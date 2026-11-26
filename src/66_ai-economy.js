// ================= AI 경제: 채굴조 상시 운영 · 잉여 자원 환전 · 대량 증원 =================
// 파츠 aiPartEconomy (70_ai-parts.js 에서 등록). 일반 모드·탈환전 모두 구성에 포함된다.
// 1) 채굴조: 열린 광석이 있으면 값비싼 것(수레>금광>철광)·가까운 것부터 2인 조를 성향별 상한까지 동시에 보낸다.
// 2) 환전: 금속·나무·총알이 안전 재고를 넘으면 초과분을 달러로 바꾸는 헬기 주문을 넣는다.
// 3) 증원: 달러가 모이면 5인 묶음을 한 번에 여러 건 주문한다(인구 상한·주문 칸 수 한도 안에서).
const AIE={
  every:3.2,
  prof:{
    aggressive:{crews:2,keepM:70,keepW:80,keepB:220,keepMoney:40,packs:3},
    defensive:{crews:3,keepM:130,keepW:130,keepB:320,keepMoney:140,packs:2},
    tricky:{crews:3,keepM:90,keepW:100,keepB:260,keepMoney:80,packs:3},
    balanced:{crews:3,keepM:100,keepW:110,keepB:280,keepMoney:90,packs:2}
  }
};
function aiMineCrews(T){let n=0;for(const t of G.tasks.values())if(t.kind==='mine'&&t.team===T.id)n++;return n;}
// 채굴에 보낼 수 있는 병사: 원정대·소탕대·운반/교체 중인 병사와 의무 상태를 뺀 나머지(이동 중인 병사도 포함)
function aiMinePool(T){
  const A=T.ai,ex=new Set([...(A.squad||[]),...((A.purge&&A.purge.ids)||[])]);
  return G.units.filter(u=>u.team===T.id&&!u.dead&&!ex.has(u.id)&&u.state!=='crew'&&!u.fetch&&!u.wf&&!u.af&&!u.item&&!u.medTarget&&!u.after&&!['med','medwait','medmove','medqueue'].includes(u.state));
}
// 채굴 회피 구역을 한 번 타일 마스크로 만들어, 광석마다 모든 마을·자경단 무리를 다시 검사하지 않는다.
// 같은 게임 초 안에서는 AI 팀들이 함께 재사용한다. 마스크의 좌표는 기존 avSafe와 같은 타일 좌상단 기준이다.
function aiMineSafeMask(gap){
  const sec=Math.floor(G.time);
  if(G._aiMineSafe&&G._aiMineSafeSec===sec&&G._aiMineSafeGap===gap)return G._aiMineSafe;
  const blocked=new Uint8Array(G.N),w=G.w,h=G.h;
  const mark=(cx,cy,r)=>{
    const r2=r*r,x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(w-1,Math.ceil(cx+r)),y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(h-1,Math.ceil(cy+r));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<r2)blocked[y*w+x]=1;}
  };
  for(const z of avZones())mark(z.x,z.y,z.r+gap);
  for(const g of G.militia||[])if(g.n===undefined||g.n>0)mark(g.cx,g.cy,g.R+gap);
  G._aiMineSafe=blocked;G._aiMineSafeSec=sec;G._aiMineSafeGap=gap;return blocked;
}
// ---- 위협·목표 보조 (76_ai-goal-gather.js 가 채워 넣는다) ----
function aiEconMine(T,P,ctx){
  ctx=ctx||{};
  if(!G.ore)return 0;
  const pop=popOf(T.id);if(pop<(ctx.low?3:8))return 0;
  const cap=Math.min(P.crews+(ctx.goal?1:0)+(ctx.low?1:0),Math.max(1,Math.floor(pop/(ctx.low?4:10))));
  let slots=cap-aiMineCrews(T);if(slots<=0)return 0;
  const w=G.w,blocked=aiMineSafeMask(ctx.goal?Math.max(3,AV.mineGap-5):AV.mineGap),limit=Math.min(G.N,slots*4),cand=[],foes=ctx.foes||[];
  for(let i=0;i<G.N;i++){
    const o=G.ore[i];if(!o||!G.open[T.id][i]||G.tasks.has(tkey('mine',i)))continue;
    const x=i%w,y=(i/w)|0;
    if(blocked[i]&&!ctx.goal)continue;
    const d=Math.hypot(x-T.flag.x,y-T.flag.y);
    let v=o===3?340:o===2?260:60;
    if(ctx.goal)v=aiOreGoalValue(o,ctx.goal);
    let score=v-d*1.5;
    if(blocked[i])score-=80;                                   // 목표 작업: 위험해도 하되 불이익
    if(foes.length){
      const th=aiThreat(foes,x,y,14),sg=aiSegThreat(foes,T.flag.x,T.flag.y,x,y,7);
      const under=!!G.under[i]&&aiMouthSafe(T,x,y,foes);       // 땅굴 안은 지상 교전을 피할 수 있다
      if(under){score+=70;}
      else if(th>0||sg>0){
        if(ctx.low&&!ctx.goal)continue;                         // 병력이 적으면 교전 지역을 피한다
        if(th>=3&&!ctx.goal)continue;
        score-=60*th+35*sg;
      }
    }
    let at=0;while(at<cand.length&&cand[at][1]>=score)at++;
    if(at>=limit)continue;
    cand.splice(at,0,[i,score]);if(cand.length>limit)cand.pop();
  }
  if(!cand.length)return 0;
  let n=0;const pool=aiMinePool(T);if(pool.length<2)return 0;
  for(const [i] of cand){
    if(slots<=0)break;
    if(!issueWork(T.id,'mine',[[i%w,(i/w)|0]],null,2,pool)){slots--;n++;}
  }
  return n;
}
function aiEconSell(T,P){
  if(!T.pad||T.order.lines.length>=SHOP.maxLines-2)return false;
  if(T.res.money>=SHOP.packCost+P.keepMoney+60)return false;   // 달러가 모자랄 때만 환전한다
  const pend=(k)=>T.order.lines.some(l=>l.kind==='trade'&&l.from===k);
  const plan=[['metal',P.keepM,40,260],['wood',P.keepW,60,260],['bullets',P.keepB,120,400]];
  let best=null,bv=0;
  for(const [k,keep,min,max] of plan){
    const extra=T.res[k]-keep;if(extra<min||pend(k))continue;
    const v=extra*RVAL[k];if(v>bv){bv=v;best=[k,Math.min(max,Math.floor(extra*.7))];}
  }
  if(!best)return false;
  return !shopAddTrade(T.id,best[0],'money',best[1]);
}
function aiEconRecruit(T,P){
  if(!T.pad)return 0;
  let n=0;
  for(let k=0;k<P.packs&&T.order.lines.length<SHOP.maxLines-1;k++){
    const pop=popOf(T.id)+pendingRecruits(T);
    if(pop+SHOP.packN>SHOP.popCap)break;
    if(T.res.money<SHOP.packCost+P.keepMoney)break;
    if(shopAddRecruit(T.id,SHOP.packN))break;
    n++;
  }
  return n;
}
function aiEconomy(T){
  const A=T.ai;if(!A||!T.flag||T.dead||G.phase!=='play')return;
  const P=AIE.prof[A.persona||'balanced']||AIE.prof.balanced;
  const e=A.eco||(A.eco={mine:0,sold:0,packs:0,gather:0,goal:''});
  const ctx={foes:aiFoePts(T),low:aiLowPop(T),goal:aiGoal(T)};
  e.goal=ctx.goal?ctx.goal.n:'';A.ecoLow=ctx.low;
  if(ctx.low&&A.attackAt!==undefined&&A.mode!=='defend')A.attackAt=Math.max(A.attackAt,G.time+12);   // 병력이 적으면 원정 대신 채굴에 집중
  if(ctx.goal&&aiGoalTrade(T,ctx.goal))e.sold++;
  e.mine+=aiEconMine(T,P,ctx);
  e.gather+=aiEconGather(T,P,ctx);
  if(!ctx.goal&&aiEconSell(T,P))e.sold++;
  e.packs+=aiEconRecruit(T,P);
}
// 파츠 'economy'
function aiPartEconomy(T,dt){
  if(T.ai&&T.id!==0){T.ai.ecT=(T.ai.ecT||0)-dt;if(T.ai.ecT<=0){T.ai.ecT=AIE.every*(.9+Math.random()*.2);try{aiEconomy(T);}catch(e){console.error('AI 경제 오류',e);}}}
}
