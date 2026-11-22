// ================= 층(layer) 지형: 높이 · 경사 · 벽 =================
// 높이 단위 = 반층(half floor). 한 층 = 2반층. 지하 1층 = 2, (2층 = 4), 지상 3층 = 6, 언덕은 최대 +3층(= 12).
// G.lv[i]  : 타일 윗면의 높이(반층). 기본 6(지상 3층).
// G.sl[i]  : 빗면 방향. 0 없음 / 1 +x쪽이 높음 / 2 -x쪽이 높음 / 3 +y쪽이 높음 / 4 -y쪽이 높음. 높은 쪽 변이 한 층(2반층) 올라간다.
// G.hl[i]  : 이 타일은 입체로 그려야 함(높이≠지상, 빗면, 또는 앞쪽 이웃보다 높음).
// G.occ[i] : 이 타일은 뒤쪽(작은 x+y)보다 높아서 뒤에 있는 것들을 가린다 → 개체 정렬 때 한 번 더 그린다.
const FLOOR_PX=28,HALF_PX=14,GROUND_LV=6,UNDER_LV=2,MAX_LV=12;
let OCQ=null,ELK=null;   // ELK: 개체를 그리는 동안 고도를 한 값으로 고정(차량 등이 경사에서 부위별로 다른 높이로 찌그러지는 것 방지)
   // 타일별: 앞쪽에 이 타일의 서 있는 것을 가릴 만큼 높은 타일이 있는가
