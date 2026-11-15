// ================= 의무 후퇴 / 병상 대기 =================
function clearMedical(u){
  const o=u.medTarget;if(o){if(o.patients)o.patients=o.patients.filter(id=>id!==u.id);if(o.medQueue)o.medQueue=o.medQueue.filter(id=>id!==u.id);}
  u.medTarget=null;u.medSlot=-1;
}
function medQueueSpot(o,index){
  const ring=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
  const layer=Math.floor(index/ring.length)+1,[dx,dy]=ring[index%ring.length];
  return [o.x+.5+dx*layer,o.y+.5+dy*layer];
}
function setMedQueuePath(o){
  if(!o||!G.obSet.has(o))return;
  o.medQueue=(o.medQueue||[]).filter(id=>{const u=G.uid.get(id);return !!u&&!u.dead&&u.medTarget===o;});
  o.medQueue.forEach((id,i)=>{const u=G.uid.get(id);if(!u)return;
    let gx,gy,path=null;
    // 막사 주변 대기 위치가 맵 밖이거나 다른 장애물 위라면 가까운 빈 칸을 찾는다.
    for(let q=i;q<i+G.w*G.h&&!path;q++){
      const [qx,qy]=medQueueSpot(o,q),tx=Math.round(qx-.5),ty=Math.round(qy-.5);
      if(!inb(tx,ty))continue;
      const oi=ty*G.w+tx,ob=G.obst[oi];
      if((ob&&ob!==o&&OB[ob.type].block)||G.trench[oi]===255)continue;
      gx=tx;gy=ty;
      if(u.state==='medwait'&&Math.hypot(u.x-(tx+.5),u.y-(ty+.5))<.35){path=[];break;}
      path=findPath(Math.floor(u.x),Math.floor(u.y),gx,gy,false);
      if(path===null)continue;
    }
    if(path!==null){u.path=path;u.state=path.length?'medqueue':'medwait';u.medSlot=i;}
  });
}
function admitMedical(o,u){
  if(!o||!u||!G.obSet.has(o)||o.patients.length>=OB.medbay.beds)return false;
  o.medQueue=o.medQueue.filter(id=>id!==u.id);if(!o.patients.includes(u.id))o.patients.push(u.id);
  u.medTarget=o;u.medSlot=-1;
  const path=findPath(Math.floor(u.x),Math.floor(u.y),o.x,o.y,false);
  if(path===null){o.patients=o.patients.filter(id=>id!==u.id);o.medQueue.unshift(u.id);setMedQueuePath(o);return false;}
  u.path=path;u.state=path.length?'medmove':'med';u.wait=0;return true;
}
function requestMedical(u){
  if(!u||u.dead||u.team<0)return false;
  if(u.medTarget&&G.obSet.has(u.medTarget))return true;
  const bays=[...G.obSet].filter(o=>o.type==='medbay'&&o.team===u.team);
  if(!bays.length)return false;
  bays.sort((a,b)=>Math.hypot(a.x+.5-u.x,a.y+.5-u.y)-Math.hypot(b.x+.5-u.x,b.y+.5-u.y));
  const o=bays[0];releaseUnit(u);u.queue=[];clearMedical(u);u.sel=false;
  if(o.patients.length<OB.medbay.beds)admitMedical(o,u);
  else{o.medQueue.push(u.id);u.medTarget=o;setMedQueuePath(o);}
  return true;
}
function closeMedbay(o){
  for(const id of [...(o.patients||[]),...(o.medQueue||[])]){const u=G.uid.get(id);if(u&&!u.dead){u.medTarget=null;u.medSlot=-1;u.path=[];u.state='idle';u.wait=.4;u.medCooldown=5;}}
  o.patients=[];o.medQueue=[];
}
function stepMedical(dt){
  for(const o of G.obSet){if(o.type!=='medbay')continue;
    o.patients=(o.patients||[]).filter(id=>{const u=G.uid.get(id);return !!u&&!u.dead&&u.medTarget===o;});
    o.medQueue=(o.medQueue||[]).filter(id=>{const u=G.uid.get(id);return !!u&&!u.dead&&u.medTarget===o;});
    // 병상이 비면 대기열 맨 앞의 부상병을 입실시킨다.
    let promoted=false;while(o.patients.length<OB.medbay.beds&&o.medQueue.length){const id=o.medQueue.shift(),u=G.uid.get(id);if(!u||u.dead)continue;if(admitMedical(o,u))promoted=true;else break;}
    if(promoted)setMedQueuePath(o);
    // 주둔한 의무병이 있으면 치료가 2배 빠르고, 없어도 기본 치료는 진행된다 (대기열이 영영 막히지 않도록).
    const rate=OB.medbay.heal*(o.occ.length>=(OB.medbay.staff||1)?1.6:.7);
    for(const id of o.patients){const u=G.uid.get(id);if(!u||u.state!=='med')continue;
      // 치료는 막사 내부에 입실한 상태에서만 진행된다.
      if(Math.hypot(u.x-(o.x+.5),u.y-(o.y+.5))>.72)continue;
      const old=u.hp;u.hp=Math.min(u.max,u.hp+rate*dt);
      if(u.hp>old&&Math.random()<dt*2)fxPush({k:'chip',x:u.x,y:u.y,t:0,d:.45,kind:'heal'});
      if(u.hp>=u.max){o.patients=o.patients.filter(pid=>pid!==id);u.medTarget=null;u.medSlot=-1;u.path=[];u.state='idle';u.wait=.8;u.medCooldown=12;u.medIgnore=true;}
    }
  }
}
