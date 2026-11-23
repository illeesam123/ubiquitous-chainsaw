// ================= 유닛 / 월드 갱신 =================
function stepUnit(u,dt){
  if(u.reveal>0)u.reveal-=dt;
  u.flash=Math.max(0,u.flash-dt);u.muz=Math.max(0,(u.muz||0)-dt);u.cd-=dt;u.anim+=dt;
  u.medCooldown=Math.max(0,(u.medCooldown||0)-dt);
  if(u.medIgnore&&u.hp>=u.max*.85)u.medIgnore=false;
  // 체력이 45% 이하로 떨어지면 가장 가까운 아군 의무 막사로 자율 후퇴한다.
  if(!u.medTarget&&!u.medIgnore&&u.medCooldown<=0&&u.hp<=u.max*OB.medbay.retreatAt&&requestMedical(u))return;
  if(u.state==='med'){return;}
  if(u.state==='medwait'){u.wait=(u.wait||0)+dt;return;}
  // 작업 중
  if(u.state==='work'){
    const t=u.task;
    if(!t||!taskAlive(t)){u.task=null;u.state='idle';pickTask(u);return;}
    return; // 진행은 월드 단계에서 합산
  }
  // 주둔 중: 장애물 화기
  if(u.state==='gar'){
    const o=u.gar;
    if(!o||!G.obSet.has(o)){u.gar=null;u.state='idle';return;}
    const gun0=OB[o.type].gun,gun=gun0&&typeof garGun==='function'?(garGun(u,o)||gun0):gun0;
    if(gun&&u.cd<=0){if(fire(u,gun,{x:o.x+o.size/2,y:o.y+o.size/2}))u.cd=gun.int*(.9+Math.random()*.2);else u.cd=.2;}
    return;
  }
  // 이동: 일반 명령뿐 아니라 의무 막사로 후퇴하거나 대기열로 이동하는 상태도 같은 경로 처리기를 사용한다.
  if(u.state==='fuse'){const t=u.task;if(!t||!G.tasks.has(t.key)){u.task=null;u.state='idle';u.wait=.2;}return;}
  const movingState=u.state==='move'||u.state==='medmove'||u.state==='medqueue'||u.state==='flee';
  if(movingState&&u.stuck>0){u.stuck-=dt;}
  else if(movingState&&u.path.length){
    const ni=u.path[0],nx=(ni%G.w)+.5,ny=((ni/G.w)|0)+.5;
    const vehicleBlock=!u.lay&&G.vehicles.some(v=>!v.dead&&Math.hypot(v.x-nx,v.y-ny)<.82);
    if(!u.lay&&climbStep(u,ni,dt)){if(!u.path.length)arrive(u);}
    else if(vehicleBlock){u.path=[];if(u.state==='flee')u.state='fuse';else if(u.state==='medmove'||u.state==='medqueue'){u.state='idle';u.medCooldown=2;clearMedical(u);}else{u.state='idle';u.wait=.2;}}
    else{
      const dx=nx-u.x,dy=ny-u.y,d=Math.hypot(dx,dy),step=SPEED*weatherSpeed()*dt*(u.lay?.9:terrainSpeed(u.x,u.y))*(u.state==='flee'?1.5:1);
      if(d<=step){u.x=nx;u.y=ny;u.path.shift();if(!u.lay&&G.trench[ni]===255&&u.path.length){u.stuck=6+Math.random()*5;fxPush({k:'dust',x:nx,y:ny,t:0,d:.5});}}
      else if(d>.0001){u.x+=dx/d*step;u.y+=dy/d*step;}
      if(d>.01)u.face=Math.atan2(dy,dx);
      if(!u.path.length)arrive(u);
    }
  }else if(movingState){arrive(u);}
  else if(u.state==='idle'){
    u.wait-=dt;
    if(u.wait<=0){
      if(u.queue.length)pickTask(u);else u.wait=.6;
    }
  }
  // 일반 사격 (작업·주둔 중이 아닐 때)
  if(u.cd<=0){
    {const gn=gunOf(u);if(fire(u,gn,u))u.cd=gn.int*(.9+Math.random()*.25);else u.cd=.25;}
  }
}
function arrive(u){
  if(u.state==='flee'){u.state='fuse';u.path=[];return;}
  if(u.after){afterTransit(u);return;}
  if(u.state==='medmove'){u.state='med';u.path=[];return;}
  if(u.state==='medqueue'){u.state='medwait';u.path=[];return;}
  if(u.garTarget){
    const o=u.garTarget;u.garTarget=null;
    if(G.obSet.has(o)&&OB[o.type].slots&&o.occ.length<OB[o.type].slots&&(o.occTeam===-1||o.occTeam===u.team)&&(o.natural||o.team===u.team)){
      o.occ.push(u.id);o.occTeam=u.team;u.gar=o;u.state='gar';u.cd=.5;
      u.sx=u.x;u.sy=u.y;           // 입장 전 위치(나올 때 기준)
      u.x=o.x+o.size/2;u.y=o.y+o.size/2; // 장애물 안으로 들어감
      u.path=[];
      return;
    }
    u.state='idle';u.wait=.3;return;
  }
  if(u.task){startWork(u);return;}
  u.state='idle';u.wait=.3;
}
function stepWorld(dt){
  G.time+=dt;
  G.weather.next-=dt;
  if(G.weather.next<=0){G.weather.type=pickWeather(G.weather.type);G.weather.next=95+Math.random()*75;}
  // 4분 주기의 낮/밤. 야간에는 모든 병력의 탐지거리가 줄어든다.
  G.weather.night=(G.time%240)>=150;
  // 작업 진행
  for(const t of [...G.tasks.values()]){
    if(t.bomb){stepBomb(t,dt);continue;}
    const n=t.workers.size;
    if(n>0){
      t.prog+=n*dt*weatherWork()*(t.kind==='dig'?BIOME[G.biome].dig:1)*(typeof taskSpeed==='function'?taskSpeed(t):1);
      if(Math.random()<dt*3){fxPush({k:'chip',x:t.x+.5,y:t.y+.5,t:0,d:.3,kind:t.kind});sfx(t.kind==='demo'?'hammer':'dig',t.x+.5,t.y+.5);}
      if(t.kind==='build'&&VEH[t.type]&&n<VEH[t.type].crew)t.prog=Math.min(t.prog,t.work-.001);
      if(t.prog>=t.work)finishTask(t);
    }
  }
  for(const u of G.units)if(!u.dead&&u.state!=='crew')stepUnit(u,dt);
  stepVehicles(dt);stepMortars(dt);stepShells(dt);stepMedical(dt);stepHelis(dt);
  for(const o of G.obSet){o.fl=Math.max(0,o.fl-dt);if(o.muz>0)o.muz-=dt;}
  G.units=G.units.filter(u=>!u.dead);
  // 고아 작업 정리
  G.tw+=dt;
  if(G.tw>1){
    G.tw=0;
    const used=new Set();
    for(const u of G.units)for(const t of u.queue)used.add(t);
    for(const t of [...G.tasks.values()])if(!used.has(t)&&!t.phase&&t.workers.size===0&&t.res.size===0)dropTask(t,true);
  }
  for(const f of G.fx)f.t+=dt;
  G.fx=G.fx.filter(f=>f.t<f.d);
  checkEnd();
}
function teamCount(t){let n=0;for(const u of G.units)if(u.team===t&&u.state!=='crew')n++;for(const v of G.vehicles)if(v.team===t&&!v.dead)n++;return n;}
function checkEnd(){
  if(G.phase!=='play')return;
  let humanAlive=teamCount(0)>0,en=0;
  for(const T of G.teams){if(T.id===0)continue;T.alive=teamCount(T.id)>0;if(T.alive)en++;}
  G.teams[0].alive=humanAlive;
  if(!humanAlive)G.over='lose';else if(!en)G.over='win';
  if(G.over){G.phase='over';showOver();}
}
