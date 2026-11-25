// ================= 공방 · 공예소 · 군수공장 · 폭발 드론 =================
const WS={
  names:['공방','공예소','군수공장'],
  batches:[5,8,10],
  upgrade:[null,{metal:150,wood:100},{metal:240,wood:180}],
  recipes:{
    weapon:{
      sling:{wood:4},pistol:{metal:5},assault:{metal:12,wood:3},sniper:{metal:18,wood:4},lmg:{metal:24,wood:6},at:{metal:20,wood:5}
    },
    armor:{wood:{wood:14},plate:{metal:18,wood:2},stone:{metal:20,wood:8}},
    exp:{smoke:{metal:2,wood:4},flash:{metal:4},molotov:{metal:1,wood:5},frag:{metal:5,wood:1}},
    drone:{}
  },
  time:{weapon:2.2,armor:2.2,exp:1.5,drone:5}
};
const WS_IMG=new Image(),DRONE_IMG=new Image();
WS_IMG.src='assets/sprites/workshop.svg';DRONE_IMG.src='assets/sprites/drone.svg';
function wsTier(o){return Math.max(0,Math.min(2,o.tier|0));}
function wsName(o){return WS.names[wsTier(o)];}
function wsRecipe(kind,item,n,tier){
  const base=WS.recipes[kind]&&WS.recipes[kind][item];if(!base)return null;
  const cost={};for(const k in base)cost[k]=Math.ceil(base[k]*(1-.1*tier))*n;return cost;
}
function wsCostText(cost){
  return Object.entries(cost||{}).map(([k,v])=>RN[k]+' '+v).join(' · ')||'재료 없음';
}
function wsUpgradeCost(tier){return WS.upgrade[tier+1]||null;}
function wsCanUpgrade(o,T){const c=wsUpgradeCost(wsTier(o));return !!c&&canAfford(T,c);}
function wsUpgrade(o,quiet){
  if(!G.obSet.has(o)||o.type!=='workshop'||wsTier(o)>=2)return false;
  const T=G.teams[o.team],c=wsUpgradeCost(wsTier(o));
  if(!canAfford(T,c)){if(!quiet&&o.team===0)toast('강화 재료가 부족합니다 · '+wsCostText(c));return false;}
  pay(T,c);o.tier=wsTier(o)+1;
  fxPush({k:'chip',x:o.x+1,y:o.y+1,t:0,d:.8,kind:'heal'});
  if(!quiet&&o.team===0)toast(wsName(o)+' 강화 완료 · 제작 '+WS.batches[o.tier]+'인분 · 단가 −10%');
  return true;
}
function wsArmoryCapacity(T,n){
  if(!armories(T.id).length)return false;
  return n<=armFree(T.id)-pendingExp(T);
}
function wsQueue(o,kind,item,n,quiet){
  if(!G.obSet.has(o)||o.type!=='workshop')return '공방을 찾을 수 없습니다';
  const T=G.teams[o.team];n=Math.floor(+n||1);
  if(kind==='drone')return '드론은 건설 시설의 차량 목록에서 제작하세요';
  if(o.job)return '현재 제작이 진행 중입니다';
  if(n<1||n>WS.batches[wsTier(o)])return '이 단계에서 제작할 수 있는 양을 초과했습니다';
  const cost=wsRecipe(kind,item,n,wsTier(o));if(!cost)return '지원하지 않는 제작 품목입니다';
  if(kind!=='drone'&&!armories(T.id))return '완성품을 넣을 무기고가 필요합니다';
  if(kind==='exp'&&!wsArmoryCapacity(T,n))return '무기고 저장 공간이 부족합니다';
  if(!canAfford(T,cost))return '금속 또는 목재가 부족합니다';
  pay(T,cost);
  const duration=wsDuration(kind,n);
  o.job={kind,item,n,cost,elapsed:0,duration};
  if(!quiet&&T.id===0)wsPanelRender(o);
  return null;
}
function wsStore(o,j){
  const T=G.teams[o.team];
  if(j.kind==='weapon')wst(T)[j.item]=(wst(T)[j.item]||0)+j.n;
  else if(j.kind==='armor')ast(T)[j.item]=(ast(T)[j.item]||0)+j.n;
  else if(j.kind==='exp'){
    let left=j.n;for(const a of armories(T.id)){const st=armStock(a);while(left>0&&armTotal(a)<ARM.cap){st[j.item]++;left--;}}
    if(left){for(const k in j.cost)T.res[k]+=Math.floor(j.cost[k]*left/j.n);}
  }else if(j.kind==='drone'){
    let spawned=false;
    for(let r=1;r<=6&&!spawned;r++){
      let made=false;
      for(let dy=-r;dy<=r&&!made;dy++)for(let dx=-r;dx<=r&&!made;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
        const x=o.x+1+dx,y=o.y+1+dy;if(!inb(x,y))continue;
        const v=addVehicle('drone',x+.5,y+.5,T.id);
        if(v){v.homeWorkshop=o.id;made=true;}
      }
      if(made)spawned=true;
    }
    if(!spawned){
      for(const k in j.cost)T.res[k]+=j.cost[k];
      if(T.id===0)toast('드론을 배치할 공간이 없습니다 · 재료를 돌려받았습니다');
      return false;
    }
  }
  if(T.id===0){const label=j.kind==='weapon'?WEAP[j.item].n:j.kind==='armor'?ARMOR[j.item].n:j.kind==='exp'?EXP[j.item].n:'폭발 드론';
    toast(j.kind==='drone'?'드론 제작 완료 · 목표를 탐색합니다':label+' 제작 완료 ×'+j.n+' · 무기고 입고');}
  return true;
}
function wsStep(dt){
  if(!G)return;
  for(const o of G.obSet){
    if(o.type!=='workshop'||!o.job)continue;
    const j=o.job;j.elapsed=Math.min(j.duration,j.elapsed+dt);
    if(j.elapsed>=j.duration){o.job=null;wsStore(o,j);if(wsPanelId===o.id)wsPanelRender(o);}
  }
  if(wsPanelId!==null){
    wsUiTick-=dt;if(wsUiTick<=0){wsUiTick=.2;const o=G.obSet&&[...G.obSet].find(q=>q.id===wsPanelId);if(o)wsPanelProgress(o);else wsClose();}
  }
  for(const z of G.zones||[]){
    if(!z.drone||z.t<=0)continue;z.droneTick=(z.droneTick||0)-dt;
    if(z.droneTick>0)continue;z.droneTick=.55;
    for(const o of [...G.obSet])if((o.natural||o.team!==z.team)&&Math.hypot(o.x+o.size/2-z.x,o.y+o.size/2-z.y)<=z.r)damageOb(o,11);
  }
}
function wsDroneTarget(v){
  let best=null,bd=1e9;
  const take=(kind,e,x,y)=>{
    const d=Math.hypot(x-v.x,y-v.y);if(d<bd){bd=d;best={kind,e};}
  };
  for(const o of G.obSet)if(o.natural||o.team!==v.team)if(o.type!=='workshop')take('ob',o,o.x+o.size/2,o.y+o.size/2);
  for(const u of G.units)if(!u.dead&&u.state!=='crew'&&!isAllyT(u.team,v.team)&&!u.lay)take('unit',u,u.x,u.y);
  for(const c of G.civs||[])if(c.mil&&!c.dead)take('civ',c,c.x,c.y);
  for(const q of G.vehicles)if(q!==v&&!q.dead&&!isAllyT(q.team,v.team))take('vehicle',q,q.x,q.y);
  return best;
}
function wsDroneBlast(v){
  if(!v||v._wsBlast)return;v._wsBlast=true;v.dead=true;v.hp=0;v.state='idle';v.path=[];
  const x=v.x,y=v.y,r=2.25;
  for(const o of [...G.obSet])if((o.natural||o.team!==v.team)&&Math.hypot(o.x+o.size/2-x,o.y+o.size/2-y)<=r)damageOb(o,155*(1-.5*Math.hypot(o.x+o.size/2-x,o.y+o.size/2-y)/r));
  for(const u of G.units)if(!u.dead&&u.state!=='crew'&&!isAllyT(u.team,v.team)){const d=Math.hypot(u.x-x,u.y-y);if(d<=r)hurt(u,115*(1-.55*d/r),v);}
  for(const c of G.civs||[])if(c.mil&&!c.dead){const d=Math.hypot(c.x-x,c.y-y);if(d<=r)hurt(c,115*(1-.55*d/r),v);}
  for(const q of [...G.vehicles])if(q!==v&&!q.dead&&!isAllyT(q.team,v.team)){const d=Math.hypot(q.x-x,q.y-y);if(d<=r)damageVehicle(q,125*(1-.5*d/r),v);}
  G.zones=G.zones||[];G.zones.push({kind:'fire',team:v.team,x,y,r:1.65,t:6,tick:.3,drone:true});
  clearBush(x,y,2);fxPush({k:'boom',x,y,t:0,d:.7});fxPush({k:'smoke',x,y,t:0,d:1});sfx('boom',x,y);
}
function wsStepDrones(dt){
  if(!G||!G.vehicles)return;
  for(const v of G.vehicles){
    if(v.type!=='drone'||v.dead)continue;
    v.anim+=dt;v.alt=.55;v.droneSense=(v.droneSense||0)-dt;
    let tx=null,ty=null;
    if(v.droneDest){
      tx=v.droneDest.x;ty=v.droneDest.y;
    }else{
      if(!v.target||v.target.kind==='ob'&&!G.obSet.has(v.target.e)||v.target.kind==='unit'&&(v.target.e.dead||!G.units.includes(v.target.e))||v.target.kind==='vehicle'&&(v.target.e.dead||!G.vehicles.includes(v.target.e))||v.target.kind==='civ'&&v.target.e.dead||v.droneSense<=0){
        v.target=wsDroneTarget(v);v.droneSense=.75;
      }
      const tar=v.target;if(!tar)continue;
      const e=tar.e;tx=tar.kind==='ob'?e.x+e.size/2:e.x;ty=tar.kind==='ob'?e.y+e.size/2:e.y;
    }
    const dx=tx-v.x,dy=ty-v.y,d=Math.hypot(dx,dy);
    if(d<=.14){v.x=tx;v.y=ty;wsDroneBlast(v);continue;}
    const step=VEH.drone.speed*weatherSpeed()*dt,move=Math.min(step,d),nx=v.x+dx/d*move,ny=v.y+dy/d*move;
    if(!inb(Math.floor(nx),Math.floor(ny))){wsDroneBlast(v);continue;}
    v.face=Math.atan2(dy,dx);v.x=nx;v.y=ny;
    if(Math.random()<dt*2.5)fxPush({k:'dust',x:v.x,y:v.y,t:0,d:.35,kind:'vehicle'});
  }
}
const _stepVehiclesWS=stepVehicles;
stepVehicles=function(dt){_stepVehiclesWS(dt);wsStepDrones(dt);wsStep(dt);};
const _damageVehicleWS=damageVehicle;
damageVehicle=function(v,dmg,shooter){_damageVehicleWS(v,dmg,shooter);if(v&&v.type==='drone'&&v.dead)wsDroneBlast(v);};
const _issueWorkWS=issueWork;
issueWork=function(team,kind,tiles,type,n,pool){if(kind==='build'&&type==='workshop')n=1;return _issueWorkWS(team,kind,tiles,type,n,pool);};
// ---- SVG 건물·드론 그리기 ----
function wsDrawBuilding(o){
  const z=cam.z,[sx,sy]=toS(o.x+1,o.y+1),L=o.fl>0?'#fff':'#d8d5bd';
  shadowAt(o.x+1.1,o.y+1.15,45,20);
  if(WS_IMG.complete&&WS_IMG.naturalWidth)cx.drawImage(WS_IMG,sx-46*z,sy-67*z,92*z,74*z);
  else{
    cx.fillStyle='#665844';cx.beginPath();cx.moveTo(sx-38*z,sy-18*z);cx.lineTo(sx,sy-36*z);cx.lineTo(sx+38*z,sy-18*z);cx.lineTo(sx,sy);cx.closePath();cx.fill();
    cx.fillStyle='#81765f';cx.fillRect(sx-30*z,sy-42*z,60*z,34*z);cx.strokeStyle='#302a20';cx.lineWidth=2*z;cx.strokeRect(sx-30*z,sy-42*z,60*z,34*z);
  }
  if(wsTier(o)>0){cx.fillStyle=L;cx.font='bold '+Math.max(8,11*z)+'px system-ui';cx.textAlign='center';cx.fillText(wsTier(o)===1?'II':'III',sx+28*z,sy-42*z);}
  if(o.job){cx.fillStyle='rgba(0,0,0,.65)';cx.fillRect(sx-22*z,sy+5*z,44*z,4*z);cx.fillStyle='#d9ad4e';cx.fillRect(sx-22*z,sy+5*z,44*z*o.job.elapsed/o.job.duration,4*z);}
}
const _drawObFullWS=drawObFull;
drawObFull=function(o){if(o.type==='workshop')return wsDrawBuilding(o);return _drawObFullWS(o);};
const _drawVehicleWS=drawVehicle;
drawVehicle=function(v){
  if(v.type!=='drone')return _drawVehicleWS(v);
  const z=cam.z,[sx,sy]=toS(v.x,v.y),bob=Math.sin((v.anim||0)*7)*2*z;
  shadowEll(sx,sy+3*z,18*z,8*z,.28);
  if(DRONE_IMG.complete&&DRONE_IMG.naturalWidth)cx.drawImage(DRONE_IMG,sx-26*z,sy-34*z+bob,52*z,38*z);
  else{cx.fillStyle='#667a6e';cx.beginPath();cx.ellipse(sx,sy-15*z+bob,15*z,7*z,0,0,6.3);cx.fill();cx.strokeStyle='#20291f';cx.lineWidth=2*z;cx.beginPath();cx.moveTo(sx-26*z,sy-22*z+bob);cx.lineTo(sx+26*z,sy-22*z+bob);cx.moveTo(sx,sy-21*z+bob);cx.lineTo(sx,sy-33*z+bob);cx.stroke();}
  if(v.sel){cx.strokeStyle='#7dff7d';cx.lineWidth=1.5*z;cx.beginPath();cx.ellipse(sx,sy+2*z,25*z,12*z,0,0,6.3);cx.stroke();}
};
const _objClickWS=objClick;
objClick=function(o){if(o&&o.type==='workshop'&&!o.natural&&o.team===0&&tool!=='demo'){wsPanelOpen(o);return true;}return _objClickWS(o);};
// ---- 제작 창 ----
let wsPanelId=null,wsUiTick=0;
const WS_KINDS={weapon:'총기',armor:'방어구',exp:'투척물'};
let wsSel={kind:'weapon',item:null,n:1};
function wsItemName(kind,k){return kind==='weapon'?WEAP[k].n:kind==='armor'?ARMOR[k].n:kind==='exp'?EXP[k].n:'폭발 드론';}
function wsItemCol(kind,k){return kind==='weapon'?WEAP[k].col:kind==='armor'?ARMOR[k].col:kind==='exp'?EXP[k].col:'#aaa';}
function wsStockOf(T,kind,k){return kind==='weapon'?(wst(T)[k]|0):kind==='armor'?(ast(T)[k]|0):armories(T.id).reduce((a,o)=>a+(armStock(o)[k]|0),0);}
// 제작 시간: 수량이 늘수록 개당 시간이 조금씩 길어진다(개당 +6%씩, 최대 +60%)
function wsDuration(kind,n){return WS.time[kind]*n*(1+Math.min(.6,.06*(n-1)));}
function wsMakePanel(){
  let m=document.getElementById('wsPanel');if(m)return m;
  const st=document.createElement('style');
  st.textContent=`#wsPanel{position:absolute;top:56px;right:12px;z-index:27;width:400px;max-height:calc(100% - 80px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:8px}
#wsPanel[hidden]{display:none}#wsPanel h3{margin:0;font:600 13px var(--body);display:flex;justify-content:space-between;align-items:center}
#wsPanel table{width:100%;border-collapse:collapse}#wsPanel td,#wsPanel th{padding:3px 4px;text-align:left;border-bottom:1px solid var(--line)}#wsPanel th{color:var(--dim);font-weight:600}
#wsPanel tr.pick{background:rgba(217,173,78,.14)}#wsPanel tbody tr{cursor:pointer}#wsPanel tbody tr:hover{background:rgba(255,255,255,.05)}
#wsPanel input[type=number]{background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:3px 6px}#wsPanel .rw{display:flex;gap:6px;align-items:center}#wsPanel .tabs{display:flex;gap:6px}#wsPanel .tabs .btn{flex:1}#wsPanel input{min-width:0}
#wsPanel .bar{height:6px;background:#111;border-radius:3px;overflow:hidden;margin-top:5px}#wsPanel .bar i{display:block;height:100%;background:var(--accent)}
#wsPanel .sum{padding:6px 8px;background:var(--panel2);border:1px solid var(--line);border-radius:3px;line-height:1.6}`;
  document.head.appendChild(st);
  m=document.createElement('aside');m.id='wsPanel';m.hidden=true;
  m.innerHTML=`<h3><span id="wsTitle">🔧 공방</span><button class="btn" id="wsClose" type="button">닫기 ✕</button></h3>
<div id="wsSubtitle" style="color:var(--dim)"></div><div id="wsUpgradeBox"></div>
<div class="tabs" id="wsTabs">${Object.keys(WS_KINDS).map(k=>`<button class="btn" type="button" data-kind="${k}">${WS_KINDS[k]}</button>`).join('')}</div>
<table><thead><tr><th>품목</th><th>재고</th><th>단가</th><th>시간</th></tr></thead><tbody id="wsTab"></tbody></table>
<div><div class="rw"><label>수량 <input type="number" id="wsN" min="1" value="1" style="width:64px"></label><span id="wsMax" style="color:var(--dim)"></span></div>
<div class="rw" style="margin-top:6px">${[-10,-5,-1,1,5,10].map(n=>`<button class="btn" type="button" data-qty="${n}" style="flex:1">${n>0?'+':''}${n}</button>`).join('')}</div></div>
<div class="sum" id="wsSum"></div><button class="btn on" id="wsCraft" type="button">제작 시작</button>
<div id="wsJob"></div><div id="wsStock" style="color:var(--dim)"></div>`;
  $('stage').appendChild(m);
  m.addEventListener('click',e=>{
    const o=wsPanelObj();if(!o)return;
    if(e.target.id==='wsClose'){wsClose();return;}
    const k=e.target.closest('button[data-kind]');if(k){wsSel.kind=k.dataset.kind;wsSel.item=null;wsPanelRender(o);return;}
    const tr=e.target.closest('tr[data-item]');if(tr){wsSel.item=tr.dataset.item;wsPanelRender(o);return;}
    const q=e.target.closest('button[data-qty]');if(q){const mx=WS.batches[wsTier(o)];$('wsN').value=Math.max(1,Math.min(mx,(+$('wsN').value|0)+(+q.dataset.qty)));wsPanelCost();return;}
    if(e.target.closest('[data-upgrade]')){wsUpgrade(o,false);wsPanelRender(o);return;}
    if(e.target.id==='wsCraft'){const er=wsQueue(o,wsSel.kind,wsSel.item,+$('wsN').value);if(er)toast(er);else wsPanelRender(o);}
  });
  m.addEventListener('input',e=>{if(e.target.id==='wsN')wsPanelCost();});
  return m;
}
function wsPanelObj(){return wsPanelId===null||!G?null:[...G.obSet].find(o=>o.id===wsPanelId)||null;}
function wsPanelOpen(o){wsPanelId=o.id;if(typeof armMenu==='function')armMenu(false);const e=wsMakePanel();e.hidden=false;wsPanelRender(o);}
function wsClose(){const e=document.getElementById('wsPanel');if(e)e.hidden=true;wsPanelId=null;}
function wsPanelRender(o){
  if(!o)return wsClose();const e=wsMakePanel(),tier=wsTier(o),T=G.teams[o.team],kind=wsSel.kind,list=Object.keys(WS.recipes[kind]||{});
  if(!list.includes(wsSel.item))wsSel.item=list[0];
  e.querySelector('#wsTitle').textContent='🔧 '+wsName(o);
  e.querySelector('#wsSubtitle').textContent='제작 상한 '+WS.batches[tier]+'개 · 재료 단가 '+Math.round((1-.1*tier)*100)+'% · 완성품은 무기고에 입고';
  const uc=wsUpgradeCost(tier);
  e.querySelector('#wsUpgradeBox').innerHTML=uc?'<button data-upgrade class="btn" type="button" style="width:100%">강화: '+WS.names[tier+1]+' · '+wsCostText(uc)+'</button>':'<div style="color:var(--accent)">최종 단계 · 차량 목록에서 폭발 드론 해금</div>';
  e.querySelectorAll('#wsTabs .btn').forEach(b=>b.classList.toggle('on',b.dataset.kind===kind));
  e.querySelector('#wsTab').innerHTML=list.map(k=>`<tr data-item="${k}" class="${k===wsSel.item?'pick':''}"><td><b style="color:${wsItemCol(kind,k)}">${wsItemName(kind,k)}</b></td><td>${wsStockOf(T,kind,k)}</td><td style="color:var(--dim);font-size:11px">${wsCostText(wsRecipe(kind,k,1,tier))}</td><td>${WS.time[kind]}초</td></tr>`).join('');
  e.querySelector('#wsMax').textContent='최대 '+WS.batches[tier]+'개';
  const inp=e.querySelector('#wsN');inp.max=WS.batches[tier];if(+inp.value>WS.batches[tier])inp.value=WS.batches[tier];if(+inp.value<1)inp.value=1;
  e.querySelector('#wsStock').textContent=(armories(T.id).length?'무기고 연결됨':'무기고 없음 · 먼저 무기고를 건설하세요')+(o.job?' · 제작 중':'');
  wsPanelCost();wsPanelProgress(o);
}
function wsPanelCost(){
  const o=wsPanelObj();if(!o)return;const e=wsMakePanel(),kind=wsSel.kind,n=Math.max(1,+e.querySelector('#wsN').value|0),T=G.teams[o.team];
  const cost=wsRecipe(kind,wsSel.item,n,wsTier(o)),enough=cost&&canAfford(T,cost),dur=wsDuration(kind,n);
  e.querySelector('#wsSum').innerHTML=`<b>${wsSel.item?wsItemName(kind,wsSel.item):'-'} ×${n}</b><br>재료 ${cost?wsCostText(cost):'-'}<br>소요 <b>${dur.toFixed(1)}초</b> <span style="color:var(--dim)">(개당 ${(dur/n).toFixed(2)}초 · 수량이 많을수록 길어짐)</span><span style="float:right;color:${enough?'var(--good)':'var(--danger)'}">${enough?'제작 가능':'재료 부족'}</span>`;
  e.querySelector('#wsCraft').disabled=!!o.job||!enough||!armories(T.id).length;
}
function wsPanelProgress(o){
  const e=document.getElementById('wsPanel');if(!e||e.hidden)return;
  const box=e.querySelector('#wsJob');
  if(!o.job){box.innerHTML='';wsPanelCost();return;}
  const j=o.job,p=Math.min(1,j.elapsed/j.duration);
  box.innerHTML=`<div class="sum"><b>제작 중</b> · ${wsItemName(j.kind,j.item)} ×${j.n}<br>${Math.floor(p*100)}% · 남은 ${Math.max(0,j.duration-j.elapsed).toFixed(1)}초<div class="bar"><i style="width:${Math.floor(p*100)}%"></i></div></div>`;
  e.querySelector('#wsCraft').disabled=true;
}
// ---- AI: 공방 건설·강화·장비 제작·드론 운용 ----
function wsAiBuild(T,free){
  if(free.length<1||T.trench.length<1||!canAfford(T,OB.workshop.cost))return false;
  const seen=new Set();
  for(const ti of T.trench){
    if(G.trench[ti]!==T.id+1)continue;
    const tx=ti%G.w,ty=(ti/G.w)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=tx+dx,y=ty+dy,k=y*G.w+x;if(seen.has(k))continue;seen.add(k);
      if(!inb(x,y)||G.trench[k]===T.id+1||taskCheck(T.id,'build',x,y,'workshop'))continue;
      const q=getTask(T.id,'build',x,y,'workshop',true);if(q){orderTasks([free[0]],[q]);return true;}
    }
  }
  return false;
}
function aiPartWorkshop(T,dt){
  if(!T.ai||!T.flag||T.dead||G.phase!=='play')return;
  T.ai.wsT=(T.ai.wsT||0)-dt;if(T.ai.wsT>0)return;T.ai.wsT=8.5;
  let os=[...G.obSet].filter(o=>o.type==='workshop'&&!o.natural&&o.team===T.id);
  if(!os.length){
    if([...G.tasks.values()].some(q=>q.kind==='build'&&q.type==='workshop'&&q.team===T.id))return;
    wsAiBuild(T,aiFreeUnits(T));return;
  }
  const o=os[0],free=aiFreeUnits(T),target=Math.min(2,Math.ceil((G.cfg.soldiers||18)/24));
  if(wsTier(o)<2&&wsUpgrade(o,true))return;
  const droneCount=G.vehicles.filter(v=>v.type==='drone'&&v.team===T.id&&!v.dead).length;
  if(wsTier(o)>=2&&droneCount<target&&T.res.metal>=OB.drone.cost.metal&&!o.job){wsAiDroneBuild(T,free);return;}
  if(armories(T.id).length&&!o.job){
    const stock=wst(T),want=Math.max(3,Math.floor(popOf(T.id)*.22));
    if((stock.assault||0)<want&&T.res.metal>30&&T.res.wood>12){wsQueue(o,'weapon','assault',Math.min(WS.batches[wsTier(o)],Math.max(1,want-(stock.assault||0)),5),true);return;}
    const astock=ast(T);
    if(aCount(T.id,'none')>4&&astock.wood>0&&!(T.aswaps||[]).some(s=>s.left>0||s.fly>0))armSwapAdd(T.id,'none','wood',Math.min(aCount(T.id,'none'),astock.wood));
    if(armFree(T.id)-pendingExp(T)>=2&&T.res.metal>14&&T.res.wood>5&&pendingExp(T)<5)wsQueue(o,'exp','frag',Math.min(3,armFree(T.id)-pendingExp(T)),true);
  }
}
if(typeof aiPart==='function'&&typeof AILOAD==='object'){
  aiPart('workshop',{name:'공방·드론 운용',desc:'공방·공예소·군수공장을 건설·강화하고 총기·방어구·폭발 드론을 제작한다.',run:aiPartWorkshop,every:8.5,blockable:true});
  for(const m of ['normal','reclaim'])if(AILOAD[m]&&!AILOAD[m].includes('workshop'))AILOAD[m].push('workshop');
}
// SVG workshop icon for the dynamic build drawer
const _facilityIconWS=facilityIcon;
facilityIcon=function(type){
  if(type==='workshop')return '<path d="M15 43V22l17-11 12 7 13-8 16 10v23z" fill="#74684f" stroke="#d5c493" stroke-width="2"/><path d="M20 24l12-8 12 8 13-8 11 8v19H20z" fill="#635a45"/><rect x="43" y="27" width="15" height="16" fill="#292a22"/><path d="M12 45h74M25 8v12M73 8v12" stroke="#d9ad4e" stroke-width="3"/><circle cx="31" cy="36" r="4" fill="#bd7445"/><circle cx="69" cy="36" r="4" fill="#bd7445"/>';
  return _facilityIconWS(type);
};

