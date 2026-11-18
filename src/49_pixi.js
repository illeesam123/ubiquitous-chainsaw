// ================= PixiJS(WebGL) 일괄 그리기 =================
// 엔티티 층(병사·차량·건물·나무·깃발·가림 타일)의 drawImage 를 가로채 '아틀라스 페이지 + Pixi 스프라이트'로 한 번에 그린다.
//  - 바닥·날씨·FX·UI 는 기존 Canvas 2D 그대로. 엔티티 층만 WebGL 로 그려 한 장의 캔버스로 합성한다(drawImage 1회).
//  - 아틀라스: 스프라이트가 처음 쓰일 때 1024² 페이지에 선반(shelf) 방식으로 채운다. 줌 구간이 바뀌어 가득 차면 다음 프레임 처음에 비운다.
//  - 좌우반전·기울임(깃발)·회전(총)·알파는 Pixi 변환으로 처리(반전 캔버스는 더 이상 필요 없음).
//  - 참호 안 병사처럼 clip() 으로 잘리는 그림은 스프라이트의 그림 영역(UV)을 잘라 같은 결과를 낸다.
//  - 순서가 중요한 벡터 그림(그림자·덤불·지붕·민간인)은 비트맵으로 구워 아틀라스에 넣고, 체력바·선택링·글자 등은 맨 위 벡터 층에 그린다.
//  - 실패하거나 WebGL 이 없으면 자동으로 기존 Canvas 경로로 돌아간다. 항상 켜져 있다(맵 로딩 때 청크·스프라이트를 미리 만들어 둔다).
const GL={on:true,ready:false,fail:'',app:null,cv:null,pool:[],n:0,pages:[],ents:new WeakMap(),tc:new Map(),bakes:new Map(),epoch:0,needReset:false,
  active:false,real:null,v:null,vcv:null,M:[1,0,0,1,0,0],alpha:1,clip:null,lastRect:null,stack:[],w:0,h:0,dpr:0,
  stat:{spr:0,pages:0,uploads:0,crops:0,skipped:0,ms:0},PAGE:2048,MAXP:6,shadow:null};
(async function(){
  try{
    if(typeof PIXI==='undefined')throw new Error('PIXI 없음');
    const t=document.createElement('canvas'),gl=t.getContext('webgl2')||t.getContext('webgl');if(!gl)throw new Error('WebGL 없음');
    try{const di=gl.getExtension('WEBGL_debug_renderer_info'),r=di?String(gl.getParameter(di.UNMASKED_RENDERER_WEBGL)):'';GL.gpu=r;
    }catch(e){}
    GL.cv=document.createElement('canvas');
    const app=new PIXI.Application();
    await app.init({canvas:GL.cv,width:Math.max(1,W||800),height:Math.max(1,H||600),resolution:DPR||1,autoDensity:false,backgroundAlpha:0,antialias:false,preference:'webgl',autoStart:false,sharedTicker:false,powerPreference:'high-performance'});
    try{app.ticker.stop();}catch(e){}
    GL.app=app;GL.mat=new PIXI.Matrix();GL.vcv=document.createElement('canvas');GL.v=GL.vcv.getContext('2d');
    GL.ready=true;glSync();
  }catch(e){GL.fail=String(e&&e.message||e);console.warn('[GL] 사용 불가 → Canvas 경로:',GL.fail);glSync();}
})();
function glSync(){}

