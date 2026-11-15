// ================= 효과음 (WebAudio 합성) · 목적지 표시 =================
const SFX={ctx:null,master:null,on:true,last:{},voices:0,noise:null,hov:null};
function sfxInit(){
  if(SFX.ctx){if(SFX.ctx.state==='suspended')SFX.ctx.resume();return;}
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const c=new C();SFX.ctx=c;SFX.master=c.createGain();SFX.master.gain.value=.55;SFX.master.connect(c.destination);
    const n=c.sampleRate,b=c.createBuffer(1,n,n),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;SFX.noise=b;
  }catch(e){SFX.ctx=null;}
}
function sOsc(type,f0,f1,t0,dur,vol,out){
  const c=SFX.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);
  if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t0+dur);
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  o.connect(g);g.connect(out);o.start(t0);o.stop(t0+dur+.03);
}
function sNoise(ft,f0,f1,q,t0,dur,vol,out){
  const c=SFX.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=SFX.noise;s.loop=true;f.type=ft;f.Q.value=q;f.frequency.setValueAtTime(f0,t0);
  if(f1)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  s.connect(f);f.connect(g);g.connect(out);s.start(t0,Math.random()*.5);s.stop(t0+dur+.03);
}
const SFXDEF={
  hover:{gap:30,ui:1,dur:.05,fn:(t,o)=>sOsc('sine',1500,1250,t,.03,.05,o)},
  click:{gap:30,ui:1,dur:.12,fn:(t,o)=>{sOsc('square',520,300,t,.06,.07,o);sOsc('sine',900,600,t,.05,.05,o);}},
  toast:{gap:120,ui:1,dur:.15,fn:(t,o)=>{sOsc('sine',700,740,t,.08,.06,o);}},
  err:{gap:150,ui:1,dur:.2,fn:(t,o)=>{sOsc('sawtooth',210,130,t,.14,.07,o);}},
  select:{gap:60,ui:1,dur:.1,fn:(t,o)=>{sOsc('sine',880,1180,t,.06,.07,o);}},
  order:{gap:80,ui:1,dur:.2,fn:(t,o)=>{sOsc('triangle',620,620,t,.07,.09,o);sOsc('triangle',930,930,t+.07,.09,.09,o);}},
  start:{gap:500,ui:1,dur:.6,fn:(t,o)=>{sOsc('triangle',330,330,t,.18,.12,o);sOsc('triangle',495,495,t+.14,.18,.12,o);sOsc('triangle',660,660,t+.28,.3,.12,o);}},
  win:{gap:500,ui:1,dur:1.4,fn:(t,o)=>{[392,494,587,784].forEach((f,i)=>sOsc('triangle',f,f,t+i*.16,.5,.14,o));}},
  lose:{gap:500,ui:1,dur:1.4,fn:(t,o)=>{[330,277,233,175].forEach((f,i)=>sOsc('sawtooth',f,f*.97,t+i*.22,.55,.08,o));}},
  beep:{gap:50,dur:.1,fn:(t,o)=>sOsc('square',1750,1750,t,.07,.1,o)},
  plant:{gap:220,dur:.2,fn:(t,o)=>{sOsc('square',720,480,t,.04,.1,o);sNoise('highpass',3000,3000,1,t+.05,.03,.15,o);}},
  alarm:{gap:600,dur:.6,fn:(t,o)=>{sOsc('sawtooth',620,620,t,.18,.1,o);sOsc('sawtooth',470,470,t+.2,.2,.1,o);}},
  rifle:{gap:45,dur:.2,fn:(t,o)=>{sNoise('bandpass',2200,900,1.2,t,.09,.5,o);sOsc('sine',170,60,t,.07,.35,o);}},
  mg:{gap:70,dur:.15,fn:(t,o)=>{sNoise('bandpass',2600,1200,1.4,t,.06,.42,o);sOsc('square',210,90,t,.04,.18,o);}},
  cannon:{gap:120,big:1,dur:.7,fn:(t,o)=>{sNoise('lowpass',900,140,.8,t,.35,.9,o);sOsc('sine',95,32,t,.45,.8,o);}},
  mortar:{gap:120,big:1,dur:.6,fn:(t,o)=>{sOsc('sine',75,28,t,.4,.7,o);sNoise('lowpass',420,120,.7,t,.25,.5,o);sOsc('triangle',900,300,t+.05,.2,.08,o);}},
  boom:{gap:90,big:1,dur:1.1,fn:(t,o)=>{sNoise('lowpass',1400,90,.7,t,.8,1,o);sOsc('sine',60,24,t,.7,.9,o);}},
  death:{gap:90,dur:.3,fn:(t,o)=>{sOsc('triangle',330,110,t,.22,.18,o);sNoise('bandpass',700,300,1,t,.12,.12,o);}},
  dig:{gap:160,dur:.15,fn:(t,o)=>{sNoise('bandpass',500+Math.random()*350,260,1.6,t,.08,.28,o);}},
  hammer:{gap:200,dur:.15,fn:(t,o)=>{sOsc('square',1150,820,t,.05,.1,o);sNoise('highpass',2500,2500,1,t,.04,.2,o);}},
  done:{gap:100,dur:.4,fn:(t,o)=>{sOsc('sine',520,520,t,.14,.12,o);sOsc('sine',780,780,t+.1,.2,.12,o);}},
  heli:{gap:1500,dur:1.9,fn:(t,o)=>{
    const c=SFX.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();
    s.buffer=SFX.noise;s.loop=true;f.type='bandpass';f.frequency.value=260;f.Q.value=.9;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+.5);g.gain.linearRampToValueAtTime(0,t+1.8);
    l.frequency.value=17;lg.gain.value=.4;l.connect(lg);lg.connect(g.gain);
    s.connect(f);f.connect(g);g.connect(o);s.start(t);s.stop(t+1.9);l.start(t);l.stop(t+1.9);}}
};
function sfxGain(x,y,big){
  if(x===undefined||!cam)return 1;
  const [sx,sy]=toS(x,y),m=big?520:90;
  if(sx<-m||sx>W+m||sy<-m||sy>H+m)return 0;
  const d=Math.hypot(sx-W/2,sy-H/2)/(Math.hypot(W,H)/2);
  return clamp(1-d*.55,big?.18:.3,1);
}
function sfx(name,x,y){
  const c=SFX.ctx,d=SFXDEF[name];
  if(!c||!d||!SFX.on||c.state!=='running'||SFX.voices>26)return;
  const now=performance.now();if(now-(SFX.last[name]||0)<d.gap)return;
  const g=d.ui?1:sfxGain(x,y,d.big);if(g<=.01)return;
  SFX.last[name]=now;
  const out=c.createGain();out.gain.value=g;out.connect(SFX.master);
  SFX.voices++;setTimeout(()=>{SFX.voices--;try{out.disconnect();}catch(e){}},(d.dur+.15)*1000);
  try{d.fn(c.currentTime+.005,out);}catch(e){}
}
function toggleSfx(){
  sfxInit();SFX.on=!SFX.on;const b=$('bSfx');if(b){b.textContent=SFX.on?'🔊':'🔇';b.classList.toggle('on',SFX.on);}
  toast(SFX.on?'효과음 켜짐':'효과음 꺼짐');
}
window.addEventListener('pointerdown',sfxInit,true);window.addEventListener('keydown',sfxInit,true);
document.addEventListener('pointerover',e=>{
  const b=e.target.closest&&e.target.closest('button,select');
  if(b&&!b.disabled){if(b!==SFX.hov){SFX.hov=b;sfx('hover');}}else SFX.hov=null;
});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button,select'))sfx('click');},true);