// 기존 OB 툴팁 등록을 보존하고 공방 설명만 확장한다.
const _tipObWS=TIPREG.ob;
tipReg('ob',(id,...args)=>id==='workshop'?{t:'공방',stats:[['크기','2×2'],['주둔','불가'],['건설','병사 1명 · 250 금속'],['강화','공예소 → 군수공장']],d:'총기·방어구·투척물을 금속과 목재로 제작합니다.'}:_tipObWS(id,...args));

window.addEventListener('keydown',e=>{if(e.key==='Escape'&&wsPanelId!==null)wsClose();});

function wsHasFactory(team){
  return !!(G&&G.obSet&&[...G.obSet].some(o=>o.type==='workshop'&&!o.natural&&o.team===team&&wsTier(o)>=2));
}
function wsAiDroneBuild(T,free){
  if(!free.length||!canAfford(T,OB.drone.cost))return false;
  if([...G.tasks.values()].some(q=>q.kind==='build'&&q.type==='drone'&&q.team===T.id))return true;
  const seen=new Set();
  for(const ti of T.trench){
    if(G.trench[ti]!==T.id+1)continue;
    const tx=ti%G.w,ty=(ti/G.w)|0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const x=tx+dx,y=ty+dy,k=y*G.w+x;if(seen.has(k))continue;seen.add(k);
      if(!inb(x,y)||taskCheck(T.id,'build',x,y,'drone'))continue;
      const q=getTask(T.id,'build',x,y,'drone',true);if(q){orderTasks([free[0]],[q]);return true;}
    }
  }
  return false;
}
const _orderVehiclesDroneWS=orderVehicles;
orderVehicles=function(list,tx,ty){
  const drones=list.filter(v=>v.type==='drone'&&!v.dead),others=list.filter(v=>v.type!=='drone'&&!v.dead);
  if(others.length)_orderVehiclesDroneWS(others,tx,ty);
  if(!inb(tx,ty))return;
  for(const v of drones){v.path=[];v.state='move';v.target=null;v.droneSense=0;v.droneDest={x:tx+.5,y:ty+.5};}
};
const _taskCheckDroneWS=taskCheck;
taskCheck=function(team,kind,x,y,type){
  if(kind==='build'&&type==='drone'&&!wsHasFactory(team))return '군수공장이 필요합니다';
  return _taskCheckDroneWS(team,kind,x,y,type);
};
const _buildDrawerDroneWS=buildBuildDrawer;
buildBuildDrawer=function(){
  _buildDrawerDroneWS();
  const b=document.querySelector('#buildList .buildCard[data-id="drone"]');if(!b)return;
  const unlocked=wsHasFactory(0),small=b.querySelector('small');
  b.disabled=!unlocked;b.setAttribute('aria-disabled',String(!unlocked));
  if(small&&!unlocked)small.innerHTML+=' <br>🔒 군수공장 필요';
  let st=document.getElementById('wsDroneLockStyle');
  if(!st){st=document.createElement('style');st.id='wsDroneLockStyle';st.textContent='#buildList .buildCard[data-id="drone"]:disabled{opacity:.48;filter:saturate(.45);cursor:not-allowed}';document.head.appendChild(st);}
};
const _stepTurretsDroneWS=stepTurrets;
stepTurrets=function(dt){
  if(G)for(const o of G.obSet){
    if(o.type!=='mortar'||stLv(o)<2)continue;
    const T=o.fort?FORT_T:G.teams[o.team];if(!T||T.res.bullets<6)continue;
    o.cd=(o.cd||0)-dt;if(o.cd>0)continue;
    const cx0=o.x+.5,cy0=o.y+.5,R=turretRange(o);
    let best=null,bd=R;
    for(const v of G.vehicles){
      if(v.type!=='drone'||v.dead||isAllyT(v.team,o.team))continue;
      const d=Math.hypot(v.x-cx0,v.y-cy0);if(d<=bd){bd=d;best=v;}
    }
    if(best){
      T.res.bullets-=6;o.aim=Math.atan2(best.y-cy0,best.x-cx0);o.muz=.25;o.cd=1.55;
      fxPush({k:'trace',x1:cx0,y1:cy0,x2:best.x,y2:best.y,t:0,d:.2});sfx('mortar',cx0,cy0);
      damageVehicle(best,VEH.drone.hp+1,{team:o.team});
    }
  }
  _stepTurretsDroneWS(dt);
};
