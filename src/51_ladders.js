// ================= 절벽 사다리: 높이 차가 큰(걸어서 못 넘는) 두 칸을 잇는다 =================
// G.cl : Map<칸 → Set<칸>> 양방향 연결. 사다리는 아래 칸(lo)과 위 칸(hi)이 4방향으로 맞닿은 곳에 놓인다.
const CLIMB_MIN=2,CLIMB_MAX=8,CLIMB_SPD=.42;   // 반층 차이 범위 / 반층당 오르는 시간(초)
function ladderLink(a,b){const s=G.cl&&G.cl.get(a);return !!(s&&s.has(b));}
function ladderPair(i){
  if(!G.hill)return null;
  const w=G.w,x=i%w,y=(i/w)|0;let best=null;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const a=x+dx,b=y+dy;if(!inb(a,b))continue;const n=b*w+a;
    if(G.sl[n]||G.sl[i]||G.tt[n]===2||G.tt[i]===2||G.obst[n]||G.obst[i])continue;
    const d=G.lv[n]-G.lv[i],ad=Math.abs(d);if(ad<CLIMB_MIN||ad>CLIMB_MAX)continue;
    if(!best||ad>best.d)best={d:ad,lo:d>0?i:n,hi:d>0?n:i};
  }
  return best;
}
function climbCheck(i){
  const p=ladderPair(i);if(!p)return '이 칸 옆에 오를 수 있는 절벽(높이 차 1층 이상)이 없습니다';
  if(ladderLink(p.lo,p.hi))return '이미 사다리가 있습니다';
  if(roofedI(p.lo)||roofedI(p.hi))return '천장 구간에는 설치할 수 없습니다';
  return null;
}
function addLadder(i){
  const p=ladderPair(i);if(!p)return false;
  if(!G.cl)G.cl=new Map();
  for(const [a,b] of [[p.lo,p.hi],[p.hi,p.lo]]){let s=G.cl.get(a);if(!s){s=new Set();G.cl.set(a,s);}s.add(b);}
  return true;
}
// 병사가 사다리 칸 사이를 건널 때: 칸 중앙에서 멈춰 절벽을 타고 오르내린 뒤 반대편 칸 중앙으로 옮겨 간다. true 이면 이번 프레임은 오르는 중.
function climbStep(u,ni,dt){
  if(!G.cl||!G.cl.size){if(u.clb||u.cz){u.clb=null;u.cz=0;}return false;}
  const w=G.w,cur=Math.floor(u.y)*w+Math.floor(u.x),cxm=cur%w+.5,cym=((cur/w)|0)+.5;
  let c=u.clb;
  if(c&&c.to!==ni){u.clb=null;u.cz=0;u.x=cxm;u.y=cym;c=null;}
  if(!c){
    if(u.lay||!ladderLink(cur,ni))return false;
    const dx=cxm-u.x,dy=cym-u.y,d=Math.hypot(dx,dy);
    if(d>.06){const st=Math.min(d,SPEED*weatherSpeed()*dt*terrainSpeed(u.x,u.y));u.x+=dx/d*st;u.y+=dy/d*st;return true;}   // 먼저 사다리 칸의 중앙으로
    const dh=G.lv[ni]-G.lv[cur],nx=(ni%w)+.5,ny=((ni/w)|0)+.5,L=Math.hypot(nx-cxm,ny-cym)||1;
    c=u.clb={to:ni,t:0,dur:Math.max(.7,Math.abs(dh)*CLIMB_SPD),dh,fx:(nx-cxm)/L,fy:(ny-cym)/L,cx:cxm,cy:cym};
    u.face=Math.atan2(c.fy,c.fx);
  }
  c.t+=dt;const f=Math.min(1,c.t/c.dur);
  u.cz=c.dh*f;u.x=c.cx+c.fx*.4*f;u.y=c.cy+c.fy*.4*f;
  if(f>=1){u.x=(ni%w)+.5;u.y=((ni/w)|0)+.5;u.cz=0;u.clb=null;u.path.shift();}
  return true;
}
// 그리기: 아래 칸(lo)에서 위 칸(hi) 쪽 절벽 면에 붙은 사다리
function drawLadder(lo,hi){
  const w=G.w,x=lo%w,y=(lo/w)|0,hx=hi%w,hy=(hi/w)|0,dx=hx-x,dy=hy-y;
  const mx=x+.5+dx*.5-dx*.03,my=y+.5+dy*.5-dy*.03,px=-dy*.17,py=dx*.17,h0=G.lv[lo],h1=G.lv[hi];
  const z=cam.z,A=rawS(mx-px,my-py,h0),B=rawS(mx+px,my+py,h0),A2=rawS(mx-px,my-py,h1+.4),B2=rawS(mx+px,my+py,h1+.4);
  cx.lineCap='round';
  cx.strokeStyle='rgba(0,0,0,.35)';cx.lineWidth=Math.max(2,3.6*z);cx.beginPath();cx.moveTo(A[0]+1,A[1]);cx.lineTo(A2[0]+1,A2[1]);cx.moveTo(B[0]+1,B[1]);cx.lineTo(B2[0]+1,B2[1]);cx.stroke();
  cx.strokeStyle='#a98a55';cx.lineWidth=Math.max(1.4,2.4*z);cx.beginPath();cx.moveTo(A[0],A[1]);cx.lineTo(A2[0],A2[1]);cx.moveTo(B[0],B[1]);cx.lineTo(B2[0],B2[1]);cx.stroke();
  cx.strokeStyle='#6e5733';cx.lineWidth=Math.max(1,1.8*z);cx.beginPath();
  const n=Math.max(2,Math.round((h1-h0)*HALF_PX/9));
  for(let k=1;k<=n;k++){const hh=h0+(h1+.4-h0)*k/(n+.4),p=rawS(mx-px,my-py,hh),q=rawS(mx+px,my+py,hh);cx.moveTo(p[0],p[1]);cx.lineTo(q[0],q[1]);}
  cx.stroke();cx.lineCap='butt';
}
