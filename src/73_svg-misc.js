// ================= 광석 · 동굴 입구 · 수직갱 뚜껑 · 투척물 드롭 → SVG 에셋 =================
// 절차적 그리기(drawOre 등)는 이제 에셋을 굽는 용도로만 쓰고(REC), 게임 안에서는 assets/sprites/*.svg 를 찍는다.
// 굽기: node tools/bake-misc.js  (비파괴 — 기존 에셋은 지우지 않는다)
const _doBase=drawOre;
function oreVar(x,y,k){return k===3?(hsh(x*3.1,y*1.3)>.5?0:1):((hsh(x*1.3,y*.7)*3)|0)%3;}
drawOre=function(x,y,i){
  if(REC)return _doBase(x,y,i);
  const k=G.ore[i],e=sprGetX('ore|'+k+'|'+oreVar(x,y,k));if(!sprOk(e))return;
  const z=cam.z,[sx,sy]=toS(x,y);sprBlit(e,sx,sy,z,true);
  const t=G.tasks.get(tkey('mine',i));
  if(t&&t.prog>0){const by=sy+16*z;cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(sx-12*z,by-30*z,24*z,4);cx.fillStyle='#d9ad4e';cx.fillRect(sx-12*z,by-30*z,24*z*(t.prog/t.work),4);}
};
const _dmBase=drawMouth;
drawMouth=function(x,y){if(REC)return _dmBase(x,y);const e=sprGetX('mouth|0');if(!sprOk(e))return;const [sx,sy]=toS(x+.5,y+.5);sprBlit(e,sx,sy,cam.z,true);};
const _dhBase=drawShaftHatch;
drawShaftHatch=function(x,y){if(REC)return _dhBase(x,y);const e=sprGetX('hatch|0');if(!sprOk(e))return;const [sx,sy]=toS(x+.5,y+.5);sprBlit(e,sx,sy,cam.z,true);};
function dropExpDraw(sx,sy,z,k){const col=EXP[k].col;
  cx.fillStyle='#2a2a24';cx.fillRect(sx-2.4*z,sy-7*z,4.8*z,6*z);cx.fillStyle=col;cx.fillRect(sx-2.4*z,sy-4.6*z,4.8*z,2.4*z);
  cx.fillStyle=k==='molotov'?'#ffb84a':'#bbb';cx.fillRect(sx-1*z,sy-9.5*z,2*z,2.6*z);}
function sprBakeMisc(){
  const o={},put=(k,fn,wx,wy)=>{const s=sprRecord(fn,wx,wy);if(s)o[k]=s;};
  const bake=(i0,kind,v,wx,wy)=>{const i=i0;const so=G.ore[i];G.ore[i]=kind;try{put('ore|'+kind+'|'+v,()=>_doBase(wx,wy,i),wx,wy);}finally{G.ore[i]=so;}};
  for(const kind of [1,2,3])for(let v=0;v<(kind===3?2:3);v++){
    let fx=0,fy=0;for(let a=8;a<60&&!fx;a++)for(let b=8;b<60;b++)if(oreVar(a,b,kind)===v){fx=a;fy=b;break;}
    bake(fy*G.w+fx,kind,v,fx,fy);
  }
  put('mouth|0',()=>_dmBase(10,10),10.5,10.5);
  put('hatch|0',()=>_dhBase(10,10),10.5,10.5);
  for(const k of EXPK)put('dropx|'+k,()=>dropExpDraw(0,0,1,k),0,0);
  return o;
}
