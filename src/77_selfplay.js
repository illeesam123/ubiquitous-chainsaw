// ================= 자기대전 연구소: AI 끼리 대결시켜 성향별 최선의 알고리즘을 진화시킨다 =================
// · 개체(유전자) = 파츠 선택(smart/economy/sniper/workshop/droneRush 켜기·끄기) + 수치 파라미터(성향 표·경제·드론 발진·채집 기준)
// · 적합도 = 다른 성향의 현재 최고 유전자(명예의 전당)와 맵을 바꿔 가며 붙여 얻은 0~1 점수(전멸승 1 · 시간 종료 시 전력 비율)
// · 두 가지 실행 방식: ① 화면 끄기(고속, 렌더 생략·연산에 시간 예산 배분) ② 화면 보기(일반 루프로 돌리고 배속 ×1~×20)
// · 결과는 localStorage('trench_ai_genomes_v1') 에 저장되고, 'assets/ai-genomes.js'(tools/selfplay.js 가 만든 파일)가 기본값이 된다.
// · 학습된 AI 사용 토글을 켜면 실제 대전의 각 성향이 최고 유전자를 쓴다(끄면 기존 값).
const SPPERSONA=['aggressive','defensive','tricky','balanced','swarm'];
const SPOPT=['smart','economy','sniper','workshop','droneRush'];
const SPGENES=[   // [키,최소,최대,정수?]
  ['delay',.3,2],['frac',.3,1],['ready',.3,1.6],['ret',.8,3.2],['dig',.6,1.8],
  ['wr',0,1],['wf',0,1],['wfl',0,1],['wa',0,1],
  ['crews',1,5,1],['keepM',0,250],['keepW',0,250],['keepB',50,450],['keepMoney',0,250],['packs',1,4,1],
  ['wAssault',0,6],['wLmg',0,6],['wSniper',0,6],['wPistol',0,6],['wAt',0,6],
  ['minLaunch',2,8,1],['saturate',4,12,1],['maxAlive',4,16,1],['low',6,24,1]
];
const SP={active:false,headless:true,speed:8,budget:40,store:{best:{},hist:{}},useBest:true,
  cfg:{size:64,soldiers:14,cap:900,pop:8,games:2,gens:20,joint:true,turbo:true,dt:.12,aiStep:.3,idle:0,vary:true},pop:{},fit:{},gen:{},log:[],defaults:null,running:false,stop:false,onUpdate:null};
