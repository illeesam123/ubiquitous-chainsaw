// ================= 참호 확장: 개량 · 지하 · 포탄구덩이 · 범위 드래그 =================
const UPG={
  bridge:{n:'다리',cost:{wood:14,metal:4},work:5,desc:'참호·얕은 물 위에 놓아 전차가 건넙니다'},
  roof:{n:'금속 천장',cost:{metal:8},work:6,desc:'포격 면역 · 사격 대부분 차단 · 사다리로만 출입'},
  ladder:{n:'사다리 출구',cost:{metal:4,wood:4},work:4,desc:'천장 구간의 출입구(천장 먼저)'},
  climb:{n:'절벽 사다리',cost:{wood:10,metal:2},work:5,desc:'높이 차가 큰 절벽(걸어서 못 넘는 곳) 위아래를 잇는다 · 절벽 옆 칸에 클릭'},
  shaft:{n:'수직갱',cost:{metal:6,wood:10},work:8,desc:'지하로 내려가는 입구 · 지하 땅굴 끝에서는 지상 출구'}
};
const UPCODE={bridge:1,roof:2,ladder:3,shaft:4};
const CAVE=250, TUN_WORK=DIG_WORK*2.4, FILL_WORK=DIG_WORK*.45, CRATER_DIG=.35;
let viewLay=0,areaMode=true,pfLay=0,pfTeam=0;

function roofedI(i){const v=G.up[i];return v===2||v===3;}
function inRoof(u){return !u.lay&&roofedI(Math.floor(u.y)*G.w+Math.floor(u.x));}
function stepOK(a,b){if(G.hill&&!stepH(a,b)&&!ladderLink(a,b))return false;const ra=roofedI(a),rb=roofedI(b);if(ra===rb)return true;return ra?G.up[a]===3:G.up[b]===3;}
function underOK(i,team){return G.under[i]!==0&&G.open[team][i]===1;}
function transitOK(team,i){return (G.mouth[i]===1&&G.under[i]!==0)||(G.up[i]===4&&G.under[i]!==0&&G.open[team][i]===1);}
function findPathL(lay,team,sx,sy,gx,gy,adj,size,vehicle){
  pfLay=lay;pfTeam=team;
  try{return findPath(sx,sy,gx,gy,adj,size,vehicle);}finally{pfLay=0;}
}

// ---- 지하 연결 / 시야 ----
function compOf(i0){
  const w=G.w,seen=new Set([i0]),st=[i0];
  while(st.length){
    const c=st.pop(),x=c%w,y=(c/w)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;
      const n=ny*w+nx;if(G.under[n]&&!seen.has(n)){seen.add(n);st.push(n);}
    }
  }
  return seen;
}
// 새 지하 타일 또는 동굴 입장 시: 연결된 덩어리에 서로 다른 팀/동굴이 있으면 서로의 지도가 열린다.
function linkCheck(i0,forceTeam){
  const comp=compOf(i0),teams=new Set();let cave=false,enemyIn=false;
  for(const i of comp){const o=G.under[i];if(o===CAVE)cave=true;else teams.add(o-1);}
  if(forceTeam!==undefined&&cave)teams.add(forceTeam);
  if(!cave&&teams.size<2)return;
  for(const t of teams){
    const op=G.open[t];let add=0;
    for(const i of comp)if(!op[i]){op[i]=1;add++;}
    if(add&&t===0){
      if(teams.size>1)toast('지하 통로가 적의 땅굴과 연결되었습니다!');
      else toast('동굴을 발견했습니다 — 지하 지도가 열렸습니다');
    }
  }
}
function setUnder(i,team){
  G.under[i]=team+1;G.open[team][i]=1;linkCheck(i);
}

