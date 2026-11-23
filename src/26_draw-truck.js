function drawDamageSmoke(wx,wy,fire,t){
  const z=cam.z,[sx,sy]=toS(wx,wy);
  for(let k=0;k<5;k++){
    const p=((t*.7+k*.2)%1),r=(4+p*11)*z;
    cx.globalAlpha=(1-p)*.6;cx.fillStyle=fire?'#3a342c':'#55524b';cx.beginPath();cx.arc(sx+Math.sin(t*2+k*2)*4*z,sy-(18+p*34)*z,r,0,6.3);cx.fill();
  }
  if(fire){for(let k=0;k<3;k++){const p=((t*2.6+k*.33)%1);cx.globalAlpha=(1-p)*.9;cx.fillStyle=k%2?'#ff9a3a':'#ffd05a';cx.beginPath();cx.arc(sx+Math.sin(t*9+k*3)*3*z,sy-(16+p*14)*z,(5-p*3)*z,0,6.3);cx.fill();}}
  cx.globalAlpha=1;
}
function drawVehicle(v){
  const z=cam.z,[sx,sy]=toS(v.x,v.y),d=VEH[v.type],flash=v.flash>0;
  if(!vehSprite(v,flash))drawMissingVehicle(v,sx,sy,z);
  if(v.sel){cx.strokeStyle='#7dff7d';cx.lineWidth=1.6;cx.beginPath();cx.ellipse(sx,sy+2*z,v.type==='tank'?36*z:40*z,v.type==='tank'?18*z:20*z,0,0,6.3);cx.stroke();}
  const top=v.type==='tank'?-46:-58;
  if(v.hp<v.max||v.sel)hpBar(sx,sy+top*z,38*z,Math.max(0,v.hp/v.max),v.hp>v.max*.35?'#86b45e':'#d0583f');
  if(v.type==='truck'&&v.cargo>0){cx.fillStyle='#d9ad4e';cx.font=`${9*z}px sans-serif`;cx.fillText(`탄약 ${Math.ceil(v.cargo)}`,sx-17*z,sy+(top-6)*z);}
  if(v.sel){cx.fillStyle='#fff';cx.font=`${9*z}px sans-serif`;cx.fillText(`승무원 ${v.crew?.length||0}/${d.crew}`,sx-20*z,sy+34*z);}
}

function drawMissingVehicle(v,sx,sy,z){
  // Missing SVGs must be obvious, never silently render an invisible vehicle.
  const c=TEAM_COL[v.team]||'#ff5a44';
  cx.save();cx.translate(sx,sy);cx.globalAlpha=.9;cx.fillStyle='rgba(0,0,0,.65)';cx.strokeStyle='#ff5a44';cx.lineWidth=2*z;
  cx.beginPath();cx.roundRect(-13*z,-8*z,26*z,16*z,3*z);cx.fill();cx.stroke();
  cx.strokeStyle=c;cx.lineWidth=2*z;cx.beginPath();cx.moveTo(-6*z,-3*z);cx.lineTo(6*z,3*z);cx.moveTo(6*z,-3*z);cx.lineTo(-6*z,3*z);cx.stroke();cx.restore();
}
