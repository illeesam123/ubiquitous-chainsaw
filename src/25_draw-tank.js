// ================= 전차 =================
function drawTank(v,flash,team){
  const F=mkFrame(v.x,v.y,v.face),C=c=>flash?'#f6f2de':c;
  const olive='#858a4b',oliveL='#a6aa63',oliveD='#686c39',black='#2b2a26',tc=TEAM_COL[team];
  const near=(()=>{const n=F.N(0,1,0);return n[0]+n[1]>0?1:-1;})(),far=-near;
  poly([F.P(-.64,-.42,0),F.P(.64,-.42,0),F.P(.64,.42,0),F.P(-.64,.42,0)],'rgba(0,0,0,.30)');
  // 포탑 방향 (차체와 독립적으로 부드럽게 회전)
  const tgt=(v.aimT>0&&v.aim!==undefined)?v.aim:v.face;
  if(v.turA===undefined)v.turA=v.face;
  const dA=Math.atan2(Math.sin(tgt-v.turA),Math.cos(tgt-v.turA));v.turA+=dA*.14;
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
