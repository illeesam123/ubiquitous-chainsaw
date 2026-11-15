// ================= 렌더링 =================
const cv=document.getElementById('cv'),cx=cv.getContext('2d');
const mini=document.getElementById('mini'),mx=mini.getContext('2d');
const cam={x:0,y:0,z:1};
let W=0,H=0,DPR=1,mmCache=null;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  const r=cv.getBoundingClientRect();W=r.width;H=r.height;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  clampCamera();
}
const toS=(x,y)=>[(x-y)*32*cam.z+cam.x,(x+y)*16*cam.z+cam.y];
function toW(sx,sy){
  const gx=(sx-cam.x)/cam.z,gy=(sy-cam.y)/cam.z;
  return [(gx/32+gy/16)/2,(gy/16-gx/32)/2];
}
function clampCamera(){
  if(!G||!W||!H)return;
  const minX=-(G.h*32+32)*cam.z,maxX=(G.w*32+32)*cam.z;
  const minY=0,maxY=((G.w+G.h)*16+32)*cam.z;
  const spanX=maxX-minX,spanY=maxY-minY;
  cam.x=spanX<=W?(W-spanX)/2-minX:clamp(cam.x,W-maxX,-minX);
  cam.y=spanY<=H?(H-spanY)/2-minY:clamp(cam.y,H-maxY,-minY);
}
function centerCam(x,y){cam.x=W/2-(x-y)*32*cam.z;cam.y=H/2-(x+y)*16*cam.z;clampCamera();}
function diamond(x,y,s){
  const [sx,sy]=toS(x,y),hw=32*cam.z*s,hh=16*cam.z*s;
  cx.beginPath();cx.moveTo(sx,sy-0);cx.lineTo(sx+hw*0,sy);cx.closePath();
  const px=sx,py=sy;
  cx.beginPath();cx.moveTo(px,py);cx.lineTo(px+32*cam.z,py+16*cam.z);cx.lineTo(px,py+32*cam.z);cx.lineTo(px-32*cam.z,py+16*cam.z);cx.closePath();
}
function tileDia(x,y,inset){
  const [sx,sy]=toS(x+inset,y+inset),z=cam.z,k=1-2*inset;
  cx.beginPath();cx.moveTo(sx,sy);cx.lineTo(sx+32*z*k,sy+16*z*k);cx.lineTo(sx,sy+32*z*k);cx.lineTo(sx-32*z*k,sy+16*z*k);cx.closePath();
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
function drawUnit(u){
  const z=cam.z;let [sx,sy]=toS(u.x,u.y);
  const tv=G.trench[Math.floor(u.y)*G.w+Math.floor(u.x)],sink=(tv>0&&tv!==255)?7*z:0;
  if(sink){cx.save();cx.beginPath();cx.rect(sx-40*z,sy-90*z,80*z,(90+3)*z);cx.clip();sy+=sink;}
  const col=TEAM_COL[u.team],inG=u.state==='gar'||u.state==='med';
  cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();cx.ellipse(sx,sy,7*z,3.5*z,0,0,6.3);cx.fill();
  if(G.tt[Math.floor(u.y)*G.w+Math.floor(u.x)]===2){cx.strokeStyle='rgba(215,238,245,.65)';cx.lineWidth=Math.max(.7,z);cx.beginPath();cx.ellipse(sx,sy,(9+Math.sin(u.anim*6))*z,4.5*z,0,0,6.3);cx.stroke();}
  const inTr=sameTeamTrench(u);
  let by=sy,lift=inTr?-3*z:0;
  if(inG){by=sy-20*z;}
  if(u.state==='fuse')by+=2.5*z;
  const bob=(u.state==='move'||u.state==='flee')?Math.sin(u.anim*(u.state==='flee'?17:12))*1.2*z:0;
  const body=u.flash>0?'#fff':col;
  if(!inG){
    cx.strokeStyle='#2a2a22';cx.lineWidth=2*z;
    const lg=(u.state==='move'||u.state==='flee')?Math.sin(u.anim*(u.state==='flee'?17:12))*3*z:0;
    cx.beginPath();cx.moveTo(sx-2*z,by-6*z);cx.lineTo(sx-2*z+lg,by);cx.moveTo(sx+2*z,by-6*z);cx.lineTo(sx+2*z-lg,by);cx.stroke();
  }
  cx.fillStyle=body;cx.fillRect(sx-4*z,by-15*z+bob,8*z,10*z);
  cx.fillStyle='#d8b890';cx.beginPath();cx.arc(sx,by-18*z+bob,3.6*z,0,6.3);cx.fill();
  cx.fillStyle=u.flash>0?'#fff':'#3d4630';cx.beginPath();cx.arc(sx,by-19.5*z+bob,4*z,Math.PI,0);cx.fill();
  const c=Math.cos(u.face),s=Math.sin(u.face),ix=(c-s)*.9,iy=(c+s)*.5;
  if(u.state==='fuse'){
    cx.strokeStyle=body;cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx-4*z,by-13*z);cx.lineTo(sx-5*z,by-21*z);cx.lineTo(sx-1*z,by-22*z);cx.moveTo(sx+4*z,by-13*z);cx.lineTo(sx+5*z,by-21*z);cx.lineTo(sx+1*z,by-22*z);cx.stroke();
  }else if(u.state==='work'&&u.task&&u.task.bomb){
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
  if(sink)cx.restore();
  if(u.team===0&&u.sel){cx.strokeStyle='#7dff7d';cx.lineWidth=1.6;cx.beginPath();cx.ellipse(sx,sy-(sink?sink:0),10*z,5*z,0,0,6.3);cx.stroke();}
  if(u.hp<u.max||u.sel)hpBar(sx,by-27*z,14*z,Math.max(0,u.hp/u.max),u.hp>u.max*.35?'#86b45e':'#d0583f');
  if(u.state==='medwait'||u.state==='medqueue'||u.state==='medmove'){cx.fillStyle='#9bd6a0';cx.font=`${8*z}px sans-serif`;cx.fillText(u.state==='medwait'?'대기':u.state==='medqueue'?'후퇴':'후송',sx+6*z,sy-23*z);}
  if(u.state==='work'&&u.task&&u.task.work>0){
    const f=u.task.prog/u.task.work;cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(sx-9*z,by-31*z,18*z,3);cx.fillStyle='#d9ad4e';cx.fillRect(sx-9*z,by-31*z,18*z*f,3);
  }
}
function drawFlag(f){
  const z=cam.z,[sx,sy]=toS(f.x+.5,f.y+.5);
  cx.strokeStyle='#ddd';cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx,sy+4*z);cx.lineTo(sx,sy-40*z);cx.stroke();
  cx.fillStyle=TEAM_COL[f.team];cx.beginPath();cx.moveTo(sx,sy-40*z);cx.lineTo(sx+22*z,sy-34*z+Math.sin(G.time*3+f.team)*2*z);cx.lineTo(sx,sy-26*z);cx.closePath();cx.fill();
}
function visRange(y,x0,x1){
  const z=cam.z,m=70*z,dl=(-m-cam.x)/(32*z),dr=(W+m-cam.x)/(32*z),sl=(-50*z-cam.y)/(16*z),sr=(H+100*z-cam.y)/(16*z);
  return [Math.max(x0,Math.ceil(y+dl),Math.ceil(sl-y)),Math.min(x1,Math.floor(y+dr),Math.floor(sr-y))];
}
function drawGround(x0,y0,x1,y1){
  const w=G.w;
  cx.lineWidth=1;
  for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){
    const i=y*w+x;
    if(cam.z<.8){tileDia(x,y,-.04);cx.fillStyle=(G.road[i]&&G.up[i]!==1)?ROADCOL[G.road[i]]:G.ground[i];cx.fill();continue;}
    tileDia(x,y,0);cx.fillStyle=G.ground[i];cx.fill();cx.strokeStyle=G.ground[i];cx.stroke();
    if(G.road[i])drawRoadTile(x,y,i);
    if(G.tt[i]===2||G.tt[i]===4)drawWaterTile(x,y,i);else if(G.dec[i]===3)drawReeds(x,y);
    if(G.dec[i]&&G.dec[i]<3){const [sx,sy]=toS(x+.5,y+.5);cx.fillStyle=G.dec[i]===1?'rgba(0,0,0,.14)':'rgba(255,255,255,.1)';cx.beginPath();cx.ellipse(sx+(G.dec[i]*3-5)*cam.z,sy,5*cam.z,2.5*cam.z,0,0,6.3);cx.fill();}
  }}
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
  updateWfx();
  const cs=[[0,0],[W,0],[0,H],[W,H]].map(p=>toW(p[0],p[1]));
  const x0=clamp(Math.floor(Math.min(...cs.map(c=>c[0])))-2,0,G.w-1),x1=clamp(Math.ceil(Math.max(...cs.map(c=>c[0])))+2,0,G.w-1);
  const y0=clamp(Math.floor(Math.min(...cs.map(c=>c[1])))-2,0,G.h-1),y1=clamp(Math.ceil(Math.max(...cs.map(c=>c[1])))+3,0,G.h-1);
  if(viewLay===1&&G.phase!=='setup'){renderUnder(x0,y0,x1,y1);return;}
  drawGround(x0,y0,x1,y1);
  if(WFX.acc>.03)snowCover(x0,y0,x1,y1);
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
  for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){const o=G.obst[y*G.w+x];if(o&&o.idx===y*G.w+x)list.push({d:x+y+o.size,o});}}
  for(let y=y0;y<=y1;y++){const [xa,xb]=visRange(y,x0,x1);for(let x=xa;x<=xb;x++){const i=y*G.w+x;if(roofedI(i))list.push({d:x+y+1.02,roof:i});if(G.brush[i])list.push({d:x+y+1.1,bush:[x,y]});}}
  for(const u of G.units){if(u.state==='gar'||u.state==='crew'||u.state==='med'||u.lay)continue;if(inRoof(u)){if(u.team!==0)continue;if(u.x>=x0-1&&u.x<=x1+2&&u.y>=y0-1&&u.y<=y1+2)list.push({d:u.x+u.y+1.6,u,ghost:true});continue;}{const hd=hiddenUnit(u);if(hd&&u.team!==0)continue;if(u.x>=x0-1&&u.x<=x1+2&&u.y>=y0-1&&u.y<=y1+2)list.push({d:u.x+u.y+(u.state==='gar'?.6:.2),u,ghost:hd});}}
  for(const v of G.vehicles)if(v.x>=x0-2&&v.x<=x1+2&&v.y>=y0-2&&v.y<=y1+2)list.push({d:v.x+v.y+.35,v});
  for(const f of G.flags)list.push({d:f.x+f.y+1.2,f});
  list.sort((a,b)=>a.d-b.d);
  for(const e of list){if(e.o){drawOb(e.o);drawCharges(e.o);}else if(e.bush)drawBush(e.bush[0],e.bush[1]);else if(e.roof!==undefined)drawRoof(e.roof);else if(e.u){if(e.ghost)cx.globalAlpha=.4;drawUnit(e.u);cx.globalAlpha=1;}else if(e.v)drawVehicle(e.v);else drawFlag(e.f);}
  for(const T of G.teams)if(T.pad&&T.heli.state!=='wait')drawHeli(T);
  for(const sh of G.shells){const p=Math.min(1,sh.t/sh.d),x=sh.x+(sh.tx-sh.x)*p,y=sh.y+(sh.ty-sh.y)*p,arc=Math.sin(p*Math.PI)*3.2,[sx,sy]=toS(x,y);cx.fillStyle='#27251d';cx.beginPath();cx.arc(sx,sy-arc*cam.z,3.2*cam.z,0,6.3);cx.fill();cx.fillStyle='rgba(255,190,90,.7)';cx.beginPath();cx.arc(sx-1*cam.z,sy-(arc+1)*cam.z,1.2*cam.z,0,6.3);cx.fill();}
  for(const f of G.fx){
    if(f.k==='trace'){const [a,b]=toS(f.x1,f.y1),[c,d]=toS(f.x2,f.y2);cx.strokeStyle='rgba(255,230,150,.85)';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(a,b-10*cam.z);cx.lineTo(c,d-10*cam.z);cx.stroke();}
    else if(f.k==='spark'){const [a,b]=toS(f.x,f.y);cx.fillStyle='#ffe29a';cx.beginPath();cx.arc(a,b-10*cam.z,Math.max(0,4*cam.z*(1-f.t/f.d)),0,6.3);cx.fill();}
    else if(f.k==='dust'||f.k==='chip'){const [a,b]=toS(f.x,f.y);const p=f.t/f.d;cx.globalAlpha=1-p;cx.fillStyle=f.kind==='demo'?'#b0a080':f.kind==='heal'?'#a8d8a0':'#6a5234';cx.beginPath();cx.arc(a+Math.sin(f.t*40)*8*cam.z,b-p*18*cam.z,3*cam.z,0,6.3);cx.fill();cx.globalAlpha=1;}
    else if(f.k==='boom')drawFxBoom(f);else if(f.k==='smoke')drawFxSmoke(f);
  }
  // 기상 효과는 전장 위에 얹되 HUD와 미니맵은 가리지 않는다.
  drawWeatherOverlay();
  uiTop();
  drawMini();
}
