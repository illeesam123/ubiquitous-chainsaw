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
  cfg:{size:64,soldiers:14,cap:360,pop:8,games:2,gens:20,turbo:true,dt:.12,aiStep:.3,idle:70,vary:true},pop:{},fit:{},gen:{},log:[],defaults:null,running:false,stop:false,onUpdate:null};
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
function spClone(g){return {p:g.p,v:Object.assign({},g.v),parts:Object.assign({},g.parts)};}
function spMutate(g,rate=.25,sig=.16){
  const c=spClone(g);
  for(const [k,lo,hi,int] of SPGENES)if(Math.random()<rate){let x=c.v[k]+(Math.random()+Math.random()+Math.random()-1.5)*2*sig*(hi-lo);x=spClamp(x,lo,hi);c.v[k]=int?Math.round(x):+x.toFixed(3);}
  for(const k of SPOPT)if(Math.random()<.08)c.parts[k]=c.parts[k]?0:1;
  return c;
}
function spCross(a,b){const c=spClone(a);for(const [k] of SPGENES)if(Math.random()<.5)c.v[k]=b.v[k];for(const k of SPOPT)if(Math.random()<.5)c.parts[k]=b.parts[k];return c;}
function spPartList(g){const l=['purge','core'];for(const k of SPOPT)if(g.parts[k])l.push(k);return l;}
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
function spEnded(){return popOf(0)===0||popOf(1)===0;}
function spScore(){   // 0 팀 관점의 0~1 점수
  const a=popOf(0),b=popOf(1);if(a===0&&b===0)return .5;if(b===0)return 1;if(a===0)return 0;
  const sa=spStrength(0),sb=spStrength(1);return spClamp(.5+(sa-sb)/(sa+sb+1)*.5,0,1)*.98;
}
async function spWaitLoad(){while(typeof LOAD!=='undefined'&&LOAD.on)await spSleep(30);}
// spec={a:genome(0팀),b:genome(1팀),seed} → 0팀 점수(0~1)
async function spMatch(spec){
  const c=SP.cfg,sc0=spec.scn||{},sz=sc0.size||c.size,cfg={seed:sc0.seed||spec.seed||('SP'+Math.random().toString(36).slice(2,8)),biome:sc0.biome||'plain',size:sz,enemies:1,soldiers:sc0.soldiers||c.soldiers,minDist:Math.round(sz*.45),noHills:sc0.hills===undefined?true:!sc0.hills};
  SP.active=true;
  spResetAllTables();   // 기본 표 + 두 유전자 (전역 수치는 a 의 값을 쓴다)
  spApplyGenome(spec.b,false);spApplyGenome(spec.a,true);
  if(SP.headless){_ldStart(cfg);}else{startGame(cfg);await spWaitLoad();}
  const fr=mulberry(hashStr(cfg.seed+'#flag')());let fx=0,fy=0;for(let k=0;k<400&&!fx;k++){const x=rint(fr,3,G.w-4),y=rint(fr,3,G.h-4);if(!flagCheck(x,y)){fx=x;fy=y;}}
  if(!fx){for(let y=3;y<G.h-3&&!fx;y++)for(let x=3;x<G.w-3;x++)if(!flagCheck(x,y)){fx=x;fy=y;break;}}
  placeFlag(0,fx,fy);aiPlaceFlags();
  const gs=[spec.a,spec.b];
  for(const T of G.teams){T.human=false;T.ai={persona:gs[T.id].p,parts:spPartList(gs[T.id])};}
  G.phase='play';G.countdown=0;
  const cap=c.cap;let result=null;
  if(SP.headless){
    G.paused=true;const turbo=c.turbo!==false,dt=turbo?(c.dt||.12):.05,aiStep=turbo?(c.aiStep||.3):0;let n=0,acc=0,lastKey='',lastT=0;
    while(SP.active&&G.time<cap&&!result){
      const t0=performance.now();
      while(G.time<cap&&performance.now()-t0<SP.budget){
        stepWorld(dt);acc+=dt;
        if(acc>=aiStep){for(const T of G.teams)if(!T.human&&teamCount(T.id)>0&&G.phase==='play')aiTick(T,acc);acc=0;}
        if(++n%10===0){
          if(spEnded()){result=spScore();break;}
          // 교착 판정: 한동안 양쪽 병력·전력이 그대로면 조기 종료
          const key=teamCount(0)+'/'+teamCount(1)+'/'+Math.round(spStrength(0)/8)+'/'+Math.round(spStrength(1)/8);
          if(key!==lastKey){lastKey=key;lastT=G.time;}
          else if(c.idle&&G.time>120&&G.time-lastT>c.idle){result=spScore();break;}
        }
      }
      await spSleep(0);
    }
  }else{
    G.paused=false;G.speed=SP.speed;
    while(SP.active&&G.time<cap){G.speed=SP.speed;if(G.runtimeError)break;if(spEnded())break;await spSleep(120);}
    G.paused=true;
  }
  const sc=result!==null?result:spScore();
  SP.active=false;spResetAllTables();spApplyBestAll();
  return sc;
}
// ---------- 진화 ----------
function spOppGenome(p){const b=SP.store.best[p];return b&&b.g?spClone(b.g):spDefaultGenome(p);}
function spInitPop(p){
  const base=SP.store.best[p]&&SP.store.best[p].g?spClone(SP.store.best[p].g):spDefaultGenome(p),pop=[base];
  while(pop.length<SP.cfg.pop)pop.push(spMutate(base,.45,.22));
  SP.pop[p]=pop;SP.gen[p]=SP.gen[p]||0;
}
// 한 세대의 평가 작업 목록(워커가 나눠 돌릴 수 있는 순수 JSON)
function spScenario(){   // 판마다 다른 시드·바이옴·맵 크기·언덕·병력
  const rs='S'+Math.random().toString(36).slice(2,9),r=mulberry(hashStr(rs+'#scn')());
  if(!SP.cfg.vary)return {seed:rs};
  const sizes=[48,56,64,72],keys=BIOME_KEYS.filter(k=>k!=='plain'||r()<.5);
  return {seed:rs,biome:keys[(r()*keys.length)|0],size:sizes[(r()*sizes.length)|0],hills:r()<.55,soldiers:10+((r()*9)|0)};
}
function spPlan(p){
  if(!SP.pop[p]||SP.pop[p].length!==SP.cfg.pop)spInitPop(p);
  // 한 세대의 모든 개체가 같은 시나리오(시드·상대·진영)를 치른다 → 개체끼리 공정하게 비교(짝지은 비교).
  const others=SPPERSONA.filter(q=>q!==p),jobs=[],scn=[];
  for(let j=0;j<SP.cfg.games;j++)scn.push({scn:spScenario(),op:spOppGenome(others[(Math.random()*others.length)|0]),side:Math.random()<.5});
  SP.pop[p].forEach((g,i)=>{for(const s of scn)jobs.push({i,p,genome:g,opp:s.op,side:s.side,scn:s.scn});});
  return jobs;
}
async function spRunJob(job){   // 0팀=a, 1팀=b. side=true 이면 후보가 1팀.
  const sc=await spMatch(job.side?{a:job.opp,b:job.genome,scn:job.scn}:{a:job.genome,b:job.opp,scn:job.scn});
  return job.side?1-sc:sc;
}
function spFinish(p,results){   // results: [{i,fit}]
  const pop=SP.pop[p],sum=pop.map(()=>0),cnt=pop.map(()=>0);
  for(const r of results){sum[r.i]+=r.fit;cnt[r.i]++;}
  const fit=pop.map((_,i)=>cnt[i]?sum[i]/cnt[i]:0),order=fit.map((f,i)=>i).sort((x,y)=>fit[y]-fit[x]);
  const best=pop[order[0]],avg=fit.reduce((a,b)=>a+b,0)/fit.length;
  SP.gen[p]=(SP.gen[p]||0)+1;
  SP.store.best[p]={g:spClone(best),fit:+fit[order[0]].toFixed(3),gen:SP.gen[p]};
  (SP.store.hist[p]=SP.store.hist[p]||[]).push({gen:SP.gen[p],best:+fit[order[0]].toFixed(3),avg:+avg.toFixed(3)});
  if(SP.store.hist[p].length>200)SP.store.hist[p].shift();
  const next=[spClone(pop[order[0]]),spClone(pop[order[1]||order[0]])],tour=()=>{const a=order[Math.floor(Math.random()*Math.ceil(pop.length*.6))],b=order[Math.floor(Math.random()*Math.ceil(pop.length*.6))];return pop[fit[a]>=fit[b]?a:b];};
  while(next.length<pop.length)next.push(spMutate(spCross(tour(),tour()),.22,.14));
  SP.pop[p]=next;spSave();
  return {gen:SP.gen[p],best:fit[order[0]],avg};
}
function spLog(s){SP.log.push(s);if(SP.log.length>60)SP.log.shift();if(SP.onUpdate)SP.onUpdate();}
async function spEvolve(personas,gens){
  if(SP.running)return;SP.running=true;SP.stop=false;
  try{
    for(let g=0;g<gens&&!SP.stop;g++)for(const p of personas){
      if(SP.stop)break;
      const jobs=spPlan(p),res=[];
      for(let j=0;j<jobs.length&&!SP.stop;j++){res.push({i:jobs[j].i,fit:await spRunJob(jobs[j])});SP.progress=`${p} 세대 ${(SP.gen[p]||0)+1} · ${j+1}/${jobs.length}판`;if(SP.onUpdate)SP.onUpdate();}
      if(SP.stop)break;
      const r=spFinish(p,res);spLog(`${p} 세대 ${r.gen}: 최고 ${r.best.toFixed(2)} · 평균 ${r.avg.toFixed(2)}`);spApplyBestAll();
    }
  }finally{SP.running=false;SP.active=false;SP.progress='';if(SP.onUpdate)SP.onUpdate();}
}
// 화면 보기: 선택한 두 성향의 최고 유전자끼리 시범 대결
async function spWatch(pa,pb){
  if(SP.running)return;SP.running=true;SP.headless=false;
  try{const s=await spMatch({a:spOppGenome(pa),b:spOppGenome(pb)});spLog(`시범 대결 ${pa} vs ${pb}: ${pa} 점수 ${s.toFixed(2)}`);}
  finally{SP.running=false;SP.active=false;if(SP.onUpdate)SP.onUpdate();}
}
// ---------- 렌더 생략·종료 판정 ----------
const _renderSP=render;
render=function(){
  if(SP.active&&SP.headless){cx.setTransform(DPR,0,0,DPR,0,0);cx.fillStyle='#0b0c08';cx.fillRect(0,0,W,H);cx.fillStyle='#d9ad4e';cx.font='16px system-ui';cx.textAlign='center';cx.fillText('🧬 자기대전 고속 연산 중 (화면 끔)',W/2,H/2-8);cx.fillStyle='#aaa';cx.font='12px system-ui';cx.fillText((SP.progress||'')+(G?` · 경과 ${G.time.toFixed(0)}초`:''),W/2,H/2+14);return;}
  return _renderSP();
};
const _checkEndSP=checkEnd;
checkEnd=function(){if(SP.active)return;return _checkEndSP();};
try{spLoad();}catch(e){console.error('자기대전 저장값 오류',e);}
