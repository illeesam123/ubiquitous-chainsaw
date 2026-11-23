// ================= 차량 =================
function vehicleCellsFree(x,y,team,ignore){
  const r=.42;
  for(let ty=Math.floor(y-r);ty<=Math.floor(y+r);ty++)for(let tx=Math.floor(x-r);tx<=Math.floor(x+r);tx++){
    if(!inb(tx,ty))return false;
    const ti=ty*G.w+tx;if((G.trench[ti]>0&&G.up[ti]!==1)||(G.tt[ti]===2&&G.up[ti]!==1))return false;
    const o=G.obst[ti];if(o&&o.type!=='crate')return false;
  }
  for(const v of G.vehicles)if(v!==ignore&&!v.dead&&!(v.alt>.02)&&Math.hypot(v.x-x,v.y-y)<.85)return false;
  return true;
}
function addVehicle(type,x,y,team){
  const d=VEH[type];if(!d||!vehicleCellsFree(x,y,team,null))return null;
  const v={id:G.nextId++,type,team,x,y,hp:d.hp,max:d.hp,face:0,anim:Math.random()*6,cd:1.2+Math.random(),sel:false,path:[],state:'idle',flash:0,muz:0,cargo:d.cargo||0,supplyCd:0,crew:[],pax:[],alt:0,dead:false};
  G.vehicles.push(v);return v;
}
function vehiclePass(x,y,v){
  if(!vehicleCellsFree(x,y,v.team,v))return false;
  return true;
}
function orderVehicles(list,tx,ty){
  const ring=[[0,0]];for(let r=1;r<=5;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r)ring.push([dx,dy]);
  let k=0;
  for(const v of list){let p=null;
    for(let q=0;q<ring.length&&!p;q++){const [dx,dy]=ring[(k+q)%ring.length],x=tx+dx,y=ty+dy;if(!inb(x,y))continue;
      if(!vehiclePass(x+.5,y+.5,v))continue;
      p=findPath(Math.floor(v.x),Math.floor(v.y),x,y,false,1,v);
      if(p){k=(k+q+1)%ring.length;}
    }
    if(p){v.path=p;v.state=p.length?'move':'idle';}
  }
}
function damageVehicle(v,dmg,shooter){if(v.dead)return;dmg*=1-(VEH[v.type].armor||0);v.hp-=dmg;v.flash=.16;if(v.hp<=0){v.dead=true;v.sel=false;if(shooter)G.teams[shooter.team].kills++;fxPush({k:'boom',x:v.x,y:v.y,t:0,d:.7});sfx('boom',v.x,v.y);for(const id of (v.crew||[])){const u=G.uid.get(id);if(u&&!u.dead){G.teams[u.team].lost++;killUnit(u);}}v.crew=[];}}
function stepVehicles(dt){
  for(const v of G.vehicles){if(v.dead)continue;const d=VEH[v.type];v.anim+=dt;v.flash=Math.max(0,v.flash-dt);v.muz=Math.max(0,v.muz-dt);v.cd-=dt;v.aimT=Math.max(0,(v.aimT||0)-dt);
    if(v.state==='move'&&v.path.length){const ni=v.path[0],nx=ni%G.w+.5,ny=((ni/G.w)|0)+.5,dx=nx-v.x,dy=ny-v.y,dist=Math.hypot(dx,dy),step=d.speed*weatherSpeed()*dt*Math.min(1,terrainSpeed(v.x,v.y))*roadMul(v.x,v.y);
      if(dist<=step){if(vehiclePass(nx,ny,v)){v.x=nx;v.y=ny;v.path.shift();}else{v.path=[];v.state='idle';}}
      else{const px=v.x+dx/dist*step,py=v.y+dy/dist*step;if(vehiclePass(px,py,v)){v.x=px;v.y=py;}else{v.path=[];v.state='idle';}}
      if(dist>.01)v.targetFace=Math.atan2(dy,dx);if(v.targetFace!==undefined){const da=Math.atan2(Math.sin(v.targetFace-v.face),Math.cos(v.targetFace-v.face));v.face+=da*Math.min(1,dt*5);}if(!v.path.length)v.state='idle';if(v.state==='move'&&Math.random()<dt*5)fxPush({k:'dust',x:v.x,y:v.y,t:0,d:.35,kind:'vehicle'});
    }
    for(const id of (v.crew||[])){const u=G.uid.get(id);if(u&&!u.dead){u.x=v.x;u.y=v.y;}}
    if(v.type==='tank'&&v.cd<=0){let target=null,tx=0,ty=0,bd=Math.pow(d.range*weatherSight(),2);for(const u of G.units){if(u.dead||u.state==='crew'||u.team===v.team||u.lay||inRoof(u)||hiddenUnit(u))continue;const dx=u.x-v.x,dy=u.y-v.y,q=shotQ(v,u,dx*dx+dy*dy,bd);if(q<bd){bd=q;target=u;tx=u.x;ty=u.y;}}for(const e of G.vehicles){if(e.dead||e.team===v.team||e===v||e.alt>.02)continue;const dx=e.x-v.x,dy=e.y-v.y,q=shotQ(v,e,dx*dx+dy*dy,bd);if(q<bd){bd=q;target=e;tx=e.x;ty=e.y;}}
      if(target&&G.teams[v.team].res.bullets>=d.ammo){G.teams[v.team].res.bullets-=d.ammo;const scatter=(1-weatherAccuracy())*1.4;tx+=(Math.random()-.5)*scatter;ty+=(Math.random()-.5)*scatter;v.aim=Math.atan2(ty-v.y,tx-v.x);v.aimT=2.5;v.muz=.14;sfx('cannon',v.x,v.y);fxPush({k:'smoke',x:v.x+Math.cos(v.aim)*.7,y:v.y+Math.sin(v.aim)*.7,t:0,d:1});G.shells.push({team:v.team,x:v.x,y:v.y,tx,ty,t:0,d:.48,def:{shell:d.damage,trenchDmg:d.trenchDmg,blast:d.blast,vehicle:true}});v.cd=d.interval*(.9+Math.random()*.2);}else v.cd=.25;
    }
    if(v.type==='truck'&&v.cargo>0){v.supplyCd-=dt;if(v.supplyCd<=0){const near=G.units.some(u=>!u.dead&&u.state!=='crew'&&u.team===v.team&&Math.hypot(u.x-v.x,u.y-v.y)<=d.supplyRange);if(near&&G.teams[v.team].res.bullets<bulletCap()){const n=Math.min(d.supply,v.cargo,bulletCap()-G.teams[v.team].res.bullets);G.teams[v.team].res.bullets+=n;v.cargo-=n;fxPush({k:'chip',x:v.x,y:v.y,t:0,d:.3,kind:'supply'});}v.supplyCd=.5;}}
  }
  G.vehicles=G.vehicles.filter(v=>!v.dead);
}
