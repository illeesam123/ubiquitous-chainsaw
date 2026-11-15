// ================= 전투 =================
function sameTeamTrench(u){const i=Math.floor(u.y)*G.w+Math.floor(u.x);return G.trench[i]===u.team+1;}
function damageOb(o,dmg){
  o.hp-=dmg;o.fl=.15;
  if(o.hp<=0&&G.obSet.has(o)){
    const d=OB[o.type];
    for(const id of [...o.occ]){const u=G.uid.get(id);if(u){leaveGar(u);if(d.collapse)hurt(u,d.collapse,null);}}
    fxPush({k:'boom',x:o.x+.5,y:o.y+.5,t:0,d:.5});sfx('boom',o.x+.5,o.y+.5);
    for(const [k,t] of G.tasks)if(t.idx===o.idx&&t.kind==='demo')dropTask(t,false);
    removeOb(o);if(d.building)spawnRubble(o);
  }
}
function hurt(u,dmg,shooter){
  if(!VEH[u.type])u.reveal=Math.max(u.reveal||0,1.5);
  u.hp-=dmg;u.flash=.12;
  if(u.hp<=0){
    G.teams[u.team].lost++;if(shooter)G.teams[shooter.team].kills++;
    killUnit(u);
  }
}
function killUnit(u){
  if(u.medTarget)clearMedical(u);
  if(u.task){u.task.res.delete(u.id);u.task.workers.delete(u.id);u.task=null;}
  if(u.gar)leaveGar(u);
  u.dead=true;u.hp=0;G.uid.delete(u.id);sfx('death',u.x,u.y);
  fxPush({k:'dead',x:u.x,y:u.y,t:0,d:6,c:u.team});
}
function resolveHit(s,u,gun){
  // 사거리·명중
  const dist=Math.hypot(s.x-u.x,s.y-u.y);
  let acc=gun.acc*(1-.35*dist/gun.range)*weatherAccuracy();
  if(s.state==='move')acc*=.7;
  const tr=sameTeamTrench(u);
  if(tr)acc*=.8;
  if(Math.random()>acc)return;
  let dmg=gun.dmg*(.85+Math.random()*.3);
  if(VEH[u.type]){damageVehicle(u,dmg,s);fxPush({k:'spark',x:u.x,y:u.y,t:0,d:.18});return;}
  // 엄폐: 사격 방향의 인접 장애물 또는 소속 장애물이 대신 피격
  let cover=null;
  if(u.gar&&G.obSet.has(u.gar))cover=u.gar;
  else{
    const sx=Math.sign(s.x-u.x),sy=Math.sign(s.y-u.y);
    const tx=Math.floor(u.x)+sx,ty=Math.floor(u.y)+sy;
    if(inb(tx,ty)&&(sx||sy)){const o=G.obst[ty*G.w+tx];if(o&&(o.type!=='crate'))cover=o;}
  }
  if(cover&&Math.random()<OB[cover.type].absorb){damageOb(cover,dmg);fxPush({k:'spark',x:cover.x+.5,y:cover.y+.5,t:0,d:.18});return;}
  if(tr)dmg*=.6;
  hurt(u,dmg,s);
}
function mortarImpact(team,x,y,def){
  const r=def.vehicle?(def.blast||1.35):1.65;
  for(const u of G.units){if(u.dead||u.state==='crew'||u.team===team||u.lay||inRoof(u))continue;const d=Math.hypot(u.x-x,u.y-y);if(d<=r){let dmg=def.shell*(1-(def.vehicle?.48:.38)*d/r);if(sameTeamTrench(u))dmg*=def.vehicle?.72:.82;hurt(u,dmg,null);if(u.gar&&G.obSet.has(u.gar))damageOb(u.gar,dmg*.45);}}
  for(const v of G.vehicles){if(v.dead||v.team===team)continue;const d=Math.hypot(v.x-x,v.y-y);if(d<=r)damageVehicle(v,def.vehicle?def.shell*(1-.35*d/r):def.shell*.72*(1-.3*d/r));}
  const rr=def.vehicle?(def.blast||1.3):1.25;for(let ty=Math.floor(y-rr);ty<=Math.ceil(y+rr);ty++)for(let tx=Math.floor(x-rr);tx<=Math.ceil(x+rr);tx++){if(!inb(tx,ty))continue;const i=ty*G.w+tx;if(G.trench[i]>0&&G.trench[i]!==255&&G.trench[i]!==team+1&&!roofedI(i)&&Math.hypot(tx+.5-x,ty+.5-y)<=rr){G.trenchHP[i]-=def.trenchDmg;if(G.trenchHP[i]<=0){G.trench[i]=255;G.trenchHP[i]=0;G.up[i]=0;}}}
  for(const o of [...G.obSet])if((o.natural||o.team!==team)&&Math.hypot(o.x+o.size/2-x,o.y+o.size/2-y)<=r*.8)damageOb(o,def.shell*.35);
  fxPush({k:'boom',x,y,t:0,d:.65});sfx('boom',x,y);clearBush(x,y,1.9);
}
function stepMortars(dt){
  for(const o of G.obSet){if(o.type!=='mortar')continue;if(o.occ.length<OB.mortar.slots){o.cd=Math.max(o.cd||0,1);continue;}o.cd=(o.cd||1.5)-dt;if(o.cd>0)continue;const def=OB.mortar,T=G.teams[o.team];if(!T||T.res.bullets<5){o.cd=.8;continue;}
    let target=null,tx=0,ty=0,bd=Math.pow(def.range*weatherSight(),2);for(const u of G.units){if(u.dead||u.state==='crew'||u.team===o.team||u.lay||inRoof(u)||hiddenUnit(u))continue;const dx=u.x-(o.x+.5),dy=u.y-(o.y+.5),d=dx*dx+dy*dy;if(d<bd){bd=d;target=u;tx=u.x;ty=u.y;}}
    for(const v of G.vehicles){if(v.dead||v.team===o.team)continue;const dx=v.x-(o.x+.5),dy=v.y-(o.y+.5),d=dx*dx+dy*dy;if(d<bd){bd=d;target=v;tx=v.x;ty=v.y;}}
    if(!target){o.cd=.8;continue;}T.res.bullets-=5;const scatter=(1-weatherAccuracy())*2.2;tx+=(Math.random()-.5)*scatter;ty+=(Math.random()-.5)*scatter;o.cd=def.interval*(.88+Math.random()*.24);o.aim=Math.atan2(ty-(o.y+.5),tx-(o.x+.5));o.muz=.22;fxPush({k:'smoke',x:o.x+.5,y:o.y+.5,t:0,d:1.2});sfx('mortar',o.x+.5,o.y+.5);G.shells.push({team:o.team,x:o.x+.5,y:o.y+.5,tx,ty,t:0,d:.95,def});
  }
}
function stepShells(dt){
  for(const sh of G.shells){sh.t+=dt;if(sh.t>=sh.d){mortarImpact(sh.team,sh.tx,sh.ty,sh.def);sh.done=true;}}
  G.shells=G.shells.filter(s=>!s.done);
}
function findTarget(u,range){
  range*=weatherSight();
  let best=null,bd=range*range;
  for(const e of G.units){
    if(e.dead||e.state==='crew'||e.team===u.team||(e.lay|0)!==(u.lay|0))continue;
    const dx=e.x-u.x,dy=e.y-u.y,d=dx*dx+dy*dy;
    if((inRoof(e)||inRoof(u))&&d>20)continue;
    if(hiddenUnit(e,u.x,u.y))continue;
    if(d<bd){bd=d;best=e;}
  }
  if(!u.lay)for(const v of G.vehicles){
    if(v.dead||v.team===u.team)continue;
    const dx=v.x-u.x,dy=v.y-u.y,d=dx*dx+dy*dy;
    if(d<bd){bd=d;best=v;}
  }
  return best;
}
function fire(u,gun,origin){
  const T=G.teams[u.team];
  if(T.res.bullets<gun.cost)return false;
  const e=findTarget(u,gun.range);
  if(!e)return false;
  T.res.bullets-=gun.cost;
  u.face=Math.atan2(e.y-u.y,e.x-u.x);u.muz=.08;u.reveal=3;
  fxPush({k:'trace',x1:origin.x,y1:origin.y,x2:e.x,y2:e.y,t:0,d:.08});
  resolveHit(u,e,gun);
  sfx(gun.int<.35?'mg':'rifle',origin.x,origin.y);
  return true;
}
