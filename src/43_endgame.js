// ================= 최종 페이즈 · 기지 몰락 =================
// - 최종 페이즈: 3인전 이상에서 생존 팀이 둘만 남았을 때(1대1) / 2인전에서 적 병사가 10명 미만일 때
//   → pit 브금으로 전환, 일정 시간마다 비프음과 함께 모든 적 병력 방향에 화살표 표시
// - 기지 몰락: 병사·차량이 전부 사망한 팀의 기지는 회색 처리되고 더 이상 헬기가 오지 않는다
const EG={enter:10,exit:13,period:7,show:3.2,t:0,arrow:0};
function enemySoldiers(team){let n=0;for(const u of G.units)if(!u.dead&&u.team!==team&&!(G.teams[u.team].dead))n++;return n;}
function updateEndgame(){
  if(!G||G.phase!=='play'){if(G)G.endgame=false;return;}
  const alive=G.teams.filter(T=>!T.dead&&T.alive!==false);
  let eg=false;
  if(G.cfg.enemies>=2)eg=alive.length===2&&alive.some(T=>T.id===0);
  else{
    let n=0;for(const u of G.units)if(!u.dead&&u.team===1)n++;
    eg=G.endgame?n<EG.exit:n<EG.enter;
    if(n===0)eg=false;
  }
  if(eg&&!G.endgame){EG.t=0;toast('최종 국면 — 적이 얼마 남지 않았습니다','ok');}
  G.endgame=eg;
}
const _checkEnd=checkEnd;
checkEnd=function(){
  _checkEnd();
  if(!G)return;
  for(const T of G.teams)if(T.alive===false&&!T.dead){T.dead=true;if(T.id!==0)toast(`${T.name||('적군 '+String.fromCharCode(64+T.id))} 기지가 무너졌습니다`);}
  updateEndgame();
};
// 헬기: 몰락한 팀에는 더 이상 오지 않는다 (접근/착륙 중이었다면 이탈)
const _stepHelis=stepHelis;
stepHelis=function(dt){
  for(const T of G.teams){
    if(!T.dead||!T.heli)continue;
    const h=T.heli;
    if(h.state==='wait'){h.timer=1e9;}
    else if(h.state==='inbound'||h.state==='landed'){h.state='leaving';h.t=0;h.delivered=true;}
  }
  _stepHelis(dt);
};
const _aiShop=aiShop;
aiShop=function(T){if(T.dead)return;return _aiShop(T);};
// 회색 처리
function grayCall(T,fn,arg){
  if(!T.dead)return fn(arg);
  const old=cx.filter;cx.filter='grayscale(1) brightness(.78)';
  try{return fn(arg);}finally{cx.filter=old;}
}
const _drawPad=drawPad;drawPad=function(T){return grayCall(T,_drawPad,T);};
const _drawHeli=drawHeli;drawHeli=function(T){return grayCall(T,_drawHeli,T);};
const _drawFlag=drawFlag;drawFlag=function(f){const T=G.teams[f.team];return grayCall(T,_drawFlag,f);};
// ---- 적 방향 화살표 ----
function stepEndgame(dt){
  if(!G.endgame){EG.arrow=0;return;}
  EG.t-=dt;
  if(EG.arrow>0)EG.arrow-=dt;
  if(EG.t<=0){EG.t=EG.period;EG.arrow=EG.show;sfx('beep');}
}
const _ss3=stepShells;stepShells=function(dt){_ss3(dt);stepEndgame(dt);};
function drawEndArrows(){
  if(!G||!G.endgame||EG.arrow<=0)return;
  // 적 병력을 격자(7칸)로 묶어 방향 표시 (병사·차량 모두)
  const cells=new Map(),add=(e)=>{if(e.dead||e.team===0)return;const k=((e.x/7)|0)+','+((e.y/7)|0);let c=cells.get(k);if(!c){c={x:0,y:0,n:0};cells.set(k,c);}c.x+=e.x;c.y+=e.y;c.n++;};
  for(const u of G.units)add(u);for(const v of G.vehicles)add(v);
  const z=1,cx0=W/2,cy0=H/2-20,rx=Math.min(W*.36,520),ry=Math.min(H*.34,260);
  const p=EG.arrow/EG.show,a=Math.min(1,p*4)*(.55+.45*Math.sin((EG.show-EG.arrow)*10));
  cx.save();cx.globalAlpha=Math.max(0,a);
  // 같은 방향(약 18°)의 무리는 화살표 하나로 합친다
  const bins=new Map();
  for(const c of cells.values()){
    const [sx,sy]=toS(c.x/c.n,c.y/c.n),dx=sx-cx0,dy=sy-cy0,d=Math.hypot(dx,dy);if(d<60)continue;
    const k=Math.round(Math.atan2(dy,dx)/(Math.PI/10));let m=bins.get(k);
    if(!m){m={dx:0,dy:0,d:1e9,n:0};bins.set(k,m);}
    m.n+=c.n;if(d<m.d){m.d=d;m.dx=dx/d;m.dy=dy/d;}
  }
  for(const m of bins.values()){
    const dx=m.dx,dy=m.dy,rr=Math.hypot(dx*rx,dy*ry),r=Math.min(m.d-34,rr),px=cx0+dx*r,py=cy0+dy*r;
    cx.save();cx.translate(px,py);cx.rotate(Math.atan2(dy,dx));
    cx.fillStyle='rgba(0,0,0,.45)';cx.beginPath();cx.moveTo(19,1);cx.lineTo(-9,-13);cx.lineTo(-3,1);cx.lineTo(-9,15);cx.closePath();cx.fill();
    cx.fillStyle='#ff5a44';cx.strokeStyle='#ffe3c8';cx.lineWidth=1.6;cx.beginPath();cx.moveTo(18,0);cx.lineTo(-8,-12);cx.lineTo(-2,0);cx.lineTo(-8,12);cx.closePath();cx.fill();cx.stroke();
    cx.restore();
    if(m.n>1){cx.font='bold 12px ui-monospace,monospace';cx.textAlign='center';cx.fillStyle='#ffe3c8';cx.fillText('×'+m.n,px-dx*28,py-dy*28+4);cx.textAlign='start';}
  }
  cx.restore();
}
const _dwo2=drawWeatherOverlay;
drawWeatherOverlay=function(){const r=_dwo2.apply(this,arguments);drawEndArrows();return r;};
