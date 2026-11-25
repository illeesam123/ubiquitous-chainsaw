// ================= 방호구 =================
// 기본은 맨몸. 헬기로 구매해 무기고에 입고 → 무기고 메뉴에서 대기 병사에게 입힌다(무기 교체와 같은 방식).
// 효과: 받는 피해 감소(def), 공격 무효화 확률(dodge), 이동 속도 증감(spd). 새 방호구는 ARMOR 에 한 줄만 추가하면 된다.
const ARMOR={
  wood:{n:'나무판자',col:'#b9955a',cost:{wood:10},def:.15,spd:-.10,desc:'여러 겹의 나무를 덧대어 방호력을 부여합니다.'},
  plate:{n:'장갑판',col:'#9aa6b2',cost:{money:50,metal:3},def:.20,spd:0,desc:'제식 장갑판입니다. 믿을 만 합니다.'},
  stone:{n:'석재 갑주',col:'#8b8f86',cost:{metal:10},def:.40,dodge:.10,spd:-.80,desc:'강력한 보호 기능을 지닙니다. 움직이기는 어려워 보입니다.'}
};
const ARMORK=Object.keys(ARMOR),ARMNONE={n:'맨몸',col:'#c9c9b8'};
const armName=k=>k==='none'?ARMNONE.n:ARMOR[k].n;
tipReg('arm',k=>{const a=ARMOR[k],s=[['방어력','+'+Math.round(a.def*100)+'%']];if(a.dodge)s.push(['공격 무효',Math.round(a.dodge*100)+'%']);if(a.spd)s.push(['이동 속도',Math.round(a.spd*100)+'%']);
  s.push(['재료',Object.entries(a.cost).map(([r,n])=>`${RN[r]} ${n}`).join(' · ')]);return {t:a.n,col:a.col,stats:s,d:a.desc};});