// ---- 층 이동 ----
function pathToTransit(u,lay){
  const w=G.w,ux=Math.floor(u.x),uy=Math.floor(u.y),cands=[];
  for(const i of G.trans){if(transitOK(u.team,i))cands.push([Math.hypot(i%w-ux,((i/w)|0)-uy),i]);}
  cands.sort((a,b)=>a[0]-b[0]);
  for(const [,i] of cands.slice(0,5)){
    const p=findPathL(u.lay|0,u.team,ux,uy,i%w,(i/w)|0,false);
    if(p!==null)return {path:p,tile:i};
  }
  return null;
}
function orderMoveL(units,tx,ty,lay){
  if(lay===1&&!underOK(ty*G.w+tx,0)&&!G.mouth[ty*G.w+tx])return '열려 있는 지하 통로를 선택하세요';
  let err=null;
  for(const u of units){
    releaseUnit(u);u.queue=[];u.after=null;
    if((u.lay|0)===lay){
      const p=findPathL(lay,u.team,Math.floor(u.x),Math.floor(u.y),tx,ty,false);
      if(p&&p.length){u.path=p;u.state='move';}
    }else{
      const tr=pathToTransit(u,lay);
      if(!tr){err='이동 가능한 입구(수직갱·동굴 입구)가 없습니다';continue;}
      u.path=tr.path;u.after={lay,tx,ty,at:tr.tile};
      if(tr.path.length)u.state='move';else arrive(u);
    }
  }
  return err;
}
function afterTransit(u){
  const a=u.after;u.after=null;
  const ix=Math.floor(u.x),iy=Math.floor(u.y),i=iy*G.w+ix;
  if(!transitOK(u.team,i)){u.state='idle';u.wait=.3;return;}
  u.lay=a.lay;u.path=[];
  if(a.lay===1&&G.mouth[i])linkCheck(i,u.team);
  fxPush({k:'dust',x:u.x,y:u.y,t:0,d:.4});
  if(a.gar){const o=a.gar;const gp=G.obSet.has(o)?findPath(ix,iy,o.x,o.y,true,o.size):null;if(gp===null){u.garTarget=null;u.state='idle';u.wait=.3;return;}u.path=gp;if(gp.length)u.state='move';else arrive(u);return;}
  if(a.task&&u.task){
    const t=u.task,adj=t.kind!=='dig';
    const p=findPathL(a.lay,u.team,ix,iy,t.x,t.y,adj,taskSize(t));
    if(p===null){t.res.delete(u.id);u.task=null;u.state='idle';u.wait=.3;return;}
    u.path=p;if(p.length)u.state='move';else startWork(u);return;
  }
  const p=findPathL(a.lay,u.team,ix,iy,a.tx,a.ty,false);
  if(p&&p.length){u.path=p;u.state='move';}else u.state='idle';
}