// ---- 목적지 표시: 도착할 때까지 타일 경계에 효과 ----
function addMark(tx,ty,ents,lay){
  if(!G)return;
  const act=ents.filter(e=>e&&!e.dead&&(e.state==='move'||e.after));
  if(!act.length)return;
  const m={x:tx,y:ty,lay:lay|0,t0:performance.now(),done:0};
  for(const e of act)e.mark=m;
  m.ents=act;G.marks=(G.marks||[]).filter(k=>k.ents.some(e=>e.mark===k&&!e.dead));G.marks.push(m);
  sfx('order');
}
const _orderMove=orderMove;
orderMove=function(units,tx,ty){_orderMove(units,tx,ty);if(units.length&&units[0].team===0)addMark(tx,ty,units,0);};
const _orderMoveL=orderMoveL;
orderMoveL=function(units,tx,ty,lay){const r=_orderMoveL(units,tx,ty,lay);if(units.length&&units[0].team===0)addMark(tx,ty,units,lay);return r;};
const _orderVehicles=orderVehicles;
orderVehicles=function(list,tx,ty){_orderVehicles(list,tx,ty);if(list.length&&list[0].team===0)addMark(tx,ty,list,0);};
function drawMarks(x0,y0,x1,y1){
  if(!G||!G.marks||!G.marks.length)return;
  const now=performance.now(),z=cam.z;
  G.marks=G.marks.filter(m=>{
    const alive=m.ents.some(e=>e.mark===m&&!e.dead&&(e.state==='move'||e.after));
    if(!alive&&!m.done)m.done=now;
    return !m.done||now-m.done<350;
  });
  for(const m of G.marks){
    if(m.lay!==viewLay||m.x<x0-1||m.x>x1+1||m.y<y0-1||m.y>y1+1)continue;
    const age=(now-m.t0)/1000,fade=m.done?1-(now-m.done)/350:1,pulse=.5+.5*Math.sin(age*5);
    cx.save();cx.globalAlpha=Math.max(0,fade);
    tileDia(m.x,m.y,.04);cx.fillStyle='rgba(125,255,125,'+(.1+.1*pulse).toFixed(3)+')';cx.fill();
    cx.strokeStyle='#8dff8d';cx.lineWidth=Math.max(1.4,2.2*z);cx.setLineDash([7*z,5*z]);cx.lineDashOffset=-age*22*z;cx.stroke();cx.setLineDash([]);
    const ph=(age*1.3)%1;tileDia(m.x,m.y,.04-ph*.5);cx.globalAlpha=Math.max(0,fade)*(1-ph)*.8;cx.strokeStyle='#d6ffd6';cx.lineWidth=Math.max(1,1.6*z);cx.stroke();
    cx.restore();
  }
}
