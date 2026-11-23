// ================= 작업(Task) 시스템 =================
function tkey(kind,idx){return kind+':'+idx;}
function canAfford(T,cost){for(const k in cost)if(T.res[k]<cost[k])return false;return true;}
function pay(T,cost){for(const k in cost)T.res[k]-=cost[k];}
function refund(T,cost){for(const k in cost)T.res[k]+=cost[k];}
function chebToTrench(team,x,y){
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(inb(nx,ny)&&G.trench[ny*G.w+nx]===team+1)return true;}
  return false;
}
// 작업 생성 가능 여부. 문자열(사유) 또는 null
function taskCheck(team,kind,x,y,type){
  if(!inb(x,y))return '맵 밖입니다';
  const i=y*G.w+x,o=G.obst[i];
  if(kind!=='demo'&&kind!=='build'&&padAt(x,y)>=0)return '헬리패드 위에는 팔 수 없습니다';
  if(G.hill&&G.sl[i]&&(kind==='dig'||kind==='build'))return '경사면 위에는 '+(kind==='dig'?'팔':'지을')+' 수 없습니다';
  if(kind==='dig'&&G.tt[i]===2)return '물이 차 있어 팔 수 없습니다';
  if(kind==='dig'&&G.tt[i]===4)return '얼음 위에는 팔 수 없습니다';
  if(kind==='dig'){
    if(o)return '장애물이 있어 팔 수 없습니다';
    if(G.trench[i]===team+1)return null_if_dup('이미 참호입니다');
    if(G.trench[i]===255)return '포탄 구덩이입니다 (이미 파여 있음)';
    if(G.trench[i]&&G.trench[i]!==team+1)return '적 참호입니다';
    if(!chebToTrench(team,x,y)&&!G.tkey.get('near:'+team+':'+i))return null;
    return null;
  }
  if(kind==='demo'){
    if(!o)return '철거할 대상이 없습니다';
    const od=OB[o.type];
    if(od.nodemo)return '무너진 잔해는 해체할 수 없습니다 (엄폐물로 사용 가능)';
    if(od.building&&!G.tasks.has(tkey('demo',o.idx))&&!canAfford(G.teams[team],{bullets:od.ammo||10}))return `해체용 폭약에 총알 ${od.ammo||10}발이 필요합니다`;
    return null;
  }
  if(kind==='build'){
    const d=OB[type],cells=footprint(type,x,y),isVehicle=!!VEH[type];
    let near=false;
    for(const [ax,ay] of cells){
      if(!inb(ax,ay))return '맵 밖입니다';
      const j=ay*G.w+ax;
      if(G.hill&&G.sl[j])return '경사면 위에는 지을 수 없습니다';
      if(padAt(ax,ay)>=0)return '헬리패드 위에는 지을 수 없습니다';
      if(G.tt[j]===2)return '물 위에는 지을 수 없습니다';
      if(G.obst[j])return '이미 무언가 있습니다';
      if(G.trench[j]===255)return '포탄 구덩이 위에는 지을 수 없습니다';
      if(G.trench[j]&&G.trench[j]!==team+1)return '적 참호 위에는 지을 수 없습니다';
      if(isVehicle&&G.trench[j]>0&&G.trench[j]!==255)return '차량은 참호 위에서 제작할 수 없습니다';
      if(chebToTrench(team,ax,ay))near=true;
    }
    if(G.hill&&cells.length>1&&!flatArea(x,y,d.size||1))return '평평하지 않은 곳에는 지을 수 없습니다';
    if(isVehicle&&G.vehicles.some(v=>!v.dead&&!(v.alt>.02)&&Math.hypot(v.x-(x+.5),v.y-(y+.5))<.85))return '차량이 지나갈 공간이 없습니다';
    if(!near)return '참호 및 1칸 주변에만 제작할 수 있습니다';
    for(const t of G.tasks.values()){
      if(t.kind!=='build')continue;
      const tc=footprint(t.type,t.x,t.y);
      if(tc.some(([a,b])=>cells.some(([c,e])=>a===c&&b===e)))return '이미 다른 제작이 예약되어 있습니다';
    }
    if(!canAfford(G.teams[team],d.cost))return '자원이 부족합니다';
    return null;
  }
  return '알 수 없는 작업';
}
function null_if_dup(m){return m;}
function getTask(team,kind,x,y,type,create){
  if(kind==='demo'){const oo=G.obst[y*G.w+x];if(oo){x=oo.x;y=oo.y;}}
  const i=y*G.w+x,k=tkey(kind,i);let t=G.tasks.get(k);
  if(t||!create)return t||null;
  const T=G.teams[team];
  let work,cost=null,bomb=false;
  if(kind==='dig')work=DIG_WORK;
  else if(kind==='demo'){const oo=G.obst[i],od=OB[oo.type];if(od.nodemo)return null;work=od.demo*((oo.natural||oo.team===team)?1:ENEMY_DEMO_MULT);
    if(od.building){cost={bullets:od.ammo||10};if(!canAfford(T,cost))return null;pay(T,cost);bomb=true;if(team===0)toast(`폭약 설치 준비 · 총알 −${cost.bullets}`);}}
  else{const d=OB[type];work=d.build;cost=d.cost;if(!canAfford(T,cost))return null;pay(T,cost);}
  t={key:k,kind,x,y,idx:i,type,team,prog:0,work,cost,bomb,workers:new Set(),res:new Set()};
  G.tasks.set(k,t);return t;
}
function taskSize(t){
  if(t.kind==='build')return OB[t.type].size||1;
  if(t.kind==='demo'){const o=G.obst[t.idx];return o?o.size:1;}
  return 1;
}
function taskAlive(t){return G.tasks.get(t.key)===t;}
function dropTask(t,doRefund){
  G.tasks.delete(t.key);
  for(const id of [...t.res,...t.workers]){const u=G.uid.get(id);if(u&&u.task===t){u.task=null;if(u.state==='work'||u.state==='move'){u.state='idle';u.path=[];}}}
  if(doRefund&&t.cost)refund(G.teams[t.team],t.cost);
}
// 명령: 유닛에게 작업 큐를 부여
function orderTasks(units,tasks,append){
  for(const u of units){
    if(!append){releaseUnit(u);u.queue=[];}
    for(const t of tasks)if(!u.queue.includes(t))u.queue.push(t);
    if(!u.task&&u.state!=='gar')pickTask(u);
  }
}
function releaseUnit(u){
  u.after=null;
  if(u.medTarget)clearMedical(u);
  if(u.task){u.task.res.delete(u.id);u.task.workers.delete(u.id);u.task=null;}
  if(u.gar){leaveGar(u);}
  u.garTarget=null;
  if(u.state==='work'||u.state==='move')u.state='idle';
  u.path=[];
}
function leaveGar(u){
  const o=u.gar;if(!o)return;
  const k=o.occ.indexOf(u.id);if(k>=0)o.occ.splice(k,1);
  if(!o.occ.length&&o.natural)o.occTeam=-1;
  u.gar=null;
  if(u.state==='gar'){
    u.state='idle';
    // 장애물 밖으로 나오기: 바깥 한 칸 중 통행 가능한 곳
    let best=null,bd=1e9;
    for(let dy=-1;dy<=o.size;dy++)for(let dx=-1;dx<=o.size;dx++){
      if(dx>=0&&dx<o.size&&dy>=0&&dy<o.size)continue;
      const x=o.x+dx,y=o.y+dy;
      if(!inb(x,y)||G.obst[y*G.w+x])continue;
      const d=Math.hypot(x+.5-u.sx,y+.5-u.sy)+Math.random()*.3;
      if(d<bd){bd=d;best=[x,y];}
    }
    if(best){u.x=best[0]+.5;u.y=best[1]+.5;}
  }
}
function pickTask(u){
  u.queue=u.queue.filter(taskAlive);
  for(const t of u.queue){
    if(t.workers.size+t.res.size>=MAXW&&!t.res.has(u.id))continue;
    const adj=t.kind!=='dig';
    const ux=Math.floor(u.x),uy=Math.floor(u.y);
    const tl=t.lay|0;let p;u.after=null;
    if(tl===(u.lay|0))p=findPathL(tl,u.team,ux,uy,t.x,t.y,adj,taskSize(t));
    else{const tr=pathToTransit(u,tl);if(tr){p=tr.path;u.after={lay:tl,task:true,at:tr.tile};}else p=null;}
    if(p===null){u.queue.splice(u.queue.indexOf(t),1);if(t.res.size+t.workers.size===0)dropTask(t,true);continue;}
    u.task=t;t.res.add(u.id);u.path=p;u.wait=0;
    if(!p.length){if(u.after)afterTransit(u);else startWork(u);}else u.state='move';
    return true;
  }
  u.state='idle';u.wait=.6;return false;
}
function startWork(u){
  const t=u.task;if(!t)return;
  if(t.workers.size>=MAXW||t.phase){t.res.delete(u.id);u.task=null;u.state='idle';u.wait=.5;return;}
  t.res.delete(u.id);t.workers.add(u.id);u.state='work';
  const tx=t.x+.5,ty=t.y+.5;u.face=Math.atan2(ty-u.y,tx-u.x);
}
function finishTask(t){
  if(t.kind==='build'&&VEH[t.type]&&(t.workers.size<VEH[t.type].crew))return;
  G.tasks.delete(t.key);
  const T=G.teams[t.team];
  let crewIds=[];
  if(t.kind==='dig'){G.trench[t.idx]=t.team+1;G.trenchHP[t.idx]=160;T.trench.push(t.idx);fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.5});}
  else if(t.kind==='build'){
    let ok;
    if(VEH[t.type]){const v=addVehicle(t.type,t.x+.5,t.y+.5,t.team);ok=!!v;if(v){crewIds=[...t.workers].slice(0,VEH[t.type].crew);v.crew=crewIds.slice();for(const id of crewIds){const u=G.uid.get(id);if(u){u.task=null;u.queue=[];u.path=[];u.x=v.x;u.y=v.y;u.state='crew';u.vehicleId=v.id;u.sel=false;}}}}
    else ok=addOb(t.type,t.x,t.y,t.team);
    if(!ok&&t.cost)refund(T,t.cost);
    const sz=OB[t.type].size||1;
    fxPush({k:'dust',x:t.x+sz/2,y:t.y+sz/2,t:0,d:.5});
  }else if(t.kind==='demo'){
    const o=G.obst[t.idx];
    if(o){
      for(const id of [...o.occ]){const u=G.uid.get(id);if(u)leaveGar(u);}
      const g=OB[o.type].gain;
      const enemy=!o.natural&&o.team!==t.team;
      if(enemy){const c0=OB[o.type].cost||{};const m=Math.round((c0.money||0)*.6)+rint(Math.random,8,20);T.res.money+=m;const got=[`+${m}달러`];
        for(const k of ['wood','metal','bullets']){if(c0[k]){const v=Math.max(1,Math.round(c0[k]*.5));T.res[k]+=v;got.push(`+${v}${RN[k]}`);}}
        if(t.team===0){G.lastGain='적 시설 해체 '+got.join(' ');G.gainShow=4;}}
      else if(g==='crate'){const m=rint(Math.random,20,60),b=rint(Math.random,20,60);T.res.money+=m;T.res.bullets+=b;if(t.team===0)G.lastGain=`+${m}달러 +${b}총알`;}
      else{const got=[];for(const k in g){const v=Math.max(1,Math.round(rint(Math.random,g[k][0],g[k][1])*(OB[o.type].building?.45:1)));T.res[k]+=v;got.push(`+${v}${RN[k]}`);}if(t.team===0)G.lastGain=got.join(' ')+(OB[o.type].building?' (일부 회수 · 잔해 남음)':'');}
      removeOb(o);if(OB[o.type].building)spawnRubble(o);fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.6});
      if(t.team===0&&G.lastGain){G.gainShow=2;}
    }
  }
  const members=[...t.workers,...t.res];
  for(const id of members){const u=G.uid.get(id);if(!u||crewIds.includes(id))continue;u.task=null;u.state='idle';u.path=[];pickTask(u);}
}