// ---- 작업 확장: upg / fill / tun / 구덩이 개조 ----
function taskCheckX(team,kind,x,y,type){
  if(!inb(x,y))return '맵 밖입니다';
  const i=y*G.w+x,T=G.teams[team];
  if(kind==='upg'){
    const U=UPG[type];if(!U)return '알 수 없는 개량';
    if(G.obst[i])return '장애물이 있어 불가합니다';
    if(G.hill&&G.sl[i])return '경사면 위에는 불가합니다';
    if(padAt(x,y)>=0)return '헬리패드 위에는 불가합니다';
    if(G.mouth[i])return '동굴 입구입니다';
    if(G.tasks.has(tkey('upg',i)))return '이미 예약된 작업입니다';
    if(type==='climb'){const r=climbCheck(i);if(r)return r;if(!canAfford(T,U.cost))return '자원이 부족합니다';return null;}
    const own=G.trench[i]===team+1,water=G.tt[i]===2,up=G.up[i];
    if(type==='bridge'){
      if(!own&&!water)return '내 참호나 얕은 물 위에만 놓을 수 있습니다';
      if(up===1)return '이미 다리입니다';if(up)return '이미 개량된 칸입니다';
      if(!own&&water){
        let link=false;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const n=ny*G.w+nx;if(G.up[n]===1||(G.tt[n]!==2&&!G.obst[n]))link=true;}
        if(!link)return '육지나 다른 다리와 이어져야 합니다';
      }
    }else if(type==='roof'){
      if(!own)return '내 참호 위에만 지을 수 있습니다';
      if(up===2||up===3)return '이미 천장이 있습니다';if(up)return '이미 개량된 칸입니다';
    }else if(type==='ladder'){
      if(!own||up!==2)return '천장이 있는 내 참호 위에만 달 수 있습니다';
    }else if(type==='shaft'){
      if(up)return '이미 개량된 칸입니다';
      const exitOk=G.under[i]===team+1&&G.tt[i]!==2;
      if(!own&&!exitOk)return '내 참호나 내 지하 땅굴 위에만 지을 수 있습니다';
      if(own&&G.under[i]&&G.under[i]!==team+1)return '이미 다른 지하 구조가 있습니다';
    }
    if(!canAfford(T,U.cost))return '자원이 부족합니다';
    return null;
  }
  if(kind==='build'&&G.mouth[i])return '동굴 입구 위에는 지을 수 없습니다';
  if(kind==='fill'){
    if(G.trench[i]!==255)return '메울 포탄 구덩이가 없습니다';
    if(G.obst[i])return '장애물이 있습니다';
    return null;
  }
  if(kind==='tun'){
    if(G.tt[i]===2)return '물 아래는 팔 수 없습니다';
    if(G.under[i])return '이미 지하 통로입니다';
    if(G.tasks.has(tkey('tun',i)))return '이미 예약된 작업입니다';
    let near=false;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const n=ny*G.w+nx;
      if((G.under[n]&&G.open[team][n])||G.tasks.has(tkey('tun',n)))near=true;
    }
    if(!near)return '내 지하 통로(수직갱)에서 이어서 파야 합니다';
    return null;
  }
  if(kind==='dig'){
    if(G.mouth[i])return '동굴 입구입니다';
    if(G.trench[i]===255){
      if(G.obst[i])return '장애물이 있어 팔 수 없습니다';
      if(G.tasks.has(tkey('dig',i)))return '이미 예약된 작업입니다';
      return null; // 포탄 구덩이는 참호로 빠르게 개조할 수 있다
    }
  }
  return undefined;
}
const taskCheckBase=taskCheck;
taskCheck=function(team,kind,x,y,type){
  const r=taskCheckX(team,kind,x,y,type);
  return r===undefined?taskCheckBase(team,kind,x,y,type):r;
};
const getTaskBase=getTask;
function mkTaskX(team,kind,x,y,type,work,cost,lay){
  const i=y*G.w+x,k=tkey(kind,i);
  const t={key:k,kind,x,y,idx:i,type,team,prog:0,work,cost,workers:new Set(),res:new Set(),lay:lay|0};
  G.tasks.set(k,t);return t;
}
getTask=function(team,kind,x,y,type,create){
  const i=y*G.w+x;
  if(kind==='upg'||kind==='fill'||kind==='tun'||(kind==='dig'&&G.trench[i]===255)){
    const k=tkey(kind,i),ex=G.tasks.get(k);
    if(ex||!create)return ex||null;
    const T=G.teams[team];
    if(kind==='upg'){const U=UPG[type];if(!canAfford(T,U.cost))return null;pay(T,U.cost);return mkTaskX(team,kind,x,y,type,U.work,U.cost,type==='shaft'&&G.under[i]?1:0);}
    if(kind==='fill')return mkTaskX(team,kind,x,y,null,FILL_WORK,null,0);
    if(kind==='tun')return mkTaskX(team,kind,x,y,null,TUN_WORK,null,1);
    return mkTaskX(team,'dig',x,y,null,DIG_WORK*CRATER_DIG,null,0);
  }
  return getTaskBase(team,kind,x,y,type,create);
};
const finishTaskBase=finishTask;
finishTask=function(t){
  if(t.kind!=='upg'&&t.kind!=='fill'&&t.kind!=='tun')return finishTaskBase(t);
  G.tasks.delete(t.key);
  const T=G.teams[t.team],i=t.idx;
  if(t.kind==='upg'){
    if(t.type==='climb')addLadder(i);else G.up[i]=UPCODE[t.type];
    if(t.type==='shaft'){
      if(!G.under[i])setUnder(i,t.team);else G.open[t.team][i]=1;
      if(!G.trans.includes(i))G.trans.push(i);
    }
    fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.5});
  }else if(t.kind==='fill'){
    G.trench[i]=0;G.trenchHP[i]=0;G.dec[i]=0;fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.6});
  }else{
    setUnder(i,t.team);
    if(t.team===0&&!t.lay)fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.3});
  }
  for(const id of [...t.workers,...t.res]){const u=G.uid.get(id);if(!u)continue;u.task=null;u.state='idle';u.path=[];pickTask(u);}
};