// ---- 아틀라스 ----
function glPageNew(w,h){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const tex=PIXI.Texture.from(cv);tex.source.scaleMode='linear';
  const p={cv,g:cv.getContext('2d'),tex,rows:[],y:0,w,h,dirty:true,solo:false};GL.pages.push(p);GL.stat.pages=GL.pages.length;return p;
}
function glPack(w,h){
  const P=GL.PAGE,pad=2,W2=w+pad*2,H2=h+pad*2;
  if(W2>P||H2>P){const p=glPageNew(W2,H2);p.solo=true;return {p,x:pad,y:pad};}
  for(const p of GL.pages){
    if(p.solo)continue;
    for(const r of p.rows)if(r.h>=H2&&r.h<=H2*1.6&&r.x+W2<=p.w){const x=r.x;r.x+=W2;return {p,x:x+pad,y:r.y+pad};}
    if(p.y+H2<=p.h){const r={y:p.y,h:H2,x:W2};p.rows.push(r);p.y+=H2;return {p,x:pad,y:r.y+pad};}
  }
  if(GL.pages.filter(p=>!p.solo).length>=GL.MAXP)GL.needReset=true;      // 가득 참: 이번 프레임은 계속 쓰고 다음 프레임 처음에 비운다
  const p=glPageNew(P,P);const r={y:0,h:H2,x:W2};p.rows.push(r);p.y=H2;return {p,x:pad,y:pad};
}
function glEnt(src){
  const ver=src._v||0;let e=GL.ents.get(src);
  if(e&&e.ver===ver)return e;
  const w=src.width,h=src.height;if(!(w>0&&h>0))return null;
  const s=glPack(w,h);s.p.g.clearRect(s.x-1,s.y-1,w+2,h+2);s.p.g.drawImage(src,s.x,s.y);s.p.dirty=true;
  e={p:s.p,x:s.x,y:s.y,w,h,ver,id:(GL.eid=(GL.eid||0)+1),tex:null};GL.ents.set(src,e);return e;
}
function glTex(e,sx,sy,sw,sh){
  if(sx===0&&sy===0&&sw===e.w&&sh===e.h){return e.tex||(e.tex=new PIXI.Texture({source:e.p.tex.source,frame:new PIXI.Rectangle(e.x,e.y,e.w,e.h)}));}
  const k=e.id+'|'+sx+'|'+sy+'|'+sw+'|'+sh;let t=GL.tc.get(k);
  if(!t){if(GL.tc.size>5000)GL.tc.clear();t=new PIXI.Texture({source:e.p.tex.source,frame:new PIXI.Rectangle(e.x+sx,e.y+sy,sw,sh)});GL.tc.set(k,t);}
  return t;
}
function glReset(){
  for(const p of GL.pages){try{p.tex.destroy(true);}catch(e){}}
  GL.pages=[];GL.ents=new WeakMap();GL.tc.clear();GL.bakes.clear();GL.epoch++;GL.needReset=false;GL.shadow=null;GL.stat.pages=0;
  for(const s of GL.pool){s.visible=false;s.texture=PIXI.Texture.EMPTY;}
}

