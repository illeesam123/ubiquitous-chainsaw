// ================= 설정 탭: 소리(음량 조절)·화면·에셋 설정을 한 곳에 =================
const SET={open:false,key:'trench.vol'};
function setLoad(){try{const o=JSON.parse(localStorage.getItem(SET.key)||'{}');if(o.sfx>=0)SFX.vol=o.sfx;if(o.mus>=0)MUS.vol=o.mus;}catch(e){}}
function setSave(){try{localStorage.setItem(SET.key,JSON.stringify({sfx:SFX.vol,mus:MUS.vol}));}catch(e){}}
SFX.vol=.55;setLoad();
const _sfxInitS=sfxInit;
sfxInit=function(){_sfxInitS();if(SFX.master)SFX.master.gain.value=SFX.vol;};
function setOpen(v){
  SET.open=v===undefined?!SET.open:v;
  const p=$('settings'),b=$('bSet');if(p)p.hidden=!SET.open;if(b)b.classList.toggle('on',SET.open);
}
(function(){
  const st=document.createElement('style');
  st.textContent=`#settings{position:absolute;top:8px;right:8px;z-index:30;width:290px;background:var(--panel);border:1px solid var(--line);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:12px 14px;display:flex;flex-direction:column;gap:12px}
#settings[hidden]{display:none}
#settings h3{margin:0;font:600 13px var(--body);display:flex;justify-content:space-between;align-items:center}
#settings .sec{display:flex;flex-direction:column;gap:7px;border-top:1px solid var(--line);padding-top:9px}
#settings .sec>b{font:600 11px var(--mono);color:var(--dim);letter-spacing:.04em}
#settings .vr{display:grid;grid-template-columns:34px 1fr 34px;gap:8px;align-items:center;font-size:12px}
#settings .vr input[type=range]{width:100%;accent-color:var(--accent)}
#settings .vr output{font:11px var(--mono);color:var(--dim);text-align:right}
#settings .tg{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px}
#settings .tg .btn{min-width:34px}
#settings .tg span.lb{flex:1;color:var(--fg)}`;
  document.head.appendChild(st);
  const top=$('top'),p=document.createElement('aside');p.id='settings';p.hidden=true;p.setAttribute('aria-label','설정');
  p.innerHTML=`<h3><span>설정</span><button class="btn" id="bSetClose" type="button">닫기 ✕</button></h3>
<div class="sec"><b>소리</b>
  <div class="vr" id="rowSfx"><span class="slot"></span><input id="vSfx" type="range" min="0" max="100" step="1" aria-label="효과음 음량"><output id="oSfx"></output></div>
  <div class="vr" id="rowMus"><span class="slot"></span><input id="vMus" type="range" min="0" max="100" step="1" aria-label="음악 음량"><output id="oMus"></output></div>
</div>
<div class="sec"><b>화면</b>
  <div class="tg" id="tgRot"><span class="lb">화면 회전 ( , . )</span></div>
  <div class="tg" id="tgFx"><span class="lb">시각 효과 (색조·플레어·블룸)</span></div>
</div>
<div class="sec"><b>에셋</b>
  <div class="tg" id="tgGh"><span class="lb">에셋 소스 (로컬 ⇄ GitHub)</span></div>
</div>`;
  $('stage').appendChild(p);
  // 기존 버튼을 설정 패널로 옮긴다 (id·핸들러 유지)
  p.querySelector('#rowSfx .slot').appendChild($('bSfx'));p.querySelector('#rowMus .slot').appendChild($('bMusic'));
  p.querySelector('#tgRot').append($('bRotL'),$('bRotR'));p.querySelector('#tgFx').appendChild($('bFx'));p.querySelector('#tgGh').appendChild($('bGh'));
  const gear=document.createElement('button');gear.className='btn';gear.id='bSet';gear.title='설정 (O)';gear.textContent='⚙';
  top.insertBefore(gear,$('bPause'));
  gear.onclick=()=>setOpen();$('bSetClose').onclick=()=>setOpen(false);
  const sync=()=>{$('vSfx').value=Math.round(SFX.vol*100);$('vMus').value=Math.round(MUS.vol*100);$('oSfx').textContent=Math.round(SFX.vol*100)+'%';$('oMus').textContent=Math.round(MUS.vol*100)+'%';};
  $('vSfx').oninput=e=>{SFX.vol=e.target.value/100;sfxInit();if(SFX.master)SFX.master.gain.value=SFX.vol;sync();setSave();};
  $('vSfx').onchange=()=>sfx('beep');
  $('vMus').oninput=e=>{MUS.vol=e.target.value/100;sync();setSave();};
  sync();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&SET.open){setOpen(false);return;}if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='o'||e.key==='O')setOpen();else if(e.key==='Escape'&&SET.open)setOpen(false);});
  document.addEventListener('pointerdown',e=>{if(SET.open&&!e.target.closest('#settings,#bSet'))setOpen(false);},true);
})();
