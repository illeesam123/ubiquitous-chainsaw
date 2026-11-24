// ================= 헬리패드 · 헬기 =================
function drawPad(T){
  const p=T.pad,cxw=p.x+1.5,cyw=p.y+1.5,col=TEAM_COL[T.id],tt=G.time;
  wbox(p.x+.04,p.y+.04,p.x+2.96,p.y+2.96,0,2.6,'#777a70','#5c5f56','#4a4c45');
  poly([pt(p.x+.14,p.y+.14,2.6),pt(p.x+2.86,p.y+.14,2.6),pt(p.x+2.86,p.y+2.86,2.6),pt(p.x+.14,p.y+2.86,2.6)],'#52564f');
  // 안전선
  poly([pt(p.x+.26,p.y+.26,2.7),pt(p.x+2.74,p.y+.26,2.7),pt(p.x+2.74,p.y+2.74,2.7),pt(p.x+.26,p.y+2.74,2.7)],null,'rgba(238,200,60,.85)',1.8*cam.z);
  // 착륙 원 + H
  const ring=[];for(let i=0;i<28;i++){const a=i/28*6.2832;ring.push(pt(cxw+Math.cos(a)*1.0,cyw+Math.sin(a)*1.0,2.7));}
  poly(ring,null,'rgba(245,245,230,.9)',2.2*cam.z);
  for(const dx of [-.3,.3])wline(pt(cxw+dx,cyw-.42,2.8),pt(cxw+dx,cyw+.42,2.8),'rgba(245,245,230,.92)',3.2);
  wline(pt(cxw-.3,cyw,2.8),pt(cxw+.3,cyw,2.8),'rgba(245,245,230,.92)',3.2);
  // 모서리 유도등 (팀 색으로 번갈아 점멸)
  const corners=[[p.x+.1,p.y+.1],[p.x+2.9,p.y+.1],[p.x+2.9,p.y+2.9],[p.x+.1,p.y+2.9]];
  corners.forEach((c,i)=>{const on=((tt*2+i*.5)%2)<1,q=pt(c[0],c[1],4);cx.fillStyle=on?col:'#2a2c26';cx.beginPath();cx.arc(q[0],q[1],2.6*cam.z,0,6.3);cx.fill();if(on){cx.fillStyle=col+'55';cx.beginPath();cx.arc(q[0],q[1],6*cam.z,0,6.3);cx.fill();}});
  // 풍향 자루
  const bx=p.x+2.92,by=p.y+.05,z=cam.z;
  wline(pt(bx,by,2.6),pt(bx,by,26),'#cfcfc4',1.5);
  const a=pt(bx,by,25),sw=Math.sin(tt*2.2+T.id)*3*z;
  for(let k=0;k<4;k++){cx.fillStyle=k%2?'#f4f1e6':'#e0742e';cx.beginPath();cx.moveTo(a[0]+k*5*z,a[1]-3*z+k*sw*.4+k*.6*z);cx.lineTo(a[0]+(k+1)*5*z,a[1]-2.2*z+(k+1)*sw*.4+(k+1)*.7*z);cx.lineTo(a[0]+(k+1)*5*z,a[1]+1.8*z+(k+1)*sw*.4+(k+1)*.7*z);cx.lineTo(a[0]+k*5*z,a[1]+3*z+k*sw*.4+k*.6*z);cx.closePath();cx.fill();}
}
function drawHeliShadow(T){const ps=heliPose(T);if(!ps)return;drawHeliShadowPose(ps);}
function drawHeliShadowPose(ps){
  const [sx,sy]=toS(ps.x,ps.y),z=cam.z,k=1-Math.min(1,ps.alt/80)*.55;
  cx.fillStyle=`rgba(0,0,0,${.3*k})`;cx.beginPath();cx.ellipse(sx+ps.alt*.25*z,sy+2*z,(30+ps.alt*.15)*z,(13+ps.alt*.06)*z,0,0,6.3);cx.fill();
}
function drawHeli(T){const ps=heliPose(T);if(!ps)return;drawHeliPose(ps,TEAM_COL[T.id]);}
function drawHeliPose(ps,col){
  const z=cam.z,[gx,gy]=toS(ps.x,ps.y),sx=gx,sy=gy-ps.alt*z,tt=WFX.t||0;
  const c=Math.cos(ps.ang),s=Math.sin(ps.ang),fx=(c-s),fy=(c+s)*.5,fl=Math.hypot(fx,fy)||1,ux=fx/fl,uy=fy/fl; // 화면상 진행 방향
  const rot=tt*30*ps.spin;
  cx.save();cx.translate(sx,sy);
  // 이착륙 중 시점에 따른 약간의 기울임
  const bank=ps.alt>6?(ux*.05):0;cx.rotate(bank);
  // 하부 스키드
  cx.strokeStyle='#2a2c25';cx.lineWidth=2*z;cx.lineCap='round';
  for(const sd of [-1,1]){const ox=-uy*7*z*sd*0+(-uy)*sd*6*z,oy=ux*sd*3*z;cx.beginPath();cx.moveTo(ox-ux*14*z,oy-uy*14*z+13*z);cx.lineTo(ox+ux*13*z,oy+uy*13*z+13*z);cx.stroke();
    for(const f of [-.55,.5]){cx.beginPath();cx.moveTo(ox+ux*f*24*z,oy+uy*f*24*z+13*z);cx.lineTo(ox+ux*f*22*z,oy+uy*f*22*z+5*z);cx.stroke();}}
  // 꼬리 붐 + 꼬리 날개
  cx.strokeStyle='#5d6240';cx.lineWidth=5*z;cx.beginPath();cx.moveTo(-ux*10*z,-uy*10*z+1*z);cx.lineTo(-ux*38*z,-uy*38*z-2*z);cx.stroke();
  cx.fillStyle='#70764b';cx.beginPath();cx.moveTo(-ux*34*z,-uy*34*z-1*z);cx.lineTo(-ux*43*z,-uy*43*z-12*z);cx.lineTo(-ux*45*z,-uy*45*z-9*z);cx.lineTo(-ux*39*z,-uy*39*z+3*z);cx.closePath();cx.fill();
  cx.strokeStyle='rgba(30,32,25,.55)';cx.lineWidth=1.4*z;cx.beginPath();cx.moveTo(-ux*44*z,-uy*44*z-8*z+Math.sin(rot*1.7)*7*z);cx.lineTo(-ux*44*z,-uy*44*z-8*z-Math.sin(rot*1.7)*7*z);cx.stroke();
  // 동체: 둥근 수송 헬기 몸체, 분리된 조종석 창, 미닫이문과 하부 그림자를 더해 방향을 쉽게 읽는다.
  cx.save();cx.translate(0,-2*z);cx.rotate(Math.atan2(uy,ux));
  cx.fillStyle='rgba(0,0,0,.22)';cx.beginPath();cx.ellipse(0,5*z,18*z,5.5*z,0,0,6.3);cx.fill();
  cx.fillStyle='#626944';cx.beginPath();cx.ellipse(-1*z,1.5*z,20*z,9*z,0,0,6.3);cx.fill();
  cx.fillStyle='#858d59';cx.beginPath();cx.ellipse(-2*z,-1.5*z,17*z,8*z,0,Math.PI,6.3);cx.fill();
  cx.fillStyle='#485238';cx.beginPath();cx.ellipse(-6*z,1*z,8*z,7*z,0,0,6.3);cx.fill();
  cx.fillStyle='#a9d4e6';cx.beginPath();cx.ellipse(11*z,-1*z,7*z,5.6*z,0,-1.9,1.9);cx.closePath();cx.fill();
  cx.strokeStyle='rgba(35,45,48,.65)';cx.lineWidth=.8*z;cx.beginPath();cx.moveTo(10*z,-6*z);cx.lineTo(10*z,4*z);cx.stroke();
  cx.fillStyle='rgba(255,255,255,.52)';cx.beginPath();cx.ellipse(12*z,-3*z,2.7*z,1.4*z,.4,0,6.3);cx.fill();
  cx.fillStyle=col;cx.fillRect(-10*z,2*z,12*z,2.2*z);
  cx.strokeStyle='rgba(33,38,27,.65)';cx.lineWidth=.8*z;cx.strokeRect(-7*z,-3*z,7*z,7*z);
  cx.fillStyle='#d8d7c8';cx.fillRect(-5*z,-6*z,1.2*z,1.1*z);
  cx.restore();
  // 점멸 항법등
  const blink=((tt*1.6)%1)<.2;cx.fillStyle=blink?'#ff4a3a':'#5a1f1a';cx.beginPath();cx.arc(-ux*40*z,-uy*40*z-6*z,1.7*z,0,6.3);cx.fill();
  // 마스트 + 메인 로터
  cx.strokeStyle='#23251f';cx.lineWidth=2.4*z;cx.beginPath();cx.moveTo(0,-6*z);cx.lineTo(0,-13*z);cx.stroke();
  const R=40*z;
  cx.fillStyle='rgba(215,222,205,.13)';cx.beginPath();cx.ellipse(0,-14*z,R,R*.46,0,0,6.3);cx.fill();
  cx.strokeStyle='rgba(30,32,25,.62)';cx.lineWidth=2.2*z;
  for(let k=0;k<2;k++){const a=rot+k*Math.PI;cx.beginPath();cx.moveTo(Math.cos(a)*R,-14*z+Math.sin(a)*R*.46);cx.lineTo(-Math.cos(a)*R,-14*z-Math.sin(a)*R*.46);cx.stroke();}
  cx.fillStyle='#1f211b';cx.beginPath();cx.arc(0,-14*z,2.6*z,0,6.3);cx.fill();
  cx.restore();
  cx.lineCap='butt';
  if(ps.alt<22){ // 하향풍 — 로터 아래 먼지 링
    const k=1-ps.alt/22;cx.strokeStyle=`rgba(210,200,170,${.18*k})`;cx.lineWidth=2*z;cx.beginPath();cx.ellipse(gx,gy+2*z,(34+14*Math.sin(tt*6))*z,(15+6*Math.sin(tt*6))*z,0,0,6.3);cx.stroke();
  }
}
