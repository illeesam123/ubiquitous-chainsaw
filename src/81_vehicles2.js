// ================= 오토바이 · 기관차량 =================
// 오토바이(bike): 2인승 = 운전자(제작 병사, 출입 불가) + 탑승 1명(출입 가능). 속도는 병사의 3배(6.3). 탑승자는 사거리 +2 로 발포.
// 기관차량(gunv): 5인승 = 승무원 2명(운전수 + 터렛 사수, 출입 불가) + 탑승 3명(출입 가능). 탑승자는 사거리 +1 로 발포,
//                 터렛 사수는 사거리 안의 적에게 기관포를 난사한다(움직이는 중에도 가능, 명중률 -12%).
// 탑승·하차·폭발·길찾기는 기존 차량 시스템(61_transport.js · 80_mines.js)을 그대로 쓴다.
OB.bike={n:'오토바이',size:1,build:16,cost:{money:45,metal:10,bullets:5},desc:'병사의 3배 속도. 운전자 외에 1명이 탑승해 사거리 +2 로 사격할 수 있습니다.'};
OB.gunv={n:'기관차량',size:1,build:40,cost:{money:150,metal:42,bullets:70},desc:'승무원 2명(운전수·터렛 사수)이 필요합니다. 터렛이 사거리 내 적에게 기관포를 난사하며, 3명이 탑승해 사거리 +1 로 사격할 수 있습니다.'};
VEH.bike={hp:130,speed:6.3,range:0,interval:0,damage:0,ammo:0,blast:0,trenchDmg:0,armor:0,crew:1,seats:1,paxRange:2};
VEH.gunv={hp:520,speed:3.2,range:0,interval:0,damage:0,ammo:0,blast:0,trenchDmg:0,armor:.25,crew:2,seats:3,paxRange:1,mg:{dmg:8,int:.2,range:9,cost:.5,acc:.76}};
OBDESC.bike=OB.bike.desc;OBDESC.gunv=OB.gunv.desc;
BUILDS.splice(BUILDS.indexOf('truck')+1,0,'bike','gunv');
VBOOM.bike={r:1.5,u:55,v:55,tr:30,ob:25,cr:1};
VBOOM.gunv={r:2.3,u:90,v:105,tr:70,ob:55,cr:1};
{const _fi2=facilityIcon;facilityIcon=function(type){
  const sh={
    bike:'<circle cx="34" cy="34" r="8" fill="#1f1e1a" stroke="#777" stroke-width="2"/><circle cx="64" cy="34" r="8" fill="#1f1e1a" stroke="#777" stroke-width="2"/><path d="M34 34l12-12h10l8 12M46 22l-4-6h-6" stroke="#8a8f4f" stroke-width="3" fill="none"/><rect x="44" y="20" width="12" height="6" fill="#6e7240"/>',
    gunv:'<rect x="16" y="22" width="64" height="16" rx="3" fill="#7b8047" stroke="#555a30" stroke-width="2"/><rect x="52" y="14" width="18" height="10" fill="#6e7240"/><circle cx="30" cy="40" r="6" fill="#1f1e1a"/><circle cx="66" cy="40" r="6" fill="#1f1e1a"/><rect x="26" y="14" width="3" height="10" fill="#444"/><rect x="18" y="11" width="22" height="3" fill="#2d2c27"/>'
  }[type];
  if(!sh)return _fi2(type);
  return `<svg viewBox="0 0 96 50" role="img" aria-label="${OB[type].n}"><rect x="1" y="1" width="94" height="48" rx="3" fill="#171a12"/>${sh}</svg>`;};}

