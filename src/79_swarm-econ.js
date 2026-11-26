// ================= 군집형 채굴 강화 + AI 채굴 작업 깜빡임 수정 =================
// 1) 군집형은 철광·바위가 밀집한 곳에 기지를 세운다(깃발 배치 가중).
// 2) 초반(12초~)부터 기지 참호에서 수직갱을 파고 가장 가까운 '닫힌 철광' 쪽으로 땅굴을 뚫어 광맥을 연다.
// 3) 철광은 항상 최우선으로 캐고, 밀집한 바위·나무는 범위로 묶어 더 크게(바위 가중 ×1.9, 작업 +1) 채집한다.
// 4) 깜빡임 수정: 길이 없어 곧바로 취소된 작업(mine/demo/bush)을 AI 가 매 틱 다시 내리던 문제 →
//    그런 목표를 기억해 두었다가 20초부터 최대 4분까지 점점 길게 건너뛴다.
const SWM={flagR:16,rockR:9,sample:900,tunCap:72,tunStart:12};
// ---- (4) 실패 목표 기억 ----
const _mkTaskXSW=mkTaskX;
mkTaskX=function(team,kind,x,y,type,work,cost,lay){const t=_mkTaskXSW(team,kind,x,y,type,work,cost,lay);if(t)t.born=G.time;return t;};
const _dropTaskSW=dropTask;
dropTask=function(t,doRefund){
  try{
    const T=G.teams[t.team];
    if(T&&T.ai&&t.born!==undefined&&G.time-t.born<15&&t.workers.size===0&&(t.kind==='mine'||t.kind==='demo'||t.kind==='bush')){
      const b=T.ai.bad||(T.ai.bad=new Map()),o=b.get(t.key)||{n:0};o.n++;o.until=G.time+Math.min(240,20*Math.pow(2,o.n-1));b.set(t.key,o);
    }
  }catch(e){}
  return _dropTaskSW(t,doRefund);
};
function aiBadKey(T,key){const b=T.ai&&T.ai.bad;if(!b)return false;const o=b.get(key);if(!o)return false;if(o.until<=G.time){return false;}return true;}
// ---- (1) 군집형 깃발 배치 ----
function swarmFlagScore(x,y){
  let s=0;const R=SWM.flagR,w=G.w;
  if(G.ore)for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
    const a=x+dx,b=y+dy;if(a<0||b<0||a>=w||b>=G.h||dx*dx+dy*dy>R*R)continue;
    const o=G.ore[b*w+a];if(o)s+=o===1?3:o===2?1.5:1;
  }
  let rocks=0;const r2=SWM.rockR;
  for(let dy=-r2;dy<=r2;dy++)for(let dx=-r2;dx<=r2;dx++){
    const a=x+dx,b=y+dy;if(a<0||b<0||a>=w||b>=G.h||dx*dx+dy*dy>r2*r2)continue;
    const o=G.obst[b*w+a];if(o&&o.natural&&o.type==='rock'&&o.x===a&&o.y===b)rocks++;
  }
  return s+Math.min(40,rocks*.9);
}
function swarmFlagSpot(){
  let best=null,bs=-1;const md=G.cfg.minDist||20;
  for(let k=0;k<SWM.sample;k++){
    const x=rint(Math.random,3,G.w-4),y=rint(Math.random,3,G.h-4);
    if(flagCheck(x,y)||(typeof avZoneDist==='function'&&avZoneDist(x,y)<4))continue;
    let ok=true;for(const f of G.flags)if(Math.max(Math.abs(f.x-x),Math.abs(f.y-y))<md){ok=false;break;}
    if(!ok)continue;
    const sc=swarmFlagScore(x,y);if(sc>bs){bs=sc;best=[x,y];}
  }
  return best;
}
function aiRollPersona(A){if(!A.persona){const r=Math.random();A.persona=r<.2?'aggressive':r<.4?'defensive':r<.6?'tricky':r<.8?'balanced':'swarm';A.side=Math.random()<.5?-1:1;}return A.persona;}
const _aiPlaceFlagsSW=aiPlaceFlags;
aiPlaceFlags=function(){
  if(typeof isDef==='function'&&isDef())return _aiPlaceFlagsSW();
  const pre=new Set();
  for(const T of G.teams){
    if(T.id===0||T.human||T.flag||!T.ai)continue;
    if(aiRollPersona(T.ai)==='swarm'){const p=swarmFlagSpot();if(p){placeFlag(T.id,p[0],p[1]);pre.add(T.id);}}
  }
  const _pf=placeFlag;
  placeFlag=function(t,x,y){if(pre.has(t)&&G.teams[t].flag)return;return _pf(t,x,y);};
  try{return _aiPlaceFlagsSW();}finally{placeFlag=_pf;}
};
// ---- (2) 초반 철광 땅굴 ----
function swarmOreTarget(T){
  let best=null,bd=1e9;const w=G.w;
  for(const kind of [1,2]){
    for(let i=0;i<G.N;i++){
      if(G.ore[i]!==kind||G.open[T.id][i])continue;
      const d=Math.hypot(i%w-T.flag.x,((i/w)|0)-T.flag.y);if(d<bd){bd=d;best=i;}
    }
    if(best!==null)break;
  }
  return best===null?null:{x:best%w,y:(best/w)|0,i:best};
}
function swarmIronOpen(T){for(let i=0;i<G.N;i++)if(G.ore[i]===1&&G.open[T.id][i])return true;return false;}
function aiSwarmTunnel(T,A,free,take){
  if(!G.ore||G.time<SWM.tunStart||free.length<1||T.trench.length<1)return true;
  if(swarmIronOpen(T)){A.oreDone=true;return false;}
  const tg=swarmOreTarget(T);if(!tg){A.oreDone=true;return false;}
  if(A.shaft===undefined){
    let bi=-1,bd=1e9;
    for(const ti of T.trench){
      if(G.trench[ti]!==T.id+1||G.up[ti])continue;
      const d=Math.hypot(ti%G.w-tg.x,((ti/G.w)|0)-tg.y);if(d<bd){bd=d;bi=ti;}
    }
    if(bi<0)return true;
    const x=bi%G.w,y=(bi/G.w)|0;
    if(taskCheck(T.id,'upg',x,y,'shaft'))return true;
    const t=getTask(T.id,'upg',x,y,'shaft',true);
    if(t){orderTasks(take(2),[t]);A.shaft=bi;A.shaftAt=G.time;}
    return true;
  }
  if(G.up[A.shaft]!==4){if(G.time-A.shaftAt>90)A.shaft=undefined;return true;}
  if(A.tunHead===undefined)A.tunHead=A.shaft;
  if(G.under[A.tunHead]!==T.id+1){   // 마지막 칸이 아직 파이는 중 — 오래 걸리면 그 칸만 다시 판다(병사가 죽었거나 작업이 취소된 경우)
    A.tunWait=(A.tunWait||G.time);
    if(G.time-A.tunWait>35){
      A.tunWait=G.time;A.tunRetry=(A.tunRetry||0)+1;
      if(A.tunRetry>3){A.tunHead=A.shaft;A.tunRetry=0;A.tunLen=Math.max(0,(A.tunLen||0)-8);}
      else issueTiles(T.id,take(Math.min(2,free.length)),'tun',[[A.tunHead%G.w,(A.tunHead/G.w)|0]]);
    }
    return true;
  }
  A.tunWait=0;
  if((A.tunLen||0)>=SWM.tunCap){A.oreDone=true;return false;}
  let cx=A.tunHead%G.w,cy=(A.tunHead/G.w)|0;const tiles=[];
  for(let s=0;s<5;s++){
    const dx=tg.x-cx,dy=tg.y-cy;
    const opts=Math.abs(dx)>=Math.abs(dy)?[[Math.sign(dx),0],[0,Math.sign(dy)||1],[0,-(Math.sign(dy)||1)]]:[[0,Math.sign(dy)],[Math.sign(dx)||1,0],[-(Math.sign(dx)||1),0]];
    let moved=false;
    for(const [ox,oy] of opts){
      if(!ox&&!oy)continue;const nx=cx+ox,ny=cy+oy;
      if(!inb(nx,ny)||G.tt[ny*G.w+nx]===2||G.under[ny*G.w+nx])continue;
      tiles.push([nx,ny]);cx=nx;cy=ny;moved=true;break;
    }
    if(!moved)break;
  }
  if(tiles.length){
    const e=issueTiles(T.id,take(Math.min(3,free.length)),'tun',tiles);
    if(!e){A.tunHead=tiles[tiles.length-1][1]*G.w+tiles[tiles.length-1][0];A.tunLen=(A.tunLen||0)+tiles.length;}
  }
  return true;
}
const _aiTunnelSW=aiTunnel;
aiTunnel=function(T,A,tf,free,take){
  if(A.persona==='swarm'&&!A.oreDone){if(aiSwarmTunnel(T,A,free,take))return;}
  return _aiTunnelSW(T,A,tf,free,take);
};
// ---- (3) 바위·나무 범위 채집 강화 ----
const _aiEconGatherSW=aiEconGather;
aiEconGather=function(T,P,ctx){
  if(!(T.ai&&T.ai.persona==='swarm'))return _aiEconGatherSW(T,P,ctx);
  const P2=Object.assign({},P,{keepM:Math.max(P.keepM,400),keepW:Math.max(P.keepW,260)}),o={mj:GATHER.maxJobs,rm:GATHER.rockMul,r:GATHER.r};
  GATHER.maxJobs=o.mj+1;GATHER.rockMul=1.9;GATHER.r=4;
  try{return _aiEconGatherSW(T,P2,ctx);}finally{GATHER.maxJobs=o.mj;GATHER.rockMul=o.rm;GATHER.r=o.r;}
};
