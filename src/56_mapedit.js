// ================= 커스텀 맵 에디터 =================
// 에디터는 setup 단계의 G 를 그대로 칠한다 (G.edit=true). 저장은 localStorage('trench.maps') + JSON 내보내기/불러오기.
// 커스텀 맵 플레이: cfg.custom 이 있으면 newGame 이 저장된 데이터를 덮어쓴다. 적 시작점은 G.cstarts.
const ME={key:'trench.maps',tool:'plain',size:1,height:1,hover:null,drag:false,last:null,dirty:false,seen:null};
const ME_ARR=['tt','gq','dec','lv','sl','road','brush','under','mouth','urail','ore'];
function meList(){try{const a=JSON.parse(localStorage.getItem(ME.key)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function meStore(a){try{localStorage.setItem(ME.key,JSON.stringify(a));return true;}catch(e){toast('저장 공간이 부족합니다 (JSON으로 내보내세요)');return false;}}
// RLE + base64
function meEnc(u8){
  const o=[];for(let i=0;i<u8.length;){let j=i;while(j<u8.length&&u8[j]===u8[i]&&j-i<255)j++;o.push(j-i,u8[i]);i=j;}
  let s='';for(let i=0;i<o.length;i+=8192)s+=String.fromCharCode.apply(null,o.slice(i,i+8192));return btoa(s);
}
function meDec(s,n){
  const b=atob(s),u=new Uint8Array(n);let p=0;for(let i=0;i+1<b.length;i+=2){const c=b.charCodeAt(i),v=b.charCodeAt(i+1);for(let k=0;k<c&&p<n;k++)u[p++]=v;}return u;
}
function meSnapshot(name){
  const d={v:1,name:name||'이름 없는 맵',size:G.w,biome:G.biome,t:Date.now(),starts:(G.cstarts||[]).map(s=>[s.x,s.y]),ob:[]};
  for(const k of ME_ARR)d[k]=meEnc(G[k]||new Uint8Array(G.N));
  for(const o of G.obSet)if(o.team<0)d.ob.push([o.type,o.x,o.y]);
  return d;
}
function meApply(g,d){
  const N=g.N;if(d.size!==g.w)return;
  g.biome=BIOME[d.biome]?d.biome:'plain';g.special=null;
  for(const o of [...g.obSet])removeOb(o);
  for(const k of ME_ARR){if(!d[k])continue;const a=meDec(d[k],N);if(g[k]&&g[k].length===N)g[k].set(a);else g[k]=a;}
  g.trench.fill(0);g.trenchHP.fill(0);g.up.fill(0);g.gq.forEach((q,i)=>{g.mm[i]=g.tt[i]===1?1:0;g.ground[i]=tileColor(g.biome,g.tt[i],(q+.5)/4);});
  g.trans.length=0;for(let i=0;i<N;i++)if(g.mouth[i])g.trans.push(i);
  g.hill=false;layersFinalize();
  g.gen=null;for(const [t,x,y] of d.ob||[])if(OB[t])addOb(t,x,y);
  g.cstarts=(d.starts||[]).map(s=>({x:s[0],y:s[1]}));
}
function meBlank(g){
  g.special=null;for(const o of [...g.obSet])removeOb(o);
  g.tt.fill(0);g.mm.fill(0);g.dec.fill(0);g.trench.fill(0);g.road.fill(0);g.brush.fill(0);g.under.fill(0);g.mouth.fill(0);g.urail.fill(0);g.up.fill(0);if(g.ore)g.ore.fill(0);g.trans.length=0;
  g.lv.fill(GROUND_LV);g.sl.fill(0);g.hill=false;
  for(let i=0;i<g.N;i++)g.ground[i]=tileColor(g.biome,0,((i*7+((i/g.w)|0)*13)%10)/10);
  layersFinalize();
}
const _newGameE=newGame;
newGame=function(cfg){
  const g=_newGameE(cfg);
  try{
    if(cfg.blank)meBlank(g);
    if(cfg.custom)meApply(g,cfg.custom);
    if(cfg.edit){g.edit=true;g.weather.type='clear';g.weather.night=false;if(!g.cstarts)g.cstarts=[];g.expl.fill(1);g.vis.fill(1);}
  }catch(e){console.error('커스텀 맵 오류',e);}
  return g;
};
// 적 깃발: 지정된 시작점 우선
const _aiPlaceFlagsE=aiPlaceFlags;
aiPlaceFlags=function(){
  const st=G.cstarts||[];if(!st.length)return _aiPlaceFlagsE();
  for(let t=1;t<G.teams.length;t++){
    let p=st[t-1];
    if(p){p={x:clamp(p.x,3,G.w-4),y:clamp(p.y,3,G.h-4)};if(G.obst[p.y*G.w+p.x]&&OB[G.obst[p.y*G.w+p.x].type].block){const o=G.obst[p.y*G.w+p.x];removeOb(o);}}
    else{let best=null;for(let k=0;k<800&&!best;k++){const x=rint(Math.random,3,G.w-4),y=rint(Math.random,3,G.h-4);let md=1e9;for(const f of G.flags)md=Math.min(md,Math.max(Math.abs(f.x-x),Math.abs(f.y-y)));if(!flagCheck(x,y)||md>=G.cfg.minDist&&!G.obst[y*G.w+x]&&G.tt[y*G.w+x]!==2)best={x,y};}p=best;}
    if(p)placeFlag(t,p.x,p.y);
  }
};

// ---- 칠하기 ----
const ME_TOOLS=[
  ['지형',[['plain','평지'],['rough','진흙'],['water','물'],['ice','얼음'],['height','높이'],['ramp','경사']]],
  ['도로',[['road1','흙길'],['road2','큰길'],['road3','철로'],['brush','덤불']]],
  ['장애물',[['tree','나무'],['rock','바위'],['house','폐가'],['shed','헛간'],['ruin','폐허'],['warehouse','창고'],['apartment','아파트'],['fence','울타리'],['crate','상자']]],
  ['지하',[['cave','동굴'],['mouth','입구'],['rail','광산 철로'],['ore1','철광석'],['ore2','금광석'],['ore3','광산 수레']]],
  ['배치',[['start','적 시작점'],['erase','지우개']]]
];
function meCells(x,y){const s=ME.size,o=-(s>>1),c=[];for(let dy=0;dy<s;dy++)for(let dx=0;dx<s;dx++){const a=x+o+dx,b=y+o+dy;if(a>=0&&b>=0&&a<G.w&&b<G.h)c.push([a,b]);}return c;}
function meClearTile(i,what){
  const o=G.obst[i];if(o&&what!=='keepob')removeOb(o);
}
function meSetTerrain(i,x,y,kind){
  G.tt[i]=kind;G.mm[i]=kind===1?1:0;const g=((G.gq[i]+.5)/4);G.ground[i]=tileColor(G.biome,kind,g);G.dec[i]=0;
  if(kind===2||kind===4){meClearTile(i);G.brush[i]=0;G.road[i]=0;G.ore[i]=0;G.under[i]=0;G.mouth[i]=0;G.urail[i]=0;G.sl[i]=0;}
}
function mePaint(x,y,first){
  const T=ME.tool,w=G.w;
  if(T==='start'){
    if(!first)return;const st=G.cstarts;const k=st.findIndex(s=>Math.hypot(s.x-x,s.y-y)<2.5);
    if(k>=0){st.splice(k,1);return;}
    if(st.length>=3){toast('적 시작점은 최대 3개입니다');return;}
    st.push({x:clamp(x,3,G.w-4),y:clamp(y,3,G.h-4)});return;
  }
  if(OB[T]&&!['ore1'].includes(T)){   // 장애물: 클릭한 칸을 기준으로
    if(ME.seen.has(y*w+x))return;ME.seen.add(y*w+x);
    const i=y*w+x;if(G.road[i]&&OB[T].building){return;}
    addOb(T,x,y);G.brush[i]=0;return;
  }
  for(const [a,b] of meCells(x,y)){
    const i=b*w+a;if(ME.seen.has(i))continue;ME.seen.add(i);
    switch(T){
      case 'plain':meSetTerrain(i,a,b,0);break;
      case 'rough':meSetTerrain(i,a,b,1);break;
      case 'water':meSetTerrain(i,a,b,2);break;
      case 'ice':meSetTerrain(i,a,b,4);break;
      case 'height':if(G.tt[i]===2)break;G.lv[i]=GROUND_LV+Math.round(2*ME.height);G.sl[i]=0;ME.dirty=true;break;
      case 'ramp':{
        const D=[[1,0,1],[-1,0,2],[0,1,3],[0,-1,4]];let best=0;
        for(const [dx,dy,d] of D){const n=i+dy*w+dx;if(a+dx<0||b+dy<0||a+dx>=w||b+dy>=G.h)continue;if(G.lv[n]===G.lv[i]+2&&!G.sl[n]){best=d;break;}}
        if(G.sl[i]){G.sl[i]=0;ME.dirty=true;}else if(best){meClearTile(i);G.road[i]=0;G.sl[i]=best;ME.dirty=true;}break;}
      case 'road1':case 'road2':case 'road3':if(G.tt[i]!==2&&!G.sl[i]){meClearTile(i);G.road[i]=+T[4];G.brush[i]=0;}break;
      case 'brush':if(G.tt[i]!==2&&!G.obst[i]&&!G.road[i]&&!G.sl[i])G.brush[i]=1;break;
      case 'cave':if(G.tt[i]!==2&&!G.mouth[i])G.under[i]=CAVE;break;
      case 'mouth':if(G.tt[i]!==2&&!G.sl[i]){meClearTile(i);G.under[i]=CAVE;G.mouth[i]=1;G.urail[i]=0;G.ore[i]=0;G.brush[i]=0;}break;
      case 'rail':if(G.under[i]===CAVE&&!G.mouth[i])G.urail[i]=1;break;
      case 'ore1':case 'ore2':case 'ore3':if(G.under[i]===CAVE&&!G.mouth[i])G.ore[i]=+T[3];break;
      case 'erase':meClearTile(i);G.brush[i]=0;G.road[i]=0;G.under[i]=0;G.mouth[i]=0;G.urail[i]=0;G.ore[i]=0;if(G.sl[i]){G.sl[i]=0;ME.dirty=true;}break;
    }
  }
  if(T==='erase'){const st=G.cstarts;const k=st.findIndex(s=>Math.hypot(s.x-x,s.y-y)<1.6);if(k>=0)st.splice(k,1);}
}
function meFlush(){
  if(!ME.dirty)return;ME.dirty=false;
  layersFinalize();TBM.clear();
  for(const o of [...G.obSet]){if(o.cells.some(j=>G.sl[j])||(o.cells.length>1&&!flatArea(o.x,o.y,o.size)))removeOb(o);}
}
function meStroke(x,y,first){
  if(!inb(x,y))return;
  const l=ME.last;
  if(!l||ME.tool==='start'){mePaint(x,y,first);}
  else{const n=Math.max(Math.abs(x-l[0]),Math.abs(y-l[1]));for(let k=1;k<=n;k++)mePaint(Math.round(l[0]+(x-l[0])*k/n),Math.round(l[1]+(y-l[1])*k/n),false);}
  ME.last=[x,y];
}
cv.addEventListener('pointerdown',e=>{
  if(!G||!G.edit||e.button!==0)return;
  e.stopImmediatePropagation();const r=cv.getBoundingClientRect(),t=tileAt(e.clientX-r.left,e.clientY-r.top);
  cv.setPointerCapture(e.pointerId);ME.drag=true;ME.last=null;ME.seen=new Set();meStroke(t[0],t[1],true);
},true);
cv.addEventListener('pointermove',e=>{
  if(!G||!G.edit)return;const r=cv.getBoundingClientRect(),t=tileAt(e.clientX-r.left,e.clientY-r.top);ME.hover=t;
  if(ME.drag)meStroke(t[0],t[1],false);
},true);
window.addEventListener('pointerup',()=>{if(ME.drag){ME.drag=false;ME.last=null;meFlush();}},true);

// ---- 화면 덧그림 (지하·시작점·붓 미리보기) ----
const _renderE=render;
render=function(){
  if(G&&G.edit)meFlush();
  _renderE();
  if(!G||!G.edit)return;
  try{meOverlay();}catch(e){console.error(e);}
};
function meOverlay(){
  const w=G.w;cx.setTransform(DPR,0,0,DPR,0,0);
  for(let i=0;i<G.N;i++){
    if(!G.under[i]&&!G.ore[i])continue;const x=i%w,y=(i/w)|0,p=toS(x+.5,y+.5);
    if(p[0]<-60||p[1]<-40||p[0]>W+60||p[1]>H+60)continue;
    if(G.under[i]){tileDia(x,y,.12);cx.fillStyle=G.mouth[i]?'rgba(20,16,12,.7)':'rgba(120,80,210,.38)';cx.fill();if(G.urail[i]){cx.strokeStyle='#d9b45a';cx.lineWidth=2*cam.z;cx.beginPath();cx.moveTo(p[0]-10*cam.z,p[1]);cx.lineTo(p[0]+10*cam.z,p[1]);cx.stroke();}}
    if(G.ore[i]){cx.fillStyle=['','#b8c4d0','#ffd34a','#e08a3c'][G.ore[i]];cx.beginPath();cx.arc(p[0],p[1],5*cam.z,0,6.3);cx.fill();cx.strokeStyle='#000';cx.lineWidth=1;cx.stroke();}
  }
  (G.cstarts||[]).forEach((s,k)=>{const p=toS(s.x+.5,s.y+.5);cx.fillStyle='#d24a3a';cx.strokeStyle='#fff';cx.lineWidth=2;cx.beginPath();cx.arc(p[0],p[1]-14*cam.z,11*cam.z,0,6.3);cx.fill();cx.stroke();cx.fillStyle='#fff';cx.font=`bold ${Math.max(10,12*cam.z)}px sans-serif`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText('E'+(k+1),p[0],p[1]-14*cam.z);});
  if(ME.hover&&!OB[ME.tool]&&ME.tool!=='start'){for(const [a,b] of meCells(ME.hover[0],ME.hover[1])){tileDia(a,b,0);cx.strokeStyle='#ffe28a';cx.lineWidth=1.5;cx.stroke();}}
  else if(ME.hover&&inb(ME.hover[0],ME.hover[1])){tileDia(ME.hover[0],ME.hover[1],0);cx.strokeStyle='#ffe28a';cx.lineWidth=1.5;cx.stroke();}
}
const _updateHUDE=updateHUD;
updateHUD=function(){_updateHUDE();if(G&&G.edit){const b=$('banner');b.hidden=false;b.textContent='맵 편집 중 — 왼쪽 도구로 칠하세요 (우클릭 드래그/WASD: 이동)';$('status').textContent='맵 편집기';}};

// ---- UI ----
(function(){
  const st=document.createElement('style');
  st.textContent=`#medit{position:absolute;top:8px;left:8px;bottom:8px;z-index:25;width:236px;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:10px 12px;display:flex;flex-direction:column;gap:9px;font-size:12px}
#medit[hidden]{display:none}
#medit h3{margin:0;font:600 13px var(--body);display:flex;justify-content:space-between;align-items:center}
#medit .sec{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line);padding-top:8px}
#medit .sec>b{font:600 11px var(--mono);color:var(--dim);letter-spacing:.04em}
#medit .pal{display:flex;flex-wrap:wrap;gap:4px}
#medit .pal .btn{padding:4px 7px;font-size:12px}
#medit input[type=text],#medit select{width:100%;box-sizing:border-box}
#medit .rw{display:flex;gap:6px;align-items:center}#medit .rw>*{flex:1}
body.medit #bar,body.medit #res,body.medit #teams,body.medit #sel,body.medit #buildDrawer,body.medit #shopDrawer{display:none!important}`;
  document.head.appendChild(st);
  const p=document.createElement('aside');p.id='medit';p.hidden=true;p.setAttribute('aria-label','맵 편집기');
  let pal='';for(const [g,ts] of ME_TOOLS)pal+=`<div class="sec"><b>${g}</b><div class="pal">${ts.map(([id,n])=>`<button class="btn" type="button" data-t="${id}">${n}</button>`).join('')}</div></div>`;
  p.innerHTML=`<h3><span>맵 편집기</span><button class="btn" id="meExit" type="button">나가기 ✕</button></h3>
<div class="sec"><b>붓</b><div class="rw"><label>크기 <select id="meSize"><option>1</option><option>2</option><option>3</option><option>4</option></select></label><label>높이(층) <select id="meH"><option value="0">0 (지상)</option><option value=".5">0.5 (반층)</option><option value="1" selected>1</option><option value="1.5">1.5</option><option value="2">2</option><option value="2.5">2.5</option><option value="3">3</option></select></label></div>
<label>바이옴 <select id="meBio">${BIOME_KEYS.map(k=>`<option value="${k}">${BIOME[k].n}</option>`).join('')}</select></label></div>
${pal}
<div class="sec"><b>저장</b><input type="text" id="meName" maxlength="24" placeholder="맵 이름"><div class="rw"><button class="btn" id="meSave" type="button">저장</button><button class="btn" id="mePlay" type="button">▶ 테스트</button></div><div class="rw"><button class="btn" id="meExp" type="button">JSON 내보내기</button><button class="btn" id="meImp" type="button">불러오기</button></div><input type="file" id="meFile" accept=".json,application/json" hidden></div>`;
  $('stage').appendChild(p);
  const sync=()=>{p.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===ME.tool));};
  p.addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(b){ME.tool=b.dataset.t;sync();}});
  $('meSize').onchange=e=>{ME.size=+e.target.value;};$('meH').onchange=e=>{ME.height=+e.target.value;};
  $('meBio').onchange=e=>{if(!G)return;G.biome=e.target.value;for(let i=0;i<G.N;i++)G.ground[i]=tileColor(G.biome,G.tt[i],(G.gq[i]+.5)/4);chunkMap.clear();TBM.clear();};
  $('meSave').onclick=()=>{const n=$('meName').value.trim()||'내 맵';const a=meList().filter(m=>m.name!==n);a.unshift(meSnapshot(n));if(meStore(a.slice(0,20))){toast(`'${n}' 저장됨`);meLobbySync();}};
  $('mePlay').onclick=()=>{const d=meSnapshot($('meName').value.trim()||'테스트');meLaunch(d,false);};
  $('meExp').onclick=()=>{const d=meSnapshot($('meName').value.trim()||'내 맵'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.download=(d.name||'map')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
  $('meImp').onclick=()=>$('meFile').click();
  $('meFile').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!d||!d.size||!d.tt)throw 0;meLaunch(d,true);}catch(x){toast('올바른 맵 파일이 아닙니다');}});e.target.value='';};
  $('meExit').onclick=()=>{if(G)G.edit=false;meSync();$('lobby').hidden=false;};
  sync();
})();
function meSync(){const on=!!(G&&G.edit);document.body.classList.toggle('medit',on);$('medit').hidden=!on;if(on){$('meBio').value=G.biome;$('meName').value=(G.cfg.custom&&G.cfg.custom.name)||$('meName').value;}}
function meCfg(d,edit){
  const v=id=>$(id)?+$(id).value:0,n=Math.max(1,Math.min(3,d.starts&&d.starts.length||v('fEnemy')||1));
  return {seed:'CUSTOM-'+(d.name||''),biome:d.biome,size:d.size,enemies:edit?3:n,soldiers:clamp(v('fSold')||24,12,60),minDist:edit?8:clamp(v('fDist')||20,5,Math.max(5,Math.floor(d.size*.34))),custom:d,edit:!!edit,mode:'normal'};
}
function meLaunch(d,edit){startGame(meCfg(d,edit));}
const _startGameE=startGame;
startGame=function(cfg){
  if(!cfg.custom&&!cfg.blank&&$('fMap')&&$('fMap').value){const m=meList().find(x=>x.name===$('fMap').value);if(m)cfg=Object.assign(meCfg(m,false),{mode:cfg.mode});}
  _startGameE(cfg);
  if(G&&G.edit&&$('meName')&&!$('meName').value)$('meName').value=(cfg.custom&&cfg.custom.name)||'';
  meSync();
};
// ---- 로비: 내 맵 ----
function meLobbySync(){
  const s=$('fMap');if(!s)return;const cur=s.value,a=meList();
  s.innerHTML='<option value="">시드로 자동 생성</option>'+a.map(m=>`<option value="${m.name.replace(/"/g,'&quot;')}">${m.name.replace(/</g,'&lt;')} · ${m.size}×${m.size}</option>`).join('');
  if(a.some(m=>m.name===cur))s.value=cur;
  const has=!!s.value;$('bMapEdit').hidden=!has;$('bMapDel').hidden=!has;
}
(function(){
  const g=document.querySelector('#lobby .grid'),go=$('bGo');if(!g||!go)return;
  const lb=document.createElement('label');lb.className='wide';
  lb.innerHTML=`내 맵<select id="fMap"></select><span class="row" style="margin-top:6px;gap:6px"><button class="btn" id="bMapNew" type="button">🗺 빈 맵 만들기</button><button class="btn" id="bMapSeed" type="button">시드 맵 편집</button><button class="btn" id="bMapEdit" type="button" hidden>편집</button><button class="btn" id="bMapDel" type="button" hidden>삭제</button></span><small style="opacity:.6;font-weight:400">내 맵을 고르면 시드 대신 그 맵으로 플레이합니다 (크기·바이옴은 맵을 따름)</small>`;
  g.insertBefore(lb,g.children[1]||null);
  $('fMap').onchange=meLobbySync;
  const base=()=>({seed:($('fSeed').value.trim())||'EDIT',size:+$('fSize').value,soldiers:24,minDist:8,enemies:3,edit:true,mode:'normal'});
  $('bMapNew').onclick=()=>startGame(Object.assign(base(),{blank:true,biome:$('fBiome').value==='auto'?'plain':$('fBiome').value,custom:null}));
  $('bMapSeed').onclick=()=>startGame(Object.assign(base(),{biome:$('fBiome').value}));
  $('bMapEdit').onclick=()=>{const m=meList().find(x=>x.name===$('fMap').value);if(m)meLaunch(m,true);};
  $('bMapDel').onclick=()=>{const n=$('fMap').value;if(!n||!confirm(`'${n}' 맵을 삭제할까요?`))return;meStore(meList().filter(m=>m.name!==n));$('fMap').value='';meLobbySync();};
  meLobbySync();
})();
