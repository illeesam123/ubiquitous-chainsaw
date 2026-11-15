// ================= 수송 트럭 =================
function drawTruck(v,flash,team){
  const F=mkFrame(v.x,v.y,v.face),C=c=>flash?'#f6f2de':c,tc=TEAM_COL[team];
  const can='#6f7441',canD='#565a31',canL='#7a804a',cab='#8a8f4f',cabD='#6e7240',black='#25241f',glass='#f2c431';
  const near=(()=>{const n=F.N(0,1,0);return n[0]+n[1]>0?1:-1;})(),far=-near,frontVis=visN(F.N(1,0,0)),rearVis=visN(F.N(-1,0,0));
  poly([F.P(-.98,-.44,0),F.P(.95,-.44,0),F.P(.95,.44,0),F.P(-.98,.44,0)],'rgba(0,0,0,.30)');
  const wheel=(wx,side)=>{
    cyl(F,[wx,side*.205,9],[wx,side*.325,9],9.2,'y',C('#1f1e1a'),C('#2e2d29'),14);
    if(visN(F.N(0,side,0))){disc(F,'y',wx,side*.33,9,5.2,C('#4a4a44'),12);disc(F,'y',wx,side*.334,9,3.1,C('#9a9d92'),10);disc(F,'y',wx,side*.338,9,1.1,C('#2a2a26'),8);}
  };
  for(const wx of [.5,-.26,-.56])wheel(wx,far);
  extrude(F,[[-.9,-.2],[.78,-.2],[.78,.2],[-.9,.2]],4,9,C(black));
  const cargo=()=>{
    extrude(F,[[-.86,-.31],[.16,-.31],[.16,.31],[-.86,.31]],9,31,C(can),{top:C(canL)});
    extrude(F,[[-.82,-.26],[.12,-.26],[.12,.26],[-.82,.26]],31,36.5,C(canL),{top:C('#838a52')});
    for(const rx of [-.68,-.4,-.12])extrude(F,[[rx-.035,-.325],[rx+.035,-.325],[rx+.035,.325],[rx-.035,.325]],9,36,C(canD));
    if(visN(F.N(0,near,0)))facePoly(F,[[-.7,near*.327,12],[-.2,near*.327,12],[-.2,near*.327,15.5],[-.7,near*.327,15.5]],tc);
    if(rearVis){for(const sy of [-1,1])facePoly(F,[[-.862,sy*.26,11],[-.862,sy*.2,11],[-.862,sy*.2,15],[-.862,sy*.26,15]],'#d63a30');}
  };
  const front=()=>{
    extrude(F,[[.2,-.28],[.5,-.28],[.5,.28],[.2,.28]],9,32,C(cab),{top:C('#9a9f5d')});
    extrude(F,[[.18,-.31],[.56,-.31],[.56,.31],[.18,.31]],32,34,C(cabD),{top:C('#7d8245')});
    extrude(F,[[.5,-.26],[.76,-.26],[.82,-.2],[.82,.2],[.76,.26],[.5,.26]],9,22,C(cab),{top:C('#9ca15f')});
    if(frontVis){
      facePoly(F,[[.505,-.23,23],[.505,.23,23],[.505,.23,31],[.505,-.23,31]],C(glass));
      wline(F.P(.506,0,23),F.P(.506,0,31),'rgba(60,50,10,.7)',1.4);
      wline(F.P(.506,-.2,24),F.P(.506,-.1,30),'rgba(255,255,255,.55)',1.2);wline(F.P(.506,.05,24),F.P(.506,.15,30),'rgba(255,255,255,.4)',1.2);
      facePoly(F,[[.823,-.16,11],[.823,.16,11],[.823,.16,20],[.823,-.16,20]],C('#1c1b17'));
      for(const gy of [-.1,-.033,.033,.1])wline(F.P(.826,gy,11.5),F.P(.826,gy,19.5),'#8d918a',1.4);
      for(const hy of [-.2,.2]){disc(F,'x',.825,hy,16,3,C('#fff3b5'),10);}
      extrude(F,[[.8,-.27],[.87,-.27],[.87,.27],[.8,.27]],5,10.5,C(black));
    }
    for(const s of [-1,1])if(visN(F.N(0,s,0))){
      facePoly(F,[[.25,s*.283,23],[.47,s*.283,23],[.47,s*.283,31],[.25,s*.283,31]],C(glass));
      wline(F.P(.36,s*.285,23),F.P(.36,s*.285,31),'rgba(60,50,10,.6)',1.2);
      extrude(F,[[.465,s*.3],[.5,s*.3],[.5,s*.34],[.465,s*.34]],25,31,C(black));
      wline(F.P(.2,s*.284,10),F.P(.2,s*.284,22),'rgba(0,0,0,.3)',1);
    }
  };
  if(frontVis){cargo();front();}else{front();cargo();}
  for(const wx of [.5,-.26,-.56])wheel(wx,near);
  // 안테나/깃발
  wline(F.P(.2,-near*.27,34),F.P(.2,-near*.27,52),'#1d1d19',1.1);
  poly([F.P(.2,-near*.27,52),F.P(.2,-near*.27+(-near*.0),49),F.P(.08,-near*.27,48)],tc);
  if(v.hp<v.max*.4)drawDamageSmoke(v.x+F.c*.5,v.y+F.s*.5,v.hp<v.max*.2,v.anim);
}
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
  if(v.type==='tank')drawTank(v,flash,v.team);else drawTruck(v,flash,v.team);
  if(v.sel){cx.strokeStyle='#7dff7d';cx.lineWidth=1.6;cx.beginPath();cx.ellipse(sx,sy+2*z,v.type==='tank'?36*z:40*z,v.type==='tank'?18*z:20*z,0,0,6.3);cx.stroke();}
  const top=v.type==='tank'?-46:-58;
  if(v.hp<v.max||v.sel)hpBar(sx,sy+top*z,38*z,Math.max(0,v.hp/v.max),v.hp>v.max*.35?'#86b45e':'#d0583f');
  if(v.type==='truck'&&v.cargo>0){cx.fillStyle='#d9ad4e';cx.font=`${9*z}px sans-serif`;cx.fillText(`탄약 ${Math.ceil(v.cargo)}`,sx-17*z,sy+(top-6)*z);}
  if(v.sel){cx.fillStyle='#fff';cx.font=`${9*z}px sans-serif`;cx.fillText(`승무원 ${v.crew?.length||0}/${d.crew}`,sx-20*z,sy+34*z);}
}
