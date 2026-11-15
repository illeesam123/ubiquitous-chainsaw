// ================= 이펙트: 폭발 / 연기 =================
function drawFxBoom(f){
  const [a,b]=toS(f.x,f.y),z=cam.z,p=f.t/f.d,r=(12+34*Math.sqrt(p))*z;
  cx.globalAlpha=Math.max(0,1-p)*.55;cx.fillStyle='#3d372e';cx.beginPath();cx.arc(a,b-(10+22*p)*z,r*.9,0,6.3);cx.fill();
  cx.globalAlpha=Math.max(0,1-p*1.4);cx.fillStyle='#e8862f';cx.beginPath();cx.arc(a,b-8*z,r*.75,0,6.3);cx.fill();
  cx.fillStyle='#ffd877';cx.beginPath();cx.arc(a,b-9*z,r*.42,0,6.3);cx.fill();
  cx.globalAlpha=Math.max(0,1-p*2)*.6;cx.strokeStyle='#ffe9b0';cx.lineWidth=2*z;cx.beginPath();cx.ellipse(a,b,r*1.25,r*.62,0,0,6.3);cx.stroke();
  cx.globalAlpha=1;
}
function drawFxSmoke(f){
  const [a,b]=toS(f.x,f.y),z=cam.z,p=f.t/f.d;
  cx.globalAlpha=Math.max(0,.55*(1-p));cx.fillStyle='#8a877d';cx.beginPath();cx.arc(a+Math.sin(f.t*3+f.x)*3*z,b-(12+p*26)*z,(4+p*10)*z,0,6.3);cx.fill();cx.globalAlpha=1;
}
