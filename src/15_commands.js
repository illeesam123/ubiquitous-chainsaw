// ================= 명령 보조 =================
function passable(x,y){if(!inb(x,y))return false;for(const v of G.vehicles)if(!v.dead&&Math.hypot(v.x-(x+.5),v.y-(y+.5))<.9)return false;const o=G.obst[y*G.w+x];return !o||!OB[o.type].block;}
function orderMove(units,tx,ty){
  const ug=units.filter(u=>u.lay);if(ug.length){orderMoveL(ug,tx,ty,0);units=units.filter(u=>!u.lay);}
  const ring=[[0,0]];for(let r=1;r<=4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r)ring.push([dx,dy]);
  let k=0;
  for(const u of units){
    releaseUnit(u);u.queue=[];
    let p=null;
    for(let t=0;t<ring.length&&!p;t++){
      const [dx,dy]=ring[(k+t)%ring.length],x=tx+dx,y=ty+dy;
      if(!passable(x,y))continue;
      p=findPath(Math.floor(u.x),Math.floor(u.y),x,y,false);
      if(p){k=(k+t+1)%ring.length;}
    }
    if(p&&p.length){u.path=p;u.state='move';}
  }
}
function orderGarrison(units,o){
  const d=OB[o.type];let free=d.slots-o.occ.length;
  for(const u of G.units)if(u.garTarget===o)free--;
  let n=0;
  for(const u of units){
    if(free<=0)break;
    if(u.gar===o)continue;
    releaseUnit(u);u.queue=[];
    if(u.lay){const tr=pathToTransit(u,0);if(!tr)continue;u.garTarget=o;u.path=tr.path;u.after={lay:0,gar:o,at:tr.tile};n++;free--;if(tr.path.length)u.state='move';else arrive(u);continue;}
    const p=findPath(Math.floor(u.x),Math.floor(u.y),o.x,o.y,true,o.size);
    if(p===null)continue;
    u.garTarget=o;u.path=p;n++;free--;
    if(p.length)u.state='move';else arrive(u);
  }
  return n;
}
// units가 비어 있으면(선택 없음) 배정 인원만큼 자동 선택
function smartCommand(team,units,x,y,n){
  const o=inb(x,y)?G.obst[y*G.w+x]:null;
  if(o){
    const d=OB[o.type];
    if(d.slots&&(o.natural||o.team===team)){
      if(o.occTeam!==-1&&o.occTeam!==team&&o.occ.length)return '적이 점령 중입니다';
      let us=units;
      if(!us.length){us=pickFree(team,null,Math.min(n||3,d.slots-o.occ.length),o.x,o.y);if(!us.length)return '배치 가능한 병사가 없습니다';}
      const k=orderGarrison(us,o);
      return k?null:'배치할 수 없습니다 (자리 없음)';
    }
    if(d.demo){
      if(!units.length)return issueWork(team,'demo',[[x,y]],null,n||3,null);
      const t=getTask(team,'demo',x,y,null,true);
      if(t){orderTasks(units,[t]);return null;}
    }
  }
  if(!units.length)return null;
  orderMove(units,x,y);return null;
}
// 배정 인원 자동 선택: 작업이 없는 병사 중 목표에 가까운 순으로 n명
let assignN=3;
function isFreeUnit(u){
  if(u.dead||u.state==='crew'||u.gar||u.garTarget||u.task)return false;
  if(u.state==='work'||u.state==='gar')return false;
  u.queue=u.queue.filter(taskAlive);
  return !u.queue.length;
}
function pickFree(team,pool,n,tx,ty){
  const all=G.units.filter(u=>u.team===team);
  let list=(pool&&pool.length?pool:all).filter(isFreeUnit);
  // 선택한 병사가 모두 작업 중이면 선택에 얽매이지 않고 놀고 있는 병사를 배정
  if(!list.length&&pool&&pool.length)list=all.filter(isFreeUnit);
  list.sort((a,b)=>Math.hypot(a.x-tx,a.y-ty)-Math.hypot(b.x-tx,b.y-ty));
  return list.slice(0,n);
}
// 플레이어 작업 명령: 인원이 부족해도 가능한 만큼 배정, 0명일 때만 오류
function issueWork(team,kind,tiles,type,n,pool){
  if(!tiles.length)return '할 수 있는 작업이 없습니다';
  const [tx,ty]=tiles[0];
  const group=pickFree(team,pool,n,tx,ty);
  if(!group.length)return '작업 가능한 병사가 없습니다';
  if(kind==='build'&&VEH[type]&&group.length<VEH[type].crew)return `${OB[type].n} 제작에는 병사 ${VEH[type].crew}명이 필요합니다`;
  return issueTiles(team,group,kind,tiles,type);
}
function issueTiles(team,units,kind,tiles,type){
  const tasks=[];let err=null;
  for(const [x,y] of tiles){
    const e=taskCheck(team,kind,x,y,type);
    if(e){if(!err&&e!=='이미 참호입니다')err=e;continue;}
    const t=getTask(team,kind,x,y,type,true);
    if(t)tasks.push(t);else if(!err)err='자원이 부족합니다';
  }
  if(tasks.length)orderTasks(units,tasks);
  return tasks.length?null:(err||'할 수 있는 작업이 없습니다');
}
