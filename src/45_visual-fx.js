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
  const low=1-Math.sin(p*Math.PI),col=low>.45?'255,196,130':'255,244,214',I=vis*.62;
  cx.save();cx.globalCompositeOperation='lighter';
  let g=cx.createRadialGradient(sx,sy,0,sx,sy,Math.max(W,H)*.3);
  g.addColorStop(0,`rgba(${col},${.22*I})`);g.addColorStop(.35,`rgba(${col},${.05*I})`);g.addColorStop(1,`rgba(${col},0)`);
  cx.fillStyle=g;cx.fillRect(0,0,W,H);
  g=cx.createRadialGradient(sx,sy,0,sx,sy,48);g.addColorStop(0,`rgba(255,255,245,${.36*I})`);g.addColorStop(1,'rgba(255,255,245,0)');
  cx.fillStyle=g;cx.fillRect(sx-48,sy-48,96,96);
  // 아나모픽 가로 줄무늬는 작고 희미하게 유지해 전술 화면을 가리지 않는다.
  cx.save();cx.translate(sx,sy);cx.scale(1,.05);
  g=cx.createRadialGradient(0,0,0,0,0,W*.42);g.addColorStop(0,`rgba(180,215,255,${.16*I})`);g.addColorStop(1,'rgba(180,215,255,0)');
  cx.fillStyle=g;cx.fillRect(-W*.5,-W*.5,W,W);cx.restore();
  const ox=W/2-sx,oy=H/2-sy,dist=Math.hypot(ox,oy),fall=clamp(1.15-dist/(Math.hypot(W,H)*.62),.15,1);
  const gh=[[.35,27,'255,170,90',.09],[.7,16,'120,200,255',.08],[1.1,36,'255,120,160',.06],[1.45,21,'160,255,190',.07],[1.9,46,'255,200,120',.05]];
  for(const [k,r,c,a] of gh){
    const x=sx+ox*k,y=sy+oy*k;
    g=cx.createRadialGradient(x,y,r*.2,x,y,r);g.addColorStop(0,`rgba(${c},0)`);g.addColorStop(.78,`rgba(${c},${a*I*fall*.6})`);g.addColorStop(.9,`rgba(${c},${a*I*fall})`);g.addColorStop(1,`rgba(${c},0)`);
    cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2);
  }
  cx.restore();
}
let fxvBloomCanvas=null,fxvBloomCtx=null,fxvBloomW=0,fxvBloomH=0;
function fxvBloom(nightK){
  // 발광원만 1/4 해상도 버퍼에 모아 넓고 부드러운 빛으로 합성한다.
  const scale=.25,z=cam.z,bw=Math.max(1,Math.ceil(W*scale)),bh=Math.max(1,Math.ceil(H*scale));
  if(!fxvBloomCanvas||fxvBloomW!==bw||fxvBloomH!==bh){
    fxvBloomCanvas=document.createElement('canvas');fxvBloomCanvas.width=bw;fxvBloomCanvas.height=bh;
    fxvBloomCtx=fxvBloomCanvas.getContext('2d');fxvBloomW=bw;fxvBloomH=bh;
  }
  const b=fxvBloomCtx;
  b.setTransform(1,0,0,1,0,0);b.globalAlpha=1;b.globalCompositeOperation='source-over';b.clearRect(0,0,bw,bh);
  b.setTransform(scale,0,0,scale,0,0);b.globalCompositeOperation='lighter';
  const night=1-nightK*.7;
  const glow=(x,y,r,a,c)=>{
    if(x<-r||x>W+r||y<-r||y>H+r||a<.015)return;
    let g=b.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(${c},${a*.72})`);g.addColorStop(.22,`rgba(${c},${a*.34})`);
    g.addColorStop(.62,`rgba(${c},${a*.08})`);g.addColorStop(1,`rgba(${c},0)`);
    b.fillStyle=g;b.fillRect(x-r,y-r,r*2,r*2);
  };
  let n=0;
  for(const f of G.fx){
    if(f.k!=='boom')continue;if(n++>=20)break;
    const [sx,sy]=toS(f.x,f.y),q=Math.max(0,1-f.t/f.d),r=(34+62*(1-q))*z;
    glow(sx,sy-10*z,r*1.5,.28*q*night,'255,164,82');
  }
  let fires=0;
  if(G.zones)for(const zn of G.zones){
    if(zn.kind!=='fire'||zn.t<=0)continue;if(fires++>=12)break;
    const [sx,sy]=toS(zn.x,zn.y),fl=.85+.15*Math.sin(G.time*14+zn.seed);
    glow(sx,sy-6*z,Math.max(18,(zn.r+1)*12*z),.13*fl*night,'255,132,62');
  }
  let muzzles=0;
  for(const v of G.vehicles){
    if(v.muz<=0)continue;if(muzzles++>=8)break;
    const [sx,sy]=toS(v.x,v.y);glow(sx,sy-14*z,42*z,.24*Math.min(1,v.muz/.14)*night,'255,205,120');
  }
  cx.save();cx.globalCompositeOperation='lighter';cx.imageSmoothingEnabled=true;
  // 넓은 번짐과 선명한 후광을 2회 합성해 다중 크기 느낌을 낸다.
  cx.globalAlpha=.24;cx.filter='blur(8px)';cx.drawImage(fxvBloomCanvas,0,0,W,H);
  cx.globalAlpha=.72;cx.filter='none';cx.drawImage(fxvBloomCanvas,0,0,W,H);
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
