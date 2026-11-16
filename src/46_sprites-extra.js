// ================= 병사 · 차량 · 타일 · 도로 SVG 에셋 =================
// 건물/장애물(42_svg-sprites.js)과 같은 방식: 에셋은 assets/sprites/*.svg 파일이며, 목록(위치·크기)은 manifest.js.
// 파일이 없거나 아직 불러오는 중이면 기존 절차적 그리기로 즉시 폴백한다.
//  - 병사:  unit|팀|자세프레임|방향(8)       예) unit|0|move2|3
//  - 차량:  veh|종류|팀|방향(16)            (전차 포탑이 차체와 정렬된 상태만 스프라이트, 조준·발사 중엔 폴백)
//  - 타일:  tile|바이옴|종류|음영(0~3)|변형(0~2)
//  - 도로:  road|종류|연결마스크(E1 W2 S4 N8)|변형(0~1)
//  - 구덩이: crater|0
// 에디터(editor/)가 보낸 교체 에셋은 BroadcastChannel 로 즉시 반영되고(localStorage 에 보관),
// '☁' 켜면 GitHub 저장소 최신 커밋의 에셋 파일을 raw 주소에서 직접 읽는다.
const SPRX={ov:{},src:'local',sha:'',repo:'illeesam123/ubiquitous-chainsaw',bc:null,timer:0};
try{
  SPRX.ov=JSON.parse(localStorage.getItem('trench.sprOv')||'{}')||{};
  const sc=JSON.parse(localStorage.getItem('trench.sprSrc')||'null');
  if(sc){SPRX.src=sc.src||'local';SPRX.sha=sc.sha||'';SPRX.repo=sc.repo||SPRX.repo;}
}catch(e){}
function sprSaveX(){try{localStorage.setItem('trench.sprOv',JSON.stringify(SPRX.ov));localStorage.setItem('trench.sprSrc',JSON.stringify({src:SPRX.src,sha:SPRX.sha,repo:SPRX.repo}));}catch(e){}}
function sprUrl(file){
  const o=SPRX.ov[file];if(o)return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(o);
  if(SPRX.src==='gh'&&SPRX.sha)return `https://raw.githubusercontent.com/${SPRX.repo}/${SPRX.sha}/assets/sprites/${file}`;
  return SPR_DIR+file;
}
function sprSetSrc(img,file){const u=sprUrl(file);if(u.startsWith('http'))img.crossOrigin='anonymous';img.src=u;}
function sprReloadFile(file){
  for(const e of SPR.map.values()){
    if(e.file!==file)continue;
    const im=new Image(),u=sprUrl(file);if(u.startsWith('http'))im.crossOrigin='anonymous';
    im.onload=()=>{e.img=im;e.bmp={};e.tint={};e.ready=true;e.fail=false;SPRV++;};im.src=u;
  }
}
function sprReloadAll(){const done=new Set();for(const e of SPR.map.values())if(e.file&&!done.has(e.file)){done.add(e.file);sprReloadFile(e.file);}}
async function sprSyncGh(){
  if(SPRX.src!=='gh')return;
  try{
    const r=await fetch(`https://api.github.com/repos/${SPRX.repo}/commits/main`,{headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok)return;const j=await r.json();
    if(j.sha&&j.sha!==SPRX.sha){SPRX.sha=j.sha;sprSaveX();sprReloadAll();}
  }catch(e){}
}
function sprSetSource(src){
  SPRX.src=src;sprSaveX();clearInterval(SPRX.timer);
  if(src==='gh'){sprSyncGh();SPRX.timer=setInterval(sprSyncGh,45000);}else sprReloadAll();
  const b=document.getElementById('bGh');if(b){b.classList.toggle('on',src==='gh');b.title='에셋 소스: '+(src==='gh'?'GitHub 최신 커밋':'로컬 파일')+' (클릭해서 전환)';}
}
try{
  SPRX.bc=new BroadcastChannel('trench-sprites');
  SPRX.bc.onmessage=(ev)=>{
    const m=ev.data||{};
    if(m.t==='set'&&m.file&&m.svg){SPRX.ov[m.file]=m.svg;sprSaveX();sprReloadFile(m.file);}
    else if(m.t==='clear'&&m.file){delete SPRX.ov[m.file];sprSaveX();sprReloadFile(m.file);}
    else if(m.t==='clearAll'){const fs=Object.keys(SPRX.ov);SPRX.ov={};sprSaveX();for(const f of fs)sprReloadFile(f);}
    else if(m.t==='source'){if(m.repo)SPRX.repo=m.repo;sprSetSource(m.src==='gh'?'gh':'local');}
  };
}catch(e){}
(function(){const b=document.getElementById('bGh');if(!b)return;b.onclick=()=>sprSetSource(SPRX.src==='gh'?'local':'gh');sprSetSource(SPRX.src);})();

// ---- 공통: 파일 항목 얻기 / 그리기 ----
function sprGetX(key){
  let e=SPR.map.get(key);if(e)return e;
  const M=typeof SPRITE_MANIFEST!=='undefined'?SPRITE_MANIFEST:null,m=M&&M[key];
  if(!m||!(m[3]>0&&m[4]>0))return null;
  e={key,ready:false,fail:false,file:m[0],x:m[1],y:m[2],w:m[3],h:m[4],img:new Image(),bmp:{}};
  e.img.onload=()=>{e.ready=true;SPRV++;};e.img.onerror=()=>{e.fail=true;};sprSetSrc(e.img,m[0]);
  SPR.map.set(key,e);SPR.files++;return e;
}
function sprBlit(e,sx,sy,z,snap){
  let b=SPR.buckets[SPR.buckets.length-1];for(const q of SPR.buckets)if(q>=z-.001){b=q;break;}
  const bm=sprRaster(e,b),k=z/b;let dx=sx+e.x*z,dy=sy+e.y*z;
  if(snap){dx=Math.round(dx);dy=Math.round(dy);}
  cx.drawImage(bm,dx,dy,bm.width*k,bm.height*k);
}
const sprOk=(e)=>e&&e.ready&&!e.fail;
const sprBkt=(z)=>{let b=SPR.buckets[SPR.buckets.length-1];for(const q of SPR.buckets)if(q>=z-.001){b=q;break;}return b;};
// 팀색 치환형: 마스크 SVG(불투명한 곳 = 색이 바뀔 영역, 회색 명암은 유지)를 팀 색상으로 바꿔 찍는다. (픽셀 읽기 없이 합성만 사용)
function sprTinted(e,b,color){
  e.tint=e.tint||{};const k=b+color;let c=e.tint[k];if(c)return c;
  const bm=sprRaster(e,b);c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;
  const g=c.getContext('2d');g.drawImage(bm,0,0);
  // 명암(밝기)은 마스크 그림 그대로 두고 색상·채도만 팀 색으로 바꾼다: 'color' 블렌드 → 원래 모양(알파)으로 다시 오려 낸다
  g.globalCompositeOperation='color';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);
  g.globalCompositeOperation='destination-in';g.drawImage(bm,0,0);
  return e.tint[k]=c;
}
function sprBlitTint(e,sx,sy,z,color,snap){
  const b=sprBkt(z),bm=sprTinted(e,b,color),k=z/b;let dx=sx+e.x*z,dy=sy+e.y*z;if(snap){dx=Math.round(dx);dy=Math.round(dy);}
  cx.drawImage(bm,dx,dy,bm.width*k,bm.height*k);
}
// 좌우반전해서 찍기 (기준점 (sx,sy) 를 지나는 세로축 기준)
const FLIPC=new WeakMap();
function flipOf(bm){            // 좌우반전본을 한 번만 만들어 재사용: 찍을 때마다 save/scale/restore 하지 않기 위함
  let f=FLIPC.get(bm);if(f)return f;
  f=document.createElement('canvas');f.width=bm.width;f.height=bm.height;const g=f.getContext('2d');g.translate(f.width,0);g.scale(-1,1);g.drawImage(bm,0,0);
  FLIPC.set(bm,f);return f;
}
function sprBlitFlip(e,sx,sy,z,snap,tint){
  const b=sprBkt(z),bm=flipOf(tint?sprTinted(e,b,tint):sprRaster(e,b)),k=z/b;
  let dx=sx+e.x*z,dy=sy+e.y*z;if(snap){dx=Math.round(dx);dy=Math.round(dy);}
  cx.drawImage(bm,dx,dy,bm.width*k,bm.height*k);
}