// ---- 탑승자 사격 · 터렛 기관포 ----
{const _stepV2=stepVehicles;stepVehicles=function(dt){
  _stepV2(dt);
  const ws=Math.max(.3,weatherSight());
  for(const v of G.vehicles){
    if(v.dead)continue;const d=VEH[v.type];
    if(v.type!=='bike'&&v.type!=='gunv')continue;
    const mv=v.state==='move';
    for(const u of vehPax(v)){
      u.cd=(u.cd||0)-dt;if(u.cd>0)continue;
      const base=gunOf(u),g=Object.assign({},base,{range:base.range+d.paxRange/ws,acc:Math.max(.05,base.acc-(mv?.12:0))});
      if(fire(u,g,{x:v.x,y:v.y}))u.cd=base.int*(.9+Math.random()*.2);else u.cd=.35;
    }
    if(v.type==='gunv'){
      v.mgT=Math.max(0,(v.mgT||0)-dt);v.mgCd=(v.mgCd||0)-dt;
      const gu=G.uid.get((v.crew||[])[1]);
      if(gu&&!gu.dead&&v.mgCd<=0){
        gu.x=v.x;gu.y=v.y;
        const m=d.mg,g=Object.assign({},m,{acc:Math.max(.05,m.acc-(mv?.12:0))});
        if(fire(gu,g,{x:v.x,y:v.y})){v.mgAim=gu.face;v.mgT=1.1;v.muz=.08;v.mgCd=m.int*(.9+Math.random()*.2);}
        else v.mgCd=.3;
      }
    }
  }
};}