const SPKEY='trench_ai_genomes_v1';
const spClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const spSleep=ms=>new Promise(r=>setTimeout(r,ms));
// ---------- 기본값 스냅샷 ----------
SP.defaults={AIP:JSON.parse(JSON.stringify(AIP)),AIE:JSON.parse(JSON.stringify(AIE.prof)),WP:JSON.parse(JSON.stringify(AI_WPREF)),DR:Object.assign({},DR),low:GATHER.low};
// ---------- 유전자 ----------
function spDefaultGenome(p){
  const D=SP.defaults,a=D.AIP[p]||D.AIP.balanced,e=D.AIE[p]||D.AIE.balanced,w=D.WP[p]||D.WP.balanced;
  const v={delay:a.delay,frac:a.frac,ready:a.ready,ret:a.ret,dig:a.dig,wr:a.w.rush||0,wf:a.w.frontal||0,wfl:a.w.flank||0,wa:a.w.ambush||0,
    crews:e.crews,keepM:e.keepM,keepW:e.keepW,keepB:e.keepB,keepMoney:e.keepMoney,packs:e.packs,
    wAssault:w.assault||0,wLmg:w.lmg||0,wSniper:w.sniper||0,wPistol:w.pistol||0,wAt:w.at||0,
    minLaunch:D.DR.minLaunch,saturate:D.DR.saturate,maxAlive:D.DR.maxAlive,low:D.low};
  const parts={};for(const k of SPOPT)parts[k]=k==='droneRush'?(p==='swarm'?1:0):1;
  return {p,v,parts};
}
function spClone(g){const c={p:g.p,v:Object.assign({},g.v),parts:Object.assign({},g.parts)};if(g.n){c.n=g.n;c.s=g.s;}return c;}   // n,s: 지금까지 치른 판 수·적합도 합(여러 세대에 걸친 평균을 위해)
function spFresh(g){delete g.n;delete g.s;return g;}
function spRel(g){const n=g.n||0;return n?g.s/n-.22/Math.sqrt(n):0;}   // 신뢰 하한: 판 수가 적은 '운 좋은 한 판'은 깎는다
function spMutate(g,rate=.25,sig=.16){
  const c=spClone(g);
  for(const [k,lo,hi,int] of SPGENES)if(Math.random()<rate){let x=c.v[k]+(Math.random()+Math.random()+Math.random()-1.5)*2*sig*(hi-lo);x=spClamp(x,lo,hi);c.v[k]=int?Math.round(x):+x.toFixed(3);}
  for(const k of SPOPT)if(Math.random()<.08)c.parts[k]=c.parts[k]?0:1;
  return spFresh(c);
}
function spCross(a,b){const c=spFresh(spClone(a));for(const [k] of SPGENES)if(Math.random()<.5)c.v[k]=b.v[k];for(const k of SPOPT)if(Math.random()<.5)c.parts[k]=b.parts[k];return c;}
function spPartList(g){const l=['purge','core'],force=g.p==='swarm'?['economy','workshop','droneRush']:[];for(const k of SPOPT)if(g.parts[k]||force.includes(k))l.push(k);return l;}   // 군집형은 경제·공방·드론 파츠가 필수
// ---------- 유전자 적용 ----------
function spResetGlobals(){const D=SP.defaults;Object.assign(DR,D.DR);GATHER.low=D.low;}
function spApplyGenome(g,globals){
  const v=g.v,w={rush:v.wr,frontal:v.wf,flank:v.wfl,ambush:v.wa};
  if(!(w.rush+w.frontal+w.flank+w.ambush>0.01))w.frontal=1;
  AIP[g.p]={delay:v.delay,frac:v.frac,ready:v.ready,ret:v.ret,dig:v.dig,w};
  AIE.prof[g.p]={crews:v.crews,keepM:v.keepM,keepW:v.keepW,keepB:v.keepB,keepMoney:v.keepMoney,packs:v.packs};
  AI_WPREF[g.p]={assault:v.wAssault,lmg:v.wLmg,sniper:v.wSniper,pistol:v.wPistol,at:v.wAt};
  if(globals){DR.minLaunch=v.minLaunch;DR.saturate=v.saturate;DR.maxAlive=v.maxAlive;GATHER.low=v.low;}
}
function spResetAllTables(){const D=SP.defaults;for(const p of Object.keys(D.AIP))AIP[p]=JSON.parse(JSON.stringify(D.AIP[p]));for(const p of Object.keys(D.AIE))AIE.prof[p]=Object.assign({},D.AIE[p]);for(const p of Object.keys(D.WP))AI_WPREF[p]=Object.assign({},D.WP[p]);spResetGlobals();}
// 실제 대전용: 저장된 최고 유전자를 성향 표에 적용(swarm 을 마지막에 적용해 드론 수치가 그 값이 된다)
function spApplyBestAll(){
  spResetAllTables();SP.partsOf={};
  if(!SP.useBest)return;
  for(const p of SPPERSONA.slice().sort((a,b)=>(a==='swarm')-(b==='swarm'))){const b=SP.store.best[p];if(!b||!b.g)continue;spApplyGenome(b.g,p==='swarm');SP.partsOf[p]=spPartList(b.g);}
}
const _aiPartIdsSP=aiPartIds;
aiPartIds=function(T){
  const A=T.ai;
  if(A&&!A.parts&&SP.useBest&&SP.partsOf&&SP.partsOf[A.persona]&&((G.cfg&&G.cfg.mode)||'normal')==='normal')return SP.partsOf[A.persona];
  return _aiPartIdsSP(T);
};
// ---------- 저장/불러오기 ----------
function spLoad(){
  try{if(typeof AI_GENOMES!=='undefined'&&AI_GENOMES&&AI_GENOMES.best)SP.store=JSON.parse(JSON.stringify(AI_GENOMES));}catch(e){}
  try{const s=localStorage.getItem(SPKEY);if(s){const o=JSON.parse(s);if(o&&o.best)SP.store=o;}}catch(e){}
  try{const u=localStorage.getItem(SPKEY+'_use');if(u!==null)SP.useBest=u==='1';}catch(e){}
  SP.store.best=SP.store.best||{};SP.store.hist=SP.store.hist||{};
  spApplyBestAll();
}
function spSave(){try{localStorage.setItem(SPKEY,JSON.stringify(SP.store));}catch(e){}}
function spExport(){return JSON.stringify(SP.store);}
function spImport(txt){const o=JSON.parse(txt);if(!o||!o.best)throw new Error('형식이 맞지 않습니다');SP.store=o;o.hist=o.hist||{};spSave();spApplyBestAll();}
// ---------- 한 판 ----------
function spStrength(id){
  let s=0;for(const u of G.units)if(!u.dead&&u.team===id)s+=3;
  for(const v of G.vehicles)if(!v.dead&&v.team===id)s+=v.type==='drone'?1.5:v.type==='tank'?9:4;
  for(const o of G.obSet)if(!o.natural&&o.team===id&&OB[o.type]&&OB[o.type].building)s+=2.5;
  const r=G.teams[id].res;return s+(r.money+r.metal*2+r.wood)*.012;
}
function spAliveN(){let n=0;for(const T of G.teams)if(popOf(T.id)>0)n++;return n;}
function spEnded(){return spAliveN()<=1;}
function spTrackOut(out){for(const T of G.teams)if(out[T.id]===undefined&&popOf(T.id)===0)out[T.id]=G.time;}
// 팀별 점수(0~1)와 순위(나쁜→좋은). 2팀: 전력 비율, 3~5팀: 순위 70% + 전력 점유 30%.
function spScores(out){
  const n=G.teams.length,st=G.teams.map((T,i)=>spStrength(i)),al=G.teams.map((T,i)=>popOf(i)>0);
  if(n===2){const a=popOf(0),b=popOf(1),f=spClamp(G.time/(SP.cfg.cap||900),0,1);let s0;
    // 이기면 빨리 이길수록, 지면 오래 버틸수록 점수가 더 높다(0/1 로 포화되어 기울기가 사라지는 것을 막는다). 승 .78~1 > 판정 .3~.7 > 패 .05~.22
    if(a===0&&b===0)s0=.5;else if(b===0)s0=.78+.22*(1-f);else if(a===0)s0=.05+.17*f;else s0=.3+.4*(st[0]/(st[0]+st[1]+1));
    return {sc:[s0,1-s0],order:s0>=.5?[1,0]:[0,1],ko:(a===0)!==(b===0)};}
  const ids=[...Array(n).keys()],dead=ids.filter(i=>!al[i]).sort((x,y)=>(out[x]||0)-(out[y]||0)),live=ids.filter(i=>al[i]).sort((x,y)=>st[x]-st[y]),order=dead.concat(live),sum=st.reduce((a,b)=>a+b,0)+1,sc=[];
  order.forEach((id,r)=>{sc[id]=spClamp(.7*r/(n-1)+.3*Math.min(1,st[id]/sum*n/2),0,1)*.98;});
  return {sc,order,ko:live.length<=1};
}
async function spWaitLoad(){while(typeof LOAD!=='undefined'&&LOAD.on)await spSleep(30);}
// spec={gs:[유전자…](팀 0..n-1) 또는 a,b, scn} → 팀별 점수 배열
async function spMatch(spec){
  const gs=spec.gs||[spec.a,spec.b],n=gs.length;
  const c=SP.cfg,sc0=spec.scn||{},sz=sc0.size||(n>2?Math.max(c.size,64):c.size),cfg={seed:sc0.seed||spec.seed||('SP'+Math.random().toString(36).slice(2,8)),biome:sc0.biome||'plain',size:sz,enemies:n-1,soldiers:sc0.soldiers||c.soldiers,minDist:Math.round(sz*(n>2?.28:.45)),noHills:sc0.hills===undefined?true:!sc0.hills};
  SP.active=true;SP.inMatch=true;
  spResetAllTables();   // 기본 표 + 유전자들 (전역 수치는 0번 팀 값을 쓴다)
  for(let i=n-1;i>=1;i--)spApplyGenome(gs[i],false);spApplyGenome(gs[0],true);
  if(SP.headless){_ldStart(cfg);}else{SP.selfStart=true;try{startGame(cfg);}finally{SP.selfStart=false;}await spWaitLoad();}
  if(!SP.userBusy)SP.spG=G;
  const fr=mulberry(hashStr(cfg.seed+'#flag')());let fx=0,fy=0;for(let k=0;k<400&&!fx;k++){const x=rint(fr,3,G.w-4),y=rint(fr,3,G.h-4);if(!flagCheck(x,y)){fx=x;fy=y;}}
  if(!fx){for(let y=3;y<G.h-3&&!fx;y++)for(let x=3;x<G.w-3;x++)if(!flagCheck(x,y)){fx=x;fy=y;break;}}
  for(const T of G.teams){T.human=false;T.ai={persona:gs[T.id].p,parts:spPartList(gs[T.id])};}   // 깃발 배치 전에 성향을 정해 둔다(군집형은 광석·바위 밀집지 선호)
  if(gs[0].p==='swarm'&&typeof swarmFlagSpot==='function'){const sp=swarmFlagSpot();if(sp){fx=sp[0];fy=sp[1];}}
  placeFlag(0,fx,fy);aiPlaceFlags();
  G.phase='play';G.countdown=0;
  const cap=c.cap,out={};let done=false;
  if(SP.headless){
    G.paused=true;const turbo=c.turbo!==false,dt=turbo?(c.dt||.12):.05,aiStep=turbo?(c.aiStep||.3):0;let k=0,acc=0,lastKey='',lastT=0;
    while(SP.active&&G.time<cap&&!done){
      const t0=performance.now();
      while(G.time<cap&&performance.now()-t0<SP.budget){
        stepWorld(dt);acc+=dt;
        if(acc>=aiStep){for(const T of G.teams)if(!T.human&&teamCount(T.id)>0&&G.phase==='play')aiTick(T,acc);acc=0;}
        if(++k%10===0){
          spTrackOut(out);
          if(spEnded()){done=true;break;}
          // (선택) 교착 판정: idle 초 동안 병력·전력 변화가 없으면 종료
          const key=G.teams.map((T,i)=>teamCount(i)+'/'+Math.round(spStrength(i)/8)).join('|');
          if(key!==lastKey){lastKey=key;lastT=G.time;}
          else if(c.idle&&G.time>120&&G.time-lastT>c.idle){done=true;break;}
        }
      }
      await spSleep(SPW?spYieldMs():0);
    }
  }else{
    G.paused=false;G.speed=SP.speed;
    while(SP.active&&G.time<cap){G.speed=SP.speed;if(G.runtimeError)break;spTrackOut(out);if(spEnded())break;await spSleep(120);}
    G.paused=true;
  }
  spTrackOut(out);
  const R=spScores(out),w=R.order[R.order.length-1],close=n===2&&Math.abs(R.sc[0]-.5)<.02;
  {const rep={ps:gs.map(g=>g.p),winner:close?-1:w,wp:close?null:gs[w].p,order:R.order.slice().reverse(),time:G.time,how:R.ko?'ko':'time'};
   if(SPW)spWorkerPost(Object.assign({type:'match'},rep));
   else{spResCard('🧬 '+spResText(rep),spResSub(rep));
     if(!SP.headless&&G){G.over=w===0?'win':'lose';G.phase='over';try{showOver();$('ovT').textContent=spResText(rep);$('ovS').textContent=spResSub(rep)+' · '+Math.floor(G.time/60)+'분 '+Math.floor(G.time%60)+'초';}catch(e){}}}}
  SP.active=false;SP.inMatch=false;spResetAllTables();spApplyBestAll();
  return R.sc;
}
// ---------- 진화 ----------
function spOppGenome(p){const b=SP.store.best[p];return b&&b.g?spClone(b.g):spDefaultGenome(p);}
// 학습용 상대: 현재 최고 55% · 과거 최고(명예의 전당) 25% · 기본 AI 20% → 상대가 계속 바뀌는 '움직이는 표적'과 서로 물려 도는 현상을 줄이고, 기본 AI에도 지지 않도록 한다
function spOppPick(p){
  const r=Math.random(),hof=(SP.store.hof&&SP.store.hof[p])||[];
  if(r<.2)return spDefaultGenome(p);
  if(r<.45&&hof.length)return spFresh(spClone(hof[(Math.random()*hof.length)|0]));
  return spFresh(spOppGenome(p));
}
function spInitPop(p){
  const has=SP.store.best[p]&&SP.store.best[p].g,base=has?spClone(SP.store.best[p].g):spDefaultGenome(p),pop=[base];if(has)base._hof=1;
  while(pop.length<SP.cfg.pop)pop.push(spMutate(base,.45,.22));
  SP.pop[p]=pop;SP.gen[p]=SP.gen[p]||0;
}
// 한 세대의 평가 작업 목록(워커가 나눠 돌릴 수 있는 순수 JSON)
function spModeN(){const m=SP.cfg.mode||'duel';if(m==='mixed'){const r=Math.random();return r<.4?2:r<.6?3:r<.8?4:5;}return m==='duel'?2:+m||2;}
function spScenario(){   // 판마다 다른 시드·바이옴·맵 크기·언덕·병력·인원
  const rs='S'+Math.random().toString(36).slice(2,9),r=mulberry(hashStr(rs+'#scn')()),n=spModeN();
  if(!SP.cfg.vary)return {seed:rs,n};
  const sizes=n>2?[64,72,80]:[48,56,64,72],keys=BIOME_KEYS.filter(k=>k!=='plain'||r()<.5);
  return {seed:rs,n,biome:keys[(r()*keys.length)|0],size:sizes[(r()*sizes.length)|0],hills:r()<.55,soldiers:10+((r()*(n>2?6:9))|0)};
}
function spShuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
function spPlan(p){
  if(!SP.pop[p]||SP.pop[p].length!==SP.cfg.pop)spInitPop(p);
  // 한 세대의 모든 개체가 같은 시나리오(시드·인원·상대들·자리)를 치른다 → 개체끼리 공정하게 비교(짝지은 비교).
  const others=SPPERSONA.filter(q=>q!==p),jobs=[],scn=[];
  for(let j=0;j<SP.cfg.games;j++){const sc=spScenario(),n=sc.n||2;
    const ops=(n-1<=others.length?spShuffle(others).slice(0,n-1):others.concat(spShuffle(SPPERSONA).slice(0,n-1-others.length))).map(spOppPick);
    scn.push({scn:sc,ops,seat:(Math.random()*n)|0});}
  SP.pop[p].forEach((g,i)=>{for(const s of scn)jobs.push({i,p,genome:g,ops:s.ops,seat:s.seat,scn:s.scn});});
  return jobs;
}
// ---- 공동 학습: 한 판에 나온 '모든' 성향이 같이 평가·학습한다 ----
// 후보 한 명만 점수를 받던 방식은 다른 AI 가 이긴 판을 버렸다. 이제 판마다 각 자리(성향별 개체)가 자기 순위·점수를 기록한다.
// 75%: 필요한 성향들을 함께 앉혀 전원 기록 / 25%: 한 성향만 기록하고 나머지는 현재최고·과거최고·기본 AI(기준점 유지).
function spPlanJoint(ps){
  for(const p of ps)if(!SP.pop[p]||SP.pop[p].length!==SP.cfg.pop)spInitPop(p);
  const q={};for(const p of ps){q[p]=[];for(let k=0;k<SP.cfg.games;k++)q[p].push(...spShuffle([...Array(SP.pop[p].length).keys()]));}
  const jobs=[];
  for(;;){
    const need=ps.filter(p=>q[p].length);if(!need.length)break;
    const sc=spScenario(),n=sc.n||2,bench=Math.random()<.25;
    let rec=spShuffle(need).sort((a,b)=>q[b].length-q[a].length).slice(0,bench?1:Math.min(n,need.length));
    const seats=rec.map(p=>{const i=q[p].pop();return {p,i,g:spClone(SP.pop[p][i])};});
    const rest=spShuffle(SPPERSONA.filter(x=>!rec.includes(x)));
    while(seats.length<n)seats.push({p:null,g:spOppPick(rest.pop())});
    const ord=spShuffle(seats);
    jobs.push({gs:ord.map(x=>x.g),rec:ord.map(x=>x.p?{p:x.p,i:x.i}:null),scn:sc});
  }
  return jobs;
}
async function spRunJoint(job){
  const sc=await spMatch({gs:job.gs,scn:job.scn}),out=[];
  job.rec.forEach((r,k)=>{if(r)out.push({p:r.p,i:r.i,fit:sc[k]});});
  return out;
}
function spFinishJoint(ps,res){return ps.map(p=>Object.assign({p},spFinish(p,res.filter(x=>x.p===p).map(x=>({i:x.i,fit:x.fit})))));}
async function spRunJob(job){   // 후보는 job.seat 번 팀, 나머지는 job.ops 순서대로
  const gs=job.ops.slice();gs.splice(job.seat,0,job.genome);
  const sc=await spMatch({gs,scn:job.scn});
  return sc[job.seat];
}
function spFinish(p,results){   // results: [{i,fit}]
  const pop=SP.pop[p],sum=pop.map(()=>0),cnt=pop.map(()=>0);
  for(const r of results){sum[r.i]+=r.fit;cnt[r.i]++;}
  // 개체별 누적 통계: 살아남은 개체는 지난 세대 기록을 70% 만 이어받아(오래된 시나리오의 운은 잊는다) 새 판 결과와 합친다
  pop.forEach((g,i)=>{if(!cnt[i])return;const n0=(g.n||0)*.7,s0=(g.s||0)*.7;g.n=n0+cnt[i];g.s=s0+sum[i];});
  const rel=pop.map(spRel),order=rel.map((f,i)=>i).sort((x,y)=>rel[y]-rel[x]);
  const gen=SP.gen[p]=(SP.gen[p]||0)+1,top=pop[order[0]];
  const thisFit=cnt[order[0]]?sum[order[0]]/cnt[order[0]]:0,avg=pop.reduce((a,g,i)=>a+(cnt[i]?sum[i]/cnt[i]:0),0)/pop.length;
  // 명예의 전당: 새 최고가 저장된 최고보다 (같은 시나리오에서 함께 평가된 뒤) 신뢰 하한이 높을 때만 교체한다 → 운 좋은 한 판으로 퇴보하지 않는다
  const st=SP.store;st.hof=st.hof||{};st.stall=st.stall||{};
  const cur=st.best[p]&&st.best[p].g,curIdx=cur?pop.findIndex(g=>g._hof):-1;
  let improved=false;
  if(!cur||curIdx<0||rel[order[0]]>rel[curIdx]+.01){
    if(cur){(st.hof[p]=st.hof[p]||[]).push(spFresh(spClone(cur)));if(st.hof[p].length>6)st.hof[p].shift();}
    st.best[p]={g:spClone(top),fit:+(top.s/top.n).toFixed(3),gen,n:+top.n.toFixed(1)};improved=true;
  }else{const b=pop[curIdx];st.best[p]={g:spClone(b),fit:+(b.s/b.n).toFixed(3),gen:st.best[p].gen,n:+b.n.toFixed(1)};}
  st.stall[p]=improved?0:(st.stall[p]||0)+1;
  (st.hist[p]=st.hist[p]||[]).push({gen,best:+thisFit.toFixed(3),avg:+avg.toFixed(3),rel:+rel[order[0]].toFixed(3)});
  if(st.hist[p].length>200)st.hist[p].shift();
  // 다음 세대: 최고(재평가용으로 항상 포함) + 이번 상위 + 적응형 변이(정체되면 변이를 키우고, 오래 정체되면 새 피를 수혈)
  const stall=st.stall[p],sig=.1+.03*Math.min(stall,8),rate=.2+.03*Math.min(stall,8);
  const best=spClone(st.best[p].g);best._hof=1;
  const next=[best];if(order[0]!==pop.indexOf(top)||true){const t2=spClone(top);if(JSON.stringify(t2.v)!==JSON.stringify(best.v))next.push(t2);}
  const pool=order.slice(0,Math.max(3,Math.ceil(pop.length*.5))),tour=()=>{const a=pool[(Math.random()*pool.length)|0],b=pool[(Math.random()*pool.length)|0];return pop[rel[a]>=rel[b]?a:b];};
  if(stall>=10&&next.length<pop.length)next.push(spMutate(spDefaultGenome(p),.6,.3));
  while(next.length<pop.length){
    const k=Math.random();   // 40% 최고 주변 탐색(exploit) · 60% 상위끼리 교배 후 변이
    next.push(k<.4?spMutate(best,rate,sig*.7):spMutate(spCross(tour(),tour()),rate,sig));
  }
  SP.pop[p]=next;spSave();
  return {gen,best:thisFit,avg,rel:rel[order[0]],stall};
}
function spLog(s){SP.log.push(s);if(SP.log.length>60)SP.log.shift();if(SP.onUpdate)SP.onUpdate();}
async function spEvolve(personas,gens){
  if(SP.running)return;SP.running=true;SP.stop=false;if(!SPW)spWorkerStop();
  try{
    if(personas.length>=2&&SP.cfg.joint!==false){   // 공동 학습
      for(let g=0;(gens<=0||g<gens)&&!SP.stop;g++){
        const jobs=spPlanJoint(personas),res=[];
        for(let j=0;j<jobs.length&&!SP.stop;j++){res.push(...await spRunJoint(jobs[j]));SP.progress=`공동 학습 · ${j+1}/${jobs.length}판`;if(SPW)spWorkerPost({type:'prog',prog:SP.progress});if(SP.onUpdate)SP.onUpdate();}
        if(SP.stop)break;
        for(const r of spFinishJoint(personas,res)){const ln=`${r.p} 세대 ${r.gen}: 최고 ${r.best.toFixed(2)} · 평균 ${r.avg.toFixed(2)} · 신뢰 ${r.rel.toFixed(2)}${r.stall?' · 정체 '+r.stall:''}`;spLog(ln);spWorkerPost({type:'gen',line:ln,prog:ln});}
        if(!SPW)spApplyBestAll();
      }
    }else for(let g=0;(gens<=0||g<gens)&&!SP.stop;g++)for(const p of personas){
      if(SP.stop)break;
      const jobs=spPlan(p),res=[];
      for(let j=0;j<jobs.length&&!SP.stop;j++){res.push({i:jobs[j].i,fit:await spRunJob(jobs[j])});SP.progress=`${p} 세대 ${(SP.gen[p]||0)+1} · ${j+1}/${jobs.length}판`;if(SPW)spWorkerPost({type:'prog',prog:SP.progress});if(SP.onUpdate)SP.onUpdate();}
      if(SP.stop)break;
      const r=spFinish(p,res);const ln=`${p} 세대 ${r.gen}: 최고 ${r.best.toFixed(2)} · 평균 ${r.avg.toFixed(2)} · 신뢰 ${r.rel.toFixed(2)}${r.stall?' · 정체 '+r.stall:''}`;spLog(ln);spWorkerPost({type:'gen',line:ln,prog:ln});if(!SPW)spApplyBestAll();
    }
  }finally{SP.running=false;SP.active=false;SP.progress='';if(!SPW&&SP.auto)setTimeout(spWorkerStart,500);if(SP.onUpdate)SP.onUpdate();}
}
// 화면 보기: 선택한 두 성향의 최고 유전자끼리 시범 대결
async function spWatch(ps){
  if(!Array.isArray(ps))ps=[].slice.call(arguments);
  if(SP.running)return;SP.running=true;SP.headless=false;if(!SPW)spWorkerStop();
  try{const gs=ps.map(spOppGenome);await spMatch({gs});spLog('시범 대결 '+ps.map(p=>SPNAME[p]).join(' vs '));}
  finally{SP.running=false;SP.active=false;if(!SPW&&SP.auto)setTimeout(spWorkerStart,500);if(SP.onUpdate)SP.onUpdate();}
}
// ---------- 렌더 생략·종료 판정 ----------
const _renderSP=render;
render=function(){
  if(SP.active&&SP.headless){cx.setTransform(DPR,0,0,DPR,0,0);cx.fillStyle='#0b0c08';cx.fillRect(0,0,W,H);cx.fillStyle='#d9ad4e';cx.font='16px system-ui';cx.textAlign='center';cx.fillText('🧬 자기대전 고속 연산 중 (화면 끔)',W/2,H/2-8);cx.fillStyle='#aaa';cx.font='12px system-ui';cx.fillText((SP.progress||'')+(G?` · 경과 ${G.time.toFixed(0)}초`:''),W/2,H/2+14);return;}
  return _renderSP();
};
const _checkEndSP=checkEnd;
checkEnd=function(){if(SP.active)return;return _checkEndSP();};
// ---------- 켜 둔 동안(플레이 중에도) 자동 학습 ----------
// 보이지 않는 iframe 안에 같은 게임을 하나 더 띄워 고속·저비중으로 학습한다(게임 상태 G 는 iframe 마다 따로라 플레이와 충돌하지 않는다).
// 종료는 한쪽이 전멸(승리 조건)할 때. 결과는 같은 localStorage 로 공유하고, 판이 끝날 때마다 postMessage 로 결과 카드를 띄운다.
const SPNAME={aggressive:'공세형',defensive:'수비형',tricky:'교란형',balanced:'균형형',swarm:'군집형'};
const SPW=/[?&]spworker=1/.test(location.search);
SP.worker=SPW;SP.auto=false;SP.load=25;   // load: 백그라운드 CPU 비중(%)
function spWorkerPost(o){try{if(SPW)parent.postMessage(Object.assign({sp:1},o),'*');}catch(e){}}
function spYieldMs(){const b=SP.budget||6,l=clamp(SP.load||25,5,90);return Math.round(b*(100-l)/l);}
function spWorkerEl(){return document.getElementById('spWorker');}
function spWorkerCfg(){const f=spWorkerEl();if(f&&f.contentWindow)try{f.contentWindow.postMessage({sp:1,type:'cfg',cfg:SP.cfg,load:SP.load,vary:SP.cfg.vary},'*');}catch(e){}}
function spWorkerStart(){
  if(SPW||spWorkerEl()||SP.running)return;
  const f=document.createElement('iframe');f.id='spWorker';f.src=location.pathname+'?spworker=1';f.style.cssText='position:fixed;left:-9999px;top:0;width:480px;height:320px;border:0;opacity:0;pointer-events:none';f.setAttribute('aria-hidden','true');f.tabIndex=-1;
  f.onload=()=>setTimeout(spWorkerCfg,300);document.body.appendChild(f);
}
function spWorkerStop(){const f=spWorkerEl();if(f)f.remove();}
function spAutoSet(on){SP.auto=!!on;try{localStorage.setItem(SPKEY+'_auto',on?'1':'0');}catch(e){}if(on)spWorkerStart();else spWorkerStop();if(SP.onUpdate)SP.onUpdate();}
function spResCard(t,sub){
  let c=document.getElementById('spRes');if(!c){c=document.createElement('div');c.id='spRes';c.style.cssText='position:fixed;left:12px;bottom:12px;z-index:95;background:rgba(18,20,14,.94);border:1px solid #d9ad4e;border-radius:10px;padding:10px 14px;color:#eee;font:13px system-ui;max-width:280px;box-shadow:0 4px 18px #0008;transition:opacity .4s';document.body.appendChild(c);}
  c.innerHTML=`<b style="color:#d9ad4e;font-size:14px">${t}</b><div style="color:#aaa;margin-top:3px;font-size:11px">${sub||''}</div>`;c.style.opacity=1;c.style.display='';
  clearTimeout(c._t);c._t=setTimeout(()=>{c.style.opacity=0;setTimeout(()=>{if(c.style.opacity==='0')c.style.display='none';},450);},6000);
}
function spResText(r){return r.winner<0?`무승부 — 제한시간 종료`:`팀 ${SPNAME[r.wp]}이 승리하였습니다!`;}
function spResSub(r){const n=r.ps.length;if(n<=2)return `${SPNAME[r.ps[0]]} vs ${SPNAME[r.ps[1]]}${r.how==='ko'?'':' · 제한시간 판정'}`;return `${n}인 개인전 · `+r.order.map((id,k)=>`${k+1}위 ${SPNAME[r.ps[id]]}`).join(' ')+(r.how==='ko'?'':' · 제한시간 판정');}
if(!SPW)window.addEventListener('message',e=>{
  const f=spWorkerEl(),d=e.data;if(!d||!d.sp||!f||e.source!==f.contentWindow)return;
  if(d.type==='match'){const t=Math.floor(d.time);spResCard('🧬 '+spResText(d),spResSub(d)+` · ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`);}
  else if(d.type==='gen'){try{spLoad();}catch(_){}if(!(G&&G.phase==='play'))spApplyBestAll();SP.log.push(d.line);if(SP.log.length>60)SP.log.shift();SP.progress='백그라운드 학습: '+d.prog;if(SP.onUpdate)SP.onUpdate();}
  else if(d.type==='prog'){SP.progress='백그라운드 학습: '+d.prog;if(SP.onUpdate)SP.onUpdate();}
});
if(SPW)window.addEventListener('message',e=>{const d=e.data;if(!d||!d.sp||e.source!==parent)return;if(d.type==='cfg'){Object.assign(SP.cfg,d.cfg);SP.load=d.load;}});
const _startGameSP=startGame;
startGame=function(cfg){if(!SPW&&!SP.selfStart&&SP.useBest&&!SP.active)try{spApplyBestAll();}catch(e){}return _startGameSP(cfg);};
if(SPW){SP.headless=true;SP.budget=6;SP.load=25;
  const go=()=>{if(SP.running)return;spEvolve(SPPERSONA,0);};
  window.addEventListener('load',()=>setTimeout(go,800));
  for(const fn of ['sfx','musTick'])if(typeof window[fn]==='function')window[fn]=function(){};
}
try{spLoad();}catch(e){console.error('자기대전 저장값 오류',e);}
try{SP.auto=localStorage.getItem(SPKEY+'_auto')==='1';}catch(e){}
try{const c=JSON.parse(localStorage.getItem(SPKEY+'_cfg')||'null');if(c)Object.assign(SP.cfg,c);}catch(e){}   // 연구소 입력값(개체수·판/개체 등)은 저장해 두었다가 자동 학습에도 쓴다
if(SP.auto&&!SPW)window.addEventListener('load',()=>setTimeout(spWorkerStart,2500));
