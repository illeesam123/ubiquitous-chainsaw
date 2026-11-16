// ================= 층(layer) 지형: 높이 · 경사 · 벽 =================
// 높이 단위 = 반층(half floor). 한 층 = 2반층. 지하 1층 = 2, (2층 = 4), 지상 3층 = 6, 언덕은 최대 +3층(= 12).
// G.lv[i]  : 타일 윗면의 높이(반층). 기본 6(지상 3층).
// G.sl[i]  : 빗면 방향. 0 없음 / 1 +x쪽이 높음 / 2 -x쪽이 높음 / 3 +y쪽이 높음 / 4 -y쪽이 높음. 높은 쪽 변이 한 층(2반층) 올라간다.
// G.hl[i]  : 이 타일은 입체로 그려야 함(높이≠지상, 빗면, 또는 앞쪽 이웃보다 높음).
// G.occ[i] : 이 타일은 뒤쪽(작은 x+y)보다 높아서 뒤에 있는 것들을 가린다 → 개체 정렬 때 한 번 더 그린다.
const FLOOR_PX=28,HALF_PX=14,GROUND_LV=6,UNDER_LV=2,MAX_LV=12;
function initLayers(){G.lv=new Uint8Array(G.N).fill(GROUND_LV);G.sl=new Uint8Array(G.N);G.hl=new Uint8Array(G.N);G.occ=new Uint8Array(G.N);G.hill=false;}
function elevIn(i,fx,fy){
  const s=G.sl[i];let a=0;
  if(s===1)a=2*fx;else if(s===2)a=2*(1-fx);else if(s===3)a=2*fy;else if(s===4)a=2*(1-fy);
  return G.lv[i]+a;
}
function elevH(x,y){
  if(!G||!G.hill||REC||viewLay===1)return GROUND_LV;
  let tx=Math.floor(x),ty=Math.floor(y);
  if(tx<0)tx=0;else if(tx>=G.w)tx=G.w-1;if(ty<0)ty=0;else if(ty>=G.h)ty=G.h-1;
  return elevIn(ty*G.w+tx,x-tx,y-ty);
}
const elevPx=(x,y)=>(elevH(x,y)-GROUND_LV)*HALF_PX;
const maxH=(i)=>G.lv[i]+(G.sl[i]?2:0);
function layersFinalize(){
  const w=G.w,h=G.h;G.hill=false;
  for(let i=0;i<G.N;i++)if(G.lv[i]!==GROUND_LV||G.sl[i]){G.hill=true;break;}
  G.hl.fill(0);G.occ.fill(0);if(!G.hill)return;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;let f=G.lv[i]!==GROUND_LV||G.sl[i]?1:0;
    const e=x+1<w?i+1:-1,s=y+1<h?i+w:-1;
    if(e>=0&&(G.lv[e]!==G.lv[i]||G.sl[e]||G.sl[i]))f=1;
    if(s>=0&&(G.lv[s]!==G.lv[i]||G.sl[s]||G.sl[i]))f=1;
    // 뒤쪽 이웃이 더 낮으면 이 타일 앞면이 보인다
    let oc=0;const m=maxH(i);
    if(x>0&&m>maxH(i-1))oc=1;if(y>0&&m>maxH(i-w))oc=1;if(x>0&&y>0&&m>maxH(i-w-1))oc=1;
    G.hl[i]=f||oc;G.occ[i]=oc;
  }
}
// 평평한 한 덩어리인가 (건물·깃발·헬기장 같은 큰 시설용)
function flatArea(x,y,s){
  if(!G.hill)return true;
  const i0=y*G.w+x;if(x<0||y<0||x+s>G.w||y+s>G.h)return false;
  const L=G.lv[i0];
  for(let dy=0;dy<s;dy++)for(let dx=0;dx<s;dx++){const j=(y+dy)*G.w+x+dx;if(G.sl[j]||G.lv[j]!==L)return false;}
  return true;
}
// 두 칸 사이를 걸어서 넘을 수 있는가: 맞닿는 변(대각선이면 꼭짓점)의 높이 차가 반층 이하
function stepH(a,b){
  if(!G.hill)return true;
  const w=G.w,ax=a%w,ay=(a/w)|0,bx=b%w,by=(b/w)|0,dx=bx-ax,dy=by-ay;
  const fa=[dx>0?1:dx<0?0:.5,dy>0?1:dy<0?0:.5],fb=[dx>0?0:dx<0?1:.5,dy>0?0:dy<0?1:.5];
  return Math.abs(elevIn(a,fa[0],fa[1])-elevIn(b,fb[0],fb[1]))<=1.001;
}
// ---- 언덕·산 생성 ----
function genHills(){
  const w=G.w,h=G.h,r=mulberry(hashStr(G.cfg.seed+'#hill')()),L1=lat(r),L2=lat(r),o1=r()*500,o2=r()*500;
  const bias={plain:0,arid:.03,snow:.015,swamp:-.07}[G.biome]||0;
  const F=new Int8Array(G.N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const n=vn(L1,x*.032+o1,y*.032+o2)*.72+vn(L2,x*.085+o2,y*.085+o1)*.28;
    const ed=Math.min(x,y,w-1-x,h-1-y),fade=Math.min(1,ed/7),v=(n-.60-bias)*fade;
    F[y*w+x]=v<=0?0:v<.07?1:v<.15?2:3;
  }
  // 물 가까이는 평지, 작은 덩어리 제거
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=G.tt[y*w+x];if(k===2||k===4)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=x+dx,b=y+dy;if(a>=0&&b>=0&&a<w&&b<h)F[b*w+a]=0;}}
  const seen=new Uint8Array(G.N),st=[];
  for(let s0=0;s0<G.N;s0++){
    if(!F[s0]||seen[s0])continue;const comp=[s0];seen[s0]=1;st.length=0;st.push(s0);
    while(st.length){const c=st.pop(),cx0=c%w,cy0=(c/w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=cx0+dx,b=cy0+dy;if(a<0||b<0||a>=w||b>=h)continue;const j=b*w+a;if(F[j]&&!seen[j]){seen[j]=1;comp.push(j);st.push(j);}}}
    if(comp.length<28)for(const j of comp)F[j]=0;
  }
  let any=false;
  for(let i=0;i<G.N;i++){G.lv[i]=GROUND_LV+2*F[i];if(F[i])any=true;}
  if(!any){layersFinalize();return;}
  // 빗면: 한 층 높은 이웃이 있는 낮은 칸 중 일부를 그쪽으로 기울인다 (두 층 이상 차이는 절벽으로 남김)
  const D=[[1,0,1],[-1,0,2],[0,1,3],[0,-1,4]];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x;if(G.tt[i]===2||G.tt[i]===4)continue;
    const c=[];for(const [dx,dy,d] of D)if(F[i+dy*w+dx]===F[i]+1&&F[i]>=0)c.push(d);
    if(!c.length||hsh(x*3.1,y*1.7)>.62)continue;
    G.sl[i]=c[(hsh(x,y*5.3)*c.length)|0];
  }
  // 빗면 칸은 인접 빗면과 서로 마주보면 모양이 깨지므로 하나만 남긴다
  for(let i=0;i<G.N;i++){const s=G.sl[i];if(!s)continue;const o=s===1?i+1:s===2?i-1:s===3?i+w:i-w;if(G.sl[o]){G.sl[i]=0;}}
  layersFinalize();
}
// ---- 그리기 ----
function dimCol(c,f){
  if(c[0]==='#')return shadeCol(c,f);
  const m=/hsl\((\d+) (\d+)% (\d+)%\)/.exec(c);return m?`hsl(${m[1]} ${m[2]}% ${Math.max(0,m[3]*f)|0}%)`:c;
}
const rawS=(x,y,hh)=>[(x-y)*32*cam.z+cam.x,(x+y)*16*cam.z+cam.y-(hh-GROUND_LV)*HALF_PX*cam.z];
function hillWalls(x,y,i){
  const w=G.w,base=G.ground[i];
  // [이웃 칸, 내 쪽 꼭짓점 둘, 이웃 쪽 꼭짓점 둘, 면 색 배율]
  const faces=[
    [x+1<w?i+1:-1,[1,0],[1,1],[0,0],[0,1],.62],   // +x 면
    [y+1<G.h?i+w:-1,[0,1],[1,1],[0,0],[1,0],.8],  // +y 면
  ];
  for(const [nb,pa,pb,na,nb2,f] of faces){
    const hA=elevIn(i,pa[0],pa[1]),hB=elevIn(i,pb[0],pb[1]);
    let nA=nb>=0?elevIn(nb,na[0],na[1]):hA-4,nB=nb>=0?elevIn(nb,nb2[0],nb2[1]):hB-4;
    nA=Math.min(nA,hA);nB=Math.min(nB,hB);if(hA-nA<.01&&hB-nB<.01)continue;
    const A=rawS(x+pa[0],y+pa[1],hA),B=rawS(x+pb[0],y+pb[1],hB),B2=rawS(x+pb[0],y+pb[1],nB),A2=rawS(x+pa[0],y+pa[1],nA);
    cx.fillStyle=dimCol(base,f*.78);cx.beginPath();cx.moveTo(A[0],A[1]);cx.lineTo(B[0],B[1]);cx.lineTo(B2[0],B2[1]);cx.lineTo(A2[0],A2[1]);cx.closePath();cx.fill();
    // 지층 줄무늬: 층 경계마다
    if(Math.abs(hA-hB)<.01&&Math.abs(nA-nB)<.01){
      cx.strokeStyle='rgba(0,0,0,.18)';cx.lineWidth=Math.max(.6,cam.z);cx.beginPath();
      for(let lv=Math.floor(nA/2)*2+2;lv<hA-.01;lv+=2){const p=rawS(x+pa[0],y+pa[1],lv),q=rawS(x+pb[0],y+pb[1],lv);cx.moveTo(p[0],p[1]);cx.lineTo(q[0],q[1]);}
      cx.stroke();
    }
    cx.strokeStyle='rgba(0,0,0,.22)';cx.lineWidth=Math.max(.6,cam.z);cx.beginPath();cx.moveTo(A2[0],A2[1]);cx.lineTo(B2[0],B2[1]);cx.stroke();
    cx.strokeStyle='rgba(255,244,210,.38)';cx.lineWidth=Math.max(.8,1.3*cam.z);cx.beginPath();cx.moveTo(A[0],A[1]);cx.lineTo(B[0],B[1]);cx.stroke();   // 윗모서리 하이라이트
  }
}
// 빗면 윗면: 평평한 타일 그림을 그대로 기울여(skew) 붙인다. 평면의 정사영이라 어파인 변환이 정확히 맞는다.
function slopeTop(x,y,i,s){
  const z=cam.z,sv=G.sl[i];G.sl[i]=0;                       // 낮은 변 기준 높이로 중심을 잡는다
  const [sx,sy]=toS(x+.5,y+.5);G.sl[i]=sv;
  const H=2*HALF_PX,gx=s===1?1:s===2?-1:s===3?-1:1,gy=s===1?1:s===2?-1:s===3?1:-1;
  const b=-H*gx/64,d=1-H*gy/32,f=-H*z*.5+H*gx*sx/64+H*gy*sy/32;     // (sx,sy)=화면 px 중심, H=줌 전 높이 px
  cx.save();
  {const P=[[0,0],[1,0],[1,1],[0,1]].map(([a,c])=>rawS(x+a,y+c,elevIn(i,a,c)));cx.beginPath();P.forEach((p,k)=>k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.clip();}   // 변환된 그림이 이웃 타일을 덮지 않도록 윗면 모양으로 오린다
  G.sl[i]=0;cx.transform(1,b,0,d,0,f);
  if(!tileSprite(x,y,i)){tileDia(x,y,0);cx.fillStyle=G.ground[i];cx.fill();}
  cx.restore();G.sl[i]=sv;
  // 방향에 따른 간단한 명암
  const sh=s===1?.10:s===2?-.12:s===3?.05:-.06,pts=[[0,0],[1,0],[1,1],[0,1]].map(([a,c])=>rawS(x+a,y+c,elevIn(i,a,c)));
  cx.fillStyle=sh>0?`rgba(255,248,220,${sh})`:`rgba(0,0,0,${-sh})`;cx.beginPath();pts.forEach((p,k)=>k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();
}
function paintHill(x,y,i){
  hillWalls(x,y,i);
  if(G.sl[i]){slopeTop(x,y,i,G.sl[i]);return true;}
  return false;
}

// 언덕 주변 그림자: 더 높은 이웃과 맞닿은 낮은 타일의 가장자리를 어둡게(접지 그림자),
// 그리고 빛(왼쪽 위)과 반대쪽인 +x/+y 쪽 낮은 땅에는 길게 드리운 그림자를 얹는다.
const AO_DIRS=[[-1,0,[0,0],[0,1],[.55,0],[.55,1]],[1,0,[1,0],[1,1],[.45,0],[.45,1]],[0,-1,[0,0],[1,0],[0,.55],[1,.55]],[0,1,[0,1],[1,1],[0,.45],[1,.45]]];
function hillShadow(x,y,i){
  const w=G.w;
  for(const [dx,dy,p0,p1,q0,q1] of AO_DIRS){
    const a=x+dx,b=y+dy;if(a<0||b<0||a>=w||b>=G.h)continue;const n=b*w+a;
    // 이웃 쪽 변에서의 높이 차 (이웃의 해당 변은 내 변과 같은 위치)
    const np0=[dx===-1?1:dx===1?0:p0[0],dy===-1?1:dy===1?0:p0[1]],np1=[dx===-1?1:dx===1?0:p1[0],dy===-1?1:dy===1?0:p1[1]];
    const d=Math.max(elevIn(n,np0[0],np0[1])-elevIn(i,p0[0],p0[1]),elevIn(n,np1[0],np1[1])-elevIn(i,p1[0],p1[1]));
    if(d<.9)continue;
    const P=rawS(x+p0[0],y+p0[1],elevIn(i,p0[0],p0[1])),Q=rawS(x+p1[0],y+p1[1],elevIn(i,p1[0],p1[1])),
      Q2=rawS(x+q1[0],y+q1[1],elevIn(i,q1[0],q1[1])),P2=rawS(x+q0[0],y+q0[1],elevIn(i,q0[0],q0[1]));
    const g=cx.createLinearGradient((P[0]+Q[0])/2,(P[1]+Q[1])/2,(P2[0]+Q2[0])/2,(P2[1]+Q2[1])/2),al=Math.min(.46,.2*d);
    // 빛이 왼쪽 위에서 오므로, 높은 땅이 -x/-y 쪽에 있는 경우(그림자가 +x/+y 쪽으로 떨어짐)를 더 진하게
    const k=(dx<0||dy<0)?1.25:.8;
    g.addColorStop(0,`rgba(10,8,4,${Math.min(.6,al*k).toFixed(3)})`);g.addColorStop(1,'rgba(10,8,4,0)');
    cx.fillStyle=g;cx.beginPath();cx.moveTo(P[0],P[1]);cx.lineTo(Q[0],Q[1]);cx.lineTo(Q2[0],Q2[1]);cx.lineTo(P2[0],P2[1]);cx.closePath();cx.fill();
  }
}