function initLayers(){G.lv=new Uint8Array(G.N).fill(GROUND_LV);G.sl=new Uint8Array(G.N);G.hl=new Uint8Array(G.N);G.occ=new Uint8Array(G.N);G.hill=false;G.pit=new Uint8Array(G.N);G.npit=0;G.cl=new Map();}
// ---- 참호 = 반층 구덩이 (층 3단계-1) ----
// 팀 참호 칸(1..254)은 주변보다 반층(14px) 낮다. 지형 메쉬는 건드리지 않고, 그 칸 위 병사의 높이(그리기·사격 계산)에만 반영한다.
const PIT_PX=HALF_PX,PIT_SIM=.6;
function pitSync(){
  if(!G.pit||G.pit.length!==G.N){G.pit=new Uint8Array(G.N);G.npit=0;}
  let n=0,chg=!G.flood||G.flood.length!==G.N;const t=G.trench,p=G.pit;
  if(chg){G.flood=new Uint8Array(G.N);G._pt=new Uint8Array(G.N);}
  const q=G._pt;
  for(let i=0;i<G.N;i++){const v=t[i]>0?(t[i]===255?2:1):0;p[i]=v;n+=v?1:0;const o=t[i]>0?1:0;if(q[i]!==o){q[i]=o;chg=true;}}
  G.npit=n;
  if(chg)floodPits();
}
// 물가에 닿은 구덩이(참호·포탄 구덩이)와 거기에 이어진 구덩이는 물이 찬다 (반투명 물, 이동 느려짐)
function floodPits(){
  const w=G.w,h=G.h,f=G.flood,q=G._pt,st=[];f.fill(0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!q[i]||G.tt[i]===2)continue;
    if((x>0&&G.tt[i-1]===2)||(x<w-1&&G.tt[i+1]===2)||(y>0&&G.tt[i-w]===2)||(y<h-1&&G.tt[i+w]===2)){f[i]=1;st.push(i);}}
  while(st.length){const c=st.pop(),x=c%w,y=(c/w)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a<0||b<0||a>=w||b>=h)continue;const j=b*w+a;if(q[j]&&!f[j]&&G.tt[j]!==2){f[j]=1;st.push(j);}}}
}
// 구덩이 깊이 배율: 참호 1, 포탄 구덩이 .6 (반층 구덩이, 포탄 구덩이는 더 얕다)
const pitAt=(x,y)=>{if(!G||!G.npit)return 0;const tx=Math.floor(x),ty=Math.floor(y);if(tx<0||ty<0||tx>=G.w||ty>=G.h)return 0;const v=G.pit[ty*G.w+tx];return v===2?.6:v?1:0;};
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
const elevPx=(x,y)=>ELK!==null?ELK:(elevH(x,y)-GROUND_LV)*HALF_PX;
const maxH=(i)=>G.lv[i]+(G.sl[i]?2:0);
function layersFinalize(){
  const w=G.w,h=G.h;G.hill=false;
  for(let i=0;i<G.N;i++)if(G.lv[i]!==GROUND_LV||G.sl[i]){G.hill=true;break;}
  G.hl.fill(0);G.occ.fill(0);OCQ=new Uint8Array(G.N);if(!G.hill){computeShade();return;}
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
  computeShade();
  // 가림 후보 미리 계산: 앞(dx,dy≥0)의 타일 T 가 D반층 더 높고 (dx+dy)*16px < D*14px + 여유 이면 그 타일 위 개체는 가려질 수 있다
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,m=G.lv[i];let q=0;
    for(let dy=0;dy<=6&&!q;dy++)for(let dx=0;dx<=6;dx++){if(!dx&&!dy)continue;const a=x+dx,b=y+dy;if(a>=w||b>=h)break;const D=maxH(b*w+a)-m;if(D>0&&(dx+dy)*16<D*HALF_PX+40){q=1;break;}}
    OCQ[i]=q;
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
  const F=new Int8Array(G.N),CAN=G.special==='canyon';
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const n=vn(L1,x*.032+o1,y*.032+o2)*.72+vn(L2,x*.085+o2,y*.085+o1)*.28;
    const ed=Math.min(x,y,w-1-x,h-1-y),fade=Math.min(1,ed/7),v=(n-.60-bias)*fade;
    F[y*w+x]=CAN?canyonF(x,y):v<=0?0:v<.07?1:v<.15?2:3;
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
    if(!c.length||CAN||hsh(x*3.1,y*1.7)>.62)continue;
    G.sl[i]=c[(hsh(x,y*5.3)*c.length)|0];
  }
  // 반층 타일: 한 층 높은 이웃과 맞닿은 낮은 칸 일부를 반층(+1) 올려 계단처럼 걸어 오를 수 있게 한다
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x;if(G.sl[i]||G.tt[i]===2||G.tt[i]===4)continue;
    let up=false;for(const [dx,dy] of D)if(F[i+dy*w+dx]===F[i]+1&&!G.sl[i+dy*w+dx])up=true;
    if(up&&!CAN&&hsh(x*2.9+7,y*4.1)<.4)G.lv[i]=GROUND_LV+2*F[i]+1;
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
const rawS=(x,y,hh)=>{const p=VROT===0?[x,y]:rotXY(x,y);return [(p[0]-p[1])*32*cam.z+cam.x,(p[0]+p[1])*16*cam.z+cam.y-(hh-GROUND_LV)*HALF_PX*cam.z];};
function hillWalls(x,y,i){
  const w=G.w,base=G.ground[i];
  // [이웃 칸, 내 쪽 꼭짓점 둘, 이웃 쪽 꼭짓점 둘, 면 색 배율]
  // 월드의 네 면 중 화면 쪽(보기 좌표에서 +x, +y 로 향하는) 두 면만 그린다. 면 색은 보기 방향 기준.
  const all=[
    [1,0,x+1<w?i+1:-1,[1,0],[1,1],[0,0],[0,1]],
    [-1,0,x>0?i-1:-1,[0,0],[0,1],[1,0],[1,1]],
    [0,1,y+1<G.h?i+w:-1,[0,1],[1,1],[0,0],[1,0]],
    [0,-1,y>0?i-w:-1,[0,0],[1,0],[0,1],[1,1]],
  ],faces=[];
  for(const [dx,dy,nb,pa,pb,na,nb2] of all){const [a,c]=rotDir(dx,dy);if(a===1&&c===0)faces.push([nb,pa,pb,na,nb2,.7]);else if(a===0&&c===1)faces.push([nb,pa,pb,na,nb2,.9]);}
  for(const [nb,pa,pb,na,nb2,f] of faces){
    const hA=elevIn(i,pa[0],pa[1]),hB=elevIn(i,pb[0],pb[1]);
    let nA=nb>=0?elevIn(nb,na[0],na[1]):0,nB=nb>=0?elevIn(nb,nb2[0],nb2[1]):0;   // 맵 가장자리: 바닥 끝까지 이어지는 단면
    nA=Math.min(nA,hA);nB=Math.min(nB,hB);if(hA-nA<.01&&hB-nB<.01)continue;
    const A=rawS(x+pa[0],y+pa[1],hA),B=rawS(x+pb[0],y+pb[1],hB),B2=rawS(x+pb[0],y+pb[1],nB),A2=rawS(x+pa[0],y+pa[1],nA);
    {const gr=cx.createLinearGradient(0,Math.min(A[1],B[1]),0,Math.max(A2[1],B2[1]));gr.addColorStop(0,dimCol(base,f*1.12));gr.addColorStop(1,dimCol(base,f*.78));cx.fillStyle=gr;}cx.beginPath();cx.moveTo(A[0],A[1]);cx.lineTo(B[0],B[1]);cx.lineTo(B2[0],B2[1]);cx.lineTo(A2[0],A2[1]);cx.closePath();cx.fill();
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
  // 평평한 타일 그림(낮은 변 기준 높이 lv 에 놓인 모양)을 경사 윗면 모양으로 옮기는 어파인 변환을 세 꼭짓점으로 직접 푼다(회전해도 그대로 맞는다).
  const lv=G.lv[i],Q=[[0,0],[1,0],[0,1]].map(([a,c])=>rawS(x+a,y+c,lv)),P3=[[0,0],[1,0],[0,1]].map(([a,c])=>rawS(x+a,y+c,elevIn(i,a,c)));
  const q1x=Q[1][0]-Q[0][0],q1y=Q[1][1]-Q[0][1],q2x=Q[2][0]-Q[0][0],q2y=Q[2][1]-Q[0][1],p1x=P3[1][0]-P3[0][0],p1y=P3[1][1]-P3[0][1],p2x=P3[2][0]-P3[0][0],p2y=P3[2][1]-P3[0][1],det=q1x*q2y-q1y*q2x;
  const ma=(p1x*q2y-p2x*q1y)/det,mc=(q1x*p2x-q2x*p1x)/det,mb=(p1y*q2y-p2y*q1y)/det,md=(q1x*p2y-q2x*p1y)/det,me=P3[0][0]-ma*Q[0][0]-mc*Q[0][1],mf=P3[0][1]-mb*Q[0][0]-md*Q[0][1];
  cx.save();
  {const P=[[0,0],[1,0],[1,1],[0,1]].map(([a,c])=>rawS(x+a,y+c,elevIn(i,a,c)));cx.beginPath();P.forEach((p,k)=>k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.clip();}   // 변환된 그림이 이웃 타일을 덮지 않도록 윗면 모양으로 오린다
  const sv=G.sl[i];G.sl[i]=0;cx.transform(ma,mb,mc,md,me,mf);
  if(!tileSprite(x,y,i)){tileDia(x,y,0);cx.fillStyle=G.ground[i];cx.fill();}
  cx.restore();G.sl[i]=sv;
  // 방향에 따른 간단한 명암
  const hd=s===1?[1,0]:s===2?[-1,0]:s===3?[0,1]:[0,-1],[ha,hb]=rotDir(hd[0],hd[1]),vs=ha===1?1:ha===-1?2:hb===1?3:4;   // 높은 쪽 방향을 보기 기준으로
  const sh=vs===1?.10:vs===2?-.12:vs===3?.05:-.06,pts=[[0,0],[1,0],[1,1],[0,1]].map(([a,c])=>rawS(x+a,y+c,elevIn(i,a,c)));
  cx.fillStyle=sh>0?`rgba(255,248,220,${sh})`:`rgba(0,0,0,${-sh})`;cx.beginPath();pts.forEach((p,k)=>k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();
}
function paintHill(x,y,i){
  hillWalls(x,y,i);
  if(G.sl[i]){slopeTop(x,y,i,G.sl[i]);return true;}
  return false;
}

// ---- 그림자: 지형 높이로 한 번에 계산 ----
// 꼭짓점마다 (1) 태양(왼쪽 위, 고도각 약 50°)을 향해 높이 지형을 훑어 가려지면 그림자, (2) 주변보다 움푹하면 접지 그림자(AO)를
// 계산해 (w+1)×(h+1) 텍스처 한 장에 담는다. 타일은 이 텍스처의 네 꼭짓점 값을 쌍선형 보간해 한 번에 얹는다(경계 이음매 없음).
function computeShade(){
  const w=G.w,h=G.h,W1=w+1,H1=h+1,HT=HALF_PX/32*.9;        // 반층 높이를 타일 길이 단위로 (대략)
  G.shV=(G.shV|0)+1;G.shT=new Uint8Array(G.N);G.shC=null;
  if(!G.hill)return;
  const V=new Float32Array(W1*H1);
  for(let vy=0;vy<H1;vy++)for(let vx=0;vx<W1;vx++){
    let sum=0,n=0;
    for(const [tx,ty,cx_,cy_] of [[vx-1,vy-1,1,1],[vx,vy-1,0,1],[vx-1,vy,1,0],[vx,vy,0,0]]){if(tx<0||ty<0||tx>=w||ty>=h)continue;sum+=elevIn(ty*w+tx,cx_,cy_);n++;}
    V[vy*W1+vx]=n?sum/n:GROUND_LV;
  }
  const hAt=(x,y)=>{x=x<0?0:x>w?w:x;y=y<0?0:y>h?h:y;const x0=Math.min(w-1,x|0),y0=Math.min(h-1,y|0),fx=x-x0,fy=y-y0;
    return (V[y0*W1+x0]*(1-fx)+V[y0*W1+x0+1]*fx)*(1-fy)+(V[(y0+1)*W1+x0]*(1-fx)+V[(y0+1)*W1+x0+1]*fx)*fy;};
  const [Lx,Ly]=unrotDir(-.92,-.38),TAN=1.15,dark=new Float32Array(W1*H1);
  for(let vy=0;vy<H1;vy++)for(let vx=0;vx<W1;vx++){
    const h0=V[vy*W1+vx];let sh=0;
    for(let t=.5;t<=11;t+=.5){
      const th=(hAt(vx+Lx*t,vy+Ly*t)-h0)*HT;if(th<=0)continue;
      const k=(th-t*TAN)/.5;if(k>sh)sh=k;if(sh>=1){sh=1;break;}
    }
    // 접지 그림자: 8방향 이웃 평균이 나보다 높을수록
    let avg=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const a=vx+dx,b=vy+dy;if(a<0||b<0||a>=W1||b>=H1)continue;avg+=V[b*W1+a];n++;}
    const ao=Math.max(0,Math.min(1,(avg/n-h0)/3))*.5;
    dark[vy*W1+vx]=Math.min(.6,Math.min(1,sh)*.38+ao);
  }
  const cv=document.createElement('canvas');cv.width=W1;cv.height=H1;const g=cv.getContext('2d'),im=g.createImageData(W1,H1);
  for(let i=0;i<W1*H1;i++){im.data[i*4]=12;im.data[i*4+1]=9;im.data[i*4+2]=5;im.data[i*4+3]=Math.round(dark[i]*255);}
  g.putImageData(im,0,0);G.shC=cv;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=y*W1+x;if(dark[a]>.02||dark[a+1]>.02||dark[a+W1]>.02||dark[a+W1+1]>.02)G.shT[y*w+x]=1;}
}
function paintShade(x,y,i){
  const P0=rawS(x,y,elevIn(i,0,0)),P1=rawS(x+1,y,elevIn(i,1,0)),P2=rawS(x,y+1,elevIn(i,0,1));
  cx.save();cx.transform(P1[0]-P0[0],P1[1]-P0[1],P2[0]-P0[0],P2[1]-P0[1],P0[0],P0[1]);
  cx.drawImage(G.shC,x+.5,y+.5,1,1,0,0,1,1);cx.restore();
}
// ---- 타일 비트맵 캐시: 가림용 타일을 개체마다 벡터로 다시 그리지 않고 한 장씩 찍는다 ----
const TBM=new Map(),TBMAX=600;   // 가림 타일 비트맵 상한(오래된 것부터 버림)
function tileBmp(j,zb){
  const w=G.w,x=j%w,y=(j/w)|0,key=j*8+CHB.indexOf(zb);
  let sg=(SPRV*131+VROT*104729+(G.shV|0)*7919+G.lv[j]*17+G.sl[j]*19+G.road[j]*3+G.tt[j]+G.dec[j])|0;
  for(const o of [1,w,-1,-w,w+1])if(j+o>=0&&j+o<G.N)sg=(sg*31+G.lv[j+o]*5+G.sl[j+o]*7)|0;
  let c=TBM.get(key);if(c&&c.sg===sg)return c;
  const pad=6,top=Math.max(0,(maxH(j)-GROUND_LV)*HALF_PX)+24,bot=70,ox=pad+34,oy=top+pad;
  const cv=c?c.cv:document.createElement('canvas');cv.width=Math.ceil((68+pad*2)*zb);cv.height=Math.ceil((top+32+bot+pad*2)*zb);
  const sv={cx:cx,x:cam.x,y:cam.y,z:cam.z};
  cx=cv.getContext('2d');cx.setTransform(1,0,0,1,0,0);{const [X,Y]=VT(x,y);cam.z=zb;cam.x=ox*zb-(X-Y)*32*zb;cam.y=oy*zb-(X+Y)*16*zb;}      // 칸의 보기 좌표 최소 꼭짓점이 캔버스 (ox,oy)에 오도록
  try{cx.lineWidth=1;paintBase(x,y,j,w);const v=G.trench[j];if(v){if(v===255)drawCrater(x,y);else drawTrenchTile(x,y,v);}if(G.mouth[j])drawMouth(x,y);const u=G.up[j];if(u===1)drawBridge(x,y);else if(u===4)drawShaftHatch(x,y);}
  finally{cx=sv.cx;cam.x=sv.x;cam.y=sv.y;cam.z=sv.z;}
  cv._v=(cv._v||0)+1;   // 내용이 바뀌었음을 아틀라스에 알린다
  // 타일 기준점 = rawS(x,y,GROUND) = 캔버스 (ox,oy)*zb 에 해당. 원점은 현재 카메라에서의 같은 좌표로 맞춰 찍는다
  c={cv,sg,ox:ox,oy:oy,zb};if(TBM.size>=TBMAX){const k0=TBM.keys().next().value;const o=TBM.get(k0);if(o&&o.cv){o.cv.width=o.cv.height=0;}TBM.delete(k0);}TBM.set(key,c);return c;
}
// 개체 가림: 개체를 그린 뒤, 그 앞(더 큰 x+y)에 있으면서 더 높은 타일(절벽·언덕)이 개체를 가리는 부분만 다시 덮는다.
// 타일은 이미 올바른 순서로 한 번 그려졌으므로, 덮는 범위를 개체 주변 상자로 한정하면 다른 곳의 표시(오버레이)는 건드리지 않는다.
function hillOcclude(e){
  let px,py,size=1,mine=false;
  if(e.u){px=e.u.x;py=e.u.y;mine=e.u.team===0&&!e.ghost;}else if(e.v){px=e.v.x;py=e.v.y;size=1.3;}else if(e.civ){px=e.civ.x;py=e.civ.y;}
  else if(e.o){px=e.o.x+e.o.size/2;py=e.o.y+e.o.size/2;size=e.o.size;}else if(e.bush){px=e.bush[0]+.5;py=e.bush[1]+.5;}
  else if(e.f){px=e.f.x+.5;py=e.f.y+.5;}else if(e.lad){px=(e.lad[0]%G.w)+.5;py=((e.lad[0]/G.w)|0)+.5;}else return;
  const w=G.w,tx=Math.floor(px),ty=Math.floor(py);if(tx<0||ty<0||tx>=w||ty>=G.h)return;
  if(!OCQ[ty*w+tx]&&!(e.o&&e.o.size>1))return;
  const lvE=elevH(px,py);let list=null;
  const R=size>1?size:0;
  const own=(x,y)=>e.o?(x>=e.o.x&&x<e.o.x+size&&y>=e.o.y&&y<e.o.y+size):(x===tx&&y===ty);
  for(let a=0;a<=6;a++)for(let c=0;c<=6;c++){            // 보기 좌표에서 앞쪽(+,+)에 있는 칸들
    const [dx,dy]=unrotDir(a,c),x=tx+dx,y=ty+dy;
    if(x<0||y<0||x>=w||y>=G.h||own(x,y))continue;       // 개체 자신이 서 있는 칸 제외
    const j=y*w+x;if(!G.hl[j]||maxH(j)<=lvE+.5)continue;
    (list||(list=[])).push(j);
  }
  if(!list)return;
  const z=cam.z,[sx,sy]=toS(px,py);
  // 개체 크기에 맞춘 상자: 병사·민간인은 작게, 건물은 크기에 비례, 나무·바위 등은 중간
  const big=e.o&&size>1,Wd=(e.u||e.civ?16:big?size*34+16:e.v?30:34)*z,up=(e.lad?(G.lv[e.lad[1]]-G.lv[e.lad[0]])*HALF_PX+30:e.u||e.civ?36:big?size*38+30:e.v?30:66)*z,dn=(e.u||e.civ?6:big?size*14:e.v?10:12)*z;
  let hit=false;const zb=CHB.find(q=>q>=z-.001),bx0=sx-Wd,by0=sy-up,bx1=sx+Wd,by1=sy+dn;
  cx.save();if(zb===undefined){cx.beginPath();cx.rect(bx0,by0,bx1-bx0,by1-by0);cx.clip();}
  for(const j of list){
    const x=j%w,y=(j/w)|0,[cxs,cys]=toS(x+.5,y+.5);
    if(Math.abs(cxs-sx)>Wd+34*z)continue;
    const ytop=cys-16*z-(Math.max(elevIn(j,0,0),elevIn(j,1,0),elevIn(j,0,1),elevIn(j,1,1))-elevH(x+.5,y+.5))*HALF_PX*z;   // 윗면의 가장 높은 꼭짓점 y
    if(ytop>sy+dn*.4||cys+16*z<sy-up)continue;
    // 실제로 겹치는 면적이 너무 작으면(얇은 띠) 건너뛴다
    const ovH=Math.min(sy+dn,cys+16*z+30*z)-Math.max(sy-up,ytop),ovW=Math.min(sx+Wd,cxs+32*z)-Math.max(sx-Wd,cxs-32*z);
    if(ovH<5*z||ovW<8*z)continue;
    hit=true;
    if(zb!==undefined){
      const c=tileBmp(j,zb),k=z/zb,[VX,VY]=VT(x,y),o0=[(VX-VY)*32*z+cam.x,(VX+VY)*16*z+cam.y],dx=o0[0]-c.ox*z,dy=o0[1]-c.oy*z,iw=c.cv.width*k,ih=c.cv.height*k;
      const ix0=Math.max(dx,bx0),iy0=Math.max(dy,by0),ix1=Math.min(dx+iw,bx1),iy1=Math.min(dy+ih,by1);
      if(ix1>ix0&&iy1>iy0)cx.drawImage(c.cv,(ix0-dx)/k,(iy0-dy)/k,(ix1-ix0)/k,(iy1-iy0)/k,ix0,iy0,ix1-ix0,iy1-iy0);
    }else{paintBase(x,y,j,w);const v=G.trench[j];if(v){if(v===255)drawCrater(x,y);else drawTrenchTile(x,y,v);}if(G.mouth[j])drawMouth(x,y);const up2=G.up[j];if(up2===1)drawBridge(x,y);else if(up2===4)drawShaftHatch(x,y);}
  }
  cx.restore();
  // 가려진 아군 병사는 윤곽만 흐리게 한 번 더 보여 준다 (선택·확인용)
  if(hit)xraySil(e,px,py,size);
}
// 벽에 가려진 병사·차량·시설은 단색 실루엣으로 투시해 보여 준다 (화면 위치 찾기용)
function xraySil(e,px,py,size){
  const z=cam.z,[sx,sy]=toS(px,py);let col,a=.82;
  cx.save();cx.lineWidth=Math.max(1,1.4*z);cx.strokeStyle='rgba(255,255,255,.75)';
  if(e.u){
    col=TEAM_COL[e.u.team]||'#ccc';cx.fillStyle=col;
    cx.beginPath();cx.ellipse(sx,sy-9*z,4.6*z,7.2*z,0,0,6.3);cx.fill();cx.stroke();
    cx.beginPath();cx.arc(sx,sy-18.5*z,3.3*z,0,6.3);cx.fill();cx.stroke();
  }else if(e.civ){
    cx.fillStyle='#b9b3a4';cx.beginPath();cx.ellipse(sx,sy-9*z,4.2*z,6.8*z,0,0,6.3);cx.fill();cx.stroke();cx.beginPath();cx.arc(sx,sy-17.5*z,3*z,0,6.3);cx.fill();cx.stroke();
  }else if(e.v){
    col=TEAM_COL[e.v.team]||'#ccc';cx.fillStyle=col;const W=11*z,H=6.5*z;
    cx.beginPath();cx.moveTo(sx-W*1.2,sy-4*z);cx.lineTo(sx,sy-4*z-H*1.4);cx.lineTo(sx+W*1.2,sy-4*z);cx.lineTo(sx,sy+H*.9-4*z);cx.closePath();cx.fill();cx.stroke();
  }else if(e.o&&(OB[e.o.type].building||size>1)){
    cx.fillStyle=e.o.team>=0?(TEAM_COL[e.o.team]||'#bbb'):'#d8c78a';
    cx.globalAlpha=.55;const o=e.o,pts=[[0,0],[size,0],[size,size],[0,size]].map(([a2,c2])=>rawS(o.x+a2,o.y+c2,elevH(px,py)));
    cx.beginPath();pts.forEach((p,k)=>k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();cx.globalAlpha=.9;cx.stroke();
  }else if(e.o){
    cx.fillStyle=OB[e.o.type].block?'#9a9a94':'#7fae6a';cx.beginPath();cx.arc(sx,sy-7*z,5*z,0,6.3);cx.globalAlpha=.7;cx.fill();cx.globalAlpha=.9;cx.stroke();
  }
  cx.restore();
}

// 땅 위 효과(물결·쌓인 눈)는 바닥을 다 그린 뒤에 얹기 때문에 앞쪽의 높은 타일(뒤를 가리는 타일, G.occ)을 덮어 버린다.
// 그런 타일만 뒤→앞 순서로 다시 찍고, 그 타일 윗면의 눈은 다시 얹는다.
function hillRepaint(x0,y0,x1,y1){
  const w=G.w,z=cam.z,zb=CHB.find(q=>q>=z-.001),a=WFX.acc;
  forTiles(x0,y0,x1+1,y1+1,(x,y)=>{
    const j=y*w+x;if(!G.occ[j])return;
    if(zb!==undefined){
      const c=tileBmp(j,zb),k=z/zb,[VX,VY]=VT(x,y),ox=(VX-VY)*32*z+cam.x-c.ox*z,oy=(VX+VY)*16*z+cam.y-c.oy*z;
      cx.drawImage(c.cv,ox,oy,c.cv.width*k,c.cv.height*k);
    }else{cx.save();cx.lineWidth=1;paintBase(x,y,j,w);const v=G.trench[j];if(v){if(v===255)drawCrater(x,y);else drawTrenchTile(x,y,v);}cx.restore();}
    if(a>.03&&!(G.trench[j]||G.tt[j]===2||G.mouth[j]||G.up[j]===1||G.up[j]===4)){
      const b=Math.min(3,((hsh(x*1.7,y*2.3))*4)|0);
      cx.globalAlpha=a*(.3+.32*(b+.5)/4);cx.fillStyle='rgb(233,239,245)';cx.beginPath();
      [[0,0],[1,0],[1,1],[0,1]].forEach(([fx,fy],kk)=>{const p=rawS(x+fx,y+fy,elevIn(j,fx,fy));kk?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);});
      cx.closePath();cx.fill();cx.globalAlpha=1;
    }
  });
}

// 가려진 칸 위에 마우스를 올렸을 때도 어디를 가리키는지 보이도록, 호버 칸 테두리를 맨 위에 한 번 더 그린다(앞쪽 절벽에 가려진 칸 포함)
const _renderHv=render;
render=function(){
  _renderHv();
  if(!G||!G.hill||viewLay===1||!hover||!inb(hover[0],hover[1])||G.edit)return;
  try{cx.setTransform(DPR,0,0,DPR,0,0);tileDia(hover[0],hover[1],.04);cx.strokeStyle='rgba(255,244,190,.95)';cx.lineWidth=2;cx.setLineDash([5,3]);cx.stroke();cx.setLineDash([]);cx.fillStyle='rgba(255,244,190,.12)';cx.fill();}catch(e){}
};
