// ================= 시작 / 루프 =================
function startGame(cfg){
  lastCfg=cfg;closeShop();shopSig='';WFX.rain=WFX.snow=WFX.fog=WFX.night=WFX.acc=0;
  controlGroups=Array.from({length:5},()=>[]);
  newGame(cfg);
  $('lobby').hidden=true;$('over').hidden=true;
  $('seedro').textContent=`시드 ${cfg.seed} · ${cfg.size}×${cfg.size} · ${BIOME[G.biome].n}`;
  resize();cam.z=1;centerCam(G.w/2,G.h/2);
  $('bPause').classList.remove('on');$('bX1').classList.add('on');$('bX2').classList.remove('on');
  setTool('dig');sfx('start');
  try{musStart();}catch(e){console.error(e);}
}
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(G){
    try{
      const sp=600*dt/Math.max(.65,cam.z);
      if(keys.has('w')||keys.has('arrowup'))cam.y+=sp;
      if(keys.has('s')||keys.has('arrowdown'))cam.y-=sp;
      if(keys.has('a')||keys.has('arrowleft'))cam.x+=sp;
      if(keys.has('d')||keys.has('arrowright'))cam.x-=sp;
      clampCamera();
      if(G.phase==='countdown'){G.countdown-=dt;if(G.countdown<=0){G.phase='play';}}
      else if(G.phase==='play'&&!G.paused){
        for(let k=0;k<G.speed;k++){
          stepWorld(dt);
          for(const T of G.teams)if(!T.human&&teamCount(T.id)>0&&G.phase==='play')aiTick(T,dt);
        }
        if(G.gainShow>0)G.gainShow-=dt;
      }else if(G.phase==='over'){for(const f of G.fx)f.t+=dt;G.fx=G.fx.filter(f=>f.t<f.d);}
    }catch(err){
      // 예외가 RAF 루프까지 전파되면 다음 프레임이 예약되지 않아 전투 전체가 멈춘다.
      // 시뮬레이션만 안전하게 일시정지하고 월드 렌더링은 계속 유지한다.
      G.paused=true;G.runtimeError=String(err&&err.message||err);
      console.error('전투 시뮬레이션 오류:',err);
      const status=$('status');if(status)status.textContent='시뮬레이션 오류로 일시정지됨';
      const banner=$('banner');if(banner){banner.hidden=false;banner.textContent='전투가 안전하게 일시정지됐어. 오류: '+G.runtimeError;}
    }
    try{musTick(dt);}catch(err){console.error('음악 오류:',err);}
    try{updateHUD();render();renderShop();}
    catch(err){console.error('화면 갱신 오류:',err);const status=$('status');if(status)status.textContent='화면 갱신 오류: '+String(err&&err.message||err);}
  }else{cx.setTransform(DPR,0,0,DPR,0,0);cx.fillStyle='#0b0c08';cx.fillRect(0,0,W,H);}
  requestAnimationFrame(frame);
}
