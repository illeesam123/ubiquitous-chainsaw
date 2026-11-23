// ================= 헬리콥터 SVG 굽기용 그리기 (게임 빌드에는 들어가지 않는다) =================
// 정지(날개 접힘)와 회전(날개 흐림) 두 모양 × 16방향(반전 재사용) × 팀. 좌표계는 기록기(SvgRec)가 지원하는 것만 쓴다.
function drawHeliSpr(v,spin,team){
  const z=1,[gx,gy]=toS(v.x,v.y),col=TEAM_COL[team];
  const c=Math.cos(v.face),s=Math.sin(v.face),fx=c-s,fy=(c+s)*.5,fl=Math.hypot(fx,fy)||1,ux=fx/fl,uy=fy/fl;
  const ox=gx,oy=gy-13,a=Math.atan2(uy,ux),ca=Math.cos(a),sa=Math.sin(a);
  const B=(px,py)=>[ox+px*ca-py*sa,oy-2+px*sa+py*ca];     // 동체 좌표(앞이 +x) → 화면
  // 접지 그림자 대신 스키드가 땅에 닿는다
  cx.lineCap='round';cx.strokeStyle='#2a2c25';cx.lineWidth=2;
  for(const sd of [-1,1]){
    const px=-uy*sd*6,py=ux*sd*3;
    cx.beginPath();cx.moveTo(ox+px-ux*14,oy+py-uy*14+13);cx.lineTo(ox+px+ux*13,oy+py+uy*13+13);cx.stroke();
    for(const f of [-.55,.5]){cx.beginPath();cx.moveTo(ox+px+ux*f*24,oy+py+uy*f*24+13);cx.lineTo(ox+px+ux*f*22,oy+py+uy*f*22+5);cx.stroke();}
  }
  // 꼬리 붐 + 꼬리 날개
  cx.strokeStyle='#5d6240';cx.lineWidth=5;cx.beginPath();cx.moveTo(ox-ux*10,oy-uy*10+1);cx.lineTo(ox-ux*38,oy-uy*38-2);cx.stroke();
  cx.fillStyle='#70764b';cx.beginPath();cx.moveTo(ox-ux*34,oy-uy*34-1);cx.lineTo(ox-ux*43,oy-uy*43-12);cx.lineTo(ox-ux*45,oy-uy*45-9);cx.lineTo(ox-ux*39,oy-uy*39+3);cx.closePath();cx.fill();
  const tx=ox-ux*44,ty=oy-uy*44-8;
  if(spin){cx.fillStyle='rgba(30,32,25,.28)';cx.beginPath();cx.ellipse(tx,ty,6.5,6.5,0,0,6.3);cx.fill();}
  else{cx.strokeStyle='rgba(30,32,25,.8)';cx.lineWidth=1.6;cx.beginPath();cx.moveTo(tx,ty-6);cx.lineTo(tx,ty+6);cx.stroke();}
  // 동체
  cx.fillStyle='#7c8352';cx.beginPath();cx.ellipse(ox,oy-2,19,9.5,a,0,6.3);cx.fill();
  let p=B(0,3.5);cx.fillStyle='#5f6640';cx.beginPath();cx.ellipse(p[0],p[1],18,6,a,0,Math.PI);cx.fill();
  p=B(-2,-3.5);cx.fillStyle='#8f9760';cx.beginPath();cx.ellipse(p[0],p[1],14,4,a,Math.PI,6.2832);cx.fill();
  p=B(11,-1);cx.fillStyle='#a9d4e6';cx.beginPath();cx.ellipse(p[0],p[1],7,6,a,0,6.3);cx.fill();
  p=B(12,-3);cx.fillStyle='rgba(255,255,255,.55)';cx.beginPath();cx.ellipse(p[0],p[1],3,1.8,a+.4,0,6.3);cx.fill();
  const q0=B(-12,-1.5),q1=B(1,-1.5),q2=B(1,1.5),q3=B(-12,1.5);
  cx.fillStyle=col;cx.beginPath();cx.moveTo(q0[0],q0[1]);cx.lineTo(q1[0],q1[1]);cx.lineTo(q2[0],q2[1]);cx.lineTo(q3[0],q3[1]);cx.closePath();cx.fill();
  // 마스트 + 메인 로터
  cx.strokeStyle='#23251f';cx.lineWidth=2.4;cx.beginPath();cx.moveTo(ox,oy-6);cx.lineTo(ox,oy-13);cx.stroke();
  const RR=40,cy0=oy-14;
  if(spin){
    cx.fillStyle='rgba(215,222,205,.2)';cx.beginPath();cx.ellipse(ox,cy0,RR,RR*.46,0,0,6.3);cx.fill();
    cx.strokeStyle='rgba(30,32,25,.16)';cx.lineWidth=2;cx.beginPath();cx.ellipse(ox,cy0,RR*.97,RR*.45,0,0,6.3);cx.stroke();
    cx.strokeStyle='rgba(30,32,25,.5)';cx.lineWidth=2.2;
    for(const A of [.5,.5+Math.PI]){cx.beginPath();cx.moveTo(ox+Math.cos(A)*RR,cy0+Math.sin(A)*RR*.46);cx.lineTo(ox-Math.cos(A)*RR,cy0-Math.sin(A)*RR*.46);cx.stroke();}
    cx.strokeStyle='rgba(30,32,25,.15)';cx.lineWidth=1.6;
    for(const A of [1.7,2.9,4.1,5.3]){cx.beginPath();cx.moveTo(ox+Math.cos(A)*RR*.8,cy0+Math.sin(A)*RR*.8*.46);cx.lineTo(ox-Math.cos(A)*RR*.8,cy0-Math.sin(A)*RR*.8*.46);cx.stroke();}
  }else{
    // 정지: 날개를 동체 축(꼬리 쪽/앞쪽)으로 늘어뜨려 접어 둔다
    cx.strokeStyle='rgba(30,32,25,.9)';cx.lineWidth=2.4;
    cx.beginPath();cx.moveTo(ox,cy0);cx.lineTo(ox-ux*34,cy0-uy*34*.9+3);cx.stroke();
    cx.beginPath();cx.moveTo(ox,cy0);cx.lineTo(ox+ux*30,cy0+uy*30*.9+3);cx.stroke();
  }
  cx.fillStyle='#1f211b';cx.beginPath();cx.arc(ox,cy0,2.6,0,6.3);cx.fill();
  cx.lineCap='butt';
}
