// ================= 자기대전 연구소 UI =================
(function(){
  const st=document.createElement('style');
  st.textContent=`#spPanel{position:fixed;top:56px;right:12px;z-index:95;width:380px;max-height:calc(100vh - 80px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,.55);padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:8px}
#spPanel[hidden]{display:none}#spPanel h3{margin:0;font:600 13px var(--body);display:flex;justify-content:space-between;align-items:center}
#spPanel .rw{display:flex;gap:6px;align-items:center;flex-wrap:wrap}#spPanel .rw>label{display:flex;gap:4px;align-items:center}
#spPanel input[type=number]{width:58px;background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:3px 5px;border-radius:3px}
#spPanel select{background:var(--bg);border:1px solid var(--line);color:var(--fg);padding:3px;border-radius:3px}
#spPanel table{width:100%;border-collapse:collapse}#spPanel td,#spPanel th{padding:3px 4px;text-align:left;border-bottom:1px solid var(--line)}#spPanel th{color:var(--dim);font-weight:600}
#spPanel .log{max-height:110px;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:3px;padding:4px 6px;font:11px/1.5 ui-monospace,monospace;color:var(--dim)}
#spPanel .prog{color:var(--accent);min-height:16px}#spPanel small{color:var(--dim);line-height:1.4}`;
  document.head.appendChild(st);
  const m=document.createElement('aside');m.id='spPanel';m.hidden=true;
  const PN={aggressive:'공세형',defensive:'수비형',tricky:'교란형',balanced:'균형형',swarm:'군집형'};
  m.innerHTML=`<h3><span>🧬 자기대전 연구소</span><button class="btn" id="spX" type="button">닫기 ✕</button></h3>
<small>AI끼리 대결시켜 성향별 파츠 선택·파라미터를 진화시킵니다. 학습 결과는 이 브라우저에 저장됩니다.</small>
<div class="rw"><label><input type="checkbox" id="spVis"> 화면 보기</label><label id="spSpdL">배속 <input type="range" id="spSpd" min="1" max="60" value="8" style="width:90px"><b id="spSpdV">×8</b></label></div>
<div class="rw" id="spTurRow"><label><input type="checkbox" id="spTur" checked> ⚡ 터보 (거친 시간 단위·교착 조기종료)</label><label><input type="checkbox" id="spVar" checked> 🎲 판마다 다른 시드·바이옴·크기·언덕</label></div>
<div class="rw" id="spBudRow"><label>연산 비중 <input type="range" id="spBud" min="10" max="200" value="40" style="width:110px"><b id="spBudV">40ms</b></label><small>클수록 빠르지만 화면이 덜 반응합니다.</small></div>
<div class="rw"><label>개체수 <input type="number" id="spPop" min="4" max="24" value="8"></label><label>판/개체 <input type="number" id="spGames" min="1" max="6" value="2"></label><label>세대 <input type="number" id="spGens" min="1" max="200" value="20"></label></div>
<div class="rw"><label>제한시간(초) <input type="number" id="spCap" min="60" max="900" step="30" value="360"></label><label>맵 <select id="spSize"><option value="64">64</option><option value="96">96</option></select></label><label>병사 <input type="number" id="spSold" min="8" max="40" value="14"></label></div>
<div class="rw"><label>진화 대상 <select id="spWho"><option value="all">전 성향 순환</option>${Object.keys(PN).map(k=>`<option value="${k}">${PN[k]}</option>`).join('')}</select></label>
<button class="btn on" id="spGo" type="button">▶ 진화 시작</button><button class="btn" id="spStop" type="button">⏹ 중지</button></div>
<div class="rw"><label>시범 대결 <select id="spA">${Object.keys(PN).map(k=>`<option value="${k}">${PN[k]}</option>`).join('')}</select> vs <select id="spB">${Object.keys(PN).map((k,i)=>`<option value="${k}" ${i===4?'selected':''}>${PN[k]}</option>`).join('')}</select></label><button class="btn" id="spWatch" type="button">👁 보기</button></div>
<div class="prog" id="spProg"></div>
<table><thead><tr><th>성향</th><th>세대</th><th>최고</th><th>파츠(최고 개체)</th></tr></thead><tbody id="spTab"></tbody></table>
<div class="log" id="spLog"></div>
<div class="rw"><label><input type="checkbox" id="spUse"> 학습된 AI 사용</label><button class="btn" id="spExp" type="button">내보내기</button><button class="btn" id="spImp" type="button">가져오기</button><button class="btn" id="spReset" type="button">초기화</button></div>`;
  document.body.appendChild(m);
  const $s=id=>document.getElementById(id);
  const PARTN={smart:'고도화',economy:'경제',sniper:'저격',workshop:'공방',droneRush:'드론'};
  function sync(){
    $s('spVis').checked=!SP.headless;$s('spTur').checked=SP.cfg.turbo!==false;$s('spVar').checked=SP.cfg.vary!==false;$s('spSpdL').style.display=SP.headless?'none':'';$s('spBudRow').style.display=SP.headless?'':'none';
    $s('spUse').checked=SP.useBest;$s('spProg').textContent=SP.progress||(SP.running?'진행 중…':'');
    $s('spGo').disabled=SP.running;$s('spWatch').disabled=SP.running;
    $s('spTab').innerHTML=Object.keys(PN).map(p=>{const b=SP.store.best[p];return `<tr><td>${PN[p]}</td><td>${b?b.gen:0}</td><td>${b?b.fit.toFixed(2):'-'}</td><td style="color:var(--dim)">${b?spPartList(b.g).slice(2).map(k=>PARTN[k]).join('·')||'기본':'기본값'}</td></tr>`;}).join('');
    $s('spLog').innerHTML=SP.log.slice().reverse().join('<br>');
  }
  SP.onUpdate=sync;
  m.addEventListener('input',e=>{
    if(e.target.id==='spTur'){SP.cfg.turbo=e.target.checked;}
    if(e.target.id==='spVar'){SP.cfg.vary=e.target.checked;}
    if(e.target.id==='spSpd'){SP.speed=+e.target.value;$s('spSpdV').textContent='×'+SP.speed;}
    if(e.target.id==='spBud'){SP.budget=+e.target.value;$s('spBudV').textContent=SP.budget+'ms';}
  });
  m.addEventListener('change',e=>{
    if(e.target.id==='spVis'){SP.headless=!e.target.checked;sync();}
    if(e.target.id==='spUse'){SP.useBest=e.target.checked;try{localStorage.setItem(SPKEY+'_use',SP.useBest?'1':'0');}catch(_){}spApplyBestAll();}
  });
  function readCfg(){const g=id=>+$s(id).value;Object.assign(SP.cfg,{pop:g('spPop'),games:g('spGames'),gens:g('spGens'),cap:g('spCap'),size:g('spSize'),soldiers:g('spSold')});SP.pop={};}
  m.addEventListener('click',e=>{
    const id=e.target.id;
    if(id==='spX'){m.hidden=true;return;}
    if(id==='spGo'){readCfg();const who=$s('spWho').value;spEvolve(who==='all'?SPPERSONA:[who],SP.cfg.gens);return;}
    if(id==='spStop'){SP.stop=true;SP.active=false;return;}
    if(id==='spWatch'){readCfg();spWatch($s('spA').value,$s('spB').value);return;}
    if(id==='spExp'){const t=spExport();try{navigator.clipboard.writeText(t);toast('유전자 JSON을 클립보드에 복사했습니다','ok');}catch(_){prompt('복사하세요',t);}return;}
    if(id==='spImp'){const t=prompt('내보낸 유전자 JSON을 붙여넣으세요');if(t){try{spImport(t);sync();toast('가져왔습니다','ok');}catch(err){toast('가져오기 실패: '+err.message);}}return;}
    if(id==='spReset'){if(confirm('학습된 유전자를 모두 지울까요?')){SP.store={best:{},hist:{}};SP.pop={};SP.gen={};spSave();spApplyBestAll();sync();}return;}
  });
  window.spToggle=()=>{m.hidden=!m.hidden;sync();};
  // 진입 버튼: 로비 아래 · 상단 바
  const lobbyBtn=document.createElement('button');lobbyBtn.className='btn';lobbyBtn.type='button';lobbyBtn.textContent='🧬 자기대전 연구소';lobbyBtn.style.cssText='width:100%;margin-top:8px';lobbyBtn.onclick=window.spToggle;
  const go=document.getElementById('bGo');if(go&&go.parentNode)go.parentNode.insertBefore(lobbyBtn,document.getElementById('bBack')||go.nextSibling);
  const top=document.getElementById('bNew');if(top&&top.parentNode){const b=document.createElement('button');b.className='btn';b.id='bSP';b.title='자기대전 연구소';b.textContent='🧬';b.onclick=window.spToggle;top.parentNode.insertBefore(b,top);}
  sync();
})();