const armSpd=u=>{const a=ARMOR[u.arm];return a?1+(a.spd||0):1;};
function ast(T){return T.ast||(T.ast={wood:0,plate:0,stone:0});}
function aCount(team,k){let n=0;for(const u of G.units)if(!u.dead&&!u.paxOf&&!u.vehicleId&&u.state!=='crew'&&u.team===team&&(u.arm||'none')===k)n++;return n;}
function aStock(T,k){return k==='none'?Infinity:(ast(T)[k]|0);}
// ---- 효과 ----
const _hurtAr=hurt;
hurt=function(u,dmg,s){
  const a=u&&u.arm&&ARMOR[u.arm];
  if(a){if(a.dodge&&Math.random()<a.dodge){u.flash=.05;return;}dmg*=1-a.def;}
  return _hurtAr(u,dmg,s);
};
// ---- 헬기 구매 ----
function shopAddArmor(team,item,n){
  const T=G.teams[team],d=ARMOR[item];
  if(!armories(team).length)return '무기고를 먼저 건설해야 합니다';
  if(T.order.lines.length>=SHOP.maxLines)return '주문 목록이 가득 찼습니다';
  const cost={};for(const k in d.cost)cost[k]=d.cost[k]*n;
  if(!canAfford(T,cost))return '자원이 부족합니다';
  pay(T,cost);T.order.lines.push({id:G.nextId++,kind:'arm',item,n,cost});return null;
}
function pendingA(T){let n=0;for(const l of T.order.lines)if(l.kind==='arm')n+=l.n;return n;}
const _deliverA=deliverOrder;
deliverOrder=function(T){
  const ws=T.order.lines.filter(l=>l.kind==='arm');
  if(ws.length){
    T.order.lines=T.order.lines.filter(l=>l.kind!=='arm');
    const got={};for(const l of ws){ast(T)[l.item]+=l.n;got[l.item]=(got[l.item]||0)+l.n;}
    if(T.id===0){const p=Object.keys(got).map(k=>`${ARMOR[k].n} +${got[k]}`).join(' · ');toast('헬기 도착: 무기고에 '+p,'ok');G.lastGain='무기고 입고 '+p;G.gainShow=5;}
  }
  _deliverA(T);
};
// ---- 착용 주문: T.aswaps=[{id,from,to,left,total,fly}] (from/to: 'none' 또는 방호구 키) ----
function armSwapCancel(team,id){const T=G.teams[team],s=(T.aswaps||[]).find(x=>x.id===id);if(s){s.left=0;}}
function armSwapAdd(team,from,to,n){
  const T=G.teams[team];
  if(!armories(team).length)return '무기고가 없습니다';
  if(from===to)return '서로 다른 상태를 고르세요';
  const have=aCount(team,from),room=aStock(T,to);
  n=Math.min(n,have,room);if(n<1)return room<1?'방호구 재고가 없습니다 (헬기로 구매)':'바꿀 병사가 없습니다';
  (T.aswaps||(T.aswaps=[])).push({id:G.nextId++,from,to,left:n,total:n,fly:0});return null;
}
function armBack(T,f){if(f.to!=='none')ast(T)[f.to]++;f.s.left++;f.s.fly--;}
function stepArmor(dt){
  G.arT=(G.arT||0)-dt;
  for(const u of G.units){
    const f=u.af;if(!f)continue;const T=G.teams[u.team];
    if(u.dead||!G.obSet.has(f.o)){u.af=null;armBack(T,f);continue;}
    f.t+=dt;
    const near=Math.hypot(u.x-(f.o.x+f.o.size/2),u.y-(f.o.y+f.o.size/2))<=2.3;
    if(near&&u.state!=='move'){
      if(f.from!=='none')ast(T)[f.from]++;
      u.arm=f.to==='none'?undefined:f.to;u.af=null;f.s.fly--;
      fxPush({k:'dust',x:u.x,y:u.y,t:0,d:.3,kind:'heal'});sfx('hammer',u.x,u.y);continue;
    }
    if((u.state!=='move'&&!near)||f.t>30){u.af=null;armBack(T,f);}
  }
  if(G.arT>0)return;G.arT=SWAP.rest;
  for(const T of G.teams){
    if(!T.aswaps)continue;
    T.aswaps=T.aswaps.filter(s=>s.left>0||s.fly>0);
    const A=armories(T.id);if(!A.length)continue;
    for(const s of T.aswaps){
      while(s.left>0&&s.fly<SWAP.par){
        if(aStock(T,s.to)<1){s.left=Math.min(s.left,s.fly);break;}
        let best=null,bd=1e9,bo=null;
        for(const u of G.units){
          if(u.dead||u.team!==T.id||(u.arm||'none')!==s.from||u.state!=='idle'||u.paxOf||u.vehicleId||u.item||u.fetch||u.wf||u.af||u.lay||u.gar||u.queue.length||u.task||u.medTarget)continue;
          for(const o of A){const d=Math.hypot(u.x-(o.x+o.size/2),u.y-(o.y+o.size/2));if(d<bd&&d<=SWAP.range){bd=d;best=u;bo=o;}}
        }
        if(!best)break;
        if(s.to!=='none')ast(T)[s.to]--;
        s.left--;s.fly++;best.af={o:bo,from:s.from,to:s.to,t:0,s};
        if(bd>2.3){
          const p=findPathL(0,best.team,Math.floor(best.x),Math.floor(best.y),bo.x,bo.y,true);
          if(p&&p.length){best.path=p;best.state='move';best.after=null;}
          else{best.af=null;armBack(T,{to:s.to,s});break;}
        }
      }
    }
  }
}
const _ssA=stepShells;stepShells=function(dt){_ssA(dt);stepArmor(dt);};
// ---- UI: 상점 구매 칸 ----
(function(){
  const body=document.querySelector('#shopDrawer .shopBody');if(!body)return;
  const secs=body.querySelectorAll('section'),last=secs[secs.length-1];
  const sec=document.createElement('section');sec.id='shArm';
  sec.innerHTML='<h3>방호구</h3><div id="shArmMsg" style="font-size:12px;color:var(--dim);line-height:1.45;margin-bottom:6px"></div>'+ARMORK.map(k=>`<div class="shArmRow" data-k="${k}" style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;margin:4px 0"><div ${tipAttr('arm:'+k)}><b style="color:${ARMOR[k].col}">${ARMOR[k].n}</b><br><small style="color:var(--dim)">${tipStats('arm:'+k)}</small></div><button class="btn" data-n="1">+1</button><button class="btn" data-n="5">+5</button></div>`).join('');
  body.insertBefore(sec,last);
  sec.addEventListener('click',e=>{const b=e.target.closest('button[data-n]');if(!b||!G)return;const er=shopAddArmor(0,b.closest('.shArmRow').dataset.k,+b.dataset.n);if(er)toast(er);renderShop(true);});
  window.updateArmUI=function(){
    if(!G)return;const ok=armories(0).length>0;
    $('shArmMsg').innerHTML=ok?`재고 ${ARMORK.map(k=>`${ARMOR[k].n} ${ast(G.teams[0])[k]|0}`).join(' · ')}<br>입고 대기 ${pendingA(G.teams[0])}벌 · 구입 후 <b>무기고 메뉴</b>에서 병사에게 입힙니다.`:'🔒 <b>무기고</b>를 건설하면 해금됩니다 (건설 시설 → 무기고).';
    sec.querySelectorAll('button').forEach(x=>x.disabled=!ok);sec.style.opacity=ok?1:.55;
  };
  setInterval(()=>{try{updateArmUI();}catch(e){}},500);
})();
// ---- UI: 무기고 메뉴의 방호구 구역 ----
(function(){
  const m=document.getElementById('armMenu');if(!m)return;
  const d=document.createElement('div');d.id='amArmor';
  d.innerHTML=`<b>🛡 방호구</b>
<table style="margin-top:4px"><thead><tr><th>종류</th><th>착용</th><th>재고</th><th>구매</th></tr></thead><tbody id="aaTab"></tbody></table>
<div class="sw" style="margin-top:6px"><select id="aaFrom"></select><span>→</span><select id="aaTo"></select></div>
<div class="rw" style="margin-top:6px"><label>인원 <input type="number" id="aaN" min="1" value="1" style="width:64px"></label><button class="btn" id="aaGo" type="button" style="flex:1">착용 주문</button></div>
<div class="rw qty" style="margin-top:4px">${[-10,-5,5,10].map(n=>`<button class="btn" type="button" data-qty="${n}" data-t="aaN" style="flex:1">${n>0?'+':''}${n}</button>`).join('')}</div>
<small style="color:var(--dim)">무기고 ${SWAP.range}칸 안의 대기 병사가 하나씩 가서 갈아입습니다. 기본은 맨몸이며, '맨몸'으로 바꾸면 벗은 방호구가 재고로 돌아옵니다.</small>
<div id="aaJobs"></div>`;
  m.insertBefore(d,document.getElementById('amJobs'));
  const $a=id=>document.getElementById(id);
  const KEYS=['none',...ARMORK];
  let sig='',lastSel='';
  m.addEventListener('click',e=>{
    if(!G)return;
    const bb=e.target.closest('button[data-buy^="arm:"]');
    if(bb){const k=bb.dataset.buy.slice(4),n=+bb.dataset.n,er=shopAddArmor(0,k,n);if(er)toast(er);else toast(ARMOR[k].n+' '+n+'벌을 주문했습니다 (헬기로 도착)','ok');window.amRender(true);try{renderShop(true);}catch(_){}return;}
    if(e.target.id==='aaGo'){const er=armSwapAdd(0,$a('aaFrom').value,$a('aaTo').value,Math.max(1,+$a('aaN').value|0));if(er)toast(er);else toast('착용 주문을 등록했습니다','ok');window.amRender(true);return;}
    const c=e.target.closest('button[data-acancel]');if(c){armSwapCancel(0,+c.dataset.acancel);window.amRender(true);}
  });
  $a('aaFrom').addEventListener('change',()=>{$a('aaFrom').dataset.touched=1;window.amRender(true);});$a('aaTo').addEventListener('change',()=>window.amRender(true));
  const _ar=window.amRender;
  window.amRender=function(force){
    _ar(force);
    if(m.hidden||!G)return;
    const T=G.teams[0],A=armories(0).length,cnt={},stk={};for(const k of KEYS){cnt[k]=aCount(0,k);stk[k]=aStock(T,k);}
    const jobs=(T.aswaps||[]).filter(s=>s.left>0||s.fly>0);
    const s2=JSON.stringify([A,cnt,ARMORK.map(k=>ast(T)[k]|0),jobs.map(s=>[s.id,s.left,s.fly]),$a('aaFrom').value,$a('aaTo').value]);
    if(!force&&s2===sig)return;sig=s2;
    $a('aaTab').innerHTML=KEYS.map(k=>k==='none'?`<tr><td><b>${ARMNONE.n}</b></td><td>${cnt[k]}명</td><td>∞</td><td>—</td></tr>`:`<tr ${tipAttr('arm:'+k)}><td><b style="color:${ARMOR[k].col}">${ARMOR[k].n}</b></td><td>${cnt[k]}명</td><td>${stk[k]}</td><td><button class="btn amBuy" data-buy="arm:${k}" data-n="1" ${A?'':'disabled'}>+1</button><button class="btn amBuy" data-buy="arm:${k}" data-n="5" ${A?'':'disabled'}>+5</button></td></tr>`).join('');
    const keep=(id,html)=>{const s=$a(id),cur=s.value;s.innerHTML=html;if(cur)s.value=cur;if(!s.value)s.selectedIndex=0;};
    keep('aaFrom',KEYS.map(k=>`<option value="${k}">${armName(k)} (${cnt[k]}명)</option>`).join(''));
    keep('aaTo',KEYS.map(k=>`<option value="${k}">${armName(k)} (${cnt[k]}명)${k==='none'?'':' · 재고 '+stk[k]}</option>`).join(''));
    if($a('aaTo').value===$a('aaFrom').value&&!$a('aaFrom').dataset.touched){const o=[...$a('aaTo').options].find(x=>x.value!==$a('aaFrom').value&&x.value!=='none');if(o)$a('aaTo').value=o.value;}
    // 편의: 선택이 바뀌면 인원을 '바꿀 병사 수'와 '목표 재고' 중 작은 쪽으로 자동 설정
    const sel=$a('aaFrom').value+'>'+$a('aaTo').value;
    if(sel!==lastSel){lastSel=sel;const v=Math.min(cnt[$a('aaFrom').value],stk[$a('aaTo').value]);$a('aaN').value=Math.max(1,isFinite(v)?v:cnt[$a('aaFrom').value]);}
    $a('aaGo').disabled=!A;
    $a('aaJobs').innerHTML=jobs.length?'<b>진행 중인 착용</b>'+jobs.map(s=>`<div class="job"><span>${armName(s.from)} → ${armName(s.to)}<br><small style="color:var(--dim)">남은 ${s.left+s.fly}명 / 총 ${s.total}명</small></span><button class="btn" data-acancel="${s.id}" type="button">취소</button></div>`).join(''):'';
  };
})();
