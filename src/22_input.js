// ================= 입력 =================
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  if(!G)return;
  const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
  cv.setPointerCapture(e.pointerId);
  mouse={x:sx,y:sy};
  if(e.button===2||e.button===1){drag={mode:'pan',sx,sy,cx:cam.x,cy:cam.y,moved:false,btn:e.button};return;}
  if(G.phase==='setup'){drag={mode:'flag',sx,sy};return;}
  if(G.phase!=='play'){return;}
  const t=tileAt(sx,sy);
  if(e.shiftKey)drag={mode:'box',sx,sy,x:sx,y:sy,shift:true};
  else drag={mode:'path',sx,sy,tiles:[t],moved:false,rect:areaMode&&isAreaTool(),t0:t,cur:t};
});
cv.addEventListener('pointermove',e=>{
  if(!G)return;
  const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
  mouse={x:sx,y:sy};hover=tileAt(sx,sy);
  cv.style.cursor=(G.phase==='play'&&!drag&&inb(hover[0],hover[1])&&padAt(hover[0],hover[1])===0)?'pointer':'';
  if(!drag)return;
  if(drag.mode==='pan'){const dx=sx-drag.sx,dy=sy-drag.sy;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;cam.x=drag.cx+dx;cam.y=drag.cy+dy;clampCamera();}
  else if(drag.mode==='box'){drag.x=sx;drag.y=sy;}
  else if(drag.mode==='path'){
    const t=tileAt(sx,sy);const l=drag.tiles[drag.tiles.length-1];
    if(drag.rect){drag.cur=t;if(t[0]!==drag.t0[0]||t[1]!==drag.t0[1])drag.moved=true;}
    else if(t[0]!==l[0]||t[1]!==l[1]){drag.moved=true;extendPath(drag,t);}
  }
});
cv.addEventListener('pointerup',e=>{
  if(!G||!drag)return;
  const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
  const d=drag;drag=null;
  if(d.mode==='pan'){
    if(!d.moved&&d.btn===2&&G.phase==='play'){for(const u of selUnits()){releaseUnit(u);u.queue=[];}for(const v of selVehicles()){v.path=[];v.state='idle';}toast('명령 취소');}
    return;
  }
  const t=tileAt(sx,sy);
  if(d.mode==='flag'){
    if(Math.abs(sx-d.sx)+Math.abs(sy-d.sy)>10)return;
    const err=flagCheck(t[0],t[1]);if(err){toast(err);return;}
    placeFlag(0,t[0],t[1]);aiPlaceFlags();centerCam(t[0]+.5,t[1]+.5);beginCountdown();
    setSel(mineUnits(),false);return;
  }
  if(G.phase!=='play')return;
  if(d.mode==='box'){
    const dx=Math.abs(d.x-d.sx),dy=Math.abs(d.y-d.sy);
    if(dx+dy<8){
      const v=hitVehicle(sx,sy);if(v){setSel([],false);v.sel=true;return;}
      const u=hitUnit(sx,sy);
      if(u)setSel([u],d.shift);
      else if(!d.shift&&!selUnits().length){/* 선택 없음 */}
      else if(!u&&!d.shift)setSel([],false);
      return;
    }
    const x0=Math.min(d.sx,d.x),x1=Math.max(d.sx,d.x),y0=Math.min(d.sy,d.y),y1=Math.max(d.sy,d.y);
    const picked=mineUnits().filter(u=>(u.lay|0)===viewLay&&((a,b)=>true)()).filter(u=>{const [a,b]=toS(u.x,u.y);return a>=x0&&a<=x1&&b-10*cam.z>=y0&&b-10*cam.z<=y1;});
    setSel(picked,d.shift);for(const v of G.vehicles){const [a,b]=toS(v.x,v.y);if(v.team===0&&a>=x0&&a<=x1&&b>=y0&&b<=y1)v.sel=true;}
    return;
  }
  // path: 작업 명령은 배정 인원만큼 놀고 있는 병사를 자동 배정 (선택한 병사가 있으면 그 안에서만)
  const sel=selUnits(),vsel=selVehicles();
  if(d.rect&&d.moved)d.tiles=rectTiles(d.t0,t);
  if(d.tiles.length<2){
    const v=hitVehicle(sx,sy);if(v){setSel([],false);v.sel=true;return;}
    const u=hitUnit(sx,sy);
    if(u){setSel([u],false);return;}
    if(viewLay===1){const e2=underClick(t,sel);if(e2)toast(e2);return;}
    const ti0=inb(t[0],t[1])?t[1]*G.w+t[0]:-1;
    if(tool==='dig'&&sel.length&&ti0>=0&&(G.mouth[ti0]||(G.up[ti0]===4&&G.under[ti0]===1))){const e3=orderMoveL(sel,t[0],t[1],1);if(e3)toast(e3);return;}
    if(inb(t[0],t[1])&&padAt(t[0],t[1])===0){openShop();return;}
    const clickedOb=inb(t[0],t[1])?G.obst[t[1]*G.w+t[0]]:null;
    if(clickedOb&&!(sel.some(u=>u.state!=='gar')&&clickedOb.occ&&clickedOb.occ.length<(OB[clickedOb.type].slots||0))&&objClick(clickedOb))return;
    if(tool==='dig'&&clickedOb&&clickedOb.occ&&clickedOb.occ.length&&clickedOb.occTeam===0){
      // 대기 병사를 이 시설에 배치하려는 경우(빈 자리 있음)만 명령으로 처리하고, 그 외에는 주둔 병사를 선택한다.
      const wantsGarrison=sel.some(u=>u.state!=='gar')&&clickedOb.occ.length<(OB[clickedOb.type].slots||0);
      if(!wantsGarrison){lastOb=clickedOb;const occupants=occUnits(clickedOb).filter(u=>u.team===0);setSel(occupants,false);toast(`주둔 병력 ${occupants.length}명 선택 · R 또는 [주둔 해제]`);return;}
    }
    if(tool==='dig'&&vsel.length){orderVehicles(vsel,t[0],t[1]);return;}
    let err=null;
    if(tool==='dig')err=smartCommand(0,sel,t[0],t[1],assignN);
    else err=commandTiles([t],sel,vsel,t);
    if(err)toast(err);
    return;
  }
  const err=commandTiles(d.tiles,sel,vsel,t);
  if(err)toast(err);
});
cv.addEventListener('pointercancel',()=>{drag=null;hover=null;});
cv.addEventListener('lostpointercapture',()=>{drag=null;});
cv.addEventListener('pointerleave',()=>{hover=null;});
cv.addEventListener('wheel',e=>{
  e.preventDefault();
  const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
  const [wx,wy]=toW(sx,sy);
  cam.z=clamp(cam.z*(e.deltaY<0?1.12:1/1.12),.36,1.7);
  const [nx,ny]=toS(wx,wy);cam.x+=sx-nx;cam.y+=sy-ny;clampCamera();
},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;
  const k=e.key.toLowerCase();
  if('wasd'.includes(k)||k.startsWith('arrow'))keys.add(k);
  if(G&&(k===','||k==='.')){setRot(VROT+(k==='.'?1:-1));return;}
  if(!G||G.phase==='setup')return;
  if(e.ctrlKey&&k>='1'&&k<='5'){
    e.preventDefault();
    const n=+k-1,ids=selUnits().map(u=>u.id);
    if(!ids.length){toast('부대에 등록할 병사를 먼저 선택하세요');return;}
    controlGroups[n]=ids;toast(`${n+1}번 부대 저장 · ${ids.length}명`);return;
  }
  if(/^f[1-5]$/.test(k)){
    e.preventDefault();const n=+k.slice(1)-1;
    const units=controlGroups[n].map(id=>G.uid.get(id)).filter(u=>u&&!u.dead&&u.team===0);
    controlGroups[n]=units.map(u=>u.id);setSel(units,false);
    toast(units.length?`${n+1}번 부대 · ${units.length}명`:`${n+1}번 부대가 비어 있습니다`);return;
  }
  if(k==='['||k==='-')setN(assignN-1);
  else if(k===']'||k==='='||k==='+')setN(assignN+1);
  else if(TOOLS.some(t=>t.k.toLowerCase()===k))setTool(TOOLS.find(t=>t.k.toLowerCase()===k).id);
  else if(k==='m')toggleMusic();
  else if(k==='n')toggleSfx();
  else if(k==='t')toggleArea();
  else if(k==='u')toggleLayer();
  else if(k==='r')releaseGarrison();
  else if(k==='e')setSel(mineUnits(),false);
  else if(k==='q')selectFreeUnits();
  else if(k==='x'){for(const u of selUnits()){releaseUnit(u);u.queue=[];}for(const v of selVehicles()){v.path=[];v.state='idle';}}
  else if(k==='p')togglePause();
  else if(k==='h'){shopOpen()?closeShop():openShop();}
  else if(k==='escape'){closeBuildDrawer();closeShop();setSel([],false);}
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());});
function togglePause(){if(!G||G.phase!=='play')return;G.paused=!G.paused;$('bPause').classList.toggle('on',G.paused);}
$('bPause').onclick=togglePause;$('bMusic').onclick=toggleMusic;$('bSfx').onclick=toggleSfx;
$('bX1').onclick=()=>{if(G){G.speed=1;$('bX1').classList.add('on');$('bX2').classList.remove('on');}};
$('bX2').onclick=()=>{if(G){G.speed=2;$('bX2').classList.add('on');$('bX1').classList.remove('on');}};
$('bNew').onclick=()=>{$('lobby').hidden=false;};
$('bNew2').onclick=()=>{$('over').hidden=true;$('lobby').hidden=false;};
$('bAgain').onclick=()=>{$('over').hidden=true;startGame(lastCfg);};
$('bDice').onclick=()=>{$('fSeed').value=Math.random().toString(36).slice(2,8).toUpperCase();};
$('bGo').onclick=()=>{
  const seed=($('fSeed').value.trim())||Math.random().toString(36).slice(2,8).toUpperCase();
  $('fSeed').value=seed;
  startGame({seed,biome:$('fBiome').value,size:+$('fSize').value,enemies:+$('fEnemy').value,soldiers:clamp(+$('fSold').value||24,12,60),minDist:clamp(+$('fDist').value||30,5,Math.max(5,Math.floor(+$('fSize').value*(+$('fEnemy').value>1?.34:.5))))});
};
// 미니맵
let miniDragging=false;
function moveMiniCamera(e){
  if(!G)return;
  const r=mini.getBoundingClientRect(),s=mmScale(),ox=(mini.width-G.w*s)/2;
  const px=(e.clientX-r.left)*mini.width/r.width,py=(e.clientY-r.top)*mini.height/r.height;
  centerCam(clamp((px-ox)/s,0,G.w),clamp(py/s,0,G.h));
}
mini.addEventListener('pointerdown',e=>{
  if(!G)return;miniDragging=true;mini.setPointerCapture(e.pointerId);moveMiniCamera(e);e.stopPropagation();
});
mini.addEventListener('pointermove',e=>{if(miniDragging)moveMiniCamera(e);});
mini.addEventListener('pointerup',()=>{miniDragging=false;});
mini.addEventListener('pointercancel',()=>{miniDragging=false;});
function mmScale(){return Math.min(mini.height/G.h,mini.width/G.w);}