// ---- 차량 ----
function vehSprite(v,flash){
  if(!(v.team>=0&&v.team<=3)){v._tuDone=false;return false;}
  v._tuDone=false;
  const q=((Math.round(v.face/(Math.PI/8))%16)+16)%16;let ok=true;
  if(v.type==='tank'){
    const tgt=(v.aimT>0&&v.aim!==undefined)?v.aim:v.face;if(v.turA===undefined)v.turA=v.face;
    v.turA+=Math.atan2(Math.sin(tgt-v.turA),Math.cos(tgt-v.turA))*.14;v._tuDone=true;
  }
  // 좌우반전 재사용: 방향 q ↔ (4-q) 는 서로 거울상
  const qm=(4-q)&15,qc=Math.min(q,qm),fl=qc!==q;
  const e=ok?sprGetX('veh|'+v.type+'|'+v.team+'|'+qc):null;if(!sprOk(e)){if(!e)sprMissing('veh|'+v.type+'|'+v.team+'|'+qc);return true;}
  const [sx,sy]=toS(v.x,v.y);if(fl)sprBlitFlip(e,sx,sy,cam.z,false);else sprBlit(e,sx,sy,cam.z,false);
  if(v.hp<v.max*.4){
    if(v.type==='tank')drawDamageSmoke(v.x,v.y,v.hp<v.max*.2,v.anim);
    else drawDamageSmoke(v.x+Math.cos(v.face)*.5,v.y+Math.sin(v.face)*.5,v.hp<v.max*.2,v.anim);
  }
  return true;
}
// ---- 타일 ----
function tileSprite(x,y,i){
  if(!G.tsE||G.tsE.length!==G.N){G.tsE=new Array(G.N);G.tsS=new Uint16Array(G.N);G.tsF=new Uint8Array(G.N);}
  const kind=G.tt[i],q=G.gq[i],sig=(kind+1)*8+q+1;
  let e=G.tsE[i];
  if(G.tsS[i]!==sig||e===undefined){
    G.tsS[i]=sig;const v4=(hsh(x*1.7,y*2.3)*4)|0;                       // 무늬 4종 = 파일 2종 + 좌우반전
    e=sprGetX('tile|'+G.biome+'|'+kind+'|'+q+'|'+(v4&1))||false;G.tsE[i]=e;G.tsF[i]=v4>>1;
  }
  if(!sprOk(e)){if(!e)sprMissing('tile|'+G.biome+'|'+G.tt[i]+'|'+G.gq[i]);return REC?false:true;}
  const [sx,sy]=toS(x+.5,y+.5);if(G.tsF[i])sprBlitFlip(e,sx,sy,cam.z,true);else sprBlit(e,sx,sy,cam.z,true);return true;
}
// ---- 도로 ----
function roadSprite(x,y,i){
  const k=G.road[i];if(!k||G.up[i]===1)return false;
  let m=0;for(const [dx,dy] of roadLinks(x,y,k))m|=dx===1?1:dx===-1?2:dy===1?4:8;
  const mm=((m&1)<<2)|((m&4)>>2)|((m&2)<<2)|((m&8)>>2),mc=Math.min(m,mm);   // E↔S, W↔N 는 거울상
  const e=sprGetX('road|'+k+'|'+mc+'|'+(k===3?0:(hsh(x,y)>.5?1:0)));if(!sprOk(e)){if(!e)sprMissing('road|'+k+'|'+mc);return REC?false:true;}
  const [sx,sy]=toS(x+.5,y+.5);if(mc!==m)sprBlitFlip(e,sx,sy,cam.z,true);else sprBlit(e,sx,sy,cam.z,true);return true;
}
const _drtBase=drawRoadTile;
drawRoadTile=function(x,y,i){if(!roadSprite(x,y,i))_drtBase(x,y,i);};
const _crBase=drawCrater;
drawCrater=function(x,y){
  const e=REC?null:sprGetX('crater|0');
  if(REC)return _crBase(x,y);
  if(!sprOk(e))return;
  const [sx,sy]=toS(x+.5,y+.5);sprBlit(e,sx,sy,cam.z,false);
};