// ---- 명령 헬퍼 ----
function isAreaTool(){return tool==='dig'||tool==='demo'||tool==='sandbag'||tool==='wire'||tool==='u:bridge'||tool==='u:roof'||tool==='u:ladder'||tool.startsWith('r:');}
function rectTiles(a,b){
  const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);
  const out=[];
  for(let y=y0;y<=y1&&out.length<500;y++)for(let x=x0;x<=x1&&out.length<500;x++)out.push([x,y]);
  out.sort((p,q)=>(Math.abs(p[0]-a[0])+Math.abs(p[1]-a[1]))-(Math.abs(q[0]-a[0])+Math.abs(q[1]-a[1])));
  return out;
}
function toggleArea(){areaMode=!areaMode;const b=$('bArea');if(b)b.textContent=`드래그: ${areaMode?'영역':'선'} [T]`;toast(areaMode?'드래그 방식: 영역(사각형)':'드래그 방식: 선(경로)');}
function toggleLayer(){
  if(!G||G.phase==='setup')return;
  viewLay=viewLay?0:1;for(const u of G.units)if((u.lay|0)!==viewLay)u.sel=false;
  const b=$('bLayer');if(b){b.classList.toggle('on',viewLay===1);b.textContent=viewLay?'지상으로 [U]':'지하 보기 [U]';}
  toast(viewLay?'지하 층 — 내 땅굴과 연결된 곳만 보입니다':'지상 층');
}
const _finishTask=finishTask;
finishTask=function(t){_finishTask(t);if(!G.tasks.has(t.key))sfx('done',t.x+.5,t.y+.5);};
function demoOrFill(tiles,sel){
  const dm=tiles.filter(([x,y])=>inb(x,y)&&G.obst[y*G.w+x]&&!OB[G.obst[y*G.w+x].type].nodemo);
  const fl=tiles.filter(([x,y])=>inb(x,y)&&!G.obst[y*G.w+x]&&G.trench[y*G.w+x]===255);
  const br=tiles.filter(([x,y])=>inb(x,y)&&!G.obst[y*G.w+x]&&G.brush[y*G.w+x]&&G.trench[y*G.w+x]!==255);
  if(!dm.length&&!fl.length&&!br.length)return '철거할 시설·덤불이나 메울 구덩이가 없습니다';
  let err=null,first=true;
  if(dm.length){err=issueWork(0,'demo',dm,null,assignN,sel);first=false;}
  if(fl.length){const e=issueWork(0,'fill',fl,null,assignN,sel);if(first)err=e;first=false;}
  if(br.length){const e=issueWork(0,'clr',br,null,assignN,sel);if(first)err=e;}
  return err;
}
function commandTiles(tiles,sel,vsel,t){
  if(tool==='u:shaft'||tool==='u:climb')tiles=[tiles[0]];
  if(tool==='dig'){
    if(viewLay===1)return issueWork(0,'tun',tiles,null,assignN,sel);
    if(vsel.length){orderVehicles(vsel,t[0],t[1]);return null;}
    return issueWork(0,'dig',tiles,null,assignN,sel);
  }
  if(tool==='demo')return demoOrFill(tiles,sel);
  if(tool.startsWith('r:'))return issueWork(0,'road',tiles,tool.slice(2),assignN,sel);
  if(tool.startsWith('u:'))return issueWork(0,'upg',tiles,tool.slice(2),assignN,sel);
  if(tool==='sandbag'||tool==='wire')return issueWork(0,'build',tiles,tool,assignN,sel);
  return issueWork(0,'build',[tiles[0]],tool,assignN,sel);
}
function underClick(t,sel){
  const i=t[1]*G.w+t[0];
  if(tool==='dig'){
    if(G.under[i]&&G.open[0][i]){
      if(!sel.length)return '병사를 선택하세요';
      if(G.up[i]===4||G.mouth[i])return orderMoveL(sel,t[0],t[1],0);
      return orderMoveL(sel,t[0],t[1],1);
    }
    return issueWork(0,'tun',[t],null,assignN,sel);
  }
  return commandTiles([t],sel,[],t);
}

// ---- 동굴 생성 ----
function genCaves(r){
  if(G.special==='superflat'||G.special==='urbanwar')return;
  const w=G.w,h=G.h,n=Math.max(3,Math.round(w*h/1700));
  for(let k=0;k<n;k++){
    const x0=rint(r,8,w-9),y0=rint(r,8,h-9),mi=y0*w+x0;
    if(G.tt[mi]===2)continue;
    const o=G.obst[mi];if(o)removeOb(o);
    G.trench[mi]=0;G.mouth[mi]=1;G.under[mi]=CAVE;G.trans.push(mi);
    let x=x0,y=y0;const len=rint(r,28,64),rail=k%3!==2;
    for(let s=0;s<len;s++){
      const d=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(r()*4)];
      const nx=clamp(x+d[0],3,w-4),ny=clamp(y+d[1],3,h-4);
      G.under[ny*w+nx]=CAVE;if(s<len*.7&&rail)G.urail[ny*w+nx]=1;x=nx;y=ny;
      if(s%11===10&&r()<.55){const R=rint(r,2,3);for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const ax=x+dx,ay=y+dy;if(Math.hypot(dx,dy)<=R+.3&&ax>=3&&ay>=3&&ax<w-3&&ay<h-3&&!G.mouth[ay*w+ax]&&G.tt[ay*w+ax]!==2)G.under[ay*w+ax]=CAVE;}}   // 넓은 공동
      if(r()<.08){x=x0;y=y0;}
    }
  }
}