// ---- 그리기 ----
function drawBike(v,flash,team){
  const F=mkFrame(v.x,v.y,v.face),C=c=>flash?'#f6f2de':c,tc=TEAM_COL[team];
  const black='#25241f',olive='#7b8047',oliveL='#9a9f5d',uni='#5f6b3a';
  poly([F.P(-.42,-.13,0),F.P(.42,-.13,0),F.P(.42,.13,0),F.P(-.42,.13,0)],'rgba(0,0,0,.30)');
  for(const wx of [.34,-.34]){
    cyl(F,[wx,-.045,6.4],[wx,.045,6.4],6.4,'y',C(black),C('#2e2d29'),14);
    if(visN(F.N(0,1,0)))disc(F,'y',wx,.05,6.4,3.2,C('#8d918a'),10);else disc(F,'y',wx,-.05,6.4,3.2,C('#8d918a'),10);
  }
  extrude(F,[[-.24,-.07],[.22,-.07],[.22,.07],[-.24,.07]],6,11,C('#3a3c35'),{top:C('#4a4c44')});
  extrude(F,[[-.02,-.075],[.2,-.075],[.2,.075],[-.02,.075]],11,17,C(olive),{top:C(oliveL)});
  extrude(F,[[-.32,-.065],[-.02,-.065],[-.02,.065],[-.32,.065]],11,14,C(black),{top:C('#33322d')});
  wline(F.P(.34,0,6),F.P(.2,0,18),'#2b2a26',2.2);
  wline(F.P(.2,-.15,19),F.P(.2,.15,19),'#2b2a26',1.8);
  disc(F,'x',.36,0,13,2.6,C('#fff3b5'),8);
  // 운전자
  extrude(F,[[-.2,-.075],[-.04,-.075],[-.04,.075],[-.2,.075]],14,26,C(uni),{top:C('#76834a')});
  wline(F.P(-.06,-.075,24),F.P(.2,-.14,19.5),C(uni),2);wline(F.P(-.06,.075,24),F.P(.2,.14,19.5),C(uni),2);
  disc(F,'z',-.115,0,29,4.6,C('#6e7240'),12);disc(F,'z',-.115,0,29.4,3.2,C(tc),10);
  // 탑승자(있으면 뒤에 한 명 더)
  if(vehPax(v).length){
    extrude(F,[[-.38,-.07],[-.26,-.07],[-.26,.07],[-.38,.07]],14,25,C('#6a7440'),{top:C('#808c52')});
    disc(F,'z',-.32,0,28,4.4,C('#6e7240'),12);
  }
  // 안테나 + 팀 깃발
  wline(F.P(-.38,.08,14),F.P(-.38,.08,38),'#1d1d19',1.1);
  poly([F.P(-.38,.08,38),F.P(-.47,.08,35),F.P(-.38,.08,32)],tc);
  if(v.hp<v.max*.4&&!v._bake)drawDamageSmoke(v.x,v.y,v.hp<v.max*.2,v.anim);
}
function drawGunV(v,flash,team){
  const F=mkFrame(v.x,v.y,v.face),C=c=>flash?'#f6f2de':c,tc=TEAM_COL[team];
  const olive='#7b8047',oliveL='#9a9f5d',oliveD='#5d6236',black='#25241f',glass='#f2c431';
  const near=(()=>{const n=F.N(0,1,0);return n[0]+n[1]>0?1:-1;})(),far=-near,frontVis=visN(F.N(1,0,0));
  poly([F.P(-.8,-.4,0),F.P(.82,-.4,0),F.P(.82,.4,0),F.P(-.8,.4,0)],'rgba(0,0,0,.30)');
  const wheel=(wx,side)=>{
    cyl(F,[wx,side*.25,8],[wx,side*.37,8],8.4,'y',C(black),C('#2e2d29'),14);
    if(visN(F.N(0,side,0))){disc(F,'y',wx,side*.375,8,4.8,C('#4a4a44'),12);disc(F,'y',wx,side*.379,8,2.8,C('#9a9d92'),10);}
  };
  for(const wx of [.5,-.46])wheel(wx,far);
  extrude(F,[[-.74,-.26],[.74,-.26],[.74,.26],[-.74,.26]],4,10,C(black));
  extrude(F,[[-.72,-.31],[.5,-.31],[.8,-.23],[.8,.23],[.5,.31],[-.72,.31]],10,20,C(olive),{top:C(oliveL)});
  // 뒤 짐칸(열린 구조, 안쪽 어둡게)
  extrude(F,[[-.7,-.29],[-.06,-.29],[-.06,.29],[-.7,.29]],20,24,C(oliveD),{top:C('#3f4326')});
  extrude(F,[[-.64,-.23],[-.12,-.23],[-.12,.23],[-.64,.23]],20,22,C('#2e3119'));
  // 운전석
  extrude(F,[[-.02,-.3],[.42,-.3],[.42,.3],[-.02,.3]],20,31,C(olive),{top:C('#8d9253')});
  extrude(F,[[-.05,-.32],[.45,-.32],[.45,.32],[-.05,.32]],31,33,C(oliveD),{top:C('#6e7240')});
  if(frontVis){
    facePoly(F,[[.425,-.25,22],[.425,.25,22],[.425,.25,30],[.425,-.25,30]],C(glass));
    wline(F.P(.426,0,22),F.P(.426,0,30),'rgba(60,50,10,.7)',1.4);
    facePoly(F,[[.805,-.17,11],[.805,.17,11],[.805,.17,18],[.805,-.17,18]],C('#1c1b17'));
    for(const gy of [-.1,0,.1])wline(F.P(.808,gy,11.5),F.P(.808,gy,17.5),'#8d918a',1.3);
    for(const hy of [-.2,.2])disc(F,'x',.805,hy,15,2.6,C('#fff3b5'),10);
  }
  for(const s of [-1,1])if(visN(F.N(0,s,0))){
    facePoly(F,[[.05,s*.303,22],[.38,s*.303,22],[.38,s*.303,30],[.05,s*.303,30]],C(glass));
    wline(F.P(.2,s*.305,22),F.P(.2,s*.305,30),'rgba(60,50,10,.6)',1.2);
  }
  if(visN(F.N(0,near,0)))facePoly(F,[[-.55,near*.313,12],[-.2,near*.313,12],[-.2,near*.313,17],[-.55,near*.313,17]],tc);
  for(const wx of [.5,-.46])wheel(wx,near);
  // 터렛(사수가 조준)
  const tgt=(v.mgT>0&&v.mgAim!==undefined)?v.mgAim:v.face;
  if(v.turA===undefined)v.turA=v.face;
  if(!v._bake){const dA=Math.atan2(Math.sin(tgt-v.turA),Math.cos(tgt-v.turA));v.turA+=dA*.2;}
  const T2=mkFrame(v.x+F.c*-.36,v.y+F.s*-.36,v.turA),front=visN(T2.N(1,0,0)),rec=v.muz>0?-.03:0;
  disc(T2,'z',0,0,24,9,C('#2d2c27'),14);
  extrude(T2,[[-.04,-.04],[.04,-.04],[.04,.04],[-.04,.04]],24,33,C('#3b3a35'));
  const gun=()=>{
    cyl(T2,[.04+rec,0,35],[.56+rec,0,35],2.6,'x',C('#2d2c27'),C('#12110f'),10);
    cyl(T2,[.5+rec,0,35],[.66+rec,0,35],3.4,'x',C('#4a4a44'),C('#12110f'),10);
    if(v.muz>0){const p=T2.P(.7+rec,0,35),z=cam.z;cx.fillStyle='#ffd06a';cx.beginPath();cx.arc(p[0],p[1],7*z,0,6.3);cx.fill();cx.fillStyle='#fff7d0';cx.beginPath();cx.arc(p[0],p[1],3.4*z,0,6.3);cx.fill();}
  };
  if(!front)gun();
  extrude(T2,[[.06,-.15],[.11,-.15],[.11,.15],[.06,.15]],26,40,C('#6a6e5a'),{top:C('#8a8e78')});
  extrude(T2,[[-.1,-.07],[.05,-.07],[.05,.07],[-.1,.07]],26,34,C(oliveD));
  if(front)gun();
  // 안테나 + 팀 깃발
  wline(F.P(-.68,-.26*near,24),F.P(-.68,-.26*near,50),'#1d1d19',1.1);
  poly([F.P(-.68,-.26*near,50),F.P(-.78,-.26*near,47),F.P(-.68,-.26*near,44)],tc);
  if(v.hp<v.max*.4&&!v._bake)drawDamageSmoke(v.x,v.y,v.hp<v.max*.2,v.anim);
}
{const _sbv=sprBakeVeh;sprBakeVeh=function(type,team,q){
  if(type!=='bike'&&type!=='gunv')return _sbv(type,team,q);
  const a=q*Math.PI/8,v={type,team,x:10,y:10,face:a,turA:a,mgAim:a,mgT:0,muz:0,hp:1,max:1,anim:0,flash:0,_bake:true,pax:[]};
  return sprRecord(()=>{if(type==='bike')drawBike(v,false,team);else drawGunV(v,false,team);},10,10);
};}
// 스프라이트가 있으면 SVG, 조준·발사 중인 기관차량은 터렛이 돌아가야 하므로 절차적 그리기
{const _vsp=vehSprite;vehSprite=function(v,flash){
  if(v.type==='bike'||v.type==='gunv'){
    if(v.type==='bike'&&vehPax(v).length){drawBike(v,flash,v.team);return true;}   // 탑승자가 보이도록
    if(!(v.type==='gunv'&&(v.mgT>0||v.muz>0))&&_vsp(v,flash))return true;
    if(v.type==='bike')drawBike(v,flash,v.team);else drawGunV(v,flash,v.team);
    return true;
  }
  return _vsp(v,flash);
};}
{const _dv3=drawVehicle;drawVehicle=function(v){
  _dv3(v);
  if((v.type==='bike'||v.type==='gunv')&&(v.sel||vehPax(v).length)){const z=cam.z,[sx,sy]=toS(v.x,v.y);cx.fillStyle='#bfe3ff';cx.font=`${9*z}px sans-serif`;cx.fillText(`탑승 ${vehPax(v).length}/${VEH[v.type].seats}`,sx-18*z,sy+44*z);}
};}