// ---- 생성기 (tools/export-sprites.js 가 호출) ----
function sprRecordSplit(fn,wx,wy,marker){
  const rec=new SvgRec(),sv={cam:{x:cam.x,y:cam.y,z:cam.z},time:G.time,cx,rec:REC};
  try{cam.z=1;cam.x=-(wx-wy)*32;cam.y=-(wx+wy)*16;G.time=0;cx=rec;REC=true;fn();}
  finally{cam.x=sv.cam.x;cam.y=sv.cam.y;cam.z=sv.cam.z;G.time=sv.time;cx=sv.cx;REC=sv.rec;}
  const all=rec.out;rec.out=all.filter(t=>!t.includes(marker));const n=rec.out.length?rec.svg().svg:null;
  rec.out=all.filter(t=>t.includes(marker));const t=rec.out.length?rec.svg().svg:null;return {neutral:n,tint:t};
}
function sprRecord(fn,wx,wy){
  const rec=new SvgRec(),sv={cam:{x:cam.x,y:cam.y,z:cam.z},time:G.time,cx,rec:REC};
  try{cam.z=1;cam.x=-(wx-wy)*32;cam.y=-(wx+wy)*16;G.time=0;cx=rec;REC=true;fn();}
  finally{cam.x=sv.cam.x;cam.y=sv.cam.y;cam.z=sv.cam.z;G.time=sv.time;cx=sv.cx;REC=sv.rec;}
  sprRecord.last=rec.out.slice();
  if(!rec.out.length)return null;return rec.svg().svg;
}
function sprBakeVeh(type,team,q){
  const a=q*Math.PI/8,v={type,team,x:10,y:10,face:a,turA:a,aim:a,aimT:0,muz:0,hp:1,max:1,anim:0,flash:0,_tuDone:true};
  return sprRecord(()=>{if(type==='tank')drawTank(v,false,team);else drawTruck(v,false,team);},10,10);
}
function sprBakeRoad(k,mask,v){
  let x=0,y=0;for(let a=8;a<40&&!x;a++)for(let b=8;b<40;b++)if((hsh(a,b)>.5?1:0)===v){x=a;y=b;break;}
  const i=y*G.w+x,sr=G.road[i],su=G.up[i],sl=roadLinks;
  const L=[];if(mask&1)L.push([1,0]);if(mask&2)L.push([-1,0]);if(mask&4)L.push([0,1]);if(mask&8)L.push([0,-1]);
  try{G.road[i]=k;G.up[i]=0;roadLinks=()=>L;return sprRecord(()=>_drtBase(x,y,i),x+.5,y+.5);}
  finally{G.road[i]=sr;G.up[i]=su;roadLinks=sl;}
}
function sprBakeCrater(){return sprRecord(()=>_crBase(10,10),10.5,10.5);}

