// ================= 효과 · 사다리 · 폭약 · 포탄 → SVG 에셋 =================
// 폭발/연기/먼지/불꽃은 진행도(0~1)를 프레임으로 나눠 구운 SVG 를 순서대로 찍는다. 굽기: node tools/bake-fx.js
const FXN={boom:10,smoke:8,dust:6,spark:6},FXDUST=['def','demo','heal'];
const _fbBase=drawFxBoom,_fsBase=drawFxSmoke;
const fxFrame=(k,p)=>Math.max(0,Math.min(FXN[k]-1,Math.floor(p*FXN[k])));
function dustDraw(p,kind){cx.globalAlpha=1-p;cx.fillStyle=kind==='demo'?'#b0a080':kind==='heal'?'#a8d8a0':'#6a5234';cx.beginPath();cx.arc(0,-p*18,3,0,6.3);cx.fill();cx.globalAlpha=1;}
function sparkDraw(p){cx.fillStyle='#ffe29a';cx.beginPath();cx.arc(0,-10,Math.max(.4,4*(1-p)),0,6.3);cx.fill();}
function shellDraw(){cx.fillStyle='#27251d';cx.beginPath();cx.arc(0,0,3.2,0,6.3);cx.fill();cx.fillStyle='rgba(255,190,90,.7)';cx.beginPath();cx.arc(-1,-1,1.2,0,6.3);cx.fill();}
drawFxBoom=function(f){
  if(REC)return _fbBase(f);
  const e=sprGetX('fx|boom|'+fxFrame('boom',f.t/f.d));if(!sprOk(e))return;
  const [a,b]=toS(f.x,f.y);sprBlit(e,a,b,cam.z,false);
};
drawFxSmoke=function(f){
  if(REC)return _fsBase(f);
  const e=sprGetX('fx|smoke|'+fxFrame('smoke',f.t/f.d));if(!sprOk(e))return;
  const [a,b]=toS(f.x,f.y);sprBlit(e,a+Math.sin(f.t*3+f.x)*3*cam.z,b,cam.z,false);
};
function drawFxDust(f){const e=sprGetX('fx|dust|'+(f.kind==='demo'||f.kind==='heal'?f.kind:'def')+'|'+fxFrame('dust',f.t/f.d));if(!sprOk(e))return;const [a,b]=toS(f.x,f.y);sprBlit(e,a+Math.sin(f.t*40)*8*cam.z,b,cam.z,false);}
function drawFxSpark(f){const e=sprGetX('fx|spark|'+fxFrame('spark',f.t/f.d));if(!sprOk(e))return;const [a,b]=toS(f.x,f.y);sprBlit(e,a,b,cam.z,false);}
function drawShellSpr(sx,sy){const e=sprGetX('fx|shell|0');if(sprOk(e))sprBlit(e,sx,sy,cam.z,false);}
// ---- 폭약(철거 장치): 꺼짐/점등 ----
function chargeDraw(on,fuse){
  cx.fillStyle='#3b4730';cx.fillRect(-3.5,-5,7,9);cx.fillStyle='#d4b13c';cx.fillRect(-3.5,-1.5,7,2);
  cx.strokeStyle='#1c2216';cx.lineWidth=.8;cx.strokeRect(-3.5,-5,7,9);
  cx.fillStyle=on?'#ff3b30':'#5a1410';cx.beginPath();cx.arc(0,-3.2,1.5,0,6.3);cx.fill();
  if(on&&fuse){cx.fillStyle='rgba(255,60,40,.25)';cx.beginPath();cx.arc(0,-3.2,5,0,6.3);cx.fill();}
}
function drawChargeSpr(px,py,on,fuse){const e=sprGetX('charge|'+(on?(fuse?2:1):0));if(sprOk(e))sprBlit(e,px,py,cam.z,false);}
// ---- 사다리: 방향 4 × 높이차 1~10 ----
const _dlBase=drawLadder,LADD=[[1,0],[-1,0],[0,1],[0,-1]],LADH=10;
drawLadder=function(lo,hi){
  if(REC)return _dlBase(lo,hi);
  const w=G.w,x=lo%w,y=(lo/w)|0,hx=hi%w,hy=(hi/w)|0;let dx=hx-x,dy=hy-y;
  if(VROT){const a=rotXY(x,y),b=rotXY(hx,hy);dx=Math.round(b[0]-a[0]);dy=Math.round(b[1]-a[1]);}
  const di=LADD.findIndex(d=>d[0]===dx&&d[1]===dy);if(di<0)return;
  const d=Math.max(1,Math.min(LADH,Math.round(G.lv[hi]-G.lv[lo]))),e=sprGetX('ladder|'+di+'|'+d);if(!sprOk(e))return;
  const [sx,sy]=rawS(x+.5,y+.5,G.lv[lo]);sprBlit(e,sx,sy,cam.z,false);
};
function sprBakeFx(){
  const o={},put=(k,fn)=>{const s=sprRecord(fn,10,10);if(s)o[k]=s;};
  for(let n=0;n<FXN.boom;n++)put('fx|boom|'+n,()=>_fbBase({x:10,y:10,t:(n+.5)/FXN.boom,d:1}));
  for(let n=0;n<FXN.smoke;n++)put('fx|smoke|'+n,()=>_fsBase({x:10,y:10,t:(n+.5)/FXN.smoke,d:1}));
  for(const k of FXDUST)for(let n=0;n<FXN.dust;n++)put('fx|dust|'+k+'|'+n,()=>dustDraw((n+.5)/FXN.dust,k));
  for(let n=0;n<FXN.spark;n++)put('fx|spark|'+n,()=>sparkDraw((n+.5)/FXN.spark));
  put('fx|shell|0',shellDraw);
  for(let m=0;m<3;m++)put('charge|'+m,()=>chargeDraw(m>0,m===2));
  const lo=10*G.w+10,sv=[G.lv[lo]];
  for(let di=0;di<4;di++){const hi=(10+LADD[di][1])*G.w+10+LADD[di][0],sh=G.lv[hi];
    for(let d=1;d<=LADH;d++){G.lv[lo]=GROUND_LV;G.lv[hi]=GROUND_LV+d;put('ladder|'+di+'|'+d,()=>_dlBase(lo,hi));}
    G.lv[hi]=sh;}
  G.lv[lo]=sv[0];
  return o;
}
