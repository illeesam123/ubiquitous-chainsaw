// ================= 건물 · 장애물 벡터(SVG) 스프라이트 =================
// 기존의 절차적 그리기 코드(drawObFull)를 캔버스 대신 SVG 기록기(SvgRec)에 실행해
// 종류·변형별로 벡터 이미지(SVG)를 한 번만 만들고, 이후에는 이미지로 찍어 낸다.
// - 줌 단계(버킷)별로 SVG를 선명하게 래스터화해 캐시 → 매 프레임 수십 개의 path 대신 drawImage 1회
// - 병사가 들어 있거나(occ), 피격 점멸, 박격포 발사 등 동적 상태는 기존 절차적 그리기로 폴백
// - 체력바·무기고 재고 글자는 스프라이트에 굽지 않고 매 프레임 위에 덧그림
let REC=false;
class SvgRec{
  constructor(){this.out=[];this.d='';this.cur=null;this.fillStyle='#000';this.strokeStyle='#000';this.lineWidth=1;this.globalAlpha=1;this.lineCap='butt';this.dash=null;this.font='';this.textAlign='start';
    this.x0=1e9;this.y0=1e9;this.x1=-1e9;this.y1=-1e9;this.n=0;}
  _b(x,y,p){p=p||0;if(x-p<this.x0)this.x0=x-p;if(y-p<this.y0)this.y0=y-p;if(x+p>this.x1)this.x1=x+p;if(y+p>this.y1)this.y1=y+p;}
  beginPath(){this.d='';this.cur=null;}
  moveTo(x,y){this.d+=`M${f(x)} ${f(y)}`;this.cur=[x,y];this._b(x,y,this.lineWidth);}
  lineTo(x,y){if(!this.cur)return this.moveTo(x,y);this.d+=`L${f(x)} ${f(y)}`;this.cur=[x,y];this._b(x,y,this.lineWidth);}
  quadraticCurveTo(cx_,cy_,x,y){this.d+=`Q${f(cx_)} ${f(cy_)} ${f(x)} ${f(y)}`;this.cur=[x,y];this._b(cx_,cy_,this.lineWidth);this._b(x,y,this.lineWidth);}
  closePath(){this.d+='Z';}
  arc(x,y,r,a0,a1){this.ellipse(x,y,r,r,0,a0,a1);}
  ellipse(x,y,rx,ry,rot,a0,a1){
    const pe=(a)=>{const ca=Math.cos(rot),sa=Math.sin(rot),px=Math.cos(a)*rx,py=Math.sin(a)*ry;return [x+px*ca-py*sa,y+px*sa+py*ca];};
    const deg=rot*180/Math.PI,full=Math.abs(a1-a0)>=6.28;
    this._b(x,y,Math.max(rx,ry)+this.lineWidth);
    if(full){const p0=pe(a0),p1=pe(a0+Math.PI);this.d+=`${this.cur?'L':'M'}${f(p0[0])} ${f(p0[1])}A${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${f(p1[0])} ${f(p1[1])}A${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${f(p0[0])} ${f(p0[1])}`;this.cur=p0;return;}
    const p0=pe(a0),p1=pe(a1),large=Math.abs(a1-a0)>Math.PI?1:0;
    this.d+=`${this.cur?'L':'M'}${f(p0[0])} ${f(p0[1])}A${f(rx)} ${f(ry)} ${f(deg)} ${large} 1 ${f(p1[0])} ${f(p1[1])}`;this.cur=p1;
  }
  _op(){return this.globalAlpha<1?` opacity="${f(this.globalAlpha)}"`:'';}
  fill(){if(!this.d)return;this.out.push(`<path d="${this.d}" fill="${this.fillStyle}"${this._op()}/>`);}
  stroke(){if(!this.d)return;this.out.push(`<path d="${this.d}" fill="none" stroke="${this.strokeStyle}" stroke-width="${f(this.lineWidth)}"${this.dash?` stroke-dasharray="${this.dash.map(f).join(' ')}"`:''}${this.lineCap!=='butt'?` stroke-linecap="${this.lineCap}"`:''}${this._op()}/>`);}
  fillRect(x,y,w,h){this._b(x,y);this._b(x+w,y+h);this.out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${this.fillStyle}"${this._op()}/>`);}
  strokeRect(x,y,w,h){this._b(x,y,this.lineWidth);this._b(x+w,y+h,this.lineWidth);this.out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="${this.strokeStyle}" stroke-width="${f(this.lineWidth)}"${this._op()}/>`);}
  setLineDash(a){this.dash=a&&a.length?a:null;}
  save(){}restore(){}clip(){}fillText(){}
  svg(){
    const pad=1,x=Math.floor(this.x0)-pad,y=Math.floor(this.y0)-pad,w=Math.ceil(this.x1-this.x0)+pad*2+1,h=Math.ceil(this.y1-this.y0)+pad*2+1;
    return {x,y,w,h,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${sprBounds(x,y,w,h)}${this.out.join('')}</svg>`};
  }
}
// 이미지 전체 가장자리에 딱 맞는 투명 사각형: 편집기·미리보기에서 그림 영역(경계)이 항상 같은 크기로 보이게 한다
function sprBounds(x,y,w,h){return `<rect id="bounds" x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" fill-opacity="0"/>`;}
function f(v){return Math.round(v*100)/100;}
const SPR={files:0,map:new Map(),buckets:[.36,.5,.7,1,1.25,1.5,2,3],bakes:0,hits:0,miss:0,on:true};
const SPR_TYPES=new Set(['tree','rock','house','apartment','warehouse','shed','ruin','rubble','rubble2','rubble3','fence','wire','sandbag','crate','bunker','tower','mg','medbay','armory']);
const SPR_LINEAR=new Set(['fence','wire','sandbag']);
const SPR_BIOME=new Set(['tree']);                       // 바이옴별 디자인이 의도된 종류 (그 외는 전부 'plain' 기본 디자인 하나만 사용)
const SPR_DMG=new Set(['house','apartment','warehouse','shed','ruin']); // 파손 단계가 그림에 반영되는 종류
const SPR_UNIFORM=new Set(['bunker','tower','mg','medbay','armory']); // 변형 없는 고정 디자인
const SPR_DIR='assets/sprites/';
function sprKey(o,biome){
  const t=o.type;
  if(o.fl>0||(o.occ&&(o.occ.size||o.occ.length))||o.muz>0)return null;
  if(!SPR_TYPES.has(t))return null;
  if(t==='medbay'&&o.patients&&o.patients.length)return null;
  const hp=SPR_DMG.has(t)&&o.hp<o.max?Math.min(4,Math.floor((1-o.hp/o.max)*5)):0;
  let nb='';
  if(SPR_LINEAR.has(t)||t==='rubble'||t==='rubble2'||t==='rubble3'){
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=o.x+dx,y=o.y+dy,q=inb(x,y)?G.obst[y*G.w+x]:null;nb+=q&&q.type===o.type?1:0;}
  }
  const stock=t==='armory'?Math.min(8,Math.ceil(armTotal(o)/3)):0;
  return [t,SPR_BIOME.has(t)?(biome||G.biome):'plain',o.size,SPR_UNIFORM.has(t)?0:(o.v*4)|0,SPR_UNIFORM.has(t)?0:o.id%4,hp,nb,o.natural?'n':o.team,o.from||'',stock].join('|');
}
function sprFile(key){return key.replace(/\|/g,'_').replace(/_+$/,'').replace(/[^\w.-]/g,'-')+'.svg';}
// 파일(매니페스트)에서 스프라이트 항목 만들기. 바이옴 전용 파일이 없으면 plain 기본 디자인으로 대체
function sprFromFile(key){
  const M=typeof SPRITE_MANIFEST!=='undefined'?SPRITE_MANIFEST:null;if(!M)return null;
  let m=M[key],use=key;
  if(!m){const k=key.split('|');if(k[1]!=='plain'){k[1]='plain';use=k.join('|');m=M[use];}}
  if(!m||!(m[3]>0&&m[4]>0))return null;
  const old=SPR.map.get(use);if(old)return old;
  const e={key:use,ready:false,fail:false,file:m[0],x:m[1],y:m[2],w:m[3],h:m[4],img:new Image(),bmp:{}};
  e.img.onload=()=>{e.ready=true;};e.img.onerror=()=>{e.fail=true;};sprSetSrc(e.img,m[0]);
  SPR.map.set(use,e);SPR.files++;return e;
}
function sprBake(o,key){
  const e={key,ready:false,fail:false,svg:null,img:null,bmp:{}};SPR.map.set(key,e);
  const hq=key.split('|')[5]|0;
  const px=Object.create(o);
  const uni=SPR_UNIFORM.has(o.type);px.occ=[];px.fl=0;px.muz=0;px.id=uni?0:o.id%4;px.v=uni?.5:(((o.v*4)|0)+.5)/4;
  px.hp=hq===0?o.max:o.max*(1-(hq+.5)/5);
  if(o.type==='armory')px.stock={smoke:Math.min(8,Math.ceil(armTotal(o)/3))*3,flash:0,molotov:0,frag:0};
  const rec=new SvgRec(),sv={cam:{x:cam.x,y:cam.y,z:cam.z},time:G.time,cx,rec:REC};
  const cxw=o.x+o.size/2,cyw=o.y+o.size/2;
  try{
    cam.z=1;cam.x=-(cxw-cyw)*32;cam.y=-(cxw+cyw)*16;G.time=0;cx=rec;REC=true;
    drawObFull(px);
  }catch(err){e.fail=true;}
  finally{cam.x=sv.cam.x;cam.y=sv.cam.y;cam.z=sv.cam.z;G.time=sv.time;cx=sv.cx;REC=sv.rec;}
  if(e.fail||!rec.out.length){e.fail=true;return e;}
  const r=rec.svg();e.x=r.x;e.y=r.y;e.w=r.w;e.h=r.h;e.svg=r.svg;
  const img=new Image();img.onload=()=>{e.ready=true;};img.onerror=()=>{e.fail=true;};
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(r.svg);e.img=img;SPR.bakes++;
  return e;
}
function sprRaster(e,b){
  let c=e.bmp[b];if(c)return c;
  c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(e.w*b));c.height=Math.max(1,Math.ceil(e.h*b));
  c.getContext('2d').drawImage(e.img,0,0,c.width,c.height);e.bmp[b]=c;return c;
}
let _sprT=0,_sprBudget=0;
const _drawObBase=drawOb;
drawOb=function(o){
  if(!SPR.on)return _drawObBase(o);
  // 키 계산은 비싸서 상태 서명이 바뀌거나 0.5초(게임 시간) 지났을 때만 다시 한다
  const occN=o.occ?(o.occ.size||o.occ.length||0):0,sig=o.hp*7+(o.fl>0?1e7:0)+occN*1e5+(o.muz>0?3e8:0)+(o.stock?armTotal(o):0)*13,slice=(G.time*2)|0;
  let e=o._se;
  if(o._ss!==sig||o._sl!==slice||(o._sb!==G.biome)){
    o._ss=sig;o._sl=slice;o._sb=G.biome;
    const key=sprKey(o);
    if(!key){e=o._se=null;}
    else{
      e=SPR.map.get(key)||sprFromFile(key);
      if(!e){
        const _t=performance.now();if(_t-_sprT>8){_sprT=_t;_sprBudget=6;}
        if(_sprBudget>0){_sprBudget--;e=sprBake(o,key);}
      }
      o._se=e||null;if(!e)o._ss=-1; // 아직 없으면 다음 프레임에 다시 시도
    }
  }
  if(!e||!e.ready||e.fail){SPR.miss++;return _drawObBase(o);}
  const z=cam.z;let b=SPR.buckets[SPR.buckets.length-1];for(const q of SPR.buckets)if(q>=z-.001){b=q;break;}
  const bm=sprRaster(e,b),[sx,sy]=toS(o.x+o.size/2,o.y+o.size/2),k=z/b;
  cx.drawImage(bm,sx+e.x*z,sy+e.y*z,bm.width*k,bm.height*k);
  SPR.hits++;
  if(o.hp<o.max)drawObHp(o);
  if(o.type==='armory')drawArmoryLabel(o);
};
// 스프라이트 내보내기 (tools/export-sprites.js 가 사용)
function sprExportAll(){const r={};for(const [k,e] of SPR.map)if(e.svg)r[k]=e.svg;return r;}