// 병사 점령 오버레이: 건물 창문 등에 보이는 병사 모습. 중립(피부·헬멧·총·창문 뒤 어둠)과 팀색(어깨·헬멧 띠) 마스크로 나눈다.
function sprBakeOcc(type){
  const res=[];let o=null;
  outer:for(let y=8;y<G.h-8;y+=3)for(let x=8;x<G.w-8;x+=4){o=addOb(type,x,y,0);if(o)break outer;}
  if(!o)return res;
  const n=OB[type].slots,ids=[];
  const mk=(j)=>({id:-100-j,team:7,x:o.x,y:o.y,face:.8,muz:0,flash:0,hp:1,max:1,sel:false});
  for(let j=0;j<n;j++){const u=mk(j);G.uid.set(u.id,u);ids.push(u.id);}
  o.occ=new Set(ids);o.occTeam=7;
  const calls=[],pk=peek,sv=TEAM_COL[7];TEAM_COL[7]='rgba(0,0,0,0)';
  const cxw=o.x+o.size/2,cyw=o.y+o.size/2;
  try{peek=function(p,u,sc,sh){calls.push([p[0],p[1],sc,sh]);};sprRecord(()=>drawObFull(o),cxw,cyw);}finally{peek=pk;}
  // 건물이 병사 자리의 창문을 어둡게 칠한 도형(점령 시에만 생김)을 그대로 가져와 오버레이의 배경으로 쓴다
  const dark=(sprRecord.last||[]).filter(t=>/fill="#(14100b|1a150f)"/.test(t)&&t.startsWith('<path'));
  calls.forEach((c,j)=>{
    const u=mk(j);TEAM_COL[7]='#fffffe';
    const r=sprRecordSplit(()=>{
      if(dark.length===calls.length){const d=dark[j],nums=/d="([^"]+)"/.exec(d)[1].replace(/[A-Za-z]/g,' ').trim().split(/\s+/).map(Number);for(let k=0;k+1<nums.length;k+=2)cx._b(nums[k],nums[k+1],0);cx.out.push(d);}
      pk([c[0],c[1]],u,c[2],c[3]);},0,0,'#fffffe');
    res.push({size:o.size,j,neutral:r.neutral,tint:r.tint});
  });
  TEAM_COL[7]=sv;for(const id of ids)G.uid.delete(id);removeOb(o);
  return res;
}

// ---- 다리 ----
function sprBakeBridge(water){const x=10,y=10,i=y*G.w+x,sv=G.tt[i];try{G.tt[i]=water?2:0;return sprRecord(()=>_dbBase(x,y),x+.5,y+.5);}finally{G.tt[i]=sv;}}
const _dbBase=drawBridge;
drawBridge=function(x,y){
  if(REC)return _dbBase(x,y);
  const e=sprGetX('bridge|'+(G.tt[y*G.w+x]===2?'water':'land'));
  if(!sprOk(e))return;
  const [sx,sy]=toS(x+.5,y+.5);sprBlit(e,sx,sy,cam.z,true);
};
