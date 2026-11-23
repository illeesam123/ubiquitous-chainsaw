// ================= 총기 종류 · 무기고 교체 =================
// 무기: 소총(기본) · 새총 · 권총 · 돌격소총 · 저격총 · 경기관총 · 대전차포.
//  - 구매는 헬기(상점)에서 → 팀 무기 재고(T.wst)로 입고. 병사에게는 무기고 메뉴의 '교체 주문'으로 하나씩 바꿔 준다.
//  - mag/reload: 탄창 발수와 재장전 시간(병사별 u.mag/u.rl). wx: 날씨 명중률 지수(0=영향 없음, 3=심하게). vdm: 차량 피해 배수. blast: 범위 공격 반경.
const WEAP={
  rifle:{n:'소총',col:'#c9b88a',price:0,dmg:14,int:.95,range:8,cost:.5,acc:.9,desc:'가장 기본적인 소총입니다.'},
  sling:{n:'새총',col:'#c79a5a',price:8,dmg:5,int:1.5,range:4.6,cost:0,acc:.5,desc:'매우 싸고 총알을 소모하지 않습니다. 공격력·명중률·사거리는 기대하기 어렵습니다.'},
  pistol:{n:'권총',col:'#a9b4c0',price:35,dmg:9,int:.45,range:5,cost:.3,acc:.97,mag:11,reload:1.9,desc:'보급형 총기. 11발을 속사하고 재장전합니다. 사거리는 짧지만 명중률이 높습니다.'},
  assault:{n:'돌격소총',col:'#8fb27a',price:80,dmg:9,int:.2,range:8.5,cost:.4,acc:.85,mag:30,reload:3.8,desc:'제식 총기. 30발을 속사하고 재장전합니다. 준수하지만 재장전이 길어 무방비해질 수 있습니다.'},
  sniper:{n:'저격총',col:'#7fb0d8',price:120,dmg:165,int:2.8,range:16,cost:1.5,acc:.93,mag:5,reload:3.2,wx:3,desc:'방대한 거리를 장악하고 높은 확률로 즉사시킵니다. 날씨에 따라 명중률이 심하게 변합니다.'},
  lmg:{n:'경기관총',col:'#d89a6f',price:150,dmg:8,int:.1,range:5,cost:.25,acc:.72,mag:250,reload:8,wx:0,desc:'막대한 포화로 근거리를 초토화합니다. 250발 속사 후 재장전. 사거리는 권총과 같고 날씨 영향이 없습니다.'},
  at:{n:'대전차포',col:'#d86f6f',price:140,dmg:70,int:5.5,range:9,cost:4,acc:.85,vdm:5,blast:1.45,desc:'장전이 매우 느리지만 중거리에서 범위 공격. 전차에게 주는 피해는 5배입니다.'}
};
const WEAPK=['rifle','sling','pistol','assault','sniper','lmg','at'],WEAPBUY=WEAPK.slice(1);
Object.assign(GUNS,{
  rifle:{n:'소총',look:'rifle',tip:13},sling:{n:'새총',look:'sling',tip:7},pistol:{n:'권총',look:'pistol',tip:9.5},
  assault:{n:'돌격소총',look:'assault',tip:15},sniper:{n:'저격총',look:'sniper',tip:20},lmg:{n:'경기관총',look:'lmg',tip:15},at:{n:'대전차포',look:'at',tip:16}
});
function gunOf(u){return WEAP[u.gun]||RIFLE;}
function wst(T){return T.wst||(T.wst={sling:0,pistol:0,assault:0,sniper:0,lmg:0,at:0});}
function wCount(team,k){let n=0;for(const u of G.units)if(!u.dead&&u.team===team&&(u.gun||'rifle')===k)n++;return n;}
function wStock(T,k){return k==='rifle'?Infinity:(wst(T)[k]|0);}
// ---- 사격 ----
const _wxA=weatherAccuracy;let WXE=1;
weatherAccuracy=function(){const v=_wxA();return WXE===1?v:Math.pow(v,WXE);};
const _fireW=fire;
fire=function(u,g,o){
  const own=g.mag&&o===u;
  if(own){if(u.rl>0)return false;if(u.mag===undefined||u.mgk!==u.gun){u.mag=g.mag;u.mgk=u.gun;}}
  const ok=_fireW(u,g,o);
  if(ok&&own){u.mag--;if(u.mag<=0){u.rl=g.reload;u.mag=g.mag;}}
  return ok;
};
const _rhW=resolveHit;
resolveHit=function(s,u,gun){
  if(gun.blast){atImpact(s,u,gun);return;}
  if(gun.vdm&&VEH[u.type])gun=Object.assign({},gun,{dmg:gun.dmg*gun.vdm});
  WXE=gun.wx===undefined?1:gun.wx;
  try{_rhW(s,u,gun);}finally{WXE=1;}
};
function atImpact(s,u,g){
  const sc=(1-g.acc*weatherAccuracy())*1.8*(u.state==='move'?1.6:1),a=Math.random()*6.283,r=Math.random()*sc;
  const x=u.x+Math.cos(a)*r,y=u.y+Math.sin(a)*r,R=g.blast,team=s.team;
  for(const q of G.units){
    if(q.dead||q.team===team||q.state==='crew'||q.lay||inRoof(q))continue;
    const d=Math.hypot(q.x-x,q.y-y);if(d>R)continue;
    let dmg=g.dmg*(1-.6*d/R)*(.9+Math.random()*.2);if(sameTeamTrench(q))dmg*=.7;
    hurt(q,dmg,s);if(q.gar&&G.obSet.has(q.gar))damageOb(q.gar,dmg*.4);
  }
  for(const v of G.vehicles){
    if(v.dead||v.team===team)continue;
    const d=Math.hypot(v.x-x,v.y-y);if(d<=R+.5)damageVehicle(v,g.dmg*g.vdm*(1-.35*Math.min(1,d/(R+.5))),s);
  }
  for(const o of [...G.obSet])if((o.natural||o.team!==team)&&Math.hypot(o.x+o.size/2-x,o.y+o.size/2-y)<=R*.8)damageOb(o,g.dmg*.5);
  fxPush({k:'boom',x,y,t:0,d:.5});sfx('boom',x,y);clearBush(x,y,1.3);
}
const _suW=stepUnit;
stepUnit=function(u,dt){if(u.rl>0)u.rl-=dt;return _suW(u,dt);};
// ---- 헬기 구매 ----
function pendingW(T){let n=0;for(const l of T.order.lines)if(l.kind==='wpn')n+=l.n;return n;}
function shopAddWeapon(team,item,n){
  const T=G.teams[team],d=WEAP[item];
  if(!armories(team).length)return '무기고를 먼저 건설해야 합니다';
  if(T.order.lines.length>=SHOP.maxLines)return '주문 목록이 가득 찼습니다';
  const cost={money:d.price*n};if(!canAfford(T,cost))return '달러가 부족합니다';
  pay(T,cost);T.order.lines.push({id:G.nextId++,kind:'wpn',item,n,cost});return null;
}
const _deliverW=deliverOrder;
deliverOrder=function(T){
  const ws=T.order.lines.filter(l=>l.kind==='wpn');
  if(ws.length){
    T.order.lines=T.order.lines.filter(l=>l.kind!=='wpn');
    const got={};for(const l of ws){wst(T)[l.item]+=l.n;got[l.item]=(got[l.item]||0)+l.n;}
    if(T.id===0){const p=Object.keys(got).map(k=>`${WEAP[k].n} +${got[k]}`).join(' · ');toast('헬기 도착: 무기고에 '+p,'ok');G.lastGain='무기고 입고 '+p;G.gainShow=5;}
  }
  _deliverW(T);
};
// ---- 교체 주문 ----
// T.swaps=[{id,from,to,left,total}] : 대기 병사가 하나씩 무기고로 가서 헌 무기를 반납하고 새 무기를 받는다.
const SWAP={range:16,par:2,rest:.5};
function swapCancel(team,id){
  const T=G.teams[team];if(!T.swaps)return;const i=T.swaps.findIndex(s=>s.id===id);if(i<0)return;
  const s=T.swaps[i];s.left=0;s.cancel=true;
}
function swapAdd(team,from,to,n){
  const T=G.teams[team];
  if(!armories(team).length)return '무기고가 없습니다';
  if(from===to)return '서로 다른 무기를 고르세요';
  const have=wCount(team,from),room=wStock(T,to);
  n=Math.min(n,have,room);if(n<1)return room<1?'교체할 무기의 재고가 없습니다 (헬기로 구매)':'바꿀 병사가 없습니다';
  (T.swaps||(T.swaps=[])).push({id:G.nextId++,from,to,left:n,total:n,fly:0});return null;
}
function stepWeapons(dt){
  G.swT=(G.swT||0)-dt;
  for(const u of G.units){
    const f=u.wf;if(!f)continue;
    const T=G.teams[u.team];
    if(u.dead||!G.obSet.has(f.o)){u.wf=null;if(f.to!=='rifle')wst(T)[f.to]++;f.s.left++;f.s.fly--;continue;}
    f.t+=dt;
    const near=Math.hypot(u.x-(f.o.x+f.o.size/2),u.y-(f.o.y+f.o.size/2))<=2.3;
    if(near&&u.state!=='move'){
      if(f.from!=='rifle')wst(T)[f.from]++;
      u.gun=f.to;u.mag=undefined;u.rl=0;u.wf=null;f.s.fly--;
      fxPush({k:'dust',x:u.x,y:u.y,t:0,d:.3,kind:'heal'});sfx('hammer',u.x,u.y);continue;
    }
    if((u.state!=='move'&&!near)||f.t>30){u.wf=null;if(f.to!=='rifle')wst(T)[f.to]++;f.s.left++;f.s.fly--;}
  }
  if(G.swT>0)return;G.swT=SWAP.rest;
  for(const T of G.teams){
    if(!T.swaps)continue;
    T.swaps=T.swaps.filter(s=>s.left>0||s.fly>0);
    const A=armories(T.id);if(!A.length)continue;
    for(const s of T.swaps){
      while(s.left>0&&s.fly<SWAP.par){
        if(wStock(T,s.to)<1){s.left=Math.min(s.left,s.fly);break;}   // 재고가 바닥나면 남은 주문은 접는다
        let best=null,bd=1e9,bo=null;
        for(const u of G.units){
          if(u.dead||u.team!==T.id||(u.gun||'rifle')!==s.from||u.state!=='idle'||u.item||u.fetch||u.wf||u.lay||u.gar||u.queue.length||u.task||u.medTarget)continue;
          for(const o of A){const d=Math.hypot(u.x-(o.x+o.size/2),u.y-(o.y+o.size/2));if(d<bd&&d<=SWAP.range){bd=d;best=u;bo=o;}}
        }
        if(!best)break;
        if(s.to!=='rifle')wst(T)[s.to]--;
        s.left--;s.fly++;best.wf={o:bo,from:s.from,to:s.to,t:0,s};
        if(bd>2.3){
          const p=findPathL(0,best.team,Math.floor(best.x),Math.floor(best.y),bo.x,bo.y,true);
          if(p&&p.length){best.path=p;best.state='move';best.after=null;}
          else{best.wf=null;if(s.to!=='rifle')wst(T)[s.to]++;s.left++;s.fly--;break;}
        }
      }
    }
  }
}
const _ssW=stepShells;stepShells=function(dt){_ssW(dt);stepWeapons(dt);};
// ---- UI: 상점 구매 칸 + 무기고 메뉴 ----
(function(){
  const body=document.querySelector('#shopDrawer .shopBody');if(!body)return;
  const secs=body.querySelectorAll('section'),last=secs[secs.length-1];
  const sec=document.createElement('section');sec.id='shWpn';
  sec.innerHTML='<h3>총기</h3><div id="shWpnMsg" style="font-size:12px;color:var(--dim);line-height:1.45;margin-bottom:6px"></div>'+WEAPBUY.map(k=>`<div class="shWpnRow" data-k="${k}" style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;margin:4px 0"><div><b style="color:${WEAP[k].col}">${WEAP[k].n}</b><br><small style="color:var(--dim)">${WEAP[k].desc}<br>달러 ${WEAP[k].price} / 정</small></div><button class="btn" data-n="1">+1</button><button class="btn" data-n="5">+5</button></div>`).join('')+'<button class="btn" id="shWpnMenu" type="button" style="width:100%;margin-top:6px">🔫 무기고 메뉴 열기</button>';
  body.insertBefore(sec,last);
  sec.addEventListener('click',e=>{
    if(e.target.id==='shWpnMenu'){armMenu(true);return;}
    const b=e.target.closest('button[data-n]');if(!b||!G)return;
    const er=shopAddWeapon(0,b.closest('.shWpnRow').dataset.k,+b.dataset.n);if(er)toast(er);renderShop(true);
  });
  const st=document.createElement('style');
  st.textContent=`#armMenu{position:absolute;top:56px;right:12px;z-index:26;width:340px;max-height:calc(100% - 80px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:8px}
#armMenu[hidden]{display:none}#armMenu h3{margin:0;font:600 13px var(--body);display:flex;justify-content:space-between;align-items:center}
#armMenu table{width:100%;border-collapse:collapse}#armMenu td,#armMenu th{padding:3px 4px;text-align:left;border-bottom:1px solid var(--line)}#armMenu th{color:var(--dim);font-weight:600}
#armMenu .rw{display:flex;gap:6px;align-items:center}#armMenu select,#armMenu input{min-width:0}#armMenu .sw{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center}
#armMenu .job{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line)}`;
  document.head.appendChild(st);
  const m=document.createElement('aside');m.id='armMenu';m.hidden=true;
  m.innerHTML=`<h3><span>🔫 무기고</span><button class="btn" id="amX" type="button">닫기 ✕</button></h3>
<div id="amInfo" style="color:var(--dim)"></div>
<table><thead><tr><th>무기</th><th>병사</th><th>재고</th></tr></thead><tbody id="amTab"></tbody></table>
<div><b>무기 교체</b><div class="sw" style="margin-top:6px"><select id="amFrom"></select><span>→</span><select id="amTo"></select></div>
<div class="rw" style="margin-top:6px"><label>인원 <input type="number" id="amN" min="1" value="1" style="width:64px"></label><button class="btn" id="amGo" type="button" style="flex:1">교체 주문</button></div>
<small style="color:var(--dim)">무기고 ${SWAP.range}칸 안의 대기 병사가 하나씩 가서 헌 무기를 반납하고 새 무기를 받습니다. 새 무기는 헬기로 구매하세요.</small></div>
<div id="amJobs"></div>`;
  $('stage').appendChild(m);
  const mk=(sel,items)=>{sel.innerHTML=items;};
  m.addEventListener('click',e=>{
    if(e.target.id==='amX'){armMenu(false);return;}
    if(e.target.id==='amGo'&&G){const er=swapAdd(0,$('amFrom').value,$('amTo').value,Math.max(1,+$('amN').value|0));if(er)toast(er);else toast('교체 주문을 등록했습니다','ok');amRender(true);}
    const c=e.target.closest('button[data-cancel]');if(c&&G){swapCancel(0,+c.dataset.cancel);amRender(true);}
  });
  window.armMenu=function(v){m.hidden=!v;if(v){amSig='';amRender(true);}};
  const sel0=(id,html)=>{const s=$(id),cur=s.value;s.innerHTML=html;if(cur)s.value=cur;if(!s.value)s.selectedIndex=0;};
  let amSig='';
  window.amRender=function(force){
    if(m.hidden||!G)return;
    const T=G.teams[0],A=armories(0).length;
    const cnt={},stk={};for(const k of WEAPK){cnt[k]=wCount(0,k);stk[k]=wStock(T,k);}
    const jobs=(T.swaps||[]).filter(s=>s.left>0||s.fly>0);
    const sig=JSON.stringify([A,cnt,WEAPK.map(k=>wst(T)[k]|0),jobs.map(s=>[s.id,s.left,s.fly]),$('amFrom').value,$('amTo').value]);
    if(!force&&sig===amSig)return;amSig=sig;
    $('amInfo').textContent=A?`무기고 ${A}동`:'🔒 무기고를 건설해야 합니다 (건설 시설 → 무기고).';
    $('amTab').innerHTML=WEAPK.map(k=>`<tr><td><b style="color:${WEAP[k].col}">${WEAP[k].n}</b></td><td>${cnt[k]}명</td><td>${k==='rifle'?'∞':stk[k]}</td></tr>`).join('');
    sel0('amFrom',WEAPK.map(k=>`<option value="${k}">${WEAP[k].n} (${cnt[k]}명)</option>`).join(''));
    sel0('amTo',WEAPK.map(k=>`<option value="${k}">${WEAP[k].n} (${cnt[k]}명)${k==='rifle'?'':' · 재고 '+stk[k]}</option>`).join(''));
    if($('amTo').value===$('amFrom').value&&!$('amFrom').dataset.touched){const o=[...$('amTo').options].find(x=>x.value!==$('amFrom').value&&x.value!=='rifle');if(o)$('amTo').value=o.value;}
    $('amJobs').innerHTML=jobs.length?'<b>진행 중인 교체</b>'+jobs.map(s=>`<div class="job"><span>${WEAP[s.from].n} (${cnt[s.from]}명) → ${WEAP[s.to].n} (${cnt[s.to]}명)<br><small style="color:var(--dim)">남은 ${s.left+s.fly}명 / 총 ${s.total}명</small></span><button class="btn" data-cancel="${s.id}" type="button">취소</button></div>`).join(''):'';
    $('amGo').disabled=!A;
  };
  $('amFrom').addEventListener('change',e=>{e.target.dataset.touched=1;amRender(true);});$('amTo').addEventListener('change',()=>amRender(true));
  // 상단 버튼
  const b=document.createElement('button');b.className='btn';b.id='bArm';b.type='button';b.title='무기고 메뉴';b.textContent='🔫';
  const pause=$('bPause');if(pause)pause.parentNode.insertBefore(b,pause);
  b.onclick=()=>armMenu(m.hidden);
  setInterval(()=>{try{amRender(false);updateWpnUI();}catch(e){}},400);
  window.updateWpnUI=function(){
    const s=$('shWpn');if(!s||!G)return;const ok=armories(0).length>0;
    $('shWpnMsg').innerHTML=ok?`재고 ${WEAPBUY.map(k=>`${WEAP[k].n} ${wst(G.teams[0])[k]|0}`).join(' · ')}<br>입고 대기 ${pendingW(G.teams[0])}정 · 구입 후 <b>무기고 메뉴</b>에서 병사에게 바꿔 줍니다.`:'🔒 <b>무기고</b>를 건설하면 해금됩니다 (건설 시설 → 무기고).';
    s.querySelectorAll('.shWpnRow button').forEach(x=>x.disabled=!ok);s.style.opacity=ok?1:.55;
  };
})();
