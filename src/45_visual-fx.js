// ================= 비주얼 FX: 시간대 색조 · 렌즈 플레어 · 그라데이션 · 폭발 블룸 =================
// drawWeatherOverlay 뒤에 화면 공간 패스를 얹는다. 게임 로직에는 영향 없음. 헤더 ✨ 버튼으로 켜고 끈다.
const FXV={on:true};
try{if(localStorage.getItem('trench.fx')==='0')FXV.on=false;}catch(e){}
// 하루(240초) 키프레임: [시각, r,g,b, 강도]
const FXV_KEYS=[[0,255,186,140,.26],[22,255,236,215,.08],[40,255,255,255,0],[100,255,255,255,0],[125,255,208,128,.2],[150,255,138,108,.3],[170,120,140,205,.12],[225,120,140,205,.12],[240,255,186,140,.26]];
function fxvGrade(t){
  let a=FXV_KEYS[0],b=FXV_KEYS[1];
  for(let i=0;i<FXV_KEYS.length-1;i++){if(t>=FXV_KEYS[i][0]&&t<=FXV_KEYS[i+1][0]){a=FXV_KEYS[i];b=FXV_KEYS[i+1];break;}}
  const p=(t-a[0])/Math.max(1e-6,b[0]-a[0]),s=p*p*(3-2*p),m=(i)=>a[i]+(b[i]-a[i])*s;
  return {r:m(1),g:m(2),b:m(3),k:m(4)};
}
const fxvSm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function fxvFlare(t,clearK){
  // 해는 0~150초 동안 화면 위쪽을 왼→오로 지나간다. 낮은 해일수록 주황.
  if(t>=150)return;
  const p=t/150,vis=fxvSm(0,.05,p)*(1-fxvSm(.93,1,p))*clearK;if(vis<.02)return;
  const sx=W*(.12+.76*p)-cam.x*.015,sy=H*(.03+.2*(1-Math.sin(p*Math.PI)))-cam.y*.01;
  const low=1-Math.sin(p*Math.PI),col=low>.45?'255,196,130':'255,244,214',I=vis;
  cx.save();cx.globalCompositeOperation='lighter';
  let g=cx.createRadialGradient(sx,sy,0,sx,sy,Math.max(W,H)*.42);
  g.addColorStop(0,`rgba(${col},${.3*I})`);g.addColorStop(.35,`rgba(${col},${.08*I})`);g.addColorStop(1,`rgba(${col},0)`);
  cx.fillStyle=g;cx.fillRect(0,0,W,H);
  g=cx.createRadialGradient(sx,sy,0,sx,sy,70);g.addColorStop(0,`rgba(255,255,245,${.5*I})`);g.addColorStop(1,'rgba(255,255,245,0)');
  cx.fillStyle=g;cx.fillRect(sx-70,sy-70,140,140);
  // 아나모픽 가로 줄무늬
  cx.save();cx.translate(sx,sy);cx.scale(1,.05);
  g=cx.createRadialGradient(0,0,0,0,0,W*.5);g.addColorStop(0,`rgba(180,215,255,${.3*I})`);g.addColorStop(1,'rgba(180,215,255,0)');
  cx.fillStyle=g;cx.fillRect(-W*.5,-W*.5,W,W);cx.restore();
  // 고스트: 태양→화면 중심 축 위의 렌즈 반사
  const ox=W/2-sx,oy=H/2-sy,dist=Math.hypot(ox,oy),fall=clamp(1.15-dist/(Math.hypot(W,H)*.62),.15,1);
  const gh=[[.35,34,'255,170,90',.18],[.7,20,'120,200,255',.16],[1.1,46,'255,120,160',.12],[1.45,26,'160,255,190',.14],[1.9,60,'255,200,120',.1]];
  for(const [k,r,c,a] of gh){
    const x=sx+ox*k,y=sy+oy*k;
    g=cx.createRadialGradient(x,y,r*.2,x,y,r);g.addColorStop(0,`rgba(${c},0)`);g.addColorStop(.78,`rgba(${c},${a*I*fall*.6})`);g.addColorStop(.9,`rgba(${c},${a*I*fall})`);g.addColorStop(1,`rgba(${c},0)`);
    cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2);
  }
  cx.restore();
}
function fxvBloom(nightK){
  // 낮/황혼에도 폭발·포구·화염이 주변을 환하게 번지게 한다 (밤에는 nightPass가 처리하므로 약하게)
  const k=1-nightK*.7,z=cam.z;
  cx.save();cx.globalCompositeOperation='lighter';
  const glow=(x,y,r,a,c)=>{if(x<-r||x>W+r||y<-r||y>H+r||a<.02)return;const g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${c},${a})`);g.addColorStop(1,`rgba(${c},0)`);cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2);};
  let n=0;
  for(const f of G.fx){
    if(f.k!=='boom'||n>24)continue;n++;
    const [sx,sy]=toS(f.x,f.y),q=Math.max(0,1-f.t/f.d);glow(sx,sy-10*z,(60+90*(1-q))*z,.34*q*k,'255,176,90');
  }
  if(G.zones)for(const zn of G.zones){
    if(zn.kind!=='fire'||zn.t<=0)continue;
    const [sx,sy]=toS(zn.x,zn.y),fl=.8+.2*Math.sin(G.time*14+zn.seed);glow(sx,sy-6*z,(zn.r+1.4)*28*z,.2*fl*k+.1*nightK,'255,140,60');
  }
  for(const v of G.vehicles)if(v.muz>0){const [sx,sy]=toS(v.x,v.y);glow(sx,sy-14*z,90*z,.3*(v.muz/.14>1?1:v.muz/.14)*k,'255,205,110');}
  cx.restore();
}
function drawVisualFx(){
  if(!FXV.on||!G||!G.weather||(G.phase!=='play'&&G.phase!=='over'))return;
  const t=wmod(G.time,240),gr=fxvGrade(t),nt=WFX.night;
  const wet=Math.max(WFX.rain,WFX.fog,WFX.snow*.8);
  // 1) 색조: 곱하기로 전체 색감을 시간대에 맞춘다 (밤에는 자체 파랑이 있으므로 약하게)
  const k=gr.k*(1-nt*.6)*(1-wet*.5);
  if(k>.01){
    const m=(c)=>Math.round(255+(c-255)*Math.min(1,k*2.6));
    cx.globalCompositeOperation='multiply';cx.fillStyle=`rgb(${m(gr.r)},${m(gr.g)},${m(gr.b)})`;cx.fillRect(0,0,W,H);
    cx.globalCompositeOperation='source-over';
    // 지평선 쪽 따뜻한 빛번짐 (위: 하늘색, 아래: 어둡게) — 세로 그라데이션
    const g=cx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,`rgba(${gr.r|0},${gr.g|0},${gr.b|0},${.22*k*3})`);g.addColorStop(.5,`rgba(${gr.r|0},${gr.g|0},${gr.b|0},0)`);g.addColorStop(1,`rgba(20,16,30,${.1+.1*k*3})`);
    cx.fillStyle=g;cx.fillRect(0,0,W,H);
  }else{
    const g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(190,215,255,.07)');g.addColorStop(.45,'rgba(190,215,255,0)');g.addColorStop(1,'rgba(10,12,20,.1)');
    cx.fillStyle=g;cx.fillRect(0,0,W,H);
  }
  // 2) 코너 비네트(낮에도 은은하게)
  const vg=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.45,W/2,H/2,Math.max(W,H)*.8);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(8,6,14,${.22*(1-nt*.5)})`);cx.fillStyle=vg;cx.fillRect(0,0,W,H);
  // 3) 블룸 + 렌즈 플레어
  fxvBloom(nt);
  fxvFlare(t,(1-nt)*(1-Math.max(WFX.rain,WFX.fog,WFX.snow*.8)));
}
{const _dwo3=drawWeatherOverlay;drawWeatherOverlay=function(){const r=_dwo3.apply(this,arguments);try{drawVisualFx();}catch(e){}return r;};}
(function(){const b=document.getElementById('bFx');if(!b)return;
  const sync=()=>{b.classList.toggle('on',FXV.on);b.title='시각 효과: 색조·렌즈 플레어·블룸 ('+(FXV.on?'켜짐':'꺼짐')+')';};
  b.onclick=()=>{FXV.on=!FXV.on;try{localStorage.setItem('trench.fx',FXV.on?'1':'0');}catch(e){}sync();};sync();})();