// ---- 스프라이트 풀 ----
function glSprite(src,sx,sy,sw,sh,dx,dy,dw,dh){
  const M=GL.M;
  if(GL.clip){
    const c=GL.clip;
    if(Math.abs(M[1])<1e-6&&Math.abs(M[2])<1e-6&&M[0]&&M[3]){                  // 축 정렬: UV 를 잘라 clip 과 같은 모양으로
      const X0=M[0]*dx+M[4],X1=M[0]*(dx+dw)+M[4],Y0=M[3]*dy+M[5],Y1=M[3]*(dy+dh)+M[5];
      const lx0=Math.min(X0,X1),lx1=Math.max(X0,X1),ly0=Math.min(Y0,Y1),ly1=Math.max(Y0,Y1);
      const ix0=Math.max(lx0,c.x0),iy0=Math.max(ly0,c.y0),ix1=Math.min(lx1,c.x1),iy1=Math.min(ly1,c.y1);
      if(ix1<=ix0||iy1<=iy0){GL.stat.skipped++;return;}
      if(ix0>lx0+.01||iy0>ly0+.01||ix1<lx1-.01||iy1<ly1-.01){
        const a=(ix0-M[4])/M[0],b=(ix1-M[4])/M[0],c2=(iy0-M[5])/M[3],d=(iy1-M[5])/M[3];
        const lo=Math.min(a,b),hi=Math.max(a,b),lo2=Math.min(c2,d),hi2=Math.max(c2,d);
        const fx0=(lo-dx)/dw,fx1=(hi-dx)/dw,fy0=(lo2-dy)/dh,fy1=(hi2-dy)/dh;
        const nsx=Math.round(sx+fx0*sw),nsy=Math.round(sy+fy0*sh),nex=Math.round(sx+fx1*sw),ney=Math.round(sy+fy1*sh);
        if(nex<=nsx||ney<=nsy){GL.stat.skipped++;return;}
        const kx=dw/sw,ky=dh/sh;dx=dx+(nsx-sx)*kx;dy=dy+(nsy-sy)*ky;dw=(nex-nsx)*kx;dh=(ney-nsy)*ky;sx=nsx;sy=nsy;sw=nex-nsx;sh=ney-nsy;GL.stat.crops++;
      }
    }
  }
  const e=glEnt(src);if(!e)return;
  sx=Math.max(0,Math.min(e.w-1,Math.round(sx)));sy=Math.max(0,Math.min(e.h-1,Math.round(sy)));
  sw=Math.max(1,Math.min(e.w-sx,Math.round(sw)));sh=Math.max(1,Math.min(e.h-sy,Math.round(sh)));
  const tex=glTex(e,sx,sy,sw,sh);
  let sp=GL.pool[GL.n];
  if(!sp){sp=new PIXI.Sprite(tex);GL.app.stage.addChild(sp);GL.pool.push(sp);}
  GL.n++;sp.texture=tex;sp.visible=true;sp.alpha=GL.alpha;
  const kx=dw/sw,ky=dh/sh;
  sp.setFromMatrix(GL.mat.set(M[0]*kx,M[1]*kx,M[2]*ky,M[3]*ky,M[0]*dx+M[2]*dy+M[4],M[1]*dx+M[3]*dy+M[5]));
}
// ---- Canvas2D 호환 껍데기: 엔티티 그리기 코드는 이 객체를 cx 로 받는다 ----
const GLB={};
const GLM={
  save(){GL.stack.push([GL.M.slice(),GL.alpha,GL.clip]);GL.v.save();},
  restore(){const s=GL.stack.pop();if(s){GL.M=s[0];GL.alpha=s[1];GL.clip=s[2];}GL.v.restore();},
  translate(x,y){const M=GL.M;M[4]+=M[0]*x+M[2]*y;M[5]+=M[1]*x+M[3]*y;GL.v.translate(x,y);},
  scale(x,y){const M=GL.M;M[0]*=x;M[1]*=x;M[2]*=y;M[3]*=y;GL.v.scale(x,y);},
  rotate(a){const M=GL.M,c=Math.cos(a),s=Math.sin(a),a0=M[0],b0=M[1],c0=M[2],d0=M[3];M[0]=a0*c+c0*s;M[1]=b0*c+d0*s;M[2]=-a0*s+c0*c;M[3]=-b0*s+d0*c;GL.v.rotate(a);},
  transform(a,b,c,d,e,f){const M=GL.M,a0=M[0],b0=M[1],c0=M[2],d0=M[3];M[0]=a0*a+c0*b;M[1]=b0*a+d0*b;M[2]=a0*c+c0*d;M[3]=b0*c+d0*d;M[4]+=a0*e+c0*f;M[5]+=b0*e+d0*f;GL.v.transform(a,b,c,d,e,f);},
  setTransform(a,b,c,d,e,f){GL.M=[a,b,c,d,e,f];GL.v.setTransform(a,b,c,d,e,f);},
  beginPath(){GL.lastRect=null;GL.v.beginPath();},
  rect(x,y,w,h){const M=GL.M;GL.lastRect=(Math.abs(M[1])<1e-6&&Math.abs(M[2])<1e-6)?{x0:Math.min(M[0]*x+M[4],M[0]*(x+w)+M[4]),x1:Math.max(M[0]*x+M[4],M[0]*(x+w)+M[4]),y0:Math.min(M[3]*y+M[5],M[3]*(y+h)+M[5]),y1:Math.max(M[3]*y+M[5],M[3]*(y+h)+M[5])}:null;GL.v.rect(x,y,w,h);},
  clip(){
    const r=GL.lastRect;
    if(r){const c=GL.clip;GL.clip=c?{x0:Math.max(c.x0,r.x0),y0:Math.max(c.y0,r.y0),x1:Math.min(c.x1,r.x1),y1:Math.min(c.y1,r.y1)}:r;}
    GL.v.clip.apply(GL.v,arguments);
  },
  drawImage(src,a1,a2,a3,a4,a5,a6,a7,a8){
    if(!(src instanceof HTMLCanvasElement)){return GL.v.drawImage.apply(GL.v,arguments);}
    const n=arguments.length;
    if(n<=3)glSprite(src,0,0,src.width,src.height,a1,a2,src.width,src.height);
    else if(n<=5)glSprite(src,0,0,src.width,src.height,a1,a2,a3,a4);
    else glSprite(src,a1,a2,a3,a4,a5,a6,a7,a8);
  },
};
const GLX=new Proxy({},{
  get(_,p){
    const f=GLM[p];if(f)return f;
    if(p==='globalAlpha')return GL.alpha;
    const v=GL.v,val=v[p];
    if(typeof val==='function')return GLB[p]||(GLB[p]=(...a)=>GL.v[p](...a));
    return val;
  },
  set(_,p,val){if(p==='globalAlpha')GL.alpha=val;GL.v[p]=val;return true;}
});
function glResize(){
  if(GL.w===W&&GL.h===H&&GL.dpr===DPR)return;
  GL.w=W;GL.h=H;GL.dpr=DPR;GL.app.renderer.resize(Math.max(1,W),Math.max(1,H),DPR);
  GL.vcv.width=Math.max(1,Math.round(W*DPR));GL.vcv.height=Math.max(1,Math.round(H*DPR));
}
function glBegin(){
  if(!GL.ready||!GL.on||GL.active)return false;
  try{
    if(GL.needReset)glReset();
    glResize();GL.n=0;GL.stat.crops=0;GL.stat.skipped=0;
    GL.v.setTransform(1,0,0,1,0,0);GL.v.clearRect(0,0,GL.vcv.width,GL.vcv.height);GL.v.setTransform(DPR,0,0,DPR,0,0);
    GL.v.globalAlpha=1;GL.M=[1,0,0,1,0,0];GL.stack=[];GL.alpha=1;GL.clip=null;GL.lastRect=null;
    GL.real=cx;cx=GLX;GL.active=true;GL.t0=performance.now();return true;
  }catch(e){GL.fail=String(e&&e.message||e);GL.on=false;console.error('[GL] 시작 실패:',e);glSync();return false;}
}
function glEnd(){
  if(!GL.active)return;
  GL.active=false;cx=GL.real;
  try{
    for(const p of GL.pages)if(p.dirty){p.tex.source.update();p.dirty=false;GL.stat.uploads++;}
    for(let i=GL.n;i<GL.pool.length;i++){if(!GL.pool[i].visible)break;GL.pool[i].visible=false;}
    GL.stat.spr=GL.n;
    GL.app.renderer.render({container:GL.app.stage});
    cx.drawImage(GL.cv,0,0,W,H);
    cx.drawImage(GL.vcv,0,0,W,H);
    GL.stat.ms=performance.now()-GL.t0;
  }catch(e){GL.fail=String(e&&e.message||e);GL.on=false;console.error('[GL] 그리기 실패 → Canvas 경로:',e);glSync();}
}
// ---- 구워서 쓰기: 줌 구간마다 한 번 그려 캔버스에 담아 두고(아틀라스에 들어감) 위치만 옮겨 찍는다 ----
function glBake(key,zb,w,h,ox,oy,wx,wy,fn){
  let c=GL.bakes.get(key);if(c)return c;
  if(GL.bakes.size>4000)GL.bakes.clear();
  c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));
  const real=cx,sv={x:cam.x,y:cam.y,z:cam.z},sk=ELK;
  const rp=rotXY(wx,wy);cx=c.getContext('2d');cx.setTransform(1,0,0,1,0,0);cam.z=zb;cam.x=ox-(rp[0]-rp[1])*32*zb;cam.y=oy-(rp[0]+rp[1])*16*zb;ELK=0;
  try{fn();}finally{cx=real;cam.x=sv.x;cam.y=sv.y;cam.z=sv.z;ELK=sk;}
  GL.bakes.set(key,c);return c;
}
function glPlace(c,sx,sy,ox,oy,z,zb){const k=z/zb;cx.drawImage(c,sx-ox*k,sy-oy*k,c.width*k,c.height*k);}
// 부드러운 그림자: 방사형 그라데이션 한 장을 늘려서 쓴다 (엔티티 층에서는 알파·크기만 바꿔 찍는다)
function shadowEll(sx,sy,rx,ry,a){
  if(!GL.active){cx.fillStyle=`rgba(0,0,0,${a})`;cx.beginPath();cx.ellipse(sx,sy,rx,ry,0,0,6.3);cx.fill();return;}
  if(!GL.shadow){const c=document.createElement('canvas');c.width=64;c.height=32;const g=c.getContext('2d');g.translate(32,16);g.scale(1,.5);
    const r=g.createRadialGradient(0,0,0,0,0,32);r.addColorStop(0,'rgba(0,0,0,1)');r.addColorStop(.55,'rgba(0,0,0,.85)');r.addColorStop(.85,'rgba(0,0,0,.35)');r.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=r;g.beginPath();g.arc(0,0,32,0,6.3);g.fill();GL.shadow=c;}
  const s=GL.alpha;GL.alpha=s*Math.min(1,a*1.25);glSprite(GL.shadow,0,0,64,32,sx-rx*1.18,sy-ry*1.18,rx*2.36,ry*2.36);GL.alpha=s;
}
// 덤불 · 지붕 · 민간인: 벡터로 그리던 것을 구워서 순서대로 찍는다
const _glBush=drawBush;
drawBush=function(x,y){
  if(!GL.active)return _glBush(x,y);
  const z=cam.z,zb=sprBkt(z),[sx,sy]=toS(x+.5,y+.5),ox=34*zb,oy=40*zb;
  const c=glBake('bush|'+x+'|'+y+'|'+zb+'|'+VROT,zb,68*zb,56*zb,ox,oy,x+.5,y+.5,()=>_glBush(x,y));
  glPlace(c,sx,sy,ox,oy,z,zb);
};
const _glRoof=drawRoof;
drawRoof=function(i){
  if(!GL.active)return _glRoof(i);
  const w=G.w,x=i%w,y=(i/w)|0,z=cam.z,zb=sprBkt(z),[sx,sy]=toS(x+.5,y+.5),ox=40*zb,oy=56*zb;
  const c=glBake('roof|'+i+'|'+(G.up[i]===3?1:0)+'|'+zb+'|'+VROT,zb,80*zb,88*zb,ox,oy,x+.5,y+.5,()=>_glRoof(i));
  glPlace(c,sx,sy,ox,oy,z,zb);
};
const _glCiv=drawCiv;
drawCiv=function(c){
  if(!GL.active)return _glCiv(c);
  const z=cam.z,zb=sprBkt(z),[sx,sy]=toS(c.x,c.y),ox=36*zb,oy=60*zb;
  const swS=Math.round(Math.sin(c.anim*9)*2),fq=Math.round((vFace(c.face||0)/(Math.PI/4)))&7,mv=(c.mode==='wander'&&c.moving)||c.mode==='flee'||c.mode==='melee'||c.mode==='shoot';
  const key=['civ',c.variant||0,c.mode,mv?swS:9,c.flash>0?1:0,c.armed?1:0,c.armed?fq:0,c.muz>0?1:0,zb,VROT].join('|');
  const fk=Object.assign({},c,{x:10,y:10,hp:1,max:1,anim:mv?Math.asin(Math.max(-1,Math.min(1,swS/2)))/9:0,face:fq*Math.PI/4});
  const cv2=glBake(key,zb,72*zb,76*zb,ox,oy,10,10,()=>_glCiv(fk));
  glPlace(cv2,sx,sy,ox,oy,z,zb);
  if(c.hp<c.max)hpBar(sx,sy-30*z,22*z,Math.max(0,c.hp/c.max),'#d0583f');
};
window.__GL=GL;
