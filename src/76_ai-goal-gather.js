// ================= AI 경제 보강: 병력 부족 시 안전 채굴 · 목표 작업 우선 · 나무/덤불/바위 범위 채집 =================
// 66_ai-economy.js 의 aiEconomy 가 아래 함수들을 부른다.
//  · 병력이 적으면(aiLowPop) 교전 지역·적 병력에서 먼 광석만 고르고(땅굴 속 광석 가산), 원정을 미루고 채굴에 집중한다.
//  · '목표 작업'(aiGoal): 지금 가장 급한 구매(공방/강화/드론/증원)에 모자란 자원을 환전·채굴로 먼저 채운다.
//    이때는 수수료·위험 같은 불이익을 감수한다(안전 재고를 무시하고 팔고, 위험한 광석도 점수만 깎고 허용).
//  · 나무·바위·덤불을 반경 GATHER.r 칸 묶음으로 한꺼번에 채집한다(나무·바위는 철거 작업, 덤불은 'bush' 채집 작업).
const GATHER={r:3,maxJobs:2,bushWork:2.2,maxHome:30,low:14};
// ---- 덤불 채집 작업 ----
const _tcGA=taskCheck;
taskCheck=function(team,kind,x,y,type){
  if(kind!=='bush')return _tcGA(team,kind,x,y,type);
  if(!inb(x,y))return '맵 밖입니다';const i=y*G.w+x;
  if(!G.brush[i])return '채집할 덤불이 없습니다';
  if(G.tasks.has(tkey('bush',i)))return '이미 예약된 작업입니다';
  return null;
};
const _gtGA=getTask;
getTask=function(team,kind,x,y,type,create){
  if(kind!=='bush')return _gtGA(team,kind,x,y,type,create);
  const i=y*G.w+x,ex=G.tasks.get(tkey('bush',i));if(ex||!create)return ex||null;
  if(!G.brush[i])return null;
  return mkTaskX(team,'bush',x,y,null,GATHER.bushWork,null,0);
};
const _ftGA=finishTask;
finishTask=function(t){
  if(t.kind!=='bush')return _ftGA(t);
  G.tasks.delete(t.key);G.brush[t.idx]=0;
  const T=G.teams[t.team],v=rint(Math.random,1,2);T.res.wood+=v;
  if(t.team===0){G.lastGain=`덤불 채집 +${v}나무`;G.gainShow=2;}
  fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.4});
  for(const id of [...t.workers,...t.res]){const u=G.uid.get(id);if(!u)continue;u.task=null;u.state='idle';u.path=[];pickTask(u);}
};
// ---- 위협 ----
function aiFoePts(T){
  if(T._foeSec===Math.floor(G.time)&&T._foePts)return T._foePts;
  const out=[];
  for(const u of G.units)if(!u.dead&&u.team!==T.id&&!isAllyT(u.team,T.id)&&u.team>=0&&!u.lay&&u.state!=='crew')out.push([u.x,u.y]);
  for(const c of G.civs||[])if(c.mil&&!c.dead)out.push([c.x,c.y]);
  for(const v of G.vehicles)if(!v.dead&&v.team!==T.id&&!isAllyT(v.team,T.id)&&v.type!=='drone'&&v.type!=='truck')out.push([v.x,v.y],[v.x,v.y]);
  T._foeSec=Math.floor(G.time);T._foePts=out;return out;
}
function aiThreat(pts,x,y,r){let n=0;const r2=r*r;for(const p of pts){const dx=p[0]-x,dy=p[1]-y;if(dx*dx+dy*dy<r2)n++;}return n;}
function aiSegThreat(pts,x0,y0,x1,y1,r){
  const dx=x1-x0,dy=y1-y0,L2=dx*dx+dy*dy||1;let n=0;
  for(const p of pts){const t=Math.max(0,Math.min(1,((p[0]-x0)*dx+(p[1]-y0)*dy)/L2)),px=x0+dx*t,py=y0+dy*t;if((p[0]-px)**2+(p[1]-py)**2<r*r)n++;}
  return n;
}
// 땅굴 속 광석: 가장 가까운 '열린' 동굴 입구까지 길이 안전하면 지상 교전을 피해 땅굴로 들어갈 수 있다
function aiMouthSafe(T,x,y,foes){
  let best=-1,bd=1e9;
  for(const m of G.trans||[]){if(!G.open[T.id][m])continue;const mx=m%G.w,my=(m/G.w)|0,d=Math.hypot(mx-T.flag.x,my-T.flag.y);if(d<bd){bd=d;best=m;}}
  if(best<0)return false;
  const mx=best%G.w,my=(best/G.w)|0;
  return aiThreat(foes,mx,my,10)===0&&aiSegThreat(foes,T.flag.x,T.flag.y,mx,my,6)===0;
}
function aiLowPop(T){
  const pop=popOf(T.id);if(pop<=GATHER.low)return true;
  let mx=0;for(const t of G.teams)if(t&&t.id!==T.id&&!t.dead&&!isAllyT(T.id,t.id)&&t.id!==9)mx=Math.max(mx,popOf(t.id));
  return mx>0&&pop<mx*.5;
}
// ---- 목표 작업 ----
function aiGoalDef(T){
  const A=T.ai,pop=popOf(T.id)+pendingRecruits(T),list=[],ws=[...G.obSet].filter(o=>o.type==='workshop'&&!o.natural&&o.team===T.id)[0];
  const recruit=pop+SHOP.packN<=SHOP.popCap&&pop<(aiLowPop(T)?40:56)?{n:'병력 증원',need:{money:SHOP.packCost}}:null;
  const swarm=[];
  if(A.persona==='swarm'){
    if(!ws)swarm.push({n:'공방 건설',need:OB.workshop.cost});
    else if(wsTier(ws)<2){const c=wsUpgradeCost(wsTier(ws));if(c)swarm.push({n:'공방 강화',need:c});}
    else swarm.push({n:'드론 생산',need:OB.drone.cost});
  }
  return aiLowPop(T)?[recruit,...swarm]:[...swarm,recruit];
}
function aiGoal(T){
  for(const g of aiGoalDef(T)){
    if(!g)continue;const def={};let any=false;
    for(const k in g.need){const d=g.need[k]-(T.res[k]||0);if(d>0){def[k]=d;any=true;}}
    if(any)return {n:g.n,need:g.need,def};
  }
  return null;
}
function aiOreGoalValue(o,g){
  const d=ORE[o];if(!d)return 0;let v=0;
  for(const k of ['money','metal']){if(!d[k])continue;const avg=(d[k][0]+d[k][1])/2,need=g.def[k]?1.7:.6;v+=avg*(RVAL[k]||1)*need;}
  return v;
}
// 목표에 모자란 자원을 남는 자원으로 환전(수수료 감수): 목표에 쓰지 않는 자원은 최소 재고만 남기고 판다
function aiGoalTrade(T,g){
  if(!T.pad||T.order.lines.length>=SHOP.maxLines-2)return false;
  const keepMin={metal:25,wood:25,bullets:240,money:0};
  for(const r of Object.keys(g.def)){
    if(T.order.lines.some(l=>l.kind==='trade'&&l.to===r))continue;          // 이미 환전 중이면 기다린다
    let best=null,bv=0;
    for(const s of ['metal','wood','bullets','money']){
      if(s===r||g.need[s])continue;
      const extra=(T.res[s]||0)-keepMin[s];if(extra<20)continue;
      const v=extra*RVAL[s];if(v>bv){bv=v;best=s;}
    }
    if(!best)continue;
    const want=Math.ceil(g.def[r]*RVAL[r]/RVAL[best]/(1-SHOP.fee))+2,amt=Math.min(Math.floor((T.res[best]||0)-keepMin[best]),want);
    if(amt<10)continue;
    if(!shopAddTrade(T.id,best,r,amt))return true;
  }
  return false;
}
// ---- 나무·바위·덤불 범위 채집 ----
function aiGatherCluster(cx,cy,wW,wM){
  const r=GATHER.r,demo=[],bush=[];let value=0;const seen=new Set();
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    const x=Math.floor(cx)+dx,y=Math.floor(cy)+dy;if(!inb(x,y)||Math.hypot(dx,dy)>r+.4)continue;
    const i=y*G.w+x,o=G.obst[i];
    if(o&&o.natural&&(o.type==='tree'||o.type==='rock')&&!seen.has(o)&&!G.tasks.has(tkey('demo',o.idx))){
      seen.add(o);demo.push([o.x,o.y]);value+=o.type==='tree'?6.7*wW:10.8*wM;
    }else if(!o&&G.brush[i]&&!G.tasks.has(tkey('bush',i))){bush.push([x,y]);value+=2.2*wW;}
  }
  return {demo,bush,value};
}
function aiGatherJobs(T){const A=T.ai;A.gJobs=(A.gJobs||[]).filter(j=>j.keys.some(k=>G.tasks.has(k)));return A.gJobs;}
function aiEconGather(T,P,ctx){
  const A=T.ai,pop=popOf(T.id);if(pop<(ctx.low?3:6)||!T.flag)return 0;
  const jobs=aiGatherJobs(T);if(jobs.length>=GATHER.maxJobs+(ctx.goal?1:0))return 0;
  const needWood=(T.res.wood<P.keepW*1.4)||(T.res.metal<P.keepM*1.2)||(ctx.goal&&(ctx.goal.def.wood||ctx.goal.def.metal));
  if(!needWood)return 0;
  const lackW=T.res.wood<P.keepW*1.4||(ctx.goal&&ctx.goal.def.wood),lackM=T.res.metal<P.keepM*1.2||(ctx.goal&&ctx.goal.def.metal),wW=lackW?1:.15,wM=lackM?1:.15;
  const blocked=aiMineSafeMask(AV.mineGap),foes=ctx.foes,fx=T.flag.x,fy=T.flag.y;
  let best=null,bs=0,tries=0;
  for(const o of G.obSet){
    if(!o.natural||(o.type!=='tree'&&o.type!=='rock'))continue;
    const d=Math.hypot(o.x-fx,o.y-fy);if(d>GATHER.maxHome)continue;
    if(((tries++)&3))continue;                                  // 후보를 성기게 훑어 비용을 줄인다
    if(blocked[o.y*G.w+o.x])continue;
    if(foes.length&&(aiThreat(foes,o.x,o.y,12)>0||aiSegThreat(foes,fx,fy,o.x,o.y,6)>0)&&!(ctx.goal&&!ctx.low))continue;
    const c=aiGatherCluster(o.x,o.y,wW,wM);const sc=c.value-d*.8;
    if(c.demo.length+c.bush.length>=3&&sc>bs){bs=sc;best=c;}
  }
  if(!best)return 0;
  const tiles=best.demo.length?best.demo[0]:best.bush[0],pool=aiMinePool(T),n=Math.min(3,Math.max(2,Math.ceil((best.demo.length+best.bush.length)/5)));
  const group=pickFree(T.id,pool,n,tiles[0],tiles[1]);if(group.length<1)return 0;
  const tasks=[];
  for(const [x,y] of best.demo){if(!taskCheck(T.id,'demo',x,y)){const t=getTask(T.id,'demo',x,y,null,true);if(t)tasks.push(t);}}
  for(const [x,y] of best.bush){if(!taskCheck(T.id,'bush',x,y)){const t=getTask(T.id,'bush',x,y,null,true);if(t)tasks.push(t);}}
  if(!tasks.length)return 0;
  orderTasks(group,tasks);A.gJobs.push({keys:tasks.map(t=>t.key)});
  return 1;
}
