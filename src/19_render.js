// ================= 렌더링 =================
const cv=document.getElementById('cv');let cx=cv.getContext('2d');const cx_main=cx;
const mini=document.getElementById('mini'),mx=mini.getContext('2d');
const cam={x:0,y:0,z:1};
let W=0,H=0,DPR=1,mmCache=null;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  const r=cv.getBoundingClientRect();W=r.width;H=r.height;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  clampCamera();
}
// ---- 화면 회전(90° 단위): 월드 좌표를 '보기 좌표'로 돌려 투영한다. 게임 상태는 건드리지 않는다. ----
let VROT=0;
const rotXY=(x,y)=>VROT===0?[x,y]:VROT===1?[G.h-y,x]:VROT===2?[G.w-x,G.h-y]:[y,G.w-x];
const unrotXY=(vx,vy)=>VROT===0?[vx,vy]:VROT===1?[vy,G.h-vx]:VROT===2?[G.w-vx,G.h-vy]:[G.w-vy,vx];
const rotDir=(dx,dy)=>VROT===0?[dx,dy]:VROT===1?[-dy,dx]:VROT===2?[-dx,-dy]:[dy,-dx];      // 월드 방향 → 보기 방향
const unrotDir=(a,b)=>VROT===0?[a,b]:VROT===1?[b,-a]:VROT===2?[-a,-b]:[-b,a];              // 보기 방향 → 월드 방향
const VW=()=>VROT&1?G.h:G.w,VH=()=>VROT&1?G.w:G.h;
const vFace=(a)=>a+VROT*Math.PI/2;                                                       // 월드 각도 → 보기 각도
// 월드 칸(x,y)의 보기 좌표상 최소 꼭짓점(칸이 차지하는 보기 칸의 왼쪽 위)
const VT=(x,y)=>VROT===0?[x,y]:VROT===1?[G.h-1-y,x]:VROT===2?[G.w-1-x,G.h-1-y]:[y,G.w-1-x];
const VD=(x,y)=>{if(VROT===0)return x+y;const p=rotXY(x,y);return p[0]+p[1];};          // 그리기 깊이(앞일수록 큼)
const toS=(x,y)=>{if(VROT===0)return [(x-y)*32*cam.z+cam.x,(x+y)*16*cam.z+cam.y-elevPx(x,y)*cam.z];const p=rotXY(x,y);return [(p[0]-p[1])*32*cam.z+cam.x,(p[0]+p[1])*16*cam.z+cam.y-elevPx(x,y)*cam.z];};
const toSV=(vx,vy,h)=>{const q=unrotXY(vx,vy);return [(vx-vy)*32*cam.z+cam.x,(vx+vy)*16*cam.z+cam.y-(elevPx(q[0],q[1])+(h||0))*cam.z];};   // 보기 좌표에서 바로
function toW(sx,sy){
  const gx=(sx-cam.x)/cam.z,g0=(sy-cam.y)/cam.z;
  if(!G||!G.hill||viewLay===1)return unrotXY((gx/32+g0/16)/2,(g0/16-gx/32)/2);
  // 시선 따라 내려가기: 높은 평면(가까움)부터 내려오며, 처음으로 지형 표면에 닿는 점이 보이는 점이다
  const W2=(gx,gy)=>unrotXY((gx/32+gy/16)/2,(gy/16-gx/32)/2);
  let hit=false;
  for(let e=MAX_LV+1;e>=0;e-=.5){
    const gy=g0+(e-GROUND_LV)*HALF_PX,[wx,wy]=W2(gx,gy);
    if(elevH(wx,wy)>=e-.02){
      // 직전 평면과 사이를 이분해 표면 위치를 다듬는다
      let lo=e,hi=e+.5;if(!hit&&e>=MAX_LV+1)return [wx,wy];
      for(let k=0;k<5;k++){const m=(lo+hi)/2,gm=g0+(m-GROUND_LV)*HALF_PX,q=W2(gx,gm);if(elevH(q[0],q[1])>=m-.02)lo=m;else hi=m;}
      return W2(gx,g0+(lo-GROUND_LV)*HALF_PX);
    }
    hit=true;
  }
  return W2(gx,g0);
}
function clampCamera(){
  if(!G||!W||!H)return;
  const vw=VW(),vh=VH(),minX=-(vh*32+32)*cam.z,maxX=(vw*32+32)*cam.z;
  const minY=G.hill?-100*cam.z:0,maxY=((vw+vh)*16+32+(G.hill?60:0))*cam.z;
  const spanX=maxX-minX,spanY=maxY-minY;
  cam.x=spanX<=W?(W-spanX)/2-minX:clamp(cam.x,W-maxX,-minX);
  cam.y=spanY<=H?(H-spanY)/2-minY:clamp(cam.y,H-maxY,-minY);
}
function centerCam(x,y){const [vx,vy]=rotXY(x,y);cam.x=W/2-(vx-vy)*32*cam.z;cam.y=H/2-(vx+vy)*16*cam.z;clampCamera();}
function diamond(x,y,s){
  const [px,py]=toS(x,y);
  cx.beginPath();cx.moveTo(px,py);cx.lineTo(px+32*cam.z,py+16*cam.z);cx.lineTo(px,py+32*cam.z);cx.lineTo(px-32*cam.z,py+16*cam.z);cx.closePath();
}
function tileDia(x,y,inset){
  const z=cam.z;
  if(G&&G.hill&&!REC&&viewLay!==1&&x>=0&&y>=0&&x<G.w&&y<G.h){          // 높이 있는 지형: 그 타일 자신의 네 꼭짓점 높이로 그린다
    const i=y*G.w+x,a=inset,c=1-inset,q=(v)=>v<0?0:v>1?1:v;
    cx.beginPath();[[a,a],[c,a],[c,c],[a,c]].forEach(([fx,fy],k)=>{const p=rawS(x+fx,y+fy,elevIn(i,q(fx),q(fy)));k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);});cx.closePath();return;
  }
  const [sx,sy]=toS(x+.5,y+.5),k=1-2*inset;                          // 칸 가운데 기준(회전해도 같은 모양)
  cx.beginPath();cx.moveTo(sx,sy-16*z*k);cx.lineTo(sx+32*z*k,sy);cx.lineTo(sx,sy+16*z*k);cx.lineTo(sx-32*z*k,sy);cx.closePath();
}
function cube(sx,sy,s,h,top,left,right){
  // (sx,sy)=타일 중심 바닥. s=크기비율, h=높이(px, 줌 적용 전)
  const z=cam.z,hw=32*z*s,hh=16*z*s,hz=h*z;
  cx.fillStyle=left;cx.beginPath();cx.moveTo(sx-hw,sy);cx.lineTo(sx,sy+hh);cx.lineTo(sx,sy+hh-hz);cx.lineTo(sx-hw,sy-hz);cx.closePath();cx.fill();
  cx.fillStyle=right;cx.beginPath();cx.moveTo(sx+hw,sy);cx.lineTo(sx,sy+hh);cx.lineTo(sx,sy+hh-hz);cx.lineTo(sx+hw,sy-hz);cx.closePath();cx.fill();
  cx.fillStyle=top;cx.beginPath();cx.moveTo(sx,sy-hh-hz);cx.lineTo(sx+hw,sy-hz);cx.lineTo(sx,sy+hh-hz);cx.lineTo(sx-hw,sy-hz);cx.closePath();cx.fill();
}
function hpBar(sx,sy,w,f,col){
  cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(sx-w/2-1,sy-1,w+2,5);
  cx.fillStyle=col;cx.fillRect(sx-w/2,sy,w*f,3);
}
// 병사 몸체(다리·몸통·머리·무기). 스프라이트 생성기도 이 함수를 그대로 사용한다. (sx,by)=발 위치
// 병사 몸(다리·몸통·머리·헬멧, 도화선 때의 팔). 총·삽·폭탄은 unitHeld 로 분리 — SVG 모드에서는 별도 스프라이트를 회전해 얹는다.
function unitBodyParts(u,sx,by,z,body,inG){
  const bob=(u.state==='move'||u.state==='flee')?Math.sin(u.anim*(u.state==='flee'?17:12))*1.2*z:0;
  const moving=u.state==='move'||u.state==='flee',stride=moving?Math.sin(u.anim*(u.state==='flee'?17:12))*2.4*z:0;
  if(!inG){
    // 별도 발과 관절이 보이는 부츠·다리로 작은 실루엣에서도 자세를 읽기 쉽게 한다.
    cx.lineCap='round';cx.strokeStyle='#35362d';cx.lineWidth=2.3*z;
    cx.beginPath();cx.moveTo(sx-2*z,by-6*z);cx.lineTo(sx-2*z+stride,by-.8*z);cx.lineTo(sx-3.5*z+stride,by);
    cx.moveTo(sx+2*z,by-6*z);cx.lineTo(sx+2*z-stride,by-.8*z);cx.lineTo(sx+3.5*z-stride,by);cx.stroke();cx.lineCap='butt';
  }
  // 조끼와 어깨를 분리해 팀색 몸통이 막대처럼 보이지 않게 한다.
  cx.fillStyle=body;cx.beginPath();cx.moveTo(sx-3.4*z,by-15*z+bob);cx.lineTo(sx-5*z,by-12.5*z+bob);cx.lineTo(sx-4*z,by-6*z+bob);cx.lineTo(sx+4*z,by-6*z+bob);cx.lineTo(sx+5*z,by-12.5*z+bob);cx.lineTo(sx+3.4*z,by-15*z+bob);cx.closePath();cx.fill();
  cx.fillStyle='rgba(25,30,23,.42)';cx.fillRect(sx-4*z,by-10*z+bob,8*z,1.5*z);
  cx.fillStyle='#514a36';cx.fillRect(sx-4.8*z,by-9*z+bob,1.8*z,3*z);cx.fillRect(sx+3*z,by-9*z+bob,1.8*z,3*z);
  cx.fillStyle='#d8b890';cx.beginPath();cx.arc(sx,by-18*z+bob,3.6*z,0,6.3);cx.fill();
  if(u.civ){cx.fillStyle=u.flash>0?'#fff':'#3b2d22';cx.beginPath();cx.arc(sx,by-19.2*z+bob,3.7*z,Math.PI*1.02,Math.PI*1.98);cx.fill();}   // 민간인: 모자 없이 머리카락
  else{
    cx.fillStyle=u.flash>0?'#fff':'#3d4630';cx.beginPath();cx.arc(sx,by-19.5*z+bob,4*z,Math.PI,0);cx.fill();
    cx.fillStyle='#292f24';cx.beginPath();cx.ellipse(sx,by-19.2*z+bob,4.6*z,1.35*z,0,Math.PI,6.3);cx.fill();
    cx.fillStyle='rgba(230,220,180,.48)';cx.fillRect(sx-2.4*z,by-20*z+bob,.9*z,.7*z);
  }
  if(u.state==='fuse'){
    cx.strokeStyle=body;cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx-4*z,by-13*z);cx.lineTo(sx-5*z,by-21*z);cx.lineTo(sx-1*z,by-22*z);cx.moveTo(sx+4*z,by-13*z);cx.lineTo(sx+5*z,by-21*z);cx.lineTo(sx+1*z,by-22*z);cx.stroke();
  }
}
// 들고 있는 것: 폭탄 · 삽 · 총
function unitHeld(u,sx,by,z,body){
  const bob=(u.state==='move'||u.state==='flee')?Math.sin(u.anim*(u.state==='flee'?17:12))*1.2*z:0;
  const c=Math.cos(vFace(u.face)),s=Math.sin(vFace(u.face)),ix=(c-s)*.9,iy=(c+s)*.5;
  if(u.state==='fuse')return;
  if(u.state==='work'&&u.task&&u.task.bomb){
    const sw=Math.sin(u.anim*6),bx=sx+ix*8*z,byy=by-5*z+iy*6*z+sw*1.2*z;
    cx.strokeStyle=body;cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx+ix*3*z,by-10*z);cx.lineTo(bx,byy);cx.stroke();
    cx.fillStyle='#3b4730';cx.fillRect(bx-3*z,byy-4*z,6*z,7*z);cx.fillStyle='#d4b13c';cx.fillRect(bx-3*z,byy-1*z,6*z,1.6*z);
    cx.fillStyle=Math.sin(G.time*8)>0?'#ff3b30':'#5a1410';cx.beginPath();cx.arc(bx,byy-2.4*z,1.3*z,0,6.3);cx.fill();
  }else if(u.state==='work'){
    const sw=Math.sin(u.anim*9);
    cx.strokeStyle='#8a8a84';cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx+ix*4*z,by-9*z);cx.lineTo(sx+ix*(10+sw*3)*z,by-1*z+iy*5*z+sw*3*z);cx.stroke();
  }else{
    cx.strokeStyle='#111';cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx-ix*3*z,by-10*z+bob-iy*3*z);cx.lineTo(sx+ix*10*z,by-10*z+bob+iy*10*z);cx.stroke();
    if(u.muz>0){cx.fillStyle='#ffd76a';cx.beginPath();cx.arc(sx+ix*13*z,by-10*z+iy*13*z,3.5*z,0,6.3);cx.fill();}
  }
}
function unitBody(u,sx,by,z,body,inG){unitBodyParts(u,sx,by,z,body,inG);unitHeld(u,sx,by,z,body);}
function drawUnit(u){
  const z=cam.z;let [sx,sy]=toS(u.x,u.y);
  const sink=0;
  if(sink){cx.save();cx.beginPath();cx.rect(sx-40*z,sy-90*z,80*z,(90+3)*z);cx.clip();sy+=sink;}
  const col=TEAM_COL[u.team],inG=u.state==='gar'||u.state==='med';
  shadowEll(sx,sy,7*z,3.5*z,.3);
  if(G.tt[Math.floor(u.y)*G.w+Math.floor(u.x)]===2||(G.flood&&G.flood[Math.floor(u.y)*G.w+Math.floor(u.x)])){cx.strokeStyle='rgba(215,238,245,.65)';cx.lineWidth=Math.max(.7,z);cx.beginPath();cx.ellipse(sx,sy,(9+Math.sin(u.anim*6))*z,4.5*z,0,0,6.3);cx.stroke();}
  const inTr=sameTeamTrench(u);
  let by=sy,lift=inTr?-3*z:0;
  if(inG){by=sy-20*z;}
  if(u.state==='fuse')by+=2.5*z;
  const bob=(u.state==='move'||u.state==='flee')?Math.sin(u.anim*(u.state==='flee'?17:12))*1.2*z:0;
  const body=u.flash>0?'#fff':col;
  if(!unitSprite(u,sx,by,z,body,inG))unitBody(u,sx,by,z,body,inG);
  if(sink)cx.restore();
  if(u.team===0&&u.sel){cx.strokeStyle='#7dff7d';cx.lineWidth=1.6;cx.beginPath();cx.ellipse(sx,sy-(sink?sink:0),10*z,5*z,0,0,6.3);cx.stroke();}
  if(u.hp<u.max||u.sel)hpBar(sx,by-27*z,14*z,Math.max(0,u.hp/u.max),u.hp>u.max*.35?'#86b45e':'#d0583f');
  if(u.state==='medwait'||u.state==='medqueue'||u.state==='medmove'){cx.fillStyle='#9bd6a0';cx.font=`${8*z}px sans-serif`;cx.fillText(u.state==='medwait'?'대기':u.state==='medqueue'?'후퇴':'후송',sx+6*z,sy-23*z);}
  if(u.state==='work'&&u.task&&u.task.work>0){
    const f=u.task.prog/u.task.work;cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(sx-9*z,by-31*z,18*z,3);cx.fillStyle='#d9ad4e';cx.fillRect(sx-9*z,by-31*z,18*z*f,3);
  }
}
function drawFlag(f){
  if(flagSprite(f))return;
  const z=cam.z,[sx,sy]=toS(f.x+.5,f.y+.5);
  cx.strokeStyle='#ddd';cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx,sy+4*z);cx.lineTo(sx,sy-40*z);cx.stroke();
  cx.fillStyle=TEAM_COL[f.team];cx.beginPath();cx.moveTo(sx,sy-40*z);cx.lineTo(sx+22*z,sy-34*z+Math.sin(G.time*3+f.team)*2*z);cx.lineTo(sx,sy-26*z);cx.closePath();cx.fill();
}
function visRange(y,x0,x1){
  if(VROT)return [x0,x1];   // 회전했을 때는 줄 단위 절단 대신 경계 상자 전체
  const z=cam.z,m=70*z,dl=(-m-cam.x)/(32*z),dr=(W+m-cam.x)/(32*z),sl=(-50*z-cam.y)/(16*z),sr=(H+100*z-cam.y)/(16*z);
  return [Math.max(x0,Math.ceil(y+dl),Math.ceil(sl-y)),Math.min(x1,Math.floor(y+dr),Math.floor(sr-y))];
}
// 한 타일의 바닥(스프라이트/색 + 도로 + 갈대 + 얼룩). 물결 애니메이션은 별도(waterQueue)라서 여기 포함되지 않는다.
function paintBase(x,y,i,w){
  const hl=G.hill&&G.hl[i],slp=hl&&paintHill(x,y,i);
  if(cam.z<.8){
    if(slp)return;
    if(hl){const pts=[[0,0],[1,0],[1,1],[0,1]].map(([a,c])=>rawS(x+a,y+c,elevIn(i,a,c)));cx.fillStyle=(G.road[i]&&G.up[i]!==1)?ROADCOL[G.road[i]]:G.ground[i];cx.beginPath();pts.forEach((p,k)=>k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();return;}
    tileDia(x,y,-.04);cx.fillStyle=(G.road[i]&&G.up[i]!==1)?ROADCOL[G.road[i]]:G.ground[i];cx.fill();return;
  }
  if(!slp&&!tileSprite(x,y,i)){tileDia(x,y,0);cx.fillStyle=G.ground[i];cx.fill();cx.strokeStyle=G.ground[i];cx.stroke();}
  if(G.shT&&G.shT[i])paintShade(x,y,i);
  if(G.road[i])drawRoadTile(x,y,i);
  if(G.tt[i]!==2&&G.tt[i]!==4&&G.dec[i]===3)drawReeds(x,y);
  if(G.dec[i]&&G.dec[i]<3){const [sx,sy]=toS(x+.5,y+.5);cx.fillStyle=G.dec[i]===1?'rgba(0,0,0,.14)':'rgba(255,255,255,.1)';cx.beginPath();cx.ellipse(sx+(G.dec[i]*3-5)*cam.z,sy,5*cam.z,2.5*cam.z,0,0,6.3);cx.fill();}
}
// ---- 바닥 청크 캐시: 16×16 타일을 한 장의 오프스크린 캔버스에 미리 그려 두고, 화면을 움직일 때는 그 몇 장만 찍는다 ----
const CHK=16,CHB=[.5,.7,1,1.25],CHBYTES=150*1048576;   // 청크 캔버스 총량 상한(바이트) — 넘으면 오래 안 쓴 것부터 버린다
let chunkMap=new Map(),chunkG=null,chunkPix=0;
function chunkEvict(keep){let t=0;for(const c of chunkMap.values())t+=c.cv.width*c.cv.height*4;if(t<=CHBYTES)return;for(const [k,c] of chunkMap){if(t<=CHBYTES)break;if(c===keep)continue;t-=c.cv.width*c.cv.height*4;chunkMap.delete(k);}}
function chunkSig(a,b){
  const w=G.w,x1=Math.min(G.w,a*CHK+CHK),y1=Math.min(G.h,b*CHK+CHK);let h=(SPR.on?7:3)+SPRV*131+(G.biome.length*17)+(G.shV|0)*7919+VROT*104729;const hv=G.hill;
  for(let y=b*CHK;y<y1;y++)for(let x=a*CHK,i=y*w+x;x<x1;x++,i++)h=(h*31+G.tt[i]*5+G.gq[i]*3+G.road[i]*11+G.dec[i]*13+(G.up[i]===1?7:0)+(G.mm[i]?1:0)+(hv?G.lv[i]*17+G.sl[i]*19:0))|0;
  if(hv){for(let y=b*CHK;y<y1;y++){if(x1<G.w){const i=y*w+x1;h=(h*31+G.lv[i]*17+G.sl[i]*19)|0;}}if(y1<G.h)for(let x=a*CHK;x<x1;x++){const i=y1*w+x;h=(h*31+G.lv[i]*17+G.sl[i]*19)|0;}}
  return h;
}
// 깊이 순(뒤→앞)으로 칸을 돈다. 회전에 따라 가로·세로 방향이 바뀐다.
function forTiles(x0,y0,x1,y1,fn){
  const ys=VROT===1||VROT===2,xs=VROT===2||VROT===3;
  for(let yy=0;yy<y1-y0;yy++){const y=ys?y1-1-yy:y0+yy;for(let xx=0;xx<x1-x0;xx++)fn(xs?x1-1-xx:x0+xx,y);}
}
function chunkGet(a,b,zb){
  const key=(a*512+b)*8+CHB.indexOf(zb),sig=chunkSig(a,b);let c=chunkMap.get(key);
  if(c&&c.sig===sig){chunkMap.delete(key);chunkMap.set(key,c);return c;}
  const pad=8,padT=G.hill?110:8,padB=G.hill?60:8;
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  for(const [px,py] of [[a*CHK,b*CHK],[a*CHK+CHK,b*CHK],[a*CHK,b*CHK+CHK],[a*CHK+CHK,b*CHK+CHK]]){const [vx,vy]=rotXY(px,py),sx=(vx-vy)*32,sy=(vx+vy)*16;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);}
  const cv2=c?c.cv:document.createElement('canvas');cv2.width=Math.ceil((maxX-minX+pad*2)*zb);cv2.height=Math.ceil((maxY-minY+padT+padB)*zb);
  const sv={cx:cx,x:cam.x,y:cam.y,z:cam.z};
  cx=cv2.getContext('2d');cx.setTransform(1,0,0,1,0,0);cam.z=zb;cam.x=(-minX+pad)*zb;cam.y=(-minY+padT)*zb;
  try{
    const x1=Math.min(G.w,a*CHK+CHK),y1=Math.min(G.h,b*CHK+CHK);cx.lineWidth=1;
    forTiles(a*CHK,b*CHK,x1,y1,(x,y)=>paintBase(x,y,y*G.w+x,G.w));
  }finally{cx=sv.cx;cam.x=sv.x;cam.y=sv.y;cam.z=sv.z;}
  c={cv:cv2,sig,ox:minX-pad,oy:minY-padT};chunkMap.delete(key);chunkMap.set(key,c);chunkEvict(c);return c;
}
function drawGround(x0,y0,x1,y1){
  const w=G.w;
  cx.lineWidth=1;
  if(chunkG!==G){chunkMap=new Map();TBM.clear();chunkG=G;}
  const zb=CHB.find(q=>q>=cam.z-.001);
  if(zb!==undefined&&cam.z>=.4){
    {const ba=Math.floor(y0/CHK),bb=Math.floor(y1/CHK),aa=Math.floor(x0/CHK),ab=Math.floor(x1/CHK);
    forTiles(aa,ba,ab+1,bb+1,(a,b)=>{
      if(a*CHK>=G.w||b*CHK>=G.h)return;
      const c=chunkGet(a,b,zb),k=cam.z/zb;
      cx.drawImage(c.cv,cam.x+c.ox*cam.z,cam.y+c.oy*cam.z,c.cv.width*k,c.cv.height*k);
    });}
    if(cam.z>=.8)for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){const i=y*w+x;if(G.tt[i]===2||G.tt[i]===4)waterQueue(x,y,i);}}
  }else{
    forTiles(x0,y0,x1+1,y1+1,(x,y)=>{const i=y*w+x;paintBase(x,y,i,w);if(cam.z>=.8&&(G.tt[i]===2||G.tt[i]===4))waterQueue(x,y,i);});
  }
  const hadWQ=WQ.length>0;
  waterFlush();
  if(WFX.acc>.03)snowCover(x0,y0,x1,y1);
  if(G.hill&&(hadWQ||WFX.acc>.03))hillRepaint(x0,y0,x1,y1);   // 물·눈 효과가 앞쪽 높은 타일(절벽·언덕)을 덮어 그리지 않도록 그 타일만 다시 찍는다   // 눈은 참호 그리기 전에 깔고, 참호·구덩이 칸은 건너뛴다
  for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){
    const v=G.trench[y*w+x];if(!v)continue;
    if(v===255)drawCrater(x,y);else drawTrenchTile(x,y,v);
  }}
  for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){const i=y*w+x;if(G.mouth[i])drawMouth(x,y);const up=G.up[i];if(up===1)drawBridge(x,y);else if(up===4)drawShaftHatch(x,y);}}
  for(const t of G.tasks.values()){
    if(t.lay||t.x<x0||t.x>x1||t.y<y0||t.y>y1)continue;
    tileDia(t.x,t.y,.1);
    cx.fillStyle=t.kind==='demo'?'rgba(208,88,63,.28)':t.kind==='build'?'rgba(80,140,220,.28)':'rgba(217,173,78,.25)';cx.fill();
    cx.strokeStyle=t.team===0?'#d9ad4e':'rgba(255,255,255,.25)';cx.setLineDash([4,3]);cx.lineWidth=1.2;cx.stroke();cx.setLineDash([]);
    if(t.prog>0){const [sx,sy]=toS(t.x+.5,t.y+.5);cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(sx-12*cam.z,sy-3,24*cam.z,5);cx.fillStyle='#d9ad4e';cx.fillRect(sx-12*cam.z,sy-3,24*cam.z*(t.prog/t.work),5);}
  }
}
function render(){
  cx.setTransform(DPR,0,0,DPR,0,0);
  cx.fillStyle='#0b0c08';cx.fillRect(0,0,W,H);
  if(!G)return;
  pitSync();
  updateWfx();
  const eh=G.hill?13*HALF_PX*cam.z:0;   // 높은 곳의 개체는 화면에서 위로 올라가 보이므로, 화면 아래쪽 바깥의 개체도 목록에 포함한다
  const cs=[[0,0],[W,0],[0,H+eh],[W,H+eh]].map(p=>toW(p[0],p[1]));
  const x0=clamp(Math.floor(Math.min(...cs.map(c=>c[0])))-2,0,G.w-1),x1=clamp(Math.ceil(Math.max(...cs.map(c=>c[0])))+2,0,G.w-1);
  const y0=clamp(Math.floor(Math.min(...cs.map(c=>c[1])))-2,0,G.h-1),y1=clamp(Math.ceil(Math.max(...cs.map(c=>c[1])))+3,0,G.h-1);
  if(viewLay===1&&G.phase!=='setup'){renderUnder(x0,y0,x1,y1);return;}
  drawGround(x0,y0,x1,y1);
  for(const T of G.teams)if(T.pad&&T.pad.x+3>=x0&&T.pad.x<=x1&&T.pad.y+3>=y0&&T.pad.y<=y1)drawPad(T);
  drawWeatherGround(x0,y0,x1,y1);
  // 시체 / 사전 효과
  for(const f of G.fx){
    if(f.k==='dead'){const [sx,sy]=toS(f.x,f.y);cx.globalAlpha=Math.min(1,(f.d-f.t)/2);cx.fillStyle=TEAM_COL[f.c];cx.fillRect(sx-5*cam.z,sy-2*cam.z,10*cam.z,3*cam.z);cx.fillStyle='rgba(0,0,0,.35)';cx.fillRect(sx-5*cam.z,sy+1*cam.z,10*cam.z,2*cam.z);cx.globalAlpha=1;}
  }
  uiGround(x0,y0,x1,y1);drawMarks(x0,y0,x1,y1);
  for(const T of G.teams)if(T.pad)drawHeliShadow(T);
  // 엔티티 정렬 그리기
  const list=[];
  for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){const o=G.obst[y*G.w+x];if(o&&o.idx===y*G.w+x)list.push({d:VD(o.x+o.size/2,o.y+o.size/2),o});}}
  for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){const i=y*G.w+x;if(roofedI(i))list.push({d:VD(x+.5,y+.5)+.02,roof:i});if(G.brush[i])list.push({d:VD(x+.5,y+.5)+.1,bush:[x,y]});}}
  if(G.cl&&G.cl.size)for(const [a,s] of G.cl){const ax=a%G.w,ay=(a/G.w)|0;if(ax<x0||ax>x1||ay<y0||ay>y1)continue;for(const b of s)if(G.lv[b]>G.lv[a])list.push({d:VD(ax+.5+((b%G.w)-ax)*.5,ay+.5+(((b/G.w)|0)-ay)*.5)+.12,lad:[a,b]});}
  const P0=G.units.filter(p=>p.team===0&&!p.dead&&!p.lay);
  for(const u of G.units){if(u.state==='gar'||u.state==='crew'||u.state==='med'||u.lay)continue;if(inRoof(u)){const rv=u.team!==0&&(u.reveal||0)>0;if(u.team!==0&&!rv)continue;if(u.x>=x0-1&&u.x<=x1+2&&u.y>=y0-1&&u.y<=y1+2)list.push({d:VD(u.x,u.y)+1.6,u,ghost:!rv});continue;}{let hd=hiddenUnit(u);if(hd&&u.team!==0){if(P0.some(p=>Math.hypot(p.x-u.x,p.y-u.y)<=1.6))hd=false;else continue;}if(u.x>=x0-1&&u.x<=x1+2&&u.y>=y0-1&&u.y<=y1+2)list.push({d:VD(u.x,u.y)+(u.state==='gar'?.6:.2),u,ghost:hd});}}
  for(const v of G.vehicles)if(v.x>=x0-2&&v.x<=x1+2&&v.y>=y0-2&&v.y<=y1+2)list.push({d:VD(v.x,v.y)+.35,v});
  if(G.civs)for(const c of G.civs)if(!c.dead&&c.x>=x0-1&&c.x<=x1+2&&c.y>=y0-1&&c.y<=y1+2)list.push({d:VD(c.x,c.y)+.3,civ:c});
  if(G.drops)for(const c of G.drops)if(c.x>=x0-1&&c.x<=x1+2&&c.y>=y0-1&&c.y<=y1+2)list.push({d:VD(c.x,c.y)+.2,civ:c});
  for(const f of G.flags)list.push({d:VD(f.x+.5,f.y+.5)+.2,f});
  list.sort((a,b)=>a.d-b.d);
  const glOn=glBegin();
  try{
  for(const e of list){const ea=e.u||e.v||e.civ;if((G.hill||G.npit)&&ea){ELK=null;ELK=elevPx(ea.x,ea.y)-(e.u?pitAt(ea.x,ea.y)*PIT_PX:0)+(e.u&&e.u.cz?e.u.cz*HALF_PX:0);}if(e.o){drawOb(e.o);drawCharges(e.o);}else if(e.lad)drawLadder(e.lad[0],e.lad[1]);else if(e.bush)drawBush(e.bush[0],e.bush[1]);else if(e.roof!==undefined)drawRoof(e.roof);else if(e.u){if(e.ghost)cx.globalAlpha=.4;drawUnit(e.u);cx.globalAlpha=1;if(e.u.under){ELK=null;drawBridge(Math.floor(e.u.x),Math.floor(e.u.y));}}else if(e.v)drawVehicle(e.v);else if(e.civ)drawCiv(e.civ);else drawFlag(e.f);ELK=null;if(G.hill)hillOcclude(e);}
  }finally{if(glOn)glEnd();}
  for(const T of G.teams)if(T.pad&&T.heli.state!=='wait')drawHeli(T);
  for(const sh of G.shells){const p=Math.min(1,sh.t/sh.d),x=sh.x+(sh.tx-sh.x)*p,y=sh.y+(sh.ty-sh.y)*p,arc=Math.sin(p*Math.PI)*3.2,[sx,sy]=toS(x,y);drawShellSpr(sx,sy-arc*cam.z);}
  for(const f of G.fx){
    if(f.k==='trace'){const [a,b]=toS(f.x1,f.y1),[c,d]=toS(f.x2,f.y2);cx.strokeStyle='rgba(255,230,150,.85)';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(a,b-10*cam.z);cx.lineTo(c,d-10*cam.z);cx.stroke();}
    else if(f.k==='spark')drawFxSpark(f);
    else if(f.k==='dust'||f.k==='chip')drawFxDust(f);
    else if(f.k==='boom')drawFxBoom(f);else if(f.k==='smoke')drawFxSmoke(f);
  }
  // 기상 효과는 전장 위에 얹되 HUD와 미니맵은 가리지 않는다.
  drawWeatherOverlay();
  uiTop();
  drawMini();
}
