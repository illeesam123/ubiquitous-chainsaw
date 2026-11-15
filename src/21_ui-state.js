// ================= UI 상태 =================
const $=id=>document.getElementById(id);
let tool='dig',hover=null,drag=null,mouse={x:0,y:0},toastT=0,lastCfg=null;
const keys=new Set();
const TOOLS=[
  {id:'dig',n:'참호/이동',k:'1',sub:'끌어서 굴착'},
  {id:'demo',n:'철거',k:'2',sub:'자원 회수'}
];
function toast(m){sfx(/헬기 도착/.test(m)?'heli':/없|불가|부족|않|못|이미|밖|필요|오류|에는|우회|떨어져/.test(m)?'err':'toast');const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1800);}
function setN(v){assignN=clamp(v,1,MAXW);const e=$('nVal');if(e)e.textContent=assignN;}
function facilityIcon(type){
  const shapes={armory:'<path d="M16 40V20h64v20z" fill="#8f8f7a" stroke="#4a4a3c" stroke-width="2"/><path d="M12 20h72l-4-6H16z" fill="#6b6b59"/><rect x="38" y="26" width="20" height="14" fill="#2e3128"/><path d="M38 24h5l-3 -3zM48 24h5l-3-3z" fill="#e0b92e"/><circle cx="28" cy="43" r="3" fill="#ff8a2a"/><circle cx="68" cy="43" r="3" fill="#b9bcc0"/>',sandbag:'<path d="M12 42h72M18 39l5-12h17l5 12M48 39l5-12h17l5 12" fill="#b9a370" stroke="#e0c58d" stroke-width="3"/>',wire:'<path d="M12 38h72M15 38l12-18 12 18 12-18 12 18 12-18 12 18" fill="none" stroke="#aeb3a2" stroke-width="3"/>',tower:'<path d="M30 43h36L60 13H36zM24 43h48M42 13V7h12v6" fill="#777e68" stroke="#d0c59a" stroke-width="3"/>',mg:'<path d="M18 40h64M30 40V25h26v15M50 27l30-8" fill="#66705a" stroke="#d0c59a" stroke-width="3"/>',bunker:'<path d="M12 42V28l12-17h48l12 17v14zM33 25h34v12H33z" fill="#606b58" stroke="#c4b68b" stroke-width="3"/>',mortar:'<path d="M18 43h60" stroke="#8a8f78" stroke-width="5"/><path d="M34 41l10-8h14l6 8z" fill="#5d6350" stroke="#c9c0a0" stroke-width="2"/><path d="M44 33l16-24" stroke="#c9c0a0" stroke-width="8" stroke-linecap="round"/><path d="M58 11l6-3" stroke="#252a22" stroke-width="6"/>',medbay:'<path d="M14 43L48 8l34 35z" fill="#8a8a70" stroke="#d0d7bd" stroke-width="2"/><path d="M48 8v35" stroke="#5e6350" stroke-width="2"/><rect x="40" y="24" width="16" height="16" fill="#e7dfcf"/><path d="M46.5 26h3v12h-3zM42 30.5h12v3H42z" fill="#b7443d"/>',tank:'<path d="M12 41h64l8-9-8-9H20l-8 9z" fill="#2b2a26"/><path d="M18 34l10-14h40l8 14z" fill="#858a4b" stroke="#686c39" stroke-width="2"/><path d="M34 22l5-9h20l6 9z" fill="#a6aa63" stroke="#686c39" stroke-width="2"/><path d="M62 17h28" stroke="#2f3220" stroke-width="5"/><g fill="#2b2a26" stroke="#858a4b" stroke-width="2"><circle cx="22" cy="38" r="3.4"/><circle cx="33" cy="38" r="3.4"/><circle cx="44" cy="38" r="3.4"/><circle cx="55" cy="38" r="3.4"/><circle cx="66" cy="38" r="3.4"/></g>',truck:'<path d="M10 36V15h40l5 3v18z" fill="#858a4b" stroke="#686c39" stroke-width="2"/><path d="M20 15v21M30 15v21M40 15v21" stroke="#5e6330" stroke-width="2.5"/><path d="M55 20h13l9 9v7H55z" fill="#858a4b" stroke="#686c39" stroke-width="2"/><path d="M60 23h7l5 6h-12z" fill="#e8d36a"/><g fill="#2b2a26" stroke="#a6aa63" stroke-width="1.5"><circle cx="20" cy="39" r="5"/><circle cx="34" cy="39" r="5"/><circle cx="66" cy="39" r="5"/></g>'};
  return `<svg viewBox="0 0 96 50" role="img" aria-label="${OB[type].n}"><rect x="1" y="1" width="94" height="48" rx="3" fill="#171a12"/>${shapes[type]||''}</svg>`;
}
function buildBuildDrawer(){
  const list=$('buildList');if(!list)return;list.innerHTML='';
  BUILDS.forEach(type=>{const d=OB[type],b=document.createElement('button');b.className='buildCard';b.dataset.id=type;
    const cost=Object.entries(d.cost).map(([k,v])=>`${RN[k]} ${v}`).join(' · ');
    b.innerHTML=`${facilityIcon(type)}<b>${d.n}</b><small>${cost}<br>작업 ${d.build}초${VEH[type]?` · 승무원 ${VEH[type].crew}명`:''}</small>`;
    b.onclick=()=>{setTool(type);closeBuildDrawer();toast(`${d.n} 선택 · 전장에 클릭 또는 드래그해 배치`);};list.appendChild(b);
  });
  const hd=document.createElement('div');hd.style.cssText='grid-column:1/-1;color:var(--accent);font:13px var(--mono);padding:6px 2px 0';hd.textContent='참호 개량';list.appendChild(hd);
  for(const k of Object.keys(UPG)){const U=UPG[k],b=document.createElement('button');b.className='buildCard';b.dataset.id='u:'+k;
    b.innerHTML=`<svg viewBox="0 0 96 50"><rect x="1" y="1" width="94" height="48" rx="3" fill="#171a12"/>${k==='bridge'?'<path d="M10 30h76v8H10zM16 38v8M80 38v8" fill="#8d7449" stroke="#3f3120" stroke-width="2"/>':k==='roof'?'<path d="M14 22h68v14H14z" fill="#7c858e" stroke="#2c3135" stroke-width="2"/>':k==='ladder'?'<path d="M38 8v36M58 8v36M38 14h20M38 24h20M38 34h20" stroke="#e6c36a" stroke-width="3"/>':'<ellipse cx="48" cy="26" rx="22" ry="10" fill="#0b0d0f" stroke="#69727a" stroke-width="3"/>'}</svg><b>${U.n}</b><small>${costText(U.cost)}<br>작업 ${U.work}초 · ${U.desc}</small>`;
    b.onclick=()=>{setTool('u:'+k);closeBuildDrawer();toast(`${U.n} 선택 · 내 참호 위에 클릭${isAreaTool()?'(영역 드래그 가능)':''}`);};list.appendChild(b);}
  const hd2=document.createElement('div');hd2.style.cssText='grid-column:1/-1;color:var(--accent);font:13px var(--mono);padding:6px 2px 0';hd2.textContent='도로 (드래그로 한 번에)';list.appendChild(hd2);
  for(const k of Object.keys(ROADB)){const R=ROADB[k],b=document.createElement('button');b.className='buildCard';b.dataset.id='r:'+k;
    b.innerHTML=`<svg viewBox="0 0 96 50"><rect x="1" y="1" width="94" height="48" rx="3" fill="#171a12"/>${k==='paved'?'<path d="M4 34L48 12L92 34L48 46Z" fill="#53565b" stroke="#b0b3b5" stroke-width="2"/><path d="M14 33L48 17L82 33" stroke="#ebdc82" stroke-width="2" stroke-dasharray="6 5" fill="none"/>':'<path d="M4 34L48 12L92 34L48 46Z" fill="#8b6e4a" stroke="#5f482e" stroke-width="2"/><path d="M16 36L50 19M26 40L58 24" stroke="#46341f" stroke-width="2" fill="none"/>'}</svg><b>${R.n}</b><small>${costText(R.cost)}<br>작업 ${R.work}초 · ${R.desc}</small>`;
    b.onclick=()=>{setTool('r:'+k);closeBuildDrawer();toast(`${R.n} 선택 · 드래그로 영역을 지정`);};list.appendChild(b);}
}
function openBuildDrawer(){closeShop();buildBuildDrawer();$('buildDrawer').classList.add('open');}
function closeBuildDrawer(){$('buildDrawer').classList.remove('open');}
function buildBar(){
  const bar=$('bar');bar.innerHTML='';
  const ctl=document.createElement('div');ctl.className='assign';
  ctl.innerHTML='<small>배정 인원</small><span class="stepper"><button id="nMinus" aria-label="배정 인원 줄이기">−</button><b id="nVal">'+assignN+'</b><button id="nPlus" aria-label="배정 인원 늘리기">+</button></span><button id="bFree" class="quick" title="Q">대기 병력 선택 [Q]</button><button id="bRelease" class="quick" title="R">주둔 해제 [R]</button><button id="bArea" class="quick" title="T">드래그: 영역 [T]</button><button id="bLayer" class="quick" title="U">지하 보기 [U]</button>';
  bar.appendChild(ctl);const s0=document.createElement('div');s0.className='sep';bar.appendChild(s0);
  $('nMinus').onclick=()=>setN(assignN-1);$('nPlus').onclick=()=>setN(assignN+1);$('bFree').onclick=selectFreeUnits;
  $('bRelease').onclick=releaseGarrison;$('bArea').onclick=toggleArea;$('bLayer').onclick=toggleLayer;
  TOOLS.forEach(t=>{const b=document.createElement('button');b.className='tool';b.dataset.id=t.id;b.innerHTML=`<span>${t.n} <small>[${t.k}]</small></span><small>${t.sub}</small>`;b.onclick=()=>setTool(t.id);bar.appendChild(b);});
  const build=document.createElement('button');build.className='tool';build.id='bBuildOpen';build.innerHTML='<span>건설 시설 ▾</span><small>시설 목록 열기</small>';build.onclick=openBuildDrawer;bar.appendChild(build);
  const shop=document.createElement('button');shop.className='tool heli';shop.id='bShopOpen';shop.innerHTML='<span>🚁 보급 상점 <small>[H]</small></span><small id="shopSub">헬기 대기 중</small>';shop.onclick=()=>{shopOpen()?closeShop():openShop();};bar.appendChild(shop);
  $('bBuildClose').onclick=closeBuildDrawer;buildBuildDrawer();setTool(tool);
}
function setTool(id){tool=id;for(const b of $('bar').children)if(b.dataset)b.classList.toggle('on',b.dataset.id===id);for(const b of $('buildList')?.children||[])b.classList.toggle('on',b.dataset.id===id);}
// 주둔 해제: 선택한 주둔 병사 → 없으면 마우스가 가리키는(또는 마지막으로 누른) 시설의 주둔 병사 전원.
// 다른 병사가 선택돼 있거나 대기 병사가 있어도 항상 동작한다.
let lastOb=null;
function releaseGarrison(){
  if(!G)return;
  let crew=selUnits().filter(u=>u.state==='gar'||u.gar);
  if(!crew.length){
    let o=hover&&inb(hover[0],hover[1])?G.obst[hover[1]*G.w+hover[0]]:null;
    if(!(o&&o.occ&&o.occ.length&&o.occTeam===0))o=lastOb&&G.obSet.has(lastOb)&&lastOb.occ.length&&lastOb.occTeam===0?lastOb:null;
    if(o)crew=occUnits(o).filter(u=>u.team===0);
  }
  if(!crew.length){toast('해제할 시설을 가리키거나 주둔 병사를 선택하세요');return;}
  for(const u of crew)releaseUnit(u);
  toast(`주둔 병력 ${crew.length}명 해제`);
}
function selUnits(){return G?G.units.filter(u=>u.sel&&!u.dead&&u.team===0):[];}
function selVehicles(){return G?G.vehicles.filter(v=>v.sel&&!v.dead&&v.team===0):[];}
function mineUnits(){return G?G.units.filter(u=>u.team===0&&!u.dead&&u.state!=='crew'):[];}
function selectFreeUnits(){if(!G)return;const free=G.units.filter(u=>u.team===0&&!u.dead&&u.state!=='crew'&&u.state==='idle'&&isFreeUnit(u));setSel(free,false);toast(`대기 병력 ${free.length}명 선택`);}
function tileAt(sx,sy){const [x,y]=toW(sx,sy);return [Math.floor(x),Math.floor(y)];}
function hitVehicle(sx,sy){if(viewLay===1)return null;let best=null,bd=Math.pow(clamp(30*cam.z,16,38),2);for(const v of G.vehicles){if(v.team!==0||v.dead)continue;const [x,y]=toS(v.x,v.y),dx=x-sx,dy=y-sy,d=dx*dx+dy*dy;if(d<bd){bd=d;best=v;}}return best;}
function hitUnit(sx,sy){
  let best=null,bd=Math.pow(clamp(18*cam.z,10,25),2);
  for(const u of mineUnits()){if(u.state==='gar'||(u.lay|0)!==viewLay)continue;const [ux,uy]=toS(u.x,u.y);const dx=ux-sx,dy=uy-10*cam.z-sy,d=dx*dx+dy*dy;if(d<bd){bd=d;best=u;}}
  return best;
}
function setSel(list,add){
  if(list&&list.length)sfx('select');
  if(!add){for(const u of G.units)u.sel=false;for(const v of G.vehicles)v.sel=false;}
  for(const u of list)u.sel=true;
}
function extendPath(d,tile){
  let [lx,ly]=d.tiles[d.tiles.length-1];
  let guard=0;
  while((lx!==tile[0]||ly!==tile[1])&&guard++<80&&d.tiles.length<80){
    const dx=tile[0]-lx,dy=tile[1]-ly;
    if(Math.abs(dx)>=Math.abs(dy))lx+=Math.sign(dx);else ly+=Math.sign(dy);
    d.tiles.push([lx,ly]);
  }
}