// ---- 그리기: 지상 개량 ----
function drawMouth(x,y){
  const z=cam.z,[sx,sy]=toS(x+.5,y+.5);
  cx.fillStyle='rgba(0,0,0,.35)';cx.beginPath();cx.ellipse(sx,sy+2*z,24*z,12.5*z,0,0,6.3);cx.fill();
  const g=cx.createRadialGradient(sx,sy,2*z,sx,sy,20*z);g.addColorStop(0,'#050403');g.addColorStop(.75,'#14100c');g.addColorStop(1,'#3c352b');
  cx.fillStyle=g;cx.beginPath();cx.ellipse(sx,sy,19*z,9.5*z,0,0,6.3);cx.fill();
  for(let k=0;k<7;k++){const a=k/7*6.283+hsh(x,y)*2,rx=Math.cos(a)*20*z,ry=Math.sin(a)*10*z;
    poly([[sx+rx-4*z,sy+ry],[sx+rx-1*z,sy+ry-6*z],[sx+rx+4*z,sy+ry-2*z],[sx+rx+3*z,sy+ry+2*z]],k%2?'#6b6559':'#7b7568','#2a2620',1);}
  cx.strokeStyle='rgba(120,170,200,.35)';cx.lineWidth=1.2;cx.beginPath();cx.ellipse(sx,sy,15*z,7*z,0,0,6.3);cx.stroke();
}
function drawBridge(x,y){
  const z=cam.z,h=5,[X,Y]=VT(x,y),P=toSV,c0=P(X,Y,h),c1=P(X+1,Y,h),c2=P(X+1,Y+1,h),c3=P(X,Y+1,h);
  if(G.tt[y*G.w+x]===2){ // 말뚝
    for(const [a,b] of [[.12,.12],[.88,.12],[.12,.88],[.88,.88]]){const p=P(X+a,Y+b,h),q=P(X+a,Y+b,-6);wline(p,q,'#3e2e1a',3);}
  }
  poly([P(X,Y+1,0),P(X+1,Y+1,0),P(X+1,Y+1,h),P(X,Y+1,h)],'#5b4630');
  poly([P(X+1,Y,0),P(X+1,Y+1,0),P(X+1,Y+1,h),P(X+1,Y,h)],'#6a5238');
  poly([c0,c1,c2,c3],'#8d7449','#3f3120',1);
  for(let k=1;k<6;k++){const f=k/6,a=[c0[0]+(c3[0]-c0[0])*f,c0[1]+(c3[1]-c0[1])*f],b=[c1[0]+(c2[0]-c1[0])*f,c1[1]+(c2[1]-c1[1])*f];wline(a,b,k%2?'#6f5a38':'#a38a5a',1);}
  wline(c0,c1,'#3f3120',2.2);wline(c3,c2,'#3f3120',2.2);
  for(const f of [.1,.5,.9]){const a=P(X+f,Y,h),b=P(X+f,Y,h+5),c=P(X+f,Y+1,h),d=P(X+f,Y+1,h+5);wline(a,b,'#4a3a22',2);wline(c,d,'#4a3a22',2);}
}
function drawShaftHatch(x,y){
  const z=cam.z,[sx,sy]=toS(x+.5,y+.5),sink=3*z;
  cx.fillStyle='#2e3238';cx.beginPath();cx.ellipse(sx,sy-sink+2*z,15*z,7.5*z,0,0,6.3);cx.fill();
  cx.fillStyle='#69727a';cx.beginPath();cx.ellipse(sx,sy-sink,13*z,6.5*z,0,0,6.3);cx.fill();
  cx.strokeStyle='#3b4147';cx.lineWidth=Math.max(1,1.5*z);cx.beginPath();cx.ellipse(sx,sy-sink,9*z,4.5*z,0,0,6.3);cx.stroke();
  cx.beginPath();cx.moveTo(sx-9*z,sy-sink);cx.lineTo(sx+9*z,sy-sink);cx.moveTo(sx,sy-sink-4.5*z);cx.lineTo(sx,sy-sink+4.5*z);cx.stroke();
  cx.fillStyle='#d9ad4e';cx.beginPath();cx.arc(sx,sy-sink,2*z,0,6.3);cx.fill();
}
function drawRoof(i){
  const w=G.w,x=i%w,y=(i/w)|0,lad=G.up[i]===3;
  const top='#7c858e',left='#4c535a',right='#5f676f',H=13;
  wbox(x+.02,y+.02,x+.98,y+.98,0,H,top,left,right,'#2c3135');
  // 판금 이음선과 리벳
  const a=pt(x+.5,y+.02,H),b=pt(x+.5,y+.98,H);wline(a,b,'#5a6269',1);
  const c=pt(x+.02,y+.5,H),d=pt(x+.98,y+.5,H);wline(c,d,'#5a6269',1);
  cx.fillStyle='#9aa3ab';
  for(const [px,py] of [[.14,.14],[.86,.14],[.14,.86],[.86,.86]]){const p=pt(x+px,y+py,H);cx.beginPath();cx.arc(p[0],p[1],Math.max(.8,1.1*cam.z),0,6.3);cx.fill();}
  if(lad){
    const o=[pt(x+.3,y+.3,H),pt(x+.7,y+.3,H),pt(x+.7,y+.7,H),pt(x+.3,y+.7,H)];
    poly(o,'#0b0d0f','#2c3135',1);
    const p1=pt(x+.38,y+.5,H),q1=pt(x+.38,y+.5,H+11),p2=pt(x+.62,y+.5,H),q2=pt(x+.62,y+.5,H+11);
    wline(p1,q1,'#d9ad4e',2);wline(p2,q2,'#d9ad4e',2);
    for(let k=0;k<4;k++){const hgt=H+2+k*3;wline(pt(x+.38,y+.5,hgt),pt(x+.62,y+.5,hgt),'#e6c36a',1.4);}
  }
}

