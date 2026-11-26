// ================= 헬리패드 · 보급 상점 · 헬기 =================
const ENEMY_DEMO_MULT=2;   // 적 시설 철거 시간 배수
const HELI={first:55,interval:95,inT:5.5,stay:6,unload:1.8,outT:4.8,dist:19};
const SHOP={popCap:100,maxLines:12,fee:.2,recruitCost:60,packCost:270,packN:5};
const RVAL={money:1,bullets:.35,metal:2.4,wood:1.5};   // 교환 기준 가치 (달러 = 1)
function bulletCap(){return 500+(G?G.cfg.soldiers:12)*20;}
function padAt(x,y){
  for(const T of G.teams){const p=T.pad;if(p&&x>=p.x&&x<p.x+3&&y>=p.y&&y<p.y+3)return T.id;}
  return -1;
}
function padCells(p){const c=[];for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)c.push([p.x+dx,p.y+dy]);return c;}
function tradeOut(from,to,amt){return Math.floor(amt*RVAL[from]/RVAL[to]*(1-SHOP.fee));}
function popOf(team){let n=0;for(const u of G.units)if(u.team===team&&!u.dead)n++;return n;}
function pendingRecruits(T){let n=0;for(const l of T.order.lines)if(l.kind==='recruit')n+=l.n;return n;}
function orderEscrow(T){const e={money:0,bullets:0,metal:0,wood:0};for(const l of T.order.lines)for(const k in l.cost)e[k]+=l.cost[k];return e;}
// 구매는 즉시 자원을 보류(차감)하고, 취소하면 돌려받는다. 헬기가 하역할 때 한 번에 거래가 이루어진다.
function shopAddRecruit(team,n){
  const T=G.teams[team];
  if(T.order.lines.length>=SHOP.maxLines)return '주문 목록이 가득 찼습니다';
  if(popOf(team)+pendingRecruits(T)+n>SHOP.popCap)return `병력 상한(${SHOP.popCap}명)을 넘을 수 없습니다`;
  const cost={money:n===SHOP.packN?SHOP.packCost:SHOP.recruitCost*n};
  if(!canAfford(T,cost))return '달러가 부족합니다';
  pay(T,cost);T.order.lines.push({id:G.nextId++,kind:'recruit',n,cost});return null;
}
function shopAddTrade(team,from,to,amt){
  const T=G.teams[team];
  if(from===to)return '서로 다른 자원을 골라야 합니다';
  if(T.order.lines.length>=SHOP.maxLines)return '주문 목록이 가득 찼습니다';
  amt=Math.floor(amt);const out=tradeOut(from,to,amt);
  if(out<1)return '교환량이 너무 적습니다';
  const cost={[from]:amt};
  if(!canAfford(T,cost))return `${RN[from]}이(가) 부족합니다`;
  pay(T,cost);T.order.lines.push({id:G.nextId++,kind:'trade',from,to,amt,out,cost});return null;
}
function shopCancel(team,id){
  const T=G.teams[team],i=T.order.lines.findIndex(l=>l.id===id);
  if(i<0)return false;
  refund(T,T.order.lines[i].cost);T.order.lines.splice(i,1);return true;
}
function shopCancelAll(team){const T=G.teams[team];let n=0;while(T.order.lines.length){shopCancel(team,T.order.lines[0].id);n++;}return n;}
function spawnAtPad(T){
  const p=T.pad;
  for(let k=0;k<12;k++){
    const x=p.x+.35+Math.random()*2.3,y=p.y+.35+Math.random()*2.3;
    if(Math.hypot(x-(T.flag.x+.5),y-(T.flag.y+.5))<.45)continue;
    return mkUnit(T.id,x,y);
  }
  return mkUnit(T.id,p.x+1.5,p.y+2.7);
}
function deliverOrder(T){
  let rec=0;const gain={};
  for(const l of T.order.lines){
    if(l.kind==='recruit'){for(let i=0;i<l.n;i++)spawnAtPad(T);rec+=l.n;}
    else{T.res[l.to]+=l.out;gain[l.to]=(gain[l.to]||0)+l.out;}
  }
  T.order.lines=[];
  if(T.id===0&&(rec||Object.keys(gain).length)){
    const parts=[];if(rec)parts.push(`병사 +${rec}`);for(const k in gain)parts.push(`${RN[k]} +${gain[k]}`);
    G.lastGain='헬기 보급 '+parts.join(' · ');G.gainShow=5;
    if(typeof toast==='function')toast('헬기 도착: '+parts.join(' · '),'ok');
  }
}
function heliPose(T){
  const h=T.heli,p=T.pad;
  if(!p||!h||h.state==='wait')return null;
  const cxw=p.x+1.5,cyw=p.y+1.5;
  const dx=Math.cos(h.dir),dy=Math.sin(h.dir);
  if(h.state==='inbound'){
    const q=Math.min(1,h.t/HELI.inT),e=1-Math.pow(1-q,2.3),d=HELI.dist*(1-e);
    return {x:cxw+dx*d,y:cyw+dy*d,alt:3+(1-e)*58,ang:h.dir+Math.PI,spin:1,flare:q};
  }
  if(h.state==='landed')return {x:cxw,y:cyw,alt:3,ang:h.dir+Math.PI,spin:h.t<HELI.stay-1?1:.7,flare:1};
  const q=Math.min(1,h.t/HELI.outT),e=q*q,d=HELI.dist*e;
  return {x:cxw+dx*d,y:cyw+dy*d,alt:3+e*58,ang:h.dir+Math.PI*0.0,spin:1,flare:1-q};
}
function stepHelis(dt){
  for(const T of G.teams){
    const h=T.heli;if(!h||!T.pad)continue;
    if(h.state==='wait'){h.timer-=dt;if(h.timer<=0){h.state='inbound';h.t=0;h.dir=Math.random()*6.283;h.delivered=false;}continue;}
    h.t+=dt;
    const ps=heliPose(T);
    // 로터 바람: 낮게 날 때 패드 위로 먼지가 퍼진다
    if(ps&&ps.alt<26&&Math.random()<dt*14){const a=Math.random()*6.283,r=.8+Math.random()*1.2;fxPush({k:'dust',x:T.pad.x+1.5+Math.cos(a)*r,y:T.pad.y+1.5+Math.sin(a)*r,t:0,d:.7,kind:'vehicle'});}
    if(h.state==='landed'&&!h.delivered&&h.t>=HELI.unload){h.delivered=true;deliverOrder(T);}
    const dur=h.state==='inbound'?HELI.inT:h.state==='landed'?HELI.stay:HELI.outT;
    if(h.t>=dur){
      h.t=0;
      if(h.state==='inbound')h.state='landed';
      else if(h.state==='landed')h.state='leaving';
      else{h.state='wait';h.timer=HELI.interval;}
    }
  }
}
function heliEta(T){
  const h=T.heli;
  if(h.state==='wait')return {txt:`다음 헬기 도착까지 ${Math.floor(h.timer/60)}:${String(Math.ceil(h.timer%60)%60).padStart(2,'0')}`,soon:h.timer<12};
  if(h.state==='inbound')return {txt:'헬기 접근 중 · 곧 착륙합니다',soon:true};
  if(h.state==='landed')return {txt:'헬기 착륙 · 보급 하역 중',soon:true};
  return {txt:'헬기 이륙 중 · 이번 편 거래는 완료됨',soon:false};
}
// 적 AI의 간단한 헬기 주문: 여유 달러로 병력을 충원하고, 모자란 자원은 교환
function aiShop(T){
  if(!T.pad||T.order.lines.length>=3)return;
  // 총알이 바닥나기 전에 먼저 사 둔다(병력 충원이 항상 먼저 걸려 총알 구매가 영영 안 되던 문제)
  if(T.res.bullets<bulletCap()*.38&&T.res.money>=130&&!T.order.lines.some(l=>l.kind==='trade'&&l.to==='bullets')){
    const amt=Math.min(Math.floor(T.res.money*.4),T.res.bullets<120?220:150);
    if(!shopAddTrade(T.id,'money','bullets',amt))return;
  }
  const pop=popOf(T.id)+pendingRecruits(T);
  if(T.ai&&T.ai.wantMetal&&pop>=10&&T.res.money<520)return;
  if(T.res.money>=SHOP.packCost+80&&pop+SHOP.packN<=SHOP.popCap){shopAddRecruit(T.id,SHOP.packN);return;}
  if(T.res.money>=SHOP.recruitCost+60&&pop<SHOP.popCap){shopAddRecruit(T.id,1);return;}
  if(T.res.bullets<80&&T.res.money>260)shopAddTrade(T.id,'money','bullets',120);
  else if(T.res.metal<14&&T.res.money>220)shopAddTrade(T.id,'money','metal',80);
  else if(T.res.wood<20&&T.res.money>200)shopAddTrade(T.id,'money','wood',60);
}
