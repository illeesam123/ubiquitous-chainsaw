// ================= 디펜스 모드: 웨이브 · 보상 · 저장 =================
// 적 기지 없이 맵 가장자리에서 웨이브가 몰려온다. 웨이브를 전멸시키면 자원을 받는다. 병사가 전멸하면 끝나며, 결과(맵+진행)를 저장해 이어서 할 수 있다.
const DEF={first:75,interval:120,aiTick:1.4,saveKey:'trench.saves',maxSaves:12};
const DEF_SIDE=['북동','남동','남서','북서'];   // 월드 가장자리 y=0 / x=max / y=max / x=0 (기본 화면 기준)
const isDef=()=>!!(G&&G.cfg&&G.cfg.mode==='defense');
function waveSpec(n){
  if(n<=5)return {dirs:1,per:n*5,tanks:0,trucks:0,either:0};
  if(n<=10)return {dirs:2,per:n*4,tanks:0,trucks:0,either:1};
  return {dirs:3,per:n*3,tanks:1+Math.floor((n-11)/5),trucks:1,either:0};
}
function waveReward(n){return {money:60+n*28,bullets:50+n*18,metal:8+n*4,wood:8+n*3};}
// ---- 시작/생성 훅 ----
const _newGameD=newGame;
newGame=function(cfg){const g=_newGameD(cfg);if(cfg.mode==='defense')g.def={wave:0,next:DEF.first,waves:[],cleared:0,t:0,got:{money:0,bullets:0,metal:0,wood:0}};return g;};
const _aiPlaceFlagsD=aiPlaceFlags;aiPlaceFlags=function(){if(isDef())return;return _aiPlaceFlagsD();};
const _aiTickD=aiTick;aiTick=function(T,dt){if(isDef())return;return _aiTickD(T,dt);};
// ---- 스폰 ----
function defSpots(side,count){
  const w=G.w,h=G.h,r0=Math.random,t=.25+r0()*.5;let cx0,cy0;
  if(side===0){cx0=Math.round(w*t);cy0=3;}else if(side===1){cx0=w-4;cy0=Math.round(h*t);}else if(side===2){cx0=Math.round(w*t);cy0=h-4;}else{cx0=3;cy0=Math.round(h*t);}
  const out=[];
  for(let r=0;r<=14&&out.length<count;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=cx0+dx,y=cy0+dy;
    if(x<1||y<1||x>=w-1||y>=h-1||!passable(x,y))continue;const i=y*w+x;if(G.trench[i]===255||G.sl[i]&&G.hill)continue;
    out.push([x,y]);if(out.length>=count)return out;
  }
  return out;
}
function spawnWave(n){
  const sp=waveSpec(n),sides=[0,1,2,3].sort(()=>Math.random()-.5).slice(0,sp.dirs),W={n,t:G.time,ids:new Set(),sides,total:0,cleared:false};
  for(const s of sides){
    const spots=defSpots(s,Math.max(6,Math.ceil(sp.per/2)));if(!spots.length)continue;
    for(let k=0;k<sp.per;k++){const c=spots[k%spots.length],u=mkUnit(1,c[0]+.2+Math.random()*.6,c[1]+.2+Math.random()*.6);u.wv=n;W.ids.add(u.id);}
    let tanks=sp.tanks,trucks=sp.trucks;if(sp.either){if(Math.random()<.5)tanks=1;else trucks=1;}
    const vs=defSpots(s,40).reverse();let q=0;
    const add=(type)=>{for(let a=0;a<vs.length;a++){const c=vs[(q+a)%vs.length],v=addVehicle(type,c[0]+.5,c[1]+.5,1);if(v){q=(q+a+1)%vs.length;v.wv=n;W.ids.add(v.id);return;}}};
    for(let k=0;k<tanks;k++)add('tank');for(let k=0;k<trucks;k++)add('truck');
    fxPush({k:'dust',x:spots[0][0]+.5,y:spots[0][1]+.5,t:0,d:1});
  }
  W.total=W.ids.size;G.def.waves.push(W);
  toast(`⚔ 웨이브 ${n} — ${sides.map(s=>DEF_SIDE[s]).join('·')}쪽에서 적 ${W.total}기 접근!`);
  sfx('beep');
}
function waveAlive(W){let c=0;for(const id of W.ids){const e=G.uid.get(id)||G.vehicles.find(v=>v.id===id);if(e&&!e.dead)c++;}return c;}
function defAlive(){let c=0;for(const W of G.def.waves)if(!W.cleared)c+=waveAlive(W);return c;}
// ---- 웨이브 AI: 가까운 아군 병사, 없으면 깃발을 향해 진격 ----
function defCommand(W){
  const T0=G.teams[0],f=T0.flag;if(!f)return;
  const mem=[],tanks=[],trucks=[];
  for(const id of W.ids){const u=G.uid.get(id);if(u){if(!u.dead&&u.state!=='crew')mem.push(u);continue;}}
  for(const v of G.vehicles)if(v.wv===W.n&&!v.dead){(v.type==='tank'?tanks:trucks).push(v);}
  if(!mem.length&&!tanks.length&&!trucks.length)return;
  let cx0=0,cy0=0,n=0;for(const e of [...mem,...tanks]){cx0+=e.x;cy0+=e.y;n++;}if(!n){cx0=trucks[0].x;cy0=trucks[0].y;n=1;}cx0/=n;cy0/=n;
  let tx=f.x+.5,ty=f.y+.5,bd=1e9;
  for(const u of G.units){if(u.dead||u.team!==0||u.state==='crew')continue;const d=Math.hypot(u.x-cx0,u.y-cy0);if(d<bd){bd=d;if(d<20){tx=u.x;ty=u.y;}}}
  const gx=Math.round(tx),gy=Math.round(ty);
  const idle=mem.filter(u=>u.state==='idle'&&!u.path.length&&!u.queue.length&&!u.task);
  if(idle.length)orderMove(idle.slice(0,40),gx,gy);
  const it=tanks.filter(v=>v.state==='idle'||!v.path.length);if(it.length)orderVehicles(it,gx,gy);
  const ik=trucks.filter(v=>v.state==='idle'||!v.path.length);
  if(ik.length){const bx=Math.round(cx0+(gx-cx0)*.55),by=Math.round(cy0+(gy-cy0)*.55);orderVehicles(ik,bx,by);}
}
function stepDefense(dt){
  const D=G.def;if(!D||G.phase!=='play')return;
  D.t+=dt;D.next-=dt;
  if(D.next<=0){D.wave++;spawnWave(D.wave);D.next=DEF.interval;}
  D.ai=(D.ai||0)-dt;
  if(D.ai<=0){D.ai=DEF.aiTick;for(const W of D.waves)if(!W.cleared)defCommand(W);}
  for(const W of D.waves){
    if(W.cleared)continue;
    if(waveAlive(W)===0){
      W.cleared=true;D.cleared++;
      const R=waveReward(W.n),T0=G.teams[0];
      for(const k in R){T0.res[k]+=R[k];D.got[k]+=R[k];}
      toast(`✔ 웨이브 ${W.n} 제압! 보상: 달러 ${R.money} · 총알 ${R.bullets} · 금속 ${R.metal} · 나무 ${R.wood}`);
      sfx('win');
    }
  }
}
const _stepWorldD=stepWorld;
stepWorld=function(dt){_stepWorldD(dt);if(isDef())stepDefense(dt);};
// ---- 종료 판정: 디펜스는 적을 다 잡아도 끝나지 않는다 ----
const _checkEndD=checkEnd;
checkEnd=function(){
  if(!isDef())return _checkEndD();
  if(G.phase!=='play')return;
  G.teams[0].alive=teamCount(0)>0;
  if(!G.teams[0].alive){G.over='lose';G.phase='over';showOver();}
};
// ---- HUD ----
const _updateHUDD=updateHUD;
updateHUD=function(){
  _updateHUDD();
  if(!isDef()||!G.def)return;
  const D=G.def,nx=Math.max(0,Math.ceil(D.next)),al=defAlive();
  $('res').insertAdjacentHTML('beforeend',`<span class="chip" title="디펜스 모드: 웨이브를 전멸시키면 보상">⚔ 웨이브 <b>${D.wave}</b> · 다음 <b>${Math.floor(nx/60)}:${String(nx%60).padStart(2,'0')}</b> · 적 <b>${al}</b> · 제압 <b>${D.cleared}</b></span>`);
};
// ---- 결과 화면 · 저장 ----
const _showOverD=showOver;
showOver=function(){
  _showOverD();
  if(!isDef())return;
  const D=G.def;
  $('ovT').textContent='디펜스 종료';
  $('ovS').textContent=`웨이브 ${D.wave}까지 도달 · ${D.cleared}개 웨이브 제압 · 생존 ${Math.floor(D.t/60)}분 ${Math.floor(D.t%60)}초`;
  const row=$('bAgain').parentElement;let b=$('bSave');
  if(!b){b=document.createElement('button');b.id='bSave';b.className='go';b.style.cssText='background:var(--panel2);color:var(--fg);border:1px solid var(--line)';row.insertBefore(b,row.firstChild);}
  b.disabled=false;b.textContent='맵·진행 저장';b.onclick=()=>{const ok=defSave();b.textContent=ok?'저장됨 ✔':'저장 실패';b.disabled=!!ok;defRefreshSaves();};
};
function defSaves(){try{return JSON.parse(localStorage.getItem(DEF.saveKey)||'[]')||[];}catch(e){return [];}}
function defSave(){
  try{
    const D=G.def,T0=G.teams[0],c=G.cfg,w=G.w;
    const trench=[];for(const i of T0.trench)if(G.trench[i]===1)trench.push([i,Math.round(G.trenchHP[i]),G.up[i]|0]);
    for(let i=0;i<G.N;i++)if(G.trench[i]===1&&!T0.trench.includes(i))trench.push([i,Math.round(G.trenchHP[i]),G.up[i]|0]);
    const obs=[];for(const o of G.obSet)if(o.team===0&&!o.dead)obs.push([o.type,o.x,o.y,Math.round(o.hp)]);
    const alive=G.units.filter(u=>u.team===0&&!u.dead).length;
    const s={v:1,id:Date.now().toString(36),when:Date.now(),cfg:{seed:c.seed,biome:c.biome,size:c.size,enemies:1,soldiers:c.soldiers,minDist:c.minDist,mode:'defense'},
      wave:D.wave,cleared:D.cleared,time:Math.round(D.t),soldiers:Math.max(alive,10),res:Object.assign({},T0.res),flag:T0.flag?[T0.flag.x,T0.flag.y]:null,
      trench:[...new Map(trench.map(t=>[t[0],t])).values()],obs,kills:T0.kills};
    const list=defSaves();list.unshift(s);list.length=Math.min(list.length,DEF.maxSaves);
    localStorage.setItem(DEF.saveKey,JSON.stringify(list));return true;
  }catch(e){console.error('저장 실패',e);return false;}
}
function defResume(s){
  startGame(Object.assign({},s.cfg,{resume:s}));
}
function defApplyResume(s){
  const T0=G.teams[0];if(!s.flag)return;
  placeFlag(0,s.flag[0],s.flag[1]);
  const mine=G.units.filter(u=>u.team===0&&!u.dead);
  while(mine.length>s.soldiers){const u=mine.pop();G.units.splice(G.units.indexOf(u),1);G.uid.delete(u.id);}
  while(mine.length<s.soldiers){const b=mine[mine.length%Math.max(1,mine.length)]||{x:s.flag[0]+.5,y:s.flag[1]+.5};mine.push(mkUnit(0,b.x+(Math.random()-.5),b.y+(Math.random()-.5)));}
  for(const [i,hp,up] of s.trench){if(G.trench[i]===255||G.tt[i]===2)continue;G.trench[i]=1;G.trenchHP[i]=hp;if(up&&up!==4)G.up[i]=up;if(!T0.trench.includes(i))T0.trench.push(i);}
  for(const [type,x,y,hp] of s.obs){if(!OB[type])continue;const o=addOb(type,x,y,0);if(o)o.hp=Math.min(o.max,hp);}
  Object.assign(T0.res,s.res);T0.kills=s.kills||0;
  G.def.wave=s.wave;G.def.cleared=s.cleared||0;G.def.t=s.time||0;G.def.next=DEF.first;
  centerCam(s.flag[0]+.5,s.flag[1]+.5);beginCountdown();
}
const _startGameD=startGame;
startGame=function(cfg){
  if(cfg.mode===undefined){const m=$('fMode');cfg=Object.assign({},cfg,{mode:m?m.value:'normal'});}
  if(cfg.mode==='defense')cfg=Object.assign({},cfg,{enemies:1});
  const r=_startGameD(cfg);
  if(cfg.mode==='defense'&&cfg.resume){try{defApplyResume(cfg.resume);}catch(e){console.error('불러오기 실패',e);}}
  return r;
};
// ---- 로비 UI ----
function defRefreshSaves(){
  const sel=$('fSave'),row=$('fSaveRow');if(!sel||!row)return;
  const list=defSaves();row.hidden=!list.length;sel.innerHTML='';
  list.forEach((s,i)=>{const o=document.createElement('option');o.value=i;const d=new Date(s.when);o.textContent=`디펜스 · 시드 ${s.cfg.seed} · 웨이브 ${s.wave} · ${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;sel.appendChild(o);});
}
(function(){
  const grid=document.querySelector('#lobby .grid');if(!grid)return;
  const lb=document.createElement('label');lb.className='wide';
  lb.innerHTML='모드<select id="fMode"><option value="normal" selected>일반 — 적 기지와 대결</option><option value="defense">디펜스 — 사방에서 몰려오는 웨이브 막기</option></select><small id="fModeHint" style="opacity:.6;font-weight:400;line-height:1.4"></small>';
  grid.insertBefore(lb,grid.firstChild);
  const hint=()=>{$('fModeHint').textContent=$('fMode').value==='defense'?'웨이브 1~5: 한 방향 5×웨이브 / 6~10: 두 방향 4×웨이브+전차 또는 트럭 / 11~: 세 방향 3×웨이브+전차·트럭(5웨이브마다 전차 +1). 제압하면 자원 보상.':'';};
  $('fMode').onchange=hint;hint();
  const go=$('bGo'),rw=document.createElement('div');rw.id='fSaveRow';rw.hidden=true;rw.className='row';rw.style.cssText='margin-top:8px;gap:6px';
  rw.innerHTML='<select id="fSave" style="flex:1"></select><button class="btn" id="bResume" type="button">불러오기</button><button class="btn" id="bSaveDel" type="button">삭제</button>';
  go.parentNode.insertBefore(rw,go.nextSibling);
  $('bResume').onclick=()=>{const s=defSaves()[+$('fSave').value];if(s)defResume(s);};
  $('bSaveDel').onclick=()=>{const l=defSaves();l.splice(+$('fSave').value,1);try{localStorage.setItem(DEF.saveKey,JSON.stringify(l));}catch(e){}defRefreshSaves();};
  defRefreshSaves();
})();
