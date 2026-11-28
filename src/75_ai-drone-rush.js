// ================= AI 성향 '군집(swarm)': 폭발 드론 주력 · 공세 우선 · 적진 돌입 =================
// 공방을 군수공장까지 키워 폭발 드론을 쉬지 않고 찍어 내고, 몇 기가 모이면 한꺼번에 날려 적 포대·병력 밀집지를 때린다.
// 드론이 터져 방어가 무너지는 동안 지상 병력도 곧바로 출격(공세 우선 · 돌격 전술 가중)해 적진으로 진입한다.
//  - 성향 확률: 약 20% (18_ai-brain.js 에서 정함) · 파츠 'droneRush' 는 AIPERSONA.swarm 에만 붙는다 → 다른 성향에 쓰려면 AIPERSONA 에 추가
//  - 조정값은 아래 DR 객체
const DR={every:2.5,minLaunch:3,saturate:6,maxAlive:12,samAvoid:27,jitter:.7};
AIP.swarm={delay:.45,frac:.85,ready:.5,ret:3,dig:.8,w:{rush:.45,frontal:.3,flank:.25,ambush:0}};
AI_WPREF.swarm={assault:5,pistol:2,lmg:1,sniper:1,at:2};
AIE.prof.swarm={crews:4,keepM:15,keepW:70,keepB:200,keepMoney:30,packs:3};
function drFoes(T){return G.teams.filter(t=>t&&t.id!==T.id&&!t.dead&&!isAllyT(T.id,t.id)&&t.id!==9);}
function drSams(T){const a=[];for(const o of G.obSet)if(o.type==='mortar'&&stLv(o)>=2&&(o.natural||!isAllyT(T.id,o.team)))a.push([o.x+.5,o.y+.5]);return a;}
function drSamCover(sams,x0,y0,x1,y1){   // 직선 비행경로가 SAM 사거리에 걸치는 길이 비율
  let hit=0;const N=8;for(let k=1;k<=N;k++){const x=x0+(x1-x0)*k/N,y=y0+(y1-y0)*k/N;if(sams.some(s=>Math.hypot(s[0]-x,s[1]-y)<DR.samAvoid))hit++;}return hit/N;
}
function drTargets(T,foes){
  const out=[],ids=new Set(foes.map(t=>t.id)),W={mg:3.2,bunker:3,tower:2.8,mortar:2.4,medbay:2.6,workshop:2,armory:3,sandbag:1.1,wire:1,fence:.8};
  for(const o of G.obSet){if(o.natural||!ids.has(o.team))continue;const w=W[o.type];if(!w)continue;const lv=stLv(o)||0;if(w<=1.1&&lv<1)continue;   // 일반 장애물은 건너뛰고 강화된 것만
    out.push({kind:'ob',e:o,x:o.x+(o.size||1)/2,y:o.y+(o.size||1)/2,w:w+lv*.5});}
  const us=G.units.filter(u=>!u.dead&&u.state!=='crew'&&ids.has(u.team)&&!u.lay);
  for(const u of us){let n=0;for(const q of us)if(q!==u&&Math.hypot(q.x-u.x,q.y-u.y)<3)n++;if(n>=2)out.push({kind:'unit',e:u,x:u.x,y:u.y,w:1.2+n*.9});}
  for(const c of G.civs||[])if(c.mil&&!c.dead&&isReclaim()){let n=0;for(const q of G.civs)if(q!==c&&q.mil&&!q.dead&&Math.hypot(q.x-c.x,q.y-c.y)<3)n++;if(n>=1)out.push({kind:'civ',e:c,x:c.x,y:c.y,w:1+n*.6});}
  for(const v of G.vehicles)if(!v.dead&&ids.has(v.team)&&v.type!=='drone')out.push({kind:'vehicle',e:v,x:v.x,y:v.y,w:2.2});
  return out;
}
function aiPartDroneRush(T,dt){
  if(!T.ai||T.dead||G.phase!=='play'||((G.cfg&&G.cfg.mode)==='defense'))return;
  const A=T.ai,mine=G.vehicles.filter(v=>v.team===T.id&&v.type==='drone'&&!v.dead);
  // 0) 금속 확보: 드론 한 기(금속 50)를 몇 기 찍을 만큼 없으면 철광 채굴을 우선하고, 달러가 있으면 금속을 사 온다
  const dm=OB.drone.cost.metal,ws0=[...G.obSet].find(o=>o.type==='workshop'&&!o.natural&&o.team===T.id),tier=ws0?wsTier(ws0):-1;
  const needM=tier<0?160:tier===0?110:tier===1?170:dm*3,needW=tier===0?65:tier===1?125:0;   // 공방 건설 150 · 공예소 100 · 군수공장 160(+목재) → 그다음 드론 50씩
  A.wantMetal=T.res.metal<needM;
  if(T.pad&&T.res.money>=140&&T.order.lines.length<SHOP.maxLines-1){
    const pend=k=>T.order.lines.some(l=>l.kind==='trade'&&l.to===k);
    if(T.res.metal<needM&&!pend('metal'))shopAddTrade(T.id,'money','metal',Math.min(Math.floor(T.res.money*.5),240));
    else if(T.res.wood<needW&&!pend('wood'))shopAddTrade(T.id,'money','wood',Math.min(Math.floor(T.res.money*.4),160));
  }
  // 0') 초반 철광 땅굴(79_swarm-econ.js): 코어 틱이 못 닿는 시기에도 직접 이어 판다
  if(!A.oreDone&&typeof aiSwarmTunnel==='function'){const fr=aiFreeUnits(T);try{aiSwarmTunnel(T,A,fr,n=>fr.splice(0,n));}catch(e){console.error('군집 땅굴 오류',e);}}
  // 1) 생산: 군수공장이 있으면 드론 건설 주문을 쉬지 않는다(동시에 최대 2건)
  if(wsHasFactory(T.id)){
    const inflight=[...G.tasks.values()].filter(q=>q.kind==='build'&&q.type==='drone'&&q.team===T.id).length;
    if(mine.length+inflight<DR.maxAlive&&inflight<2&&T.res.metal>=OB.drone.cost.metal+0)wsAiDroneBuild(T,aiFreeUnits(T));
  }
  // 2) 이미 날아가는 드론: 움직이는 목표는 현재 위치로 목적지를 갱신
  for(const v of mine){const tg=v.aiTarget;if(!tg||!v.droneDest)continue;
    if(tg.kind==='ob'?!G.obSet.has(tg.e):tg.e.dead){v.aiTarget=null;continue;}
    if(tg.kind!=='ob'){v.droneDest.x=tg.e.x;v.droneDest.y=tg.e.y;}}
  // 3) 발진: 대기 중인 드론이 일정 수 모이면 목표를 나눠서 한꺼번에
  const idle=mine.filter(v=>!v.droneDest);
  if(!idle.length)return;
  const foes=drFoes(T);if(!foes.length)return;
  const tg=drTargets(T,foes);if(!tg.length)return;
  const sams=drSams(T),cx0=idle.reduce((a,v)=>a+v.x,0)/idle.length,cy0=idle.reduce((a,v)=>a+v.y,0)/idle.length;
  // SAM 이 닿는 경로면 포화 숫자를 채울 때까지 기다린다
  const probe=tg.slice().sort((a,b)=>Math.hypot(a.x-cx0,a.y-cy0)-Math.hypot(b.x-cx0,b.y-cy0))[0];
  const covered=sams.length&&drSamCover(sams,cx0,cy0,probe.x,probe.y)>0;
  const need=covered?DR.saturate:DR.minLaunch,waited=G.time-(A.drLast||0);
  if(idle.length<need&&!(waited>70&&idle.length>=2&&!covered))return;
  const w=new Map(tg.map(t=>[t,t.w-Math.hypot(t.x-cx0,t.y-cy0)*.012]));
  for(const v of idle){
    let best=null,bs=-1e9;
    for(const t of tg){let s=w.get(t);if(sams.length&&drSamCover(sams,v.x,v.y,t.x,t.y)>0)s-=1.8;if(s>bs){bs=s;best=t;}}
    if(!best)break;
    w.set(best,w.get(best)*.55);   // 같은 목표에 몰리지 않도록 분산
    v.aiTarget=best;v.path=[];v.state='move';v.target=null;v.droneSense=0;
    v.droneDest={x:best.x+(Math.random()-.5)*DR.jitter,y:best.y+(Math.random()-.5)*DR.jitter};
  }
  A.drLast=G.time;
  // 4) 공세 우선: 드론이 방어를 흔드는 동안 지상 병력도 곧바로 출격
  A.attackAt=Math.min(A.attackAt===undefined?1e9:A.attackAt,G.time+6);
}
aiPart('droneRush',{name:'드론 군집 공세',desc:'폭발 드론을 쉬지 않고 생산해 한꺼번에 발진시키고, 지상 병력은 곧바로 적진에 돌입시킨다(성향 swarm 전용).',run:aiPartDroneRush,every:DR.every});
AIPERSONA.swarm=['droneRush'];
