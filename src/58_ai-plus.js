// ================= AI 강화: 플레이어가 쓸 수 있는 수단을 AI 도 쓴다 =================
//  1) 무기고를 짓고, 성향에 맞는 총기·수류탄을 헬기로 사서 병사에게 바꿔 준다
//  2) 지형에 막히면(절벽·물) 사다리/다리를 놓아 적 본진까지 길을 낸다
//  3) 동굴을 탐사하고 광석을 캔다
// 기본 지휘(18_ai-brain.js)는 그대로 두고, 이 모듈은 몇 초마다 한 번 '보조 판단'만 한다.
const AIX={every:4.5,linkEvery:14};
const AI_WPREF={   // 성향별 총기 선호 (가중치)
  aggressive:{assault:4,at:2,pistol:2,lmg:2,sniper:1},
  defensive:{lmg:4,sniper:3,assault:2,at:2,pistol:1},
  tricky:{sniper:4,pistol:3,assault:2,lmg:1,at:1},
  balanced:{assault:4,lmg:2,sniper:2,pistol:1,at:2}
};
function aiPick(w){let t=0;for(const k in w)t+=w[k];let r=Math.random()*t;for(const k in w){r-=w[k];if(r<=0)return k;}return Object.keys(w)[0];}
function aiFreeUnits(T){
  const sq=new Set((T.ai&&T.ai.squad)||[]);
  return G.units.filter(u=>u.team===T.id&&!u.dead&&u.state==='idle'&&!u.gar&&!u.garTarget&&!u.lay&&!u.task&&!u.queue.length&&!u.fetch&&!u.wf&&!u.item&&!sq.has(u.id));
}
// ---- 1. 무기고 · 총기 · 수류탄 ----
function aiArms(T,free){
  const A=T.ai,P=AIP[A.persona||'balanced']||AIP.balanced,mineN=popOf(T.id);
  if(!armories(T.id).length){
    A.saving=mineN>=10&&G.time>100&&T.trench.length>10;   // 무기고 값을 모으는 동안 충원을 잠시 미룬다
    if(mineN>=8&&T.trench.length>10&&free.length>=2&&canAfford(T,OB.armory.cost))
      aiBuildNear(T,free,(n)=>free.splice(0,n),T.flag,['armory']);
    return;
  }
  A.saving=false;
  // 입고된 총기를 병사에게 (소총 → 새 무기)
  const rifles=wCount(T.id,'rifle');
  for(const k of WEAPBUY){
    const have=wst(T)[k]|0;if(have<1||rifles<1)continue;
    if((T.swaps||[]).some(s=>s.to===k&&(s.left>0||s.fly>0)))continue;
    swapAdd(T.id,'rifle',k,Math.min(have,Math.max(1,Math.floor(rifles*.7))));
  }
}
// 헬기 구매 한 건(총기 또는 수류탄). 샀으면 true
function aiArmsBuy(T){
  const A=T.ai;if(!A||!T.pad||!armories(T.id).length||T.order.lines.length>=5)return false;
  const mineN=popOf(T.id),enemyVeh=G.vehicles.some(v=>!v.dead&&v.team!==T.id);
  const w=Object.assign({},AI_WPREF[A.persona||'balanced']);
  if(enemyVeh)w.at=(w.at||0)+4;else w.at=Math.min(w.at||0,1);
  const held=WEAPBUY.reduce((a,k)=>a+wCount(T.id,k)+(wst(T)[k]|0)+pendingWk(T,k),0);
  if(held<Math.ceil(mineN*.7)){
    const k=aiPick(w),want=WEAP[k].price<=60?4:WEAP[k].price<=100?3:2,n=Math.min(want,Math.floor((T.res.money-20)/WEAP[k].price));
    if(n>=1&&!shopAddWeapon(T.id,k,n))return true;
  }
  if(armFree(T.id)>=3&&pendingExp(T)<6&&T.res.money>=90){
    const k=aiPick({frag:4,molotov:2,flash:2,smoke:1});
    if(!shopAddExp(T.id,k,3))return true;
  }
  return false;
}
function pendingWk(T,k){let n=0;for(const l of T.order.lines)if(l.kind==='wpn'&&l.item===k)n+=l.n;return n;}
const _aiShopP=aiShop;
aiShop=function(T){
  if(T.ai&&T.ai.saving)return;
  if(T.ai&&popOf(T.id)>=10&&Math.random()<.8&&aiArmsBuy(T))return;
  return _aiShopP(T);
};
// ---- 2. 지형 연결 (사다리 · 다리) ----
function aiReach(T){
  const w=G.w,N=G.N,seen=new Uint8Array(N),q=[];
  const s=T.flag.y*w+T.flag.x;seen[s]=1;q.push(s);
  const walk=(i)=>{const o=G.obst[i];if(o&&OB[o.type].block)return false;if(G.tt[i]===2&&G.up[i]!==1)return false;return true;};
  for(let h=0;h<q.length;h++){
    const a=q[h],x=a%w,y=(a/w)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=G.h)continue;const b=ny*w+nx;
      if(seen[b]||!walk(b)||!stepOK(a,b))continue;
      seen[b]=1;q.push(b);
    }
  }
  return {seen,q};
}
function aiLink(T,free,tf){
  const A=T.ai;if(free.length<1)return;
  if(A.linkAt&&G.time-A.linkAt<22)return;   // 직전 연결 공사가 끝나길 기다린다
  const w=G.w,R=aiReach(T),t0=tf.y*w+tf.x;
  if(R.seen[t0])return;                      // 이미 닿는다
  let best=null,bs=1e9;
  const dist=(i)=>Math.hypot(i%w-tf.x,((i/w)|0)-tf.y);
  for(const a of R.q){
    const x=a%w,y=(a/w)|0;
    if(G.obst[a]||G.trench[a]&&G.trench[a]!==T.id+1)continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=G.h)continue;const b=ny*w+nx;
      if(R.seen[b])continue;
      const d=dist(b);if(d>=bs)continue;
      if(G.tt[b]===2&&G.up[b]!==1){   // 물: 다리
        if(taskCheck(T.id,'upg',nx,ny,'bridge')===null){bs=d;best=['bridge',nx,ny];}
      }else if(G.hill&&Math.abs(G.lv[b]-G.lv[a])>=CLIMB_MIN){   // 절벽: 사다리
        const p=ladderPair(a);
        if(p&&((p.lo===a&&p.hi===b)||(p.hi===a&&p.lo===b))&&taskCheck(T.id,'upg',x,y,'climb')===null){bs=d;best=['climb',x,y];}
      }
    }
  }
  if(!best)return;
  const t=getTask(T.id,'upg',best[1],best[2],best[0],true);
  if(t){orderTasks(free.splice(0,2),[t]);A.linkAt=G.time;}
}
// ---- 3. 동굴 탐사 · 채굴 ----
function aiMine(T,free){
  if(!G.ore||free.length<2)return;
  const A=T.ai,w=G.w;
  // 열린 광석부터
  let best=null,bd=1e9;
  for(let i=0;i<G.N;i++){
    if(!G.ore[i]||!G.open[T.id][i]||G.tasks.has(tkey('mine',i)))continue;
    const d=Math.hypot(i%w-T.flag.x,((i/w)|0)-T.flag.y);if(d<bd){bd=d;best=i;}
  }
  if(best!==null&&(T.res.metal<70||T.res.money<350||ORE[G.ore[best]].work<12)){
    const e=issueWork(T.id,'mine',[[best%w,(best/w)|0]],null,2,free);if(!e)return;
  }
  // 아직 못 찾았으면 가까운 동굴 입구로 정찰 병사를 보낸다
  if(best===null&&(!A.scoutAt||G.time-A.scoutAt>60)&&G.time>120){
    let m=-1,md=1e9;
    for(const i of G.trans){if(!G.mouth[i]||G.open[T.id][i])continue;const d=Math.hypot(i%w-T.flag.x,((i/w)|0)-T.flag.y);if(d<md&&d<G.w*.6){md=d;m=i;}}
    if(m>=0){const u=free.splice(0,2);orderMoveL(u,m%w,(m/w)|0,1);A.scoutAt=G.time;}
  }
}
// ---- 수입: 돈이 마르면 자연 건물을 철거해 달러·자재를 번다 ----
function aiIncome(T,free){
  if(free.length<2||T.res.money>=220)return;
  const A=T.ai;if(A.incAt&&G.time-A.incAt<12)return;
  let best=null,b2=1e9;
  for(const o of G.obSet){
    const d=OB[o.type];if(!o.natural||d.nodemo||!d.gain||!d.gain.money||G.tasks.has(tkey('demo',o.idx)))continue;
    const dd=Math.hypot(o.x-T.flag.x,o.y-T.flag.y);
    if(dd<b2&&dd<34){b2=dd;best=o;}
  }
  if(best){const t=getTask(T.id,'demo',best.x,best.y,null,true);if(t){orderTasks(free.splice(0,Math.min(3,free.length)),[t]);A.incAt=G.time;}}
}
function aiPlus(T){
  if(!T.ai||!T.flag||isDef())return;
  const free=aiFreeUnits(T);
  const foes=G.flags.filter(f=>f.team!==T.id&&G.teams[f.team].alive);if(!foes.length)return;
  let tf=foes[0],bs=1e9;for(const f of foes){const s=Math.hypot(f.x-T.flag.x,f.y-T.flag.y);if(s<bs){bs=s;tf=f;}}
  aiArms(T,free);
  {T.ai.lk=(T.ai.lk||0)-AIX.every;if(T.ai.lk<=0){T.ai.lk=AIX.linkEvery;aiLink(T,free,tf);}}
  aiMine(T,free);
  aiIncome(T,free);
}
const _aiTickP=aiTick;
aiTick=function(T,dt){
  T.apT=(T.apT||0)-dt;
  if(T.apT<=0&&G.phase==='play'){T.apT=AIX.every*(.9+Math.random()*.2);try{aiPlus(T);}catch(e){console.error('[AI+]',e);}}
  return _aiTickP(T,dt);
};
