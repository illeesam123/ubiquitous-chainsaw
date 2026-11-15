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
    im.onload=()=>{e.img=im;e.bmp={};e.ready=true;e.fail=false;};im.src=u;
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
  e.img.onload=()=>{e.ready=true;};e.img.onerror=()=>{e.fail=true;};sprSetSrc(e.img,m[0]);
  SPR.map.set(key,e);SPR.files++;return e;
}
function sprBlit(e,sx,sy,z,snap){
  let b=SPR.buckets[SPR.buckets.length-1];for(const q of SPR.buckets)if(q>=z-.001){b=q;break;}
  const bm=sprRaster(e,b),k=z/b;let dx=sx+e.x*z,dy=sy+e.y*z;
  if(snap){dx=Math.round(dx);dy=Math.round(dy);}
  cx.drawImage(bm,dx,dy,bm.width*k,bm.height*k);
}
const sprOk=(e)=>e&&e.ready&&!e.fail;

// ---- 병사 ----
function unitSprite(u,sx,by,z,body,inG){
  if(!SPR.on||u.flash>0||!(u.team>=0&&u.team<=3))return false;
  const st=u.state;let pose,fr=0;
  if(st==='fuse')pose='fuse';
  else if(st==='work'){if(u.task&&u.task.bomb)return false;pose='work';fr=(((u.anim*9)/6.2832)%1)*4|0;}
  else if(u.muz>0)pose=inG?'gfire':'fire';
  else if(st==='move'||st==='flee'){pose='move';fr=(((u.anim*(st==='flee'?17:12))/6.2832)%1)*4|0;}
  else pose=inG?'gidle':'idle';
  const d=((Math.round(u.face/(Math.PI/4))%8)+8)%8;
  const key='unit|'+u.team+'|'+pose+(pose==='move'||pose==='work'?fr:'')+'|'+(pose==='fuse'?0:d);
  const e=sprGetX(key);if(!sprOk(e))return false;
  sprBlit(e,sx,by,z,false);return true;
}
// ---- 차량 ----
function vehSprite(v,flash){
  if(!SPR.on||!(v.team>=0&&v.team<=3)){v._tuDone=false;return false;}
  v._tuDone=false;
  const q=((Math.round(v.face/(Math.PI/8))%16)+16)%16;let ok=!flash&&!(v.muz>0);
  if(v.type==='tank'){
    const tgt=(v.aimT>0&&v.aim!==undefined)?v.aim:v.face;if(v.turA===undefined)v.turA=v.face;
    v.turA+=Math.atan2(Math.sin(tgt-v.turA),Math.cos(tgt-v.turA))*.14;v._tuDone=true;
    const a=q*Math.PI/8;if(Math.abs(Math.atan2(Math.sin(v.turA-a),Math.cos(v.turA-a)))>.22)ok=false;
  }
  const e=ok?sprGetX('veh|'+v.type+'|'+v.team+'|'+q):null;if(!sprOk(e))return false;
  const [sx,sy]=toS(v.x,v.y);sprBlit(e,sx,sy,cam.z,false);
  if(v.hp<v.max*.4){
    if(v.type==='tank')drawDamageSmoke(v.x,v.y,v.hp<v.max*.2,v.anim);
    else drawDamageSmoke(v.x+Math.cos(v.face)*.5,v.y+Math.sin(v.face)*.5,v.hp<v.max*.2,v.anim);
  }
  return true;
}
// ---- 타일 ----
function tileSprite(x,y,i){
  if(!SPR.on)return false;
  if(!G.tsE||G.tsE.length!==G.N){G.tsE=new Array(G.N);G.tsS=new Uint16Array(G.N);}
  const kind=G.tt[i],q=G.gq[i],sig=(kind+1)*8+q+1;
  let e=G.tsE[i];
  if(G.tsS[i]!==sig||e===undefined){
    G.tsS[i]=sig;
    e=sprGetX('tile|'+G.biome+'|'+kind+'|'+q+'|'+((hsh(x*1.7,y*2.3)*3)|0))||false;G.tsE[i]=e;
  }
  if(!sprOk(e))return false;
  const [sx,sy]=toS(x+.5,y+.5);sprBlit(e,sx,sy,cam.z,true);return true;
}
// ---- 도로 ----
function roadSprite(x,y,i){
  const k=G.road[i];if(!SPR.on||!k||G.up[i]===1)return false;
  let m=0;for(const [dx,dy] of roadLinks(x,y,k))m|=dx===1?1:dx===-1?2:dy===1?4:8;
  const e=sprGetX('road|'+k+'|'+m+'|'+(k===3?0:(hsh(x,y)>.5?1:0)));if(!sprOk(e))return false;
  const [sx,sy]=toS(x+.5,y+.5);sprBlit(e,sx,sy,cam.z,true);return true;
}
const _drtBase=drawRoadTile;
drawRoadTile=function(x,y,i){if(!roadSprite(x,y,i))_drtBase(x,y,i);};
const _crBase=drawCrater;
drawCrater=function(x,y){
  const e=SPR.on?sprGetX('crater|0'):null;
  if(!sprOk(e))return _crBase(x,y);
  const [sx,sy]=toS(x+.5,y+.5);sprBlit(e,sx,sy,cam.z,false);
};

// ---- 생성기 (tools/export-sprites.js 가 호출) ----
function sprRecord(fn,wx,wy){
  const rec=new SvgRec(),sv={cam:{x:cam.x,y:cam.y,z:cam.z},time:G.time,cx,rec:REC};
  try{cam.z=1;cam.x=-(wx-wy)*32;cam.y=-(wx+wy)*16;G.time=0;cx=rec;REC=true;fn();}
  finally{cam.x=sv.cam.x;cam.y=sv.cam.y;cam.z=sv.cam.z;G.time=sv.time;cx=sv.cx;REC=sv.rec;}
  if(!rec.out.length)return null;return rec.svg().svg;
}
function sprBakeUnit(team,pose,fr,d){
  const inG=pose[0]==='g',base=inG?pose.slice(1):pose;
  const u={team,x:-1,y:-1,face:d*Math.PI/4,flash:0,muz:base==='fire'?.05:0,task:{},
    state:base==='fuse'?'fuse':base==='work'?'work':base==='move'?'move':inG?'gar':'idle',
    anim:base==='move'?(fr+.5)/4*6.2832/12:base==='work'?(fr+.5)/4*6.2832/9:0};
  return sprRecord(()=>unitBody(u,0,0,1,TEAM_COL[team],inG),0,0);
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
