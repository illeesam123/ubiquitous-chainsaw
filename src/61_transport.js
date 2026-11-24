// ================= 수송: 헬리콥터 + 수송트럭 (병사 탑승) =================
// 정차한 수송 차량을 병사 선택 상태에서 클릭하면 탑승한다. 목적지에 도착하거나 [주둔 해제] 로 하차한다.
// 수송트럭 8인승(보정 없음), 헬리콥터 4인승: 사거리 보정 + 탑승 병사 대응 사격, 이륙·착륙 지연.
function vehSeats(v){return (VEH[v.type]&&VEH[v.type].seats)||0;}
function vehPax(v){const a=[];for(const id of (v.pax||[])){const u=G.uid.get(id);if(u&&!u.dead)a.push(u);}v.pax=a.map(u=>u.id);return a;}
function seatsPending(v){let n=0;for(const u of G.units)if(!u.dead&&u.boardV===v.id)n++;return n;}
function canBoard(v,team){
  return !!v&&!v.dead&&v.team===(team||0)&&vehSeats(v)>0&&v.state==='idle'&&!(v.alt>.02)&&!(v.dest)&&vehPax(v).length+seatsPending(v)<vehSeats(v);
}
function tryBoard(units,v){
  const tm=units.length?units[0].team:0;
  if(!v||vehSeats(v)<=0||v.team!==tm)return false;
  if(!canBoard(v,tm)){
    if(tm!==0)return false;
    if(v.state!=='idle'||v.alt>.02)toast(v.type==='heli'?'착륙한 헬리콥터에만 탑승할 수 있습니다':'정차한 차량에만 탑승할 수 있습니다');
    else toast('빈 자리가 없습니다');
    return false;
  }
  const free=vehSeats(v)-vehPax(v).length-seatsPending(v);
  const L=units.filter(u=>!u.dead&&u.state!=='crew'&&!u.lay).sort((a,b)=>Math.hypot(a.x-v.x,a.y-v.y)-Math.hypot(b.x-v.x,b.y-v.y)).slice(0,free);
  if(!L.length)return false;
  let n=0;
  for(const u of L){
    releaseUnit(u);u.queue=[];u.after=null;u.sel=false;u.item=null;
    const p=findPath(Math.floor(u.x),Math.floor(u.y),Math.floor(v.x),Math.floor(v.y),true);
    if(!p){continue;}
    u.boardV=v.id;u.path=p;u.state='move';n++;
    if(!p.length)boardArrive(u);
  }
  if(tm===0)toast(n?`${n}명이 ${OB[v.type].n}에 탑승합니다 (${vehPax(v).length+seatsPending(v)}/${vehSeats(v)})`:'탑승할 수 없는 위치입니다');
  return n>0;
}
function boardArrive(u){
  const v=G.vehicles.find(q=>q.id===u.boardV);u.boardV=undefined;u.path=[];u.state='idle';
  if(!v||v.dead||v.state!=='idle'||v.alt>.02||Math.hypot(u.x-v.x,u.y-v.y)>2.6||vehPax(v).length>=vehSeats(v))return;
  v.pax.push(u.id);u.state='crew';u.vehicleId=v.id;u.paxOf=v.id;u.sel=false;u.x=v.x;u.y=v.y;u.cd=.5;
  sfx('toast');
}
function unloadVehicle(v){
  const L=vehPax(v);if(!L.length)return 0;
  const ring=[];for(let r=1;r<=4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r)ring.push([dx,dy]);
  const bx=Math.floor(v.x),by=Math.floor(v.y);let k=0;
  for(const u of L){
    let p=null;
    for(;k<ring.length&&!p;k++){const x=bx+ring[k][0],y=by+ring[k][1];if(inb(x,y)&&passable(x,y)&&G.trench[y*G.w+x]!==255&&G.tt[y*G.w+x]!==2)p=[x,y];}
    if(!p)p=[bx,by];
    u.x=p[0]+.5;u.y=p[1]+.5;u.state='idle';u.vehicleId=undefined;u.paxOf=undefined;u.path=[];u.wait=.3;u.cd=.5;
  }
  v.pax=[];return L.length;
}
// 정차한 상태에서 내린다 (비행 중에는 불가)
const _relGar=releaseGarrison;
releaseGarrison=function(){
  const vs=selVehicles().filter(v=>vehPax(v).length);
  if(vs.length){
    let n=0,blocked=0;
    for(const v of vs){if(v.alt>.02||v.state==='move'||v.dest){blocked++;continue;}n+=unloadVehicle(v);}
    if(n)toast(`${n}명 하차`);else if(blocked)toast('이동·비행 중에는 내릴 수 없습니다');
    return;
  }
  return _relGar();
};
// ---- 병사 도착 → 탑승 ----
const _arriveT=arrive;
arrive=function(u){if(u.boardV!==undefined){boardArrive(u);return;}return _arriveT(u);};
// ---- 차량 단계 ----
const _addVehT=addVehicle;
addVehicle=function(type,x,y,team){const v=_addVehT(type,x,y,team);if(v&&VEH[type].air){v.alt=0;v.spin=0;v.dest=null;}return v;};
const _dmgVehT=damageVehicle;
damageVehicle=function(v,dmg,shooter){
  const was=v.dead;_dmgVehT(v,dmg,shooter);
  if(!was&&v.dead){for(const u of vehPax(v)){G.teams[u.team].lost++;killUnit(u);}v.pax=[];}
};
function heliSpot(v,x,y){
  const ring=[[0,0]];for(let r=1;r<=6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r)ring.push([dx,dy]);
  const tx=Math.floor(x),ty=Math.floor(y);
  for(const [dx,dy] of ring){const px=tx+dx+.5,py=ty+dy+.5;if(inb(px|0,py|0)&&vehicleCellsFree(px,py,v.team,v))return [px,py];}
  return null;
}
const _orderVehT=orderVehicles;
orderVehicles=function(list,tx,ty){
  const heli=list.filter(v=>v.type==='heli'),rest=list.filter(v=>v.type!=='heli');
  if(rest.length)_orderVehT(rest,tx,ty);
  let k=0;
  for(const v of heli){
    const s=heliSpot(v,tx+(k%3)-1,ty+((k/3)|0)-1);k++;if(!s)continue;
    v.dest=s;v.path=[];
    if(v.alt<=.02&&v.state==='idle'){v.state='takeoff';v.t=0;sfx('heli',v.x,v.y);}
    else if(v.state==='landing'||v.state==='idle'){v.state='fly';}
  }
  if(heli.length&&heli[0].team===0&&typeof addMark==='function')addMark(tx,ty,heli,0);
};
function stepHeliUnits(dt){
  const ws=Math.max(.3,weatherSight());
  for(const v of G.vehicles){
    if(v.dead||v.type!=='heli')continue;
    const d=VEH.heli;v.spin=v.spin||0;
    // 정지 명령(x·우클릭)으로 공중에서 멈춘 경우: 가까운 빈 곳에 착륙
    if(v.alt>.02&&v.state==='idle'){const s=heliSpot(v,v.x,v.y);if(s){v.dest=s;v.state='fly';}else v.state='landing',v.t=0;}
    if(v.state==='takeoff'){
      v.t+=dt;v.alt=Math.min(1,v.t/d.takeoff);v.spin=Math.min(1,v.spin+dt/1.4);
      if(v.t>=d.takeoff){v.state='fly';}
    }else if(v.state==='fly'){
      v.spin=1;v.alt=1;
      if(!v.dest){v.state='landing';v.t=0;}
      else{
        const dx=v.dest[0]-v.x,dy=v.dest[1]-v.y,dist=Math.hypot(dx,dy),step=d.speed*dt;
        if(dist>.05){v.targetFace=Math.atan2(dy,dx);const da=Math.atan2(Math.sin(v.targetFace-v.face),Math.cos(v.targetFace-v.face));v.face+=da*Math.min(1,dt*4);}
        if(dist<=step){v.x=v.dest[0];v.y=v.dest[1];v.state='landing';v.t=0;v.dest=null;}
        else{v.x+=dx/dist*step;v.y+=dy/dist*step;}
      }
    }else if(v.state==='landing'){
      v.t+=dt;v.alt=Math.max(0,1-v.t/d.landing);
      if(!vehicleCellsFree(v.x,v.y,v.team,v)&&v.t<.2){const s=heliSpot(v,v.x,v.y);if(s){v.dest=s;v.state='fly';continue;}}
      if(v.t>=d.landing){v.alt=0;v.state='idle';v.t=0;v._arrived=true;}
    }else if(v.state==='idle'){
      v.spin=Math.max(0,v.spin-dt/2.2);
      if(v.alt!==0)v.alt=0;
    }
    // 탑승 병사 대응 사격 (사거리 보정)
    const P=vehPax(v);
    for(const u of P){
      u.x=v.x;u.y=v.y;u.cd=(u.cd||0)-dt;if(u.cd>0)continue;
      const base=gunOf(u),g=Object.assign({},base,{range:base.range+d.rangeBonus/ws,acc:Math.min(.97,base.acc+.03)});
      if(fire(u,g,{x:v.x,y:v.y}))u.cd=base.int*(.9+Math.random()*.2);else u.cd=.35;
    }
  }
}
const _stepVehT=stepVehicles;
stepVehicles=function(dt){
  for(const v of G.vehicles)if(!v.dead&&v.type!=='heli')v._mv0=v.state==='move';
  _stepVehT(dt);
  stepHeliUnits(dt);
  for(const v of G.vehicles){
    if(v.dead)continue;
    const P=vehPax(v);
    for(const u of P){u.x=v.x;u.y=v.y;}
    if(!P.length)continue;
    // 목적지에 도착하면 하차
    if(v.type==='heli'){if(v._arrived){v._arrived=false;unloadVehicle(v);}}
    else if(v._mv0&&v.state!=='move')unloadVehicle(v);
  }
};
// ---- 그리기 ----
function heliSprite(v,alt){
  if(!(v.team>=0&&v.team<=3))return false;
  const q=((Math.round(vFace(v.face)/(Math.PI/8))%16)+16)%16,qm=(4-q)&15,qc=Math.min(q,qm),fl=qc!==q;
  const e=sprGetX('veh|'+((v.spin||0)>.25?'heliR':'heli')+'|'+v.team+'|'+qc);if(!sprOk(e))return false;
  const [sx,sy]=toS(v.x,v.y),lift=(alt-3)*cam.z;
  if(fl)sprBlitFlip(e,sx,sy-lift,cam.z,false);else sprBlit(e,sx,sy-lift,cam.z,false);
  return true;
}
const _drawVehT=drawVehicle;
drawVehicle=function(v){
  if(v.type!=='heli')return _drawVehT(v);
  const z=cam.z,[sx,sy]=toS(v.x,v.y),alt=3+v.alt*52,ps={x:v.x,y:v.y,alt,ang:v.face,spin:Math.max(.06,v.spin||0),flare:1},flash=v.flash>0;
  drawHeliShadowPose(ps);
  if(flash)cx.globalAlpha=.7;
  if(!heliSprite(v,alt))drawHeliPose(ps,TEAM_COL[v.team]);   // SVG 에셋(정지/회전), 없으면 절차적 그리기
  cx.globalAlpha=1;
  if(v.sel){cx.strokeStyle='#7dff7d';cx.lineWidth=1.6;cx.beginPath();cx.ellipse(sx,sy+2*z,36*z,18*z,0,0,6.3);cx.stroke();}
  const top=-(alt+22);
  if(v.hp<v.max||v.sel)hpBar(sx,sy+top*z,38*z,Math.max(0,v.hp/v.max),v.hp>v.max*.35?'#86b45e':'#d0583f');
  const np=vehPax(v).length;
  if(v.sel||np){cx.fillStyle='#fff';cx.font=`${9*z}px sans-serif`;cx.fillText(`탑승 ${np}/${VEH.heli.seats}`,sx-18*z,sy+(top-6)*z);}
};
{const _dv2=drawVehicle;drawVehicle=function(v){
  _dv2(v);
  if(v.type==='truck'&&v.sel){const z=cam.z,[sx,sy]=toS(v.x,v.y);cx.fillStyle='#bfe3ff';cx.font=`${9*z}px sans-serif`;cx.fillText(`탑승 ${vehPax(v).length}/${VEH.truck.seats}`,sx-18*z,sy+44*z);}
};}