// ---- 그리기: 지하 층 ----
function drawTunnelTile(x,y,i){
  const z=cam.z,w=G.w,o=G.under[i],[sx,sy]=toS(x,y),hz=9*z,W2=32*z,H2=16*z;
  const own=o===1,cave=o===CAVE;
  const floor=cave?'#586471':own?'#8a6a45':'#8a4b3d';
  tileDia(x,y,-.01);cx.fillStyle=floor;cx.fill();
  if(G.urail[i])drawUndRail(x,y,i);
  const k=hsh(x,y);
  cx.fillStyle='rgba(0,0,0,.12)';cx.beginPath();cx.ellipse(sx+(k-.5)*20*z,sy+H2+(hsh(y,x)-.5)*8*z,6*z,2.5*z,0,0,6.3);cx.fill();
  const solid=(dx,dy)=>{const nx=x+dx,ny=y+dy;if(!inb(nx,ny))return true;const n=ny*w+nx;return !(G.under[n]&&G.open[0][n]);};
  const T=[sx,sy],R=[sx+W2,sy+H2],B=[sx,sy+2*H2],L=[sx-W2,sy+H2];
  const up=(p,h)=>[p[0],p[1]-h];
  const wall=cave?['#38414b','#2e363f','#434d59']:['#4a3827','#3a2b1e','#56402b'];
  if(solid(-1,0))poly([L,T,up(T,hz),up(L,hz)],wall[2]);
  if(solid(0,-1))poly([T,R,up(R,hz),up(T,hz)],wall[2]);
  if(solid(1,0)){poly([R,B,up(B,hz),up(R,hz)],wall[0]);if(!cave)wline(up(R,hz),up(B,hz),'#6b4a2a',2);}
  if(solid(0,1)){poly([B,L,up(L,hz),up(B,hz)],wall[1]);if(!cave)wline(up(B,hz),up(L,hz),'#6b4a2a',2);}
  if(!cave&&G.up[i]!==4){ // 지지 기둥
    if(solid(1,0)&&solid(0,1)){wline(B,up(B,hz),'#7a5a34',2.4);}
  }
  const tx=sx,ty=sy+H2;
  if(G.up[i]===4){ // 사다리 / 수직갱
    cx.strokeStyle='#e6c36a';cx.lineWidth=Math.max(1,1.8*z);
    cx.beginPath();cx.moveTo(tx-5*z,ty+4*z);cx.lineTo(tx-5*z,ty-20*z);cx.moveTo(tx+5*z,ty+4*z);cx.lineTo(tx+5*z,ty-20*z);cx.stroke();
    for(let r=0;r<5;r++){cx.beginPath();cx.moveTo(tx-5*z,ty-r*5*z);cx.lineTo(tx+5*z,ty-r*5*z);cx.stroke();}
    cx.fillStyle='rgba(255,240,180,.25)';cx.beginPath();cx.ellipse(tx,ty,11*z,5.5*z,0,0,6.3);cx.fill();
  }
  if(G.mouth[i]){cx.fillStyle='rgba(140,200,235,.3)';cx.beginPath();cx.ellipse(tx,ty,14*z,7*z,0,0,6.3);cx.fill();}
  if(cave&&k>.82){cx.fillStyle='#8fd4ff';poly([[tx-2*z,ty],[tx,ty-9*z],[tx+2*z,ty]],'#8fd4ff');}
}
function renderUnder(x0,y0,x1,y1){
  const z=cam.z,w=G.w,op=G.open[0];
  cx.fillStyle='#0c0907';cx.fillRect(0,0,W,H);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=y*w+x;
    if(G.under[i]&&op[i])continue;
    if(z<.62){tileDia(x,y,-.04);const g=(19+hsh(x,y)*9)|0;cx.fillStyle=`rgb(${g+9},${g+3},${g-3})`;cx.fill();continue;}
    tileDia(x,y,-.01);const g=(19+hsh(x,y)*9)|0;cx.fillStyle=`rgb(${g+9},${g+3},${g-3})`;cx.fill();
    if(hsh(y,x*3)>.9){const [sx,sy]=toS(x+.5,y+.5);cx.fillStyle='rgba(255,255,255,.05)';cx.beginPath();cx.ellipse(sx,sy,5*z,2.5*z,0,0,6.3);cx.fill();}
  }
  // 지상 표식: 내 깃발·참호(희미하게)
  cx.globalAlpha=.22;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x;if(G.trench[i]===1&&!(G.under[i]&&op[i])){tileDia(x,y,.12);cx.fillStyle='#6fa0d8';cx.fill();}}
  cx.globalAlpha=1;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x;if(G.under[i]&&op[i])drawTunnelTile(x,y,i);}
  // 작업 표시
  for(const t of G.tasks.values()){
    if(!t.lay||t.x<x0||t.x>x1||t.y<y0||t.y>y1)continue;
    tileDia(t.x,t.y,.1);cx.fillStyle='rgba(217,173,78,.28)';cx.fill();
    cx.strokeStyle='#d9ad4e';cx.setLineDash([4,3]);cx.lineWidth=1.2;cx.stroke();cx.setLineDash([]);
    if(t.prog>0){const [sx,sy]=toS(t.x+.5,t.y+.5);cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(sx-12*z,sy-3,24*z,5);cx.fillStyle='#d9ad4e';cx.fillRect(sx-12*z,sy-3,24*z*(t.prog/t.work),5);}
  }
  uiGround(x0,y0,x1,y1);drawMarks(x0,y0,x1,y1);
  const list=[];
  for(const u of G.units){
    if(u.dead||u.state==='crew'||u.x<x0-1||u.x>x1+2||u.y<y0-1||u.y>y1+2)continue;
    if(u.lay){const i=Math.floor(u.y)*w+Math.floor(u.x);if(u.team===0||op[i])list.push({d:u.x+u.y+.2,u});}
    else if(u.team===0&&u.state!=='gar'){const [sx,sy]=toS(u.x,u.y);cx.fillStyle=u.sel?'#7dff7d':'rgba(95,165,232,.7)';cx.beginPath();cx.arc(sx,sy-3*z,Math.max(2,2.6*z),0,6.3);cx.fill();}
  }
  list.sort((a,b)=>a.d-b.d);for(const e of list)drawUnit(e.u);
  for(const f of G.fx){if(f.k==='dead'&&f.lay){}}
  // 어둠 비네팅
  const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.75);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');cx.fillStyle=g;cx.fillRect(0,0,W,H);
  cx.fillStyle='#e6c36a';cx.font='600 13px system-ui, sans-serif';cx.fillText('지하 층 · [U] 지상으로',14,H-14);
  uiTop();drawMini();
}
