// ================= fortress 시드 =================
// 4면이 1층 평지인 정사각 맵. 한가운데에 거대한 호수 + 그 안의 네모난 섬. 섬의 모서리마다 4층짜리 절벽 계단이 솟아 있고,
// 그 위 2강화 감시탑에는 움직이지 않는 자경단 저격수가 올라가 있다. 섬 안에는 금광석이 가득한 동굴 입구·벙커·소이포가 흩어져 있고,
// 호수에서 섬으로는 사방에서 좁은 둑길 하나씩만 이어진다. 맵의 네 귀퉁이에는 언덕과 마을(자경단 · 2강화 감시포=SAM 터렛)이 있다.
function fortressGeo(){
  const w=G.w,h=G.h,m=Math.min(w,h);
  return {w,h,m,cx:Math.round((w-1)/2),cy:Math.round((h-1)/2),LH:Math.round(m*.27),IH:Math.round(m*.15),CL:8};   // CL: 모서리 절벽 한 변(칸)
}
// 귀퉁이 언덕 높이 지도(48_layers.js genHills 가 G._hillF 를 쓴다)
function fortressHillF(){
  const g=fortressGeo(),F=new Int8Array(G.N),hr=Math.round(g.m*.1);
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const hx=sx<0?Math.round(g.m*.1):G.w-1-Math.round(g.m*.1),hy=sy<0?Math.round(g.m*.1):G.h-1-Math.round(g.m*.1);
    for(let y=hy-hr-3;y<=hy+hr+3;y++)for(let x=hx-hr-3;x<=hx+hr+3;x++){
      if(x<1||y<1||x>=G.w-1||y>=G.h-1)continue;
      const d=Math.hypot(x-hx,y-hy)+(hsh(x*.9,y*1.1)-.5)*2.4;
      const f=d<hr*.5?2:d<hr?1:0;if(f>F[y*G.w+x])F[y*G.w+x]=f;
    }
  }
  return F;
}
const FORT_T={id:-1,name:'자경단',res:{bullets:1e9,money:0,wood:0,metal:0}};   // 중립 포탑이 쓰는 가상 팀(탄약 무한)
function fortCorner(g,sx,sy,a,b){return [sx<0?g.cx-g.IH+a:g.cx+g.IH-a,sy<0?g.cy-g.IH+b:g.cy+g.IH-b];}
function genFortress(r){
  const g=fortressGeo(),w=G.w,h=G.h,bio=G.biome,nat=(t,x,y,lv)=>{const o=addOb(t,x,y,-1);if(!o)return null;o.natural=true;o.team=-1;o.occTeam=-1;o.fort=true;if(lv){o.lv=lv;o.max=Math.round(o.max*1.35);o.hp=o.max;}return o;};
  // 1) 깨끗한 평지로 정리(바이옴 물웅덩이 제거) + 호수 · 섬
  for(let i=0;i<G.N;i++){if(G.tt[i]===2||G.tt[i]===4){G.tt[i]=0;G.mm[i]=0;G.ground[i]=tileColor(bio,0,hsh(i%w,(i/w)|0));}}
  const inLake=(x,y)=>Math.pow(Math.abs(x-g.cx),3)+Math.pow(Math.abs(y-g.cy),3)<=Math.pow(g.LH,3);
  const inIsle=(x,y)=>Math.abs(x-g.cx)<=g.IH&&Math.abs(y-g.cy)<=g.IH;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    if(!inLake(x,y)||inIsle(x,y))continue;const i=y*w+x;
    G.tt[i]=2;G.mm[i]=0;G.dec[i]=0;G.ground[i]=tileColor(bio,2,hsh(x,y));G.gq[i]=Math.min(3,(hsh(x,y)*4)|0);G.lv[i]=GROUND_LV;G.sl[i]=0;G.trench[i]=0;G.road[i]=0;
  }
  for(let y=g.cy-g.IH;y<=g.cy+g.IH;y++)for(let x=g.cx-g.IH;x<=g.cx+g.IH;x++){const i=y*w+x;G.tt[i]=0;G.mm[i]=0;G.dec[i]=0;G.ground[i]=tileColor(bio,0,hsh(x,y));G.lv[i]=GROUND_LV;G.sl[i]=0;}
  // 2) 사방 둑길(폭 3): 호수 가장자리 ↔ 섬
  for(let d=g.IH+1;d<=g.LH+1;d++)for(let k=-1;k<=1;k++)for(const [x,y] of [[g.cx+k,g.cy-d],[g.cx+k,g.cy+d],[g.cx-d,g.cy+k],[g.cx+d,g.cy+k]]){if(x>0&&y>0&&x<w-1&&y<h-1&&G.tt[y*w+x]===2)G.up[y*w+x]=1;}
  // 3) 섬 모서리: 4층 절벽 계단(칸 간격 2칸, 한 층씩 올라가는 벽)
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])for(let a=0;a<g.CL;a++)for(let b=0;b<g.CL;b++){
    const [x,y]=fortCorner(g,sx,sy,a,b),i=y*w+x,F=4-Math.floor(Math.max(a,b)/2);
    G.lv[i]=GROUND_LV+2*F;G.sl[i]=0;G.road[i]=0;G.trench[i]=0;
  }
  G.hill=true;
  // 4) 섬 내부: 금광 동굴 · 입구 · 벙커 · 소이포
  fortressCaves(r,g);
  const free=(x,y,s)=>{for(let dy=0;dy<s;dy++)for(let dx=0;dx<s;dx++){const i=(y+dy)*w+x+dx;if(!inb(x+dx,y+dy)||G.obst[i]||G.tt[i]===2||G.mouth[i]||G.lv[i]!==GROUND_LV||G.sl[i])return false;}return true;};
  const farCorner=(x,y)=>{for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const [qx,qy]=fortCorner(g,sx,sy,0,0);if(Math.abs(x-qx)<g.CL+1&&Math.abs(y-qy)<g.CL+1)return false;}return true;};
  const placed=[],spot=(s,gap)=>{for(let t=0;t<200;t++){const x=g.cx+rint(r,-g.IH+2,g.IH-2-s+1),y=g.cy+rint(r,-g.IH+2,g.IH-2-s+1);
    if(!farCorner(x,y)||!free(x,y,s)||placed.some(p=>Math.hypot(p[0]-x,p[1]-y)<gap))continue;placed.push([x,y]);return [x,y];}return null;};
  for(let k=0;k<Math.max(6,Math.round(g.m/12));k++){const p=spot(2,5);if(p)nat('bunker',p[0],p[1],0);}
  for(let k=0;k<Math.max(6,Math.round(g.m/12));k++){const p=spot(1,5);if(p)nat('mortar',p[0],p[1],1);}   // 소이포
  // 모서리 절벽 위 2강화 감시탑: 꼭대기 + 3층 가장자리 두 곳
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])for(const [a,b] of [[0,0],[3,0],[0,3]]){const [x,y]=fortCorner(g,sx,sy,a,b);nat('tower',x,y,2);}
  // 5) 귀퉁이 마을(+ 2강화 감시포 SAM 터렛)
  G.fort={cx:g.cx,cy:g.cy,LH:g.LH,IH:g.IH,villages:[]};
  const vc=Math.round(g.m*.2),VC=[];
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const cx=sx<0?vc:w-1-vc,cy=sy<0?vc:h-1-vc,R=6,hs=[];VC.push([cx,cy]);
    const gap=(x,y,s)=>hs.every(p=>Math.max(x-(p.x+p.s),p.x-(x+s),y-(p.y+p.s),p.y-(y+s))>=1);
    roadLine(cx-R-1,cy,cx+R+1,cy,1,false,r);roadLine(cx,cy-R-1,cx,cy+R+1,1,false,r);
    const plan=['apartment','warehouse'];for(let j=0;j<rint(r,5,7);j++)plan.push('house');for(let j=0;j<rint(r,2,3);j++)plan.push('shed');for(let j=0;j<rint(r,1,2);j++)plan.push('ruin');
    for(const type of plan){const sz=OB[type].size||1;for(let t=0;t<80;t++){const x=cx+Math.round((r()+r()-1)*R)-(sz>>1),y=cy+Math.round((r()+r()-1)*R)-(sz>>1);if(!gap(x,y,sz))continue;if(addOb(type,x,y)){hs.push({x,y,s:sz});break;}}}
    for(let j=0;j<rint(r,3,6);j++){const x=cx+rint(r,-R-1,R+1),y=cy+rint(r,-R-1,R+1);if(inb2(x,y)&&gap(x,y,1))addOb('fence',x,y);}
    const sam=[];for(let t=0,n=0;t<120&&n<2;t++){const x=cx+rint(r,-R-2,R+2),y=cy+rint(r,-R-2,R+2);if(!gap(x,y,1)||!free(x,y,1)||sam.some(p=>Math.hypot(p[0]-x,p[1]-y)<5))continue;if(nat('mortar',x,y,2)){sam.push([x,y]);hs.push({x,y,s:1});n++;}}
    G.fort.villages.push({x:cx,y:cy,R});
  }
  for(let i=0;i<4;i++)roadLine(VC[i][0],VC[i][1],VC[(i+1)%4][0],VC[(i+1)%4][1],2,false,r);
  // 6) 들판에 드문 나무·바위
  for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
    if(inLake(x,y)||G.road[y*w+x]||G.lv[y*w+x]!==GROUND_LV||G.sl[y*w+x]||VC.some(v=>Math.hypot(v[0]-x,v[1]-y)<9))continue;
    if(r()<.012)addOb(r()<.7?'tree':'rock',x,y);
  }
}
// 섬 아래 금광 동굴: 중앙 대형 방 + 사방 입구방 + 사선 방, 철로로 연결
function fortressCaves(r,g){
  const w=G.w,h=G.h,carve=(x,y)=>{if(inb(x,y)&&G.tt[y*w+x]!==2)G.under[y*w+x]=CAVE;};
  const room=(cx,cy,R)=>{for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++)if(Math.hypot(dx,dy)<R+.3-r()*.5)carve(cx+dx,cy+dy);};
  const link=(ax,ay,bx,by)=>{let x=ax,y=ay;while(x!==bx||y!==by){if(x!==bx&&(y===by||r()<.6))x+=Math.sign(bx-x);else y+=Math.sign(by-y);carve(x,y);carve(x+1,y);carve(x,y+1);G.urail[y*w+x]=1;}};
  const off=Math.round(g.IH*.64);
  room(g.cx,g.cy,6);
  const mouths=[[g.cx+off,g.cy],[g.cx-off,g.cy],[g.cx,g.cy+off],[g.cx,g.cy-off]];
  for(const [x,y] of mouths){room(x,y,3);link(g.cx,g.cy,x,y);}
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=g.cx+sx*Math.round(g.IH*.45),y=g.cy+sy*Math.round(g.IH*.45);room(x,y,3);link(g.cx,g.cy,x,y);}
  for(const [x,y] of mouths){const i=y*w+x;const o=G.obst[i];if(o)removeOb(o);G.trench[i]=0;G.mouth[i]=1;G.under[i]=CAVE;G.urail[i]=0;G.trans.push(i);}
}
// 광석: 철광석 대부분을 금광석으로 바꾸고, 동굴 가장자리에 금광석을 대량으로 심는다
const _newGameF=newGame;
newGame=function(cfg){
  const g=_newGameF(cfg)||G;
  if(g.special!=='fortress'||!g.ore)return g;
  const w=g.w,h=g.h,r=mulberry(hashStr(g.cfg.seed+'#gold')),adj=(i)=>{const x=i%w,y=(i/w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a<0||b<0||a>=w||b>=h||!g.under[b*w+a])return true;}return false;};
  for(let i=0;i<g.N;i++){
    if(g.under[i]!==CAVE||g.mouth[i])continue;
    if(g.ore[i]===1&&r()<.85)g.ore[i]=2;
    else if(!g.ore[i]&&!g.urail[i]&&adj(i)&&r()<.5)g.ore[i]=2;
  }
  return g;
};
// ---- 자경단 배치 ----
function genFortressMilitia(rnd){
  G.militia=[];
  const cap=(g)=>{for(const c of G.civs.filter(q=>q.grp===g)){if(g.post&&milFree(g.post)>0)milEnter(c,g.post);}};
  for(const o of G.obSet){
    if(!o.natural)continue;const sz=OB[o.type].size||1,cx=o.x+sz/2,cy=o.y+sz/2;
    if(o.type==='tower'&&o.fort){const g=milGroup(cx,cy,1.8,{fixed:true,stay:true,post:o});milFill(rnd,g,['sniper','sniper'],2,0);cap(g);}   // 탑에서 내려오지 않는 저격수
    else if(o.type==='bunker'){const g=milGroup(cx,cy,2.2,{fixed:true,post:o});milFill(rnd,g,['lmg','lmg','assault','assault'],sz/2+1.6,.3);cap(g);}
    else if(o.type==='mortar'&&o.fort&&(o.lv|0)===1){const g=milGroup(cx,cy,2,{fixed:true});milFill(rnd,g,['lmg','assault','sniper'],2,.2);}
  }
  const F=G.fort;if(!F)return;
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=F.cx+sx*Math.round(F.IH*.5),y=F.cy+sy*Math.round(F.IH*.5),p=milSpot(rnd,x,y,3);if(p){const g=milGroup(p[0]+.5,p[1]+.5,6);milFill(rnd,g,milGuns(rnd,9,.25),4,.5);}}   // 섬 순찰대
  for(const v of F.villages){   // 마을 순찰대 + 집 거점
    const g=milGroup(v.x,v.y,8);milFill(rnd,g,milGuns(rnd,9+Math.floor(rnd()*4),.2),5,.5);
    for(const o of G.obSet){if(!o.natural||!['house','warehouse','apartment'].includes(o.type)||Math.hypot(o.x-v.x,o.y-v.y)>v.R+2||rnd()>.45)continue;milPostGroup(rnd,o);}
  }
  G.militia=G.militia.filter(g=>g.n>0);
}
