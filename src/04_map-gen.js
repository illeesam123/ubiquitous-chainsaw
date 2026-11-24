// ================= 게임 / 맵 생성 =================
function newGame(cfg){
  const w=cfg.size,h=cfg.size,N=w*h,rnd=mulberry(hashStr(cfg.seed)());
  G={cfg,w,h,N,ground:new Array(N),gq:new Uint8Array(N),mm:new Uint8Array(N),tt:new Uint8Array(N),biome:'plain',dec:new Uint8Array(N),trench:new Uint8Array(N),trenchHP:new Float32Array(N),shells:[],obst:new Array(N).fill(null),obSet:new Set(),
    units:[],vehicles:[],uid:new Map(),tasks:new Map(),tkey:new Map(),nextId:1,teams:[],flags:[],phase:'setup',time:0,countdown:0,fx:[],weather:{type:['clear','rain','snow','fog'][Math.floor(Math.random()*4)],next:95+Math.random()*55,night:false},
    expl:new Uint8Array(N),vis:new Uint8Array(N),over:null,speed:1,paused:false,gen:rnd,dead:false,tv:0,to:0,tw:0};
  for(let t=0;t<=cfg.enemies;t++)G.teams.push({id:t,human:t===0,flag:null,res:{money:300+cfg.soldiers*12,bullets:500+cfg.soldiers*20,metal:60+cfg.soldiers*3,wood:80+cfg.soldiers*4},order:{lines:[]},heli:{state:'wait',timer:HELI.first+t*9,t:0,dir:0,delivered:false},pad:null,trench:[],alive:true,kills:0,lost:0,name:TEAM_NAME[t],ai:{next:3+t*.7,nb:10,nr:0,bi:0,na:0}});
  G.special=specialOf(cfg.seed);
  G.biome=G.special?(G.special==='mineshaft'||G.special==='canyon'?'arid':'plain'):(cfg.biome&&BIOME[cfg.biome])?cfg.biome:BIOME_KEYS[hashStr(cfg.seed+'#biome')()%BIOME_KEYS.length];
  if(G.special==='superflat')for(const T of G.teams)T.res={money:110,bullets:240,metal:10,wood:14};
  G.weather.type=pickWeather(null);
  G.up=new Uint8Array(N);G.under=new Uint8Array(N);G.mouth=new Uint8Array(N);G.road=new Uint8Array(N);G.brush=new Uint8Array(N);G.urail=new Uint8Array(N);G.open=G.teams.map(()=>new Uint8Array(N));G.trans=[];viewLay=0;initLayers();
  genMap(rnd);
  if(G.special==='mineshaft')genMine(rnd);else genCaves(mulberry(hashStr(cfg.seed+'#cave')()));
  genBush(rnd);
  if(G.hill){for(let i=0;i<G.N;i++)if(G.sl[i]){G.road[i]=0;if(G.trench[i]===255)G.trench[i]=0;}
    for(const o of [...G.obSet])if(o.cells.some(j=>G.sl[j])||(o.cells.length>1&&!flatArea(o.x,o.y,o.size)))removeOb(o);   // 경사면·비탈에 걸친 장애물은 지운다
    layersFinalize();}
  G.gen=null;
  G.expl.fill(1);G.vis.fill(1);
  return G;
}
function footprint(type,x,y){
  const s=OB[type].size||1,c=[];
  for(let dy=0;dy<s;dy++)for(let dx=0;dx<s;dx++)c.push([x+dx,y+dy]);
  return c;
}
function addOb(type,x,y,team){
  const cells=footprint(type,x,y);
  for(const [ax,ay] of cells){
    if(ax<0||ay<0||ax>=G.w||ay>=G.h)return null;
    const j=ay*G.w+ax;if(G.hill&&(G.sl[j]||((cells.length>1||OB[type].building)&&!flatArea(x,y,OB[type].size||1))))return null;if(G.obst[j]||G.trench[j]===255||G.tt[j]===2||(G.gen&&G.road[j]))return null;
  }
  const i=y*G.w+x;
  const d=OB[type],nat=team===undefined||team<0,rv=G.gen||Math.random;
  const o={id:G.nextId++,type,x,y,idx:i,size:d.size||1,cells:cells.map(([ax,ay])=>ay*G.w+ax),hp:d.hp,max:d.hp,team:nat?-1:team,natural:nat,occ:[],occTeam:nat?-1:team,patients:[],medQueue:[],cd:0,fl:0,v:rv(),aim:0};
  for(const j of o.cells)G.obst[j]=o;
  G.obSet.add(o);return o;
}
function removeOb(o){if(o.type==='medbay')closeMedbay(o);for(const j of o.cells)if(G.obst[j]===o)G.obst[j]=null;G.obSet.delete(o);}
function inb2(x,y){return x>=0&&y>=0&&x<G.w&&y<G.h;}
function genMap(r){
  const w=G.w,h=G.h,A=lat(r),B=lat(r),C=lat(r),D=lat(r);
  const o1=r()*500,o2=r()*500,o3=r()*500,fs=.07+r()*.05;
  const bio=G.biome,BI=BIOME[bio],wr=mulberry(hashStr(G.cfg.seed+'#w')()),Wl=lat(wr),ow=wr()*500;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,m=vn(A,x*.11+o1,y*.11+o2),g=vn(B,x*.5+o2,y*.5+o3),wv=vn(Wl,x*.085+ow,y*.085+ow*.7);
    let kind=m>(bio==='swamp'?.56:.6)?1:0;
    if(G.special&&G.special!=='mineshaft')kind=0;
    if(bio==='swamp'&&wv>.73)kind=2;else if(bio==='snow'&&wv>.78)kind=4;
    G.tt[i]=kind;G.mm[i]=kind===1?1:0;
    G.ground[i]=tileColor(bio,kind,g);G.gq[i]=Math.min(3,Math.max(0,(g*4)|0));
    const q=r();G.dec[i]=kind>=2?0:(q<.07?1:q<.1?2:0);
  }
  if(bio==='swamp')for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(G.tt[i]===2)continue;
    if((G.tt[i-1]===2||G.tt[i+1]===2||G.tt[i-w]===2||G.tt[i+w]===2)&&r()<.55)G.dec[i]=3;}
  const SP=G.special;
  if((!SP||SP==='canyon'||SP==='mafia')&&!G.cfg.flat&&!G.cfg.noHills)genHills();   // cfg.flat: 에셋 추출용, cfg.noHills: 성능 모드
  if(SP==='superflat')return;
  if(SP==='urbanwar'){
    carveRiver(r,'h',.5,Math.max(6,Math.round(w/14)),.1);
    genBridges(r,'h',w>=128?5:3);
    genCity(r);
    for(let k=0;k<Math.floor(w*h/700);k++){const x=rint(r,2,w-3),y=rint(r,2,h-3);if(!G.obst[y*w+x]&&G.tt[y*w+x]!==2)G.trench[y*w+x]=255;}
    return;
  }
  if(SP==='coast'){
    const nh=w>=128?3:2,nv2=w>=128?3:2,wd=Math.max(6,Math.round(w/12));
    for(let k=0;k<nh;k++)carveRiver(r,'h',(k+1)/(nh+1)+(r()-.5)*.06,wd,.07);
    for(let k=0;k<nv2;k++)carveRiver(r,'v',(k+1)/(nv2+1)+(r()-.5)*.06,wd,.07);
    carveRiver(r,r()<.5?'h':'v',.18+r()*.64,Math.round(wd*.7),.1);
  }
  const nc=Math.floor(w*h/160);
  for(let k=0;k<nc;k++){const cx=rint(r,2,w-3),cy=rint(r,2,h-3);if(G.tt[cy*w+cx]===2)continue;G.trench[cy*w+cx]=255;
    if(r()<.5){const dx=r()<.5?1:0,dy=1-dx;if(G.tt[(cy+dy)*w+cx+dx]!==2)G.trench[(cy+dy)*w+cx+dx]=255;}}
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const f=vn(C,x*fs+o3,y*fs+o1),rk=vn(D,x*.09+o2,y*.09+o3);
    if(f>.57&&r()<(f-.5)*1.95*BI.tree)addOb('tree',x,y);
    else if(rk>(SP==='mineshaft'?.56:bio==='arid'?.64:.73)&&r()<(rk-.6)*.5*BI.rock*(SP==='mineshaft'?1.6:1))addOb('rock',x,y);
    else if(r()<.005)addOb(r()<(bio==='arid'?.35:.82)?'tree':'rock',x,y);
  }
  // 마을: 건물을 한 칸 간격으로 밀집 배치 (소도시는 아파트·창고·폐허 포함)
  const nv=SP==='mineshaft'||SP==='canyon'?0:Math.floor(w/(SP==='coast'?20:13))+rint(r,0,2);
  const gapOK=(hs,x,y,sz)=>hs.every(p=>Math.max(x-(p.x+p.s),p.x-(x+sz),y-(p.y+p.s),p.y-(y+sz))>=1);
  const VC=[];
  for(let k=0;k<nv;k++){
    const cx=rint(r,9,w-10),cy=rint(r,9,h-10),town=r()<.42,R=town?9:6,hs=[];
    for(let dy=-R-1;dy<=R+1;dy++)for(let dx=-R-1;dx<=R+1;dx++){const xx=cx+dx,yy=cy+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const o=G.obst[yy*w+xx];if(o&&!OB[o.type].building)removeOb(o);}
    VC.push([cx,cy]);
    if(town){roadLine(cx-R-1,cy,cx+R+1,cy,1,false,r);roadLine(cx,cy-R-1,cx,cy+R+1,1,false,r);}
    else if(r()<.6)roadLine(cx-R,cy,cx+R,cy,2,false,r);
    const plan=[];
    const add=(t,n)=>{for(let j=0;j<n;j++)plan.push(t);};
    if(town){add('apartment',rint(r,1,3));add('warehouse',rint(r,1,2));add('house',rint(r,5,8));add('shed',rint(r,2,4));add('ruin',rint(r,2,4));}
    else{if(r()<.25)add('warehouse',1);add('house',rint(r,4,7));add('shed',rint(r,2,4));add('ruin',rint(r,0,2));}
    for(const type of plan){
      const sz=OB[type].size||1;
      for(let t=0;t<70;t++){
        const x=cx+Math.round((r()+r()-1)*R)-(sz>>1),y=cy+Math.round((r()+r()-1)*R)-(sz>>1);
        if(!gapOK(hs,x,y,sz))continue;
        if(addOb(type,x,y)){hs.push({x,y,s:sz});break;}
      }
    }
    const nf=rint(r,3,8);
    for(let j=0;j<nf;j++){const x=cx+rint(r,-R-1,R+1),y=cy+rint(r,-R-1,R+1);if(inb2(x,y)&&gapOK(hs,x,y,1)||inb2(x,y)&&r()<.3&&!hs.some(p=>x>=p.x&&x<p.x+p.s&&y>=p.y&&y<p.y+p.s))addOb('fence',x,y);}
  }
  if(SP==='canyon'){   // 협곡 양 끝의 오두막 마을
    for(const ex of [10,w-11]){
      const cx=ex,cy=Math.round(canyonY(ex)),R=5,hs=[];
      for(let dy=-R-2;dy<=R+2;dy++)for(let dx=-R-2;dx<=R+2;dx++){const xx=cx+dx,yy=cy+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const o=G.obst[yy*w+xx];if(o)removeOb(o);}
      VC.push([cx,cy]);
      const plan=[];for(let j=0;j<rint(r,4,6);j++)plan.push('house');for(let j=0;j<rint(r,2,3);j++)plan.push('shed');
      for(const type of plan)for(let t=0;t<60;t++){const x=cx+Math.round((r()+r()-1)*R),y=cy+Math.round((r()+r()-1)*R);if(!gapOK(hs,x,y,1))continue;if(addOb(type,x,y)){hs.push({x,y,s:1});break;}}
      for(let j=0;j<rint(r,3,6);j++){const x=cx+rint(r,-R-1,R+1),y=cy+rint(r,-R-1,R+1);if(gapOK(hs,x,y,1))addOb('fence',x,y);}
    }
  }
  // 마을 사이 비포장도로 + 철로
  for(let i=1;i<VC.length;i++){let bj=0,bd=1e9;for(let j=0;j<i;j++){const d=Math.hypot(VC[i][0]-VC[j][0],VC[i][1]-VC[j][1]);if(d<bd){bd=d;bj=j;}}roadLine(VC[i][0],VC[i][1],VC[bj][0],VC[bj][1],2,SP!=='coast',r);}
  if(SP!=='mineshaft'&&SP!=='canyon'){
    const hz=r()<.5,wp=[];for(let k=0;k<5;k++)wp.push(hz?[Math.round((w-1)*k/4),rint(r,Math.round(h*.2),Math.round(h*.8))]:[rint(r,Math.round(w*.2),Math.round(w*.8)),Math.round((h-1)*k/4)]);
    for(let k=0;k<4;k++)roadLine(wp[k][0],wp[k][1],wp[k+1][0],wp[k+1][1],3,SP!=='coast',r);
  }
  // 외딴 건물
  for(let k=0;k<(SP==='mineshaft'||SP==='canyon'?0:Math.floor(w/9));k++){const tp=['house','shed','ruin','ruin','warehouse'][rint(r,0,4)];addOb(tp,rint(r,4,w-8),rint(r,4,h-8));}
  const nl=Math.floor(w/12);
  for(let k=0;k<nl;k++){let x=rint(r,4,w-5),y=rint(r,4,h-5);const dx=r()<.5?1:0,dy=1-dx,len=rint(r,4,9);
    for(let j=0;j<len;j++){if(r()<.88)addOb('fence',x,y);x+=dx;y+=dy;}}
  if(SP==='mafia')genMafia(r);
}
