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
function aiEconMine(T,P){
  if(!G.ore)return 0;
  const pop=popOf(T.id);if(pop<8)return 0;
  const cap=Math.min(P.crews,Math.max(1,Math.floor(pop/10)));
  let slots=cap-aiMineCrews(T);if(slots<=0)return 0;
  const w=G.w,cand=[];
  for(let i=0;i<G.N;i++){
    const o=G.ore[i];if(!o||!G.open[T.id][i]||G.tasks.has(tkey('mine',i)))continue;
    if(!avSafe(i%w,(i/w)|0,AV.mineGap))continue;   // 마을·자경단 근처 광석은 건너뛰고 다른 쪽을 찾는다
    const d=Math.hypot(i%w-T.flag.x,((i/w)|0)-T.flag.y),v=o===3?340:o===2?260:60;
    cand.push([i,v-d*1.5]);
  }
  if(!cand.length)return 0;
  cand.sort((a,b)=>b[1]-a[1]);
  let n=0;
  for(const [i] of cand){
    if(slots<=0)break;
    const pool=aiMinePool(T);if(pool.length<2)break;
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
  const e=A.eco||(A.eco={mine:0,sold:0,packs:0});
  e.mine+=aiEconMine(T,P);
  if(aiEconSell(T,P))e.sold++;
  e.packs+=aiEconRecruit(T,P);
}
// 파츠 'economy'
function aiPartEconomy(T,dt){
  if(T.ai&&T.id!==0){T.ai.ecT=(T.ai.ecT||0)-dt;if(T.ai.ecT<=0){T.ai.ecT=AIE.every*(.9+Math.random()*.2);try{aiEconomy(T);}catch(e){console.error('AI 경제 오류',e);}}}
}
