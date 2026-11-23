// ================= 메뉴 정리: 헬기 상점 기능별 묶음 + 무기고 클릭 메뉴(투척물 재고 통합) =================
// 1) 헬기 상점: 보급 / 무장 / 주문 내역 세 묶음. 머리글을 눌러야 펼쳐진다 (한 번에 하나만).
(function(){
  const body=document.querySelector('#shopDrawer .shopBody');if(!body)return;
  const st=document.createElement('style');
  st.textContent=`.shGrp{border:1px solid var(--line);border-radius:3px;background:rgba(0,0,0,.18)}
.shGH{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;background:none;border:0;color:var(--fg);font:15px var(--display);letter-spacing:.03em;padding:9px 10px;cursor:pointer;text-align:left}
.shGH:hover{background:rgba(217,173,78,.1)}.shGH small{font:11px var(--mono);color:var(--dim);margin-left:auto}.shGH i{font-style:normal;color:var(--accent);transition:transform .15s}
.shGrp.open .shGH i{transform:rotate(90deg)}.shGrp.open .shGH{border-bottom:1px solid var(--line);color:var(--accent)}
.shGB{display:none;flex-direction:column;gap:12px;padding:9px 10px}.shGrp.open .shGB{display:flex}
.shGB section{border:0;background:none;padding:0}.shGrp.one .shGB section>h3{display:none}`;
  document.head.appendChild(st);
  const find=(t)=>[...body.children].find(s=>s.tagName==='SECTION'&&s.querySelector('h3')&&s.querySelector('h3').textContent.trim()===t);
  const GR=[['📦 보급',['병력 충원','자원 교환'],'병사 · 자원 교환'],['🔫 무장',['총기','폭발물'],'총기 · 폭발물'],['📋 주문 내역',['주문 내역'],'']];
  const grps=[];
  for(const [name,list,sub] of GR){
    const secs=list.map(find).filter(Boolean);if(!secs.length)continue;
    const g=document.createElement('div');g.className='shGrp'+(secs.length===1?' one':'');
    g.innerHTML=`<button type="button" class="shGH"><span>${name}</span><small>${sub}</small><i>▸</i></button><div class="shGB"></div>`;
    body.insertBefore(g,secs[0]);const gb=g.querySelector('.shGB');secs.forEach(s=>gb.appendChild(s));
    g.querySelector('.shGH').addEventListener('click',()=>{const was=g.classList.contains('open');grps.forEach(x=>x.classList.remove('open'));if(!was)g.classList.add('open');});
    grps.push(g);
  }
  // 주문 내역 머리글에 건수를 표시
  const cartSmall=grps[grps.length-1]&&grps[grps.length-1].querySelector('.shGH small');
  setInterval(()=>{if(!cartSmall||typeof G==='undefined'||!G||!G.teams)return;const n=G.teams[0].order.lines.length;cartSmall.textContent=n?`${n}건 대기`:'비어 있음';},500);
})();

// 2) 투척물 재고 · 입고 현황은 무기고 메뉴로 옮긴다 (상점에는 구매 버튼만 남김)
updateExpUI=function(){
  const sec=document.getElementById('shExp');if(!sec||!G)return;
  const ok=armories(0).length>0,msg=document.getElementById('shExpMsg');
  msg.innerHTML=ok?`재고·입고 현황은 <b>무기고를 클릭</b>하면 볼 수 있습니다.`:'🔒 <b>무기고</b>를 건설하면 해금됩니다 (건설 시설 → 무기고).';
  sec.querySelectorAll('button').forEach(b=>b.disabled=!ok);sec.style.opacity=ok?1:.55;
};
(function(){
  const m=document.getElementById('armMenu');if(!m)return;
  const armor=document.createElement('div');armor.id='amArmorSlot';
  armor.style.cssText='border:1px dashed var(--line);border-radius:4px;padding:8px 10px;color:var(--dim);font-size:12px';
  armor.innerHTML='<b style="color:var(--fg)">🛡 '+ARMOR_SLOT.name+'</b> <span>— '+ARMOR_SLOT.description+'</span>';
  m.insertBefore(armor,document.getElementById('amJobs'));
  const d=document.createElement('div');d.id='amExp';
  m.insertBefore(d,document.getElementById('amJobs'));
  const _ar=window.amRender;
  window.amRender=function(force){
    _ar(force);
    if(m.hidden||!G)return;
    const A=armories(0),t={};for(const k of EXPK)t[k]=0;for(const o of A){const s=armStock(o);for(const k of EXPK)t[k]+=s[k];}
    d.innerHTML=`<b>투척물</b><table style="margin-top:4px"><thead><tr><th>종류</th><th>재고</th><th>효과</th></tr></thead><tbody>${EXPK.map(k=>`<tr><td><b style="color:${EXP[k].col}">${EXP[k].n}</b></td><td>${t[k]}</td><td style="color:var(--dim);font-size:11px">${EXP[k].desc}</td></tr>`).join('')}</tbody></table><small style="color:var(--dim)">입고 대기 ${pendingExp(G.teams[0])} · 여유 ${armFree(0)}칸 · 무기고 ${ARM.range}칸 안의 대기 병사가 가까운 순으로 1개씩 수령합니다. 구매는 헬기 상점 → 무장.</small>`;
  };
})();
// 3) 클릭 처리: 해체 도구가 아닐 때 시설을 누르면 메뉴가 뜬다 (22_input.js 에서 호출)
function objClick(o){
  if(!o||o.natural||o.team!==0||tool==='demo')return false;
  if(o.type==='armory'){armMenu(true);return true;}
  if(typeof structMenu==='function')return structMenu(o);
  return false;
}
