// ================= 탈환전: 모든 팀이 한 편이 되어 점령당한 맵의 자경단을 전멸시킨다 =================
// - 플레이어와 AI(동맹)는 서로 싸우지 않는다 (피해·사격·폭발 판정은 isAllyT 로 동맹을 가려낸다).
// - 승리: 맵의 자경단 전원 사살 / 패배: 플레이어 병력 전멸.
// - AI: 기지 건설·원정 대신 경제·구매만 하고, 병력이 모이면 가까운 자경단 무리를 소탕한다 (src/64_ai-advanced.js 의 소탕 로직 재사용).
const isReclaim=()=>!!(G&&G.cfg&&G.cfg.mode==='reclaim');
function isAllyT(a,b){return a===b||(isReclaim()&&a>=0&&a<=3&&b>=0&&b<=3);}
function milLeft(){let n=0;if(G&&G.civs)for(const c of G.civs)if(c.mil&&!c.dead)n++;return n;}
const MIL_ALL={0:true,1:true,2:true,3:true};
// ---- 시작 ----
const _newGameR=newGame;
newGame=function(cfg){
  const g=_newGameR(cfg);
  if(cfg.mode==='reclaim')for(const T of g.teams)if(T.id>0)T.name='동맹 '+String.fromCharCode(64+T.id);
  return g;
};
// ---- 자경단 대량 배치 (도시마다 + 구조물 거점 + 들판) ----
function milPostGroup(rnd,o){
  const sz=OB[o.type].size||1,cx=o.x+sz/2,cy=o.y+sz/2,g=milGroup(cx,cy,2.2,{fixed:true,post:o});
  const L={apartment:['sniper','sniper','lmg','assault','assault','pistol','rifle'],tower:['sniper','sniper','lmg'],bunker:['lmg','lmg','assault','assault'],mg:['lmg','lmg']}[o.type];
  milFill(rnd,g,L||milGuns(rnd,2+Math.floor(rnd()*3),.2),sz/2+1.8,.4);return g;
}
function genReclaimMilitia(vs,rnd){
  G.militia=G.militia||[];
  const target=Math.round(G.w*G.h/45),far=(x,y,r)=>G.flags.every(f=>Math.hypot(f.x-x,f.y-y)>r),cnt=()=>G.civs.filter(c=>c.mil).length;
  // 1) 구조물 거점
  for(const o of G.obSet){
    if(!o.natural||!['house','shed','warehouse','ruin','apartment','bunker','mg','tower'].includes(o.type))continue;
    if(!far(o.x,o.y,15)||rnd()>(o.type==='apartment'||o.type==='tower'?.8:.4))continue;
    if(cnt()>=target*.6)break;milPostGroup(rnd,o);
  }
  // 2) 도시마다: 순찰 무리 + 저격·기관총 사수 고리
  for(const v of vs){
    if(cnt()>=target)break;
    const g=milGroup(v.x,v.y,Math.min(10,5+v.n*.15));milFill(rnd,g,milGuns(rnd,8+Math.floor(rnd()*8),.2),5,.5);
    for(let k=0;k<3;k++){const a=rnd()*6.283,r=6+rnd()*4,x=v.x+Math.cos(a)*r,y=v.y+Math.sin(a)*r;if(!civOK(Math.floor(x),Math.floor(y)))continue;const f=milGroup(x,y,1.6,{fixed:true});milFill(rnd,f,k%2?['lmg','lmg','pistol']:['sniper','assault'],1.5,.3);}
  }
  milGroups();G.militia=G.militia.filter(g=>g.n>0);
}
// 자경단이 모자라면(마을이 적은 맵 등) 들판에 무리를 흩뿌려 목표량을 채운다
function genReclaimFill(rnd){
  G.militia=G.militia||[];
  const target=Math.round(G.w*G.h/45*.75);let n=G.civs.filter(c=>c.mil).length,guard=0;
  while(n<target&&guard++<400){
    const x=Math.floor(8+rnd()*(G.w-16)),y=Math.floor(8+rnd()*(G.h-16));
    if(!civOK(x,y)||G.flags.some(f=>Math.hypot(f.x-x,f.y-y)<=22))continue;
    const g=milGroup(x+.5,y+.5,6);n+=milFill(rnd,g,milGuns(rnd,7+Math.floor(rnd()*7),.22),4,.5);
  }
  G.militia=G.militia.filter(g=>g.n>0);
}
const _genCivsR=genCivs;
genCivs=function(){
  _genCivsR();
  if(isReclaim()||G.special==='occupied'){
    const rnd=mulberry(hashStr(G.cfg.seed+'#rec'));
    if(G.special!=='mafia'&&!G.civs.some(c=>c.mil&&c.grp&&c.grp.fixed)&&G.special!=='superflat'&&G.special!=='mineshaft')genReclaimMilitia(villageCells().filter(v=>G.flags.every(f=>Math.hypot(f.x-v.x,f.y-v.y)>14)),rnd);
    if(isReclaim())genReclaimFill(rnd);
  }
  G.milTotal=G.civs.filter(c=>c.mil).length;
};
// ---- 승패 ----
const _checkEndRc=checkEnd;
checkEnd=function(){
  if(!isReclaim())return _checkEndRc();
  if(!G||G.phase!=='play')return;
  for(const T of G.teams){const was=T.alive!==false;T.alive=teamCount(T.id)>0;if(!T.alive&&!T.dead){T.dead=true;if(T.id!==0)toast(`${T.name} 병력이 전멸했습니다`,'warn');}}
  if(!G.teams[0].alive)G.over='lose';
  else if(G.civsInit&&G.milTotal>0&&milLeft()===0)G.over='win';
  if(G.over){G.phase='over';showOver();}
};
const _showOverRc=showOver;
showOver=function(){
  _showOverRc();
  if(isReclaim()){
    $('ovS').textContent=G.over==='win'?'모든 자경단을 소탕했습니다. 도시를 탈환했습니다!':'아군 병사가 전멸했습니다.';
  }
};
const _updEgR=updateEndgame;
updateEndgame=function(){if(isReclaim()){if(G)G.endgame=false;return;}return _updEgR();};
// ---- 탈환전 AI: 시설·충원·투척물 우선 ----
function rcFacilityCount(T,type){let n=0;for(const o of G.obSet)if(o.type===type&&!o.natural&&o.team===T.id)n++;return n;}
function rcFacilityPending(T,type){for(const t of G.tasks.values())if(t.team===T.id&&t.kind==='build'&&t.type===type)return true;return false;}
function rcBuildFacility(T,free,type){
  if(rcFacilityCount(T,type)||rcFacilityPending(T,type)||free.length<2)return false;
  const cost=OB[type].cost;
  if(!canAfford(T,cost)){
    if(T.res.money>200&&T.order.lines.length<3){
      if(T.res.wood<cost.wood)shopAddTrade(T.id,'money','wood',Math.min(160,T.res.money-100));
      else if(T.res.metal<cost.metal)shopAddTrade(T.id,'money','metal',Math.min(160,T.res.money-100));
    }
    return false;
  }
  const seen=new Set();
  for(const ti of T.trench){
    if(G.trench[ti]!==T.id+1)continue;
    const x0=ti%G.w,y0=(ti/G.w)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=x0+dx,y=y0+dy,k=y*G.w+x;if(seen.has(k))continue;seen.add(k);
      if(!inb(x,y)||G.trench[k]===T.id+1)continue;
      if(taskCheck(T.id,'build',x,y,type))continue;
      const task=getTask(T.id,'build',x,y,type,true);if(!task)continue;
      orderTasks(free.slice(0,2),[task]);return true;
    }
  }
  return false;
}
function rcFacilities(T,free){
  if(!rcFacilityCount(T,'armory')){rcBuildFacility(T,free,'armory');return false;}
  if(!rcFacilityCount(T,'medbay')){rcBuildFacility(T,free,'medbay');return false;}
  const med=Array.from(G.obSet).find(o=>o.type==='medbay'&&!o.natural&&o.team===T.id);
  if(med&&med.occ.length===0&&free.length){orderGarrison([free[0]],med);}
  return true;
}
const _aiShopReclaim=aiShop;
aiShop=function(T){
  if(!isReclaim()||!T.ai)return _aiShopReclaim(T);
  const current=popOf(T.id),pending=pendingRecruits(T),target=Math.min(SHOP.popCap,Math.max(30,Math.min(42,Math.ceil((G.cfg.soldiers||18)*1.5))));
  if(!rcFacilityCount(T,'armory')||!rcFacilityCount(T,'medbay')){
    if(T.order.lines.length<3&&T.res.money<SHOP.recruitCost+60)_aiShopReclaim(T);
    return;
  }
  if(current+pending<target&&T.order.lines.length<3){
    if(T.res.money>=SHOP.packCost+40&&current+pending+SHOP.packN<=target)shopAddRecruit(T.id,SHOP.packN);
    else if(T.res.money>=SHOP.recruitCost+20)shopAddRecruit(T.id,1);
    else _aiShopReclaim(T);
    return;
  }
  const ready=armFree(T.id)-pendingExp(T);
  if(ready>=3&&pendingExp(T)<9&&T.res.money>=90){
    const n=Math.min(3,ready,Math.floor(T.res.money/30));
    if(n>0)shopAddExp(T.id,armTot(T.id,'frag')<8?'frag':'molotov',n);
    return;
  }
  _aiShopReclaim(T);
};
function armTot(T,item){let n=0;for(const o of armories(T.id))n+=armStock(o)[item]||0;return n;}
// ---- AI: 경제 + 자경단 소탕 ----
const _aiTickRc=aiTick;
aiTick=function(T,dt){
  if(!isReclaim())return _aiTickRc(T,dt);
  const A=T.ai;if(!A||!T.flag||T.dead||G.phase!=='play')return;
  if(!A.squad)A.squad=[];
  A.rcT=(A.rcT||0)-dt;
  if(A.rcT<=0){A.rcT=1.4+Math.random()*.4;aiShop(T);}
  T.apT=(T.apT||0)-dt;
  if(T.apT<=0){
    T.apT=AIX.every*(.9+Math.random()*.2);
    try{const free=aiFreeUnits(T);const facilities=rcFacilities(T,free);aiMine(T,free);aiIncome(T,free);if(facilities)aiArms(T,free);if(typeof stAiUpgrade==='function')stAiUpgrade(T);}catch(e){console.error('[AI-reclaim]',e);}
  }
  aiPurgeStep(T,dt);
};
// ---- HUD: 남은 자경단 ----
const _ssRc=stepShells;
stepShells=function(dt){
  _ssRc(dt);
  if(!isReclaim()||!G||G.phase==='setup')return;
  G.rcHudT=(G.rcHudT||0)-dt;if(G.rcHudT>0)return;G.rcHudT=.5;
  let e=document.getElementById('rcHud');
  if(!e){e=document.createElement('div');e.id='rcHud';e.style.cssText='position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:20;background:rgba(20,22,18,.82);border:1px solid #6d6a52;color:#ffd86b;padding:4px 14px;border-radius:14px;font:600 13px/1.4 system-ui,sans-serif;pointer-events:none;letter-spacing:.2px';document.body.appendChild(e);}
  const n=milLeft(),tot=G.milTotal||n;
  e.textContent=`🏴 남은 자경단 ${n} / ${tot}`;e.hidden=G.phase==='over';
};
// ---- 로비 ----
(function(){
  const m=$('fMode');if(!m)return;
  const old=m.onchange;
  m.onchange=function(){if(old)old.call(m);if(m.value==='reclaim')$('fModeHint').textContent='모든 팀(플레이어와 AI)이 한 편입니다. 자경단을 전멸시키면 승리. 자경단이 아주 많으니 병력을 모아 한 무리씩 치세요. 추천 시드: mafia · occupied. ‘적 수’는 협력 AI 수입니다.';};
})();
