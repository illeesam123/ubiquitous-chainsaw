// ================= 전차 =================
function drawTank(v,flash,team){
  const F=mkFrame(v.x,v.y,v.face),C=c=>flash?'#f6f2de':c;
  const olive='#858a4b',oliveL='#a6aa63',oliveD='#686c39',black='#2b2a26',tc=TEAM_COL[team];
  const near=(()=>{const n=F.N(0,1,0);return n[0]+n[1]>0?1:-1;})(),far=-near;
  poly([F.P(-.64,-.42,0),F.P(.64,-.42,0),F.P(.64,.42,0),F.P(-.64,.42,0)],'rgba(0,0,0,.30)');
  // 포탑 방향 (차체와 독립적으로 부드럽게 회전)
  const tgt=(v.aimT>0&&v.aim!==undefined)?v.aim:v.face;
  if(v.turA===undefined)v.turA=v.face;
  if(!v._tuDone){const dA=Math.atan2(Math.sin(tgt-v.turA),Math.cos(tgt-v.turA));v.turA+=dA*.14;}
  const track=(side)=>{
    const ya=side>0?.19:-.37,yb=side>0?.37:-.19;
    extrude(F,[[-.5,ya],[.5,ya],[.57,ya+.05],[.57,yb-.05],[.5,yb],[-.5,yb],[-.57,yb-.05],[-.57,ya+.05]],0,10,C(black),{top:C('#3b3a35')});
    const yo=side>0?yb:ya;
    if(visN(F.N(0,side,0))){
      const yy=yo+side*.012;
      for(const wx of [-.38,-.19,0,.19,.38]){disc(F,'y',wx,yy,5.2,5.3,C('#1d1c19'),12);disc(F,'y',wx,yy+side*.003,5.2,4.1,C('#34332e'),12);disc(F,'y',wx,yy+side*.006,5.2,2.3,C(oliveL),10);}
      disc(F,'y',-.53,yy,6.2,3.6,C('#26251f'),10);disc(F,'y',.54,yy,6.2,3.6,C('#26251f'),10);
    }
    extrude(F,[[-.53,ya-.01],[.53,ya-.01],[.53,yb+.01],[-.53,yb+.01]],10,12.8,C(olive),{top:C(oliveL)});
    cyl(F,[-.3,side*.28,19.2],[.22,side*.28,19.2],6.2,'x',C('#302f2a'),C(oliveD));
    for(const bx of [-.2,.02]){cyl(F,[bx,side*.28,19.2],[bx+.035,side*.28,19.2],6.5,'x',C(oliveD),C(oliveD));}
  };
  track(far);
  extrude(F,[[-.5,-.2],[.45,-.2],[.54,-.13],[.54,.13],[.45,.2],[-.5,.2]],5,14.6,C(olive),{top:C(oliveL)});
  extrude(F,[[-.5,-.19],[-.12,-.19],[-.12,.19],[-.5,.19]],14.6,18,C(oliveL),{top:C('#b1b571')});
  for(const sx of [-.44,-.34,-.24])extrude(F,[[sx,-.15],[sx+.045,-.15],[sx+.045,.15],[sx,.15]],18,19,C(oliveD));
  // 안테나 + 팀 깃발
  const ax=-.42,ay=near*.14;
  wline(F.P(ax,ay,18),F.P(ax,ay,46),'#1d1d19',1.2);
  poly([F.P(ax,ay,46),F.P(ax-.12,ay,43),F.P(ax,ay,40)],tc);
  // 포탑
  const T2=mkFrame(v.x+F.c*.06,v.y+F.s*.06,v.turA);
  const gunFront=visN(T2.N(1,0,0));
  const rec=v.muz>0?-.05*(v.muz/.14):0;
  const gun=()=>{
    extrude(T2,[[.17,-.075],[.3,-.075],[.3,.075],[.17,.075]],17.5,25,C(oliveD));
    cyl(T2,[.28+rec,0,21.3],[.74+rec,0,21.3],3.4,'x',C(olive),C(oliveD));
    cyl(T2,[.72+rec,0,21.3],[.94+rec,0,21.3],4.4,'x',C('#2d2c27'),C('#12110f'));
    if(v.muz>0){const p=T2.P(.98+rec,0,21.3),z=cam.z;cx.fillStyle='#ffd06a';cx.beginPath();cx.arc(p[0],p[1],9*z,0,6.3);cx.fill();cx.fillStyle='#fff7d0';cx.beginPath();cx.arc(p[0],p[1],4.5*z,0,6.3);cx.fill();}
  };
  if(!gunFront)gun();
  extrude(T2,[[.23,0],[.12,.2],[-.13,.2],[-.23,0],[-.13,-.2],[.12,-.2]],14.6,23.5,C(olive),{top:C(olive)});
  extrude(T2,[[.18,0],[.09,.155],[-.11,.155],[-.18,0],[-.11,-.155],[.09,-.155]],23.5,25.6,C(oliveL),{top:C('#b0b470')});
  for(const hy of [-.075,.075]){disc(T2,'z',-.045,hy,25.7,5.4,C(oliveD),12);disc(T2,'z',-.045,hy,25.8,4.3,hy>0?tc:C('#9a9e5a'),12);disc(T2,'z',-.045,hy,25.9,2.2,C('#d4d6a0'),10);}
  for(const sx of [.06,.1,.14])wline(T2.P(sx,-.11,25.8),T2.P(sx,.11,25.8),'rgba(35,38,20,.6)',1.1);
  if(gunFront)gun();
  track(near);
  // 연기/화염 (손상 시)
  if(v.hp<v.max*.4)drawDamageSmoke(v.x,v.y,v.hp<v.max*.2,v.anim);
}
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
  // 동체: 명암이 다른 하부와 분리된 조종석·측면문으로 방향감과 기체 구조를 살린다.
  cx.fillStyle='rgba(0,0,0,.22)';cx.beginPath();cx.ellipse(ox,oy+3,18,5.5,a,0,6.3);cx.fill();
  cx.fillStyle='#626944';cx.beginPath();cx.ellipse(ox-1,oy-.5,20,9,a,0,6.3);cx.fill();
  cx.fillStyle='#858d59';cx.beginPath();cx.ellipse(ox-2,oy-3.5,17,7.8,a,Math.PI,6.3);cx.fill();
  p=B(-6,1);cx.fillStyle='#485238';cx.beginPath();cx.ellipse(p[0],p[1],8,7,a,0,6.3);cx.fill();
  p=B(11,-1);cx.fillStyle='#a9d4e6';cx.beginPath();cx.ellipse(p[0],p[1],7,5.6,a,0,6.3);cx.fill();
  cx.strokeStyle='rgba(35,45,48,.65)';cx.lineWidth=.8;{const q0=B(10,-6),q1=B(10,4);cx.beginPath();cx.moveTo(...q0);cx.lineTo(...q1);cx.stroke();}
  p=B(12,-3);cx.fillStyle='rgba(255,255,255,.52)';cx.beginPath();cx.ellipse(p[0],p[1],2.7,1.4,a+.4,0,6.3);cx.fill();
  {const q0=B(-7,-3),q1=B(0,-3),q2=B(0,4),q3=B(-7,4);cx.strokeStyle='rgba(33,38,27,.65)';cx.lineWidth=.8;cx.beginPath();cx.moveTo(...q0);cx.lineTo(...q1);cx.lineTo(...q2);cx.lineTo(...q3);cx.closePath();cx.stroke();}
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
