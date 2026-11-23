// ================= 배경음악 =================
const MUS={tr:{},lv:{calm:0,battle:0,pit:0},mode:'calm',on:true,vol:.55,deaths:[],lost0:0,last:-1e9,pending:false,ready:false};
function musInit(){
  if(MUS.ready||typeof MUS_SRC==='undefined')return;
  for(const k of ['calm','battle','pit']){const a=new Audio(MUS_SRC[k]);a.loop=true;a.preload='auto';a.volume=0;MUS.tr[k]=a;}
  MUS.ready=true;
}
function musLost(){let n=0;for(const T of G.teams)n+=T.lost||0;return n;}
function musPlay(k){const a=MUS.tr[k];if(!a||!a.paused)return;const p=a.play();if(p&&p.catch)p.catch(()=>{MUS.pending=true;});}
function musStart(){
  musInit();if(!MUS.ready)return;
  MUS.mode='calm';MUS.deaths=[];MUS.last=-1e9;MUS.lost0=musLost();MUS.lv.calm=0;MUS.lv.battle=0;MUS.lv.pit=0;MUS.fd={calm:0,battle:0,pit:0};MUS.q=1;
  for(const k in MUS.tr){MUS.tr[k].pause();MUS.tr[k].currentTime=0;MUS.tr[k].volume=0;}
  musPlay('calm');
}
function musTick(dt){
  if(!MUS.ready||!G)return;
  if(G.phase==='play'){
    const l=musLost();
    if(l>MUS.lost0){for(let i=MUS.lost0;i<l;i++)MUS.deaths.push(G.time);MUS.lost0=l;MUS.last=G.time;}
    else if(l<MUS.lost0)MUS.lost0=l;
    MUS.deaths=MUS.deaths.filter(t=>G.time-t<40);
    if(MUS.mode==='calm'&&MUS.deaths.length>=3){MUS.mode='battle';const b=MUS.tr.battle;b.currentTime=0;}
    else if(MUS.mode==='battle'&&G.time-MUS.last>70)MUS.mode='calm';
    // 최종 페이즈(pit): 3인전+ 1대1 / 2인전 적 10명 미만
    if(G.endgame&&MUS.mode!=='pit'){MUS.mode='pit';MUS.tr.pit.currentTime=0;}
    else if(!G.endgame&&MUS.mode==='pit'){MUS.mode='battle';MUS.last=G.time;MUS.tr.battle.currentTime=0;}
  }
  // 페이드는 전용 변수(MUS.fd: 곡별 0~1, MUS.q: 일시정지/종료 감쇠)로만 움직이고, 음량 슬라이더(MUS.vol)는 마지막에 곱한다.
  // 그래서 음량을 어떻게 바꿔도 페이즈 전환 페이드 길이와 모양이 변하지 않는다.
  const qt=G.phase==='over'?0:G.paused?.35:1;
  MUS.q=MUS.q===undefined?1:MUS.q;MUS.q+=(qt-MUS.q)*Math.min(1,dt*4);
  MUS.fd=MUS.fd||{calm:0,battle:0,pit:0};
  for(const k of ['calm','battle','pit']){
    const a=MUS.tr[k],on=MUS.on&&MUS.mode===k&&G.phase!=='setup';
    let f=MUS.fd[k];
    const dur=on?((k==='battle'||k==='pit')?1.4:3):2.2;   // 들어올 때 / 나갈 때 걸리는 초
    f=on?Math.min(1,f+dt/dur):Math.max(0,f-dt/dur);MUS.fd[k]=f;
    const out=f*f*(3-2*f)*MUS.q*MUS.vol;   // 부드러운 곡선
    a.volume=clamp(out,0,1);
    if(f>.002&&MUS.vol>0&&a.paused)musPlay(k);
    else if(f<=.002&&!on&&!a.paused)a.pause();
  }
}
function toggleMusic(){
  musInit();MUS.on=!MUS.on;const b=$('bMusic');if(b){b.textContent=MUS.on?'♪':'♪̸';b.classList.toggle('on',MUS.on);}
  toast(MUS.on?'음악 켜짐':'음악 꺼짐');
}
window.addEventListener('pointerdown',()=>{if(MUS.pending&&G){MUS.pending=false;musPlay(MUS.mode);}},true);
