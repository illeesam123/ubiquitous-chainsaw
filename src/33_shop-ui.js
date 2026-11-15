// ================= 보급 상점 UI =================
let shopSig='',shopTick=0;
function shopOpen(){const e=$('shopDrawer');return !!e&&e.classList.contains('open');}
function openShop(){
  if(!G||!G.teams[0].pad){toast('먼저 깃발을 꽂아 헬리패드를 만드세요');return;}
  closeBuildDrawer();$('shopDrawer').classList.add('open');shopSig='';renderShop(true);
}
function closeShop(){const e=$('shopDrawer');if(e)e.classList.remove('open');}
function initShop(){
  const opts=RK.map(k=>`<option value="${k}">${RN[k]}</option>`).join('');
  $('shFrom').innerHTML=opts;$('shTo').innerHTML=opts;$('shFrom').value='money';$('shTo').value='metal';
  const act=(fn)=>()=>{if(!G)return;const e=fn();if(e)toast(e);renderShop(true);};
  $('shR1').onclick=act(()=>shopAddRecruit(0,1));
  $('shR5').onclick=act(()=>shopAddRecruit(0,SHOP.packN));
  $('shAdd').onclick=act(()=>shopAddTrade(0,$('shFrom').value,$('shTo').value,+$('shAmt').value));
  for(const id of ['shFrom','shTo','shAmt'])$(id).addEventListener('input',()=>renderShop(true));
  $('shSwap').onclick=()=>{const a=$('shFrom').value;$('shFrom').value=$('shTo').value;$('shTo').value=a;renderShop(true);};
  $('shCancelAll').onclick=()=>{if(!G)return;const n=shopCancelAll(0);toast(n?`주문 ${n}건 취소 · 보류했던 자원을 돌려받았습니다`:'취소할 주문이 없습니다');renderShop(true);};
  $('shCart').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b||!G)return;shopCancel(0,+b.dataset.id);toast('주문 취소 · 자원 반환');renderShop(true);});
  $('bShopClose').onclick=closeShop;
}
function costText(c){return RK.filter(k=>c[k]>0).map(k=>`${RN[k]} ${c[k]}`).join(' · ');}
function renderShop(force){
  if(!G||!shopOpen())return;
  const now=performance.now();if(!force&&now-shopTick<180)return;shopTick=now;
  const T=G.teams[0],eta=heliEta(T);
  $('shEta').textContent='헬기 · '+eta.txt;$('shEta').classList.toggle('soon',eta.soon);
  $('shPop').textContent=`현재 병력 ${popOf(0)}명 + 주문 ${pendingRecruits(T)}명 · 상한 ${SHOP.popCap}명`;
  $('shAmtV').textContent=$('shAmt').value;
  const f=$('shFrom').value,t=$('shTo').value,amt=+$('shAmt').value;
  $('shEst').innerHTML=f===t?'서로 다른 자원을 골라 주세요':`${RN[f]} <b>${amt}</b> → ${RN[t]} <b>${tradeOut(f,t,amt)}</b><br><small>수수료 ${Math.round(SHOP.fee*100)}% 포함 · ${RN[f]} 보유 ${Math.floor(T.res[f])}</small>`;
  $('shR1').querySelector('small').textContent=`달러 ${SHOP.recruitCost}`;
  $('shR5').querySelector('small').textContent=`달러 ${SHOP.packCost} · 10% 할인`;
  const sig=T.order.lines.map(l=>l.id).join(',');
  if(force||sig!==shopSig){
    shopSig=sig;
    if(!T.order.lines.length)$('shCart').innerHTML='<div class="cartEmpty">주문 내역이 없습니다.<br>구매한 물품은 헬기가 도착할 때 한 번에 내려옵니다.</div>';
    else{
      let h='';
      for(const l of T.order.lines){
        const name=l.kind==='exp'?`${EXP[l.item].n} ×${l.n}`:l.kind==='recruit'?`병사 +${l.n}명`:`${RN[l.from]} ${l.amt} → ${RN[l.to]} ${l.out}`;
        h+=`<div class="cartLine"><span>${name}</span><em>${costText(l.cost)}</em><button class="btn" data-id="${l.id}">취소</button></div>`;
      }
      const esc=orderEscrow(T);
      h+=`<div class="cartSum">보류 중인 자원: <b>${costText(esc)}</b><br><small>취소하기 전까지 다른 작업에 쓸 수 없습니다</small></div>`;
      $('shCart').innerHTML=h;
    }
  }
}
