// ================= 박격포 진지 =================
function drawMortarOb(o,occ,L){
  const z=cam.z,cxw=o.x+.5,cyw=o.y+.5,ang=o.aim||.78;
  shadowAt(cxw+.08,cyw+.06,28,12);
  const b=pt(cxw,cyw,0);
  cx.fillStyle='#35291a';cx.beginPath();cx.ellipse(b[0],b[1]+1*z,27*z,13.5*z,0,0,6.3);cx.fill();
  cx.fillStyle='#1d160d';cx.beginPath();cx.ellipse(b[0],b[1]+2*z,20*z,9.5*z,0,0,6.3);cx.fill();
  // 뒤쪽 모래주머니 반원
  sandbagRow(o,[[cxw-.46,cyw-.36],[cxw+.46,cyw-.36]],0,4,false);
  sandbagRow(o,[[cxw-.44,cyw-.26],[cxw-.44,cyw+.36]],0,3,false);
  sandbagRow(o,[[cxw-.4,cyw-.36],[cxw+.4,cyw-.36]],5,3,false);
  // 포탄 상자 + 황동 탄
  wbox(cxw+.2,cyw-.28,cxw+.42,cyw-.06,0,7,L('#8d7a4c'),L('#756439'),L('#5f5230'),'#3a2f1b');
  for(let k=0;k<3;k++){const p=pt(cxw+.25+k*.065,cyw-.17,7.5);cx.fillStyle=L('#c8a24a');cx.fillRect(p[0]-1.6*z,p[1]-7*z,3.2*z,7*z);cx.fillStyle='#8b3b2a';cx.fillRect(p[0]-1.6*z,p[1]-7*z,3.2*z,2.4*z);}
  // 포: 받침판 + 이각 + 포신
  const bp=pt(cxw,cyw+.03,2),ix=(Math.cos(ang)-Math.sin(ang))*.9,iy=(Math.cos(ang)+Math.sin(ang))*.5;
  cx.fillStyle=L('#3d3f37');cx.beginPath();cx.ellipse(bp[0],bp[1],13*z,6.5*z,0,0,6.3);cx.fill();
  cx.strokeStyle=L('#2a2c25');cx.lineWidth=1.4*z;cx.stroke();
  const bot=[bp[0]-ix*3*z,bp[1]-2*z],top=[bp[0]+ix*10*z,bp[1]+iy*10*z-21*z],mid=[bot[0]+(top[0]-bot[0])*.55,bot[1]+(top[1]-bot[1])*.55];
  cx.strokeStyle=L('#5c5f52');cx.lineWidth=1.8*z;
  cx.beginPath();cx.moveTo(mid[0],mid[1]);cx.lineTo(bp[0]-11*z,bp[1]+3*z);cx.moveTo(mid[0],mid[1]);cx.lineTo(bp[0]+11*z,bp[1]+4*z);cx.stroke();
  cx.lineCap='round';cx.strokeStyle=L('#23251f');cx.lineWidth=7.4*z;cx.beginPath();cx.moveTo(bot[0],bot[1]);cx.lineTo(top[0],top[1]);cx.stroke();
  cx.strokeStyle=L('#5d6054');cx.lineWidth=3*z;cx.beginPath();cx.moveTo(bot[0]-1.5*z,bot[1]);cx.lineTo(top[0]-1.5*z,top[1]);cx.stroke();
  cx.strokeStyle=L('#9a9d8a');cx.lineWidth=1.3*z;cx.beginPath();cx.moveTo(mid[0]-2.2*z,mid[1]);cx.lineTo(mid[0]+2.2*z,mid[1]);cx.stroke();
  cx.lineCap='butt';
  cx.fillStyle='#0e0f0b';cx.beginPath();cx.ellipse(top[0],top[1],3.4*z,2*z,0,0,6.3);cx.fill();
  if(o.muz>0){const q=o.muz/.22;cx.fillStyle=`rgba(255,208,100,${q})`;cx.beginPath();cx.arc(top[0],top[1]-3*z,(9+8*(1-q))*z,0,6.3);cx.fill();cx.fillStyle=`rgba(255,248,210,${q})`;cx.beginPath();cx.arc(top[0],top[1]-3*z,4*z,0,6.3);cx.fill();}
  // 앞쪽 낮은 자루 두 개 + 팀 표식
  sandbagRow(o,[[cxw-.46,cyw+.38],[cxw-.2,cyw+.38]],0,1,false);sandbagRow(o,[[cxw+.2,cyw+.38],[cxw+.46,cyw+.38]],0,1,false);
  const pole=pt(cxw-.46,cyw-.36,10);wline(pole,pt(cxw-.46,cyw-.36,32),'#d8d8cc',1.4);
  poly([pt(cxw-.46,cyw-.36,32),pt(cxw-.46,cyw-.36,28),pt(cxw-.34,cyw-.36,30)],TEAM_COL[o.team<0?0:o.team]);
  if(occ[0])peek(pt(cxw-.3,cyw+.2,9),occ[0],.85,true);
  if(occ[1])peek(pt(cxw+.3,cyw+.22,9),occ[1],.85,true);
}
