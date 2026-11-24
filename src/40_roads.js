// ================= 도로 · 철로 · 덤불 =================
const ROADCOL=['','#4f5258','#8b6e4a','#6e6a62'];
const ROADB={
  dirt:{n:'비포장도로',code:2,cost:{wood:2},work:1.6,desc:'차량 +20% · 나무 2'},
  paved:{n:'포장도로',code:1,cost:{metal:2,money:8},work:3.2,desc:'차량 +40% · 금속 2 · 달러 8'}
};
function roadMul(x,y){const k=G.road[Math.floor(y)*G.w+Math.floor(x)];return k===1?1.4:k?1.2:1;}
function roadCost(i){const k=G.road[i];return k===1?.4:k?.55:1;}
function hiddenUnit(e,ox,oy){
  if(e.lay||(e.reveal||0)>0||!G.brush[Math.floor(e.y)*G.w+Math.floor(e.x)])return false;
  if(ox!==undefined&&Math.hypot(e.x-ox,e.y-oy)<=1.6)return false;
  return true;
}
function clearBush(x,y,r){
  for(let dy=-Math.ceil(r);dy<=Math.ceil(r);dy++)for(let dx=-Math.ceil(r);dx<=Math.ceil(r);dx++){
    const tx=Math.floor(x)+dx,ty=Math.floor(y)+dy;
    if(inb(tx,ty)&&Math.hypot(tx+.5-x,ty+.5-y)<=r)G.brush[ty*G.w+tx]=0;
  }
}
// ---- 생성 ----
function roadTile(x,y,k,bridge){
  if(!inb(x,y))return false;const i=y*G.w+x;
  if(G.tt[i]===2){if(!bridge)return false;G.up[i]=1;G.road[i]=k;return true;}
  const o=G.obst[i];
  if(o){if(OB[o.type].building)return false;removeOb(o);}
  if(G.trench[i]===255)G.trench[i]=0;
  if(G.mouth[i])return false;
  G.road[i]=k;return true;
}
function roadLine(ax,ay,bx,by,k,bridge,r){
  let x=ax,y=ay,guard=0;roadTile(x,y,k,bridge);
  while((x!==bx||y!==by)&&guard++<3000){
    const dx=bx-x,dy=by-y,px=Math.sign(dx),py=Math.sign(dy);
    let opts=(Math.abs(dx)>Math.abs(dy)||(Math.abs(dx)===Math.abs(dy)&&r()<.5))?[[px,0],[0,py||1],[0,-(py||1)]]:[[0,py],[px||1,0],[-(px||1),0]];
    if(r()<.1&&dx&&dy)opts=[opts[0][0]?[0,py]:[px,0],opts[0]];
    let moved=false;
    for(const [ox,oy] of opts){if(!ox&&!oy)continue;if(roadTile(x+ox,y+oy,k,bridge)){x+=ox;y+=oy;moved=true;break;}}
    if(!moved)break;
  }
}
function genBush(r){
  if(G.special==='superflat'||G.special==='urbanwar')return;
  const L=lat(r),o1=r()*500,o2=r()*500,w=G.w,h=G.h,b=G.biome;
  const thr=G.special==='mineshaft'?.84:b==='swamp'?.63:b==='arid'?.76:b==='snow'?.72:.69;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x;
    if(G.obst[i]||G.tt[i]===2||G.trench[i]||G.mouth[i]||G.road[i]||G.up[i])continue;
    if(vn(L,x*.12+o1,y*.12+o2)>thr&&r()<.55)G.brush[i]=1;
  }
}
// ---- 그리기 ----
function roadLinks(x,y,k){
  const out=[];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;
    const v=G.road[ny*G.w+nx];
    if(k===3?v===3:(v>0&&v<3))out.push([dx,dy]);
  }
  return out;
}
function railGfx(x,y,L,gravel,col){
  const z=cam.z,C=toS(x+.5,y+.5);
  if(!L.length)L=[[1,0],[-1,0]];
  if(gravel){tileDia(x,y,.1);cx.fillStyle=col||'#6e6a62';cx.fill();}
  for(const [dx,dy] of L){
    const M=toS(x+.5+dx*.5,y+.5+dy*.5),vx=M[0]-C[0],vy=M[1]-C[1],len=Math.hypot(vx,vy)||1,ux=vx/len,uy=vy/len,px=-uy,py=ux;
    // 단단한 밸러스트 가장자리와 목재 침목을 고정 간격으로 그려 타일 경계에서 철로가 이어진다.
    cx.strokeStyle='rgba(48,43,36,.62)';cx.lineWidth=Math.max(1,4.8*z);cx.beginPath();
    for(const side of [-1,1]){cx.moveTo(C[0]+px*5.4*z*side,C[1]+py*4.8*z*side);cx.lineTo(M[0]+px*5.4*z*side,M[1]+py*4.8*z*side);}
    cx.stroke();
    [.12,.37,.62,.87].forEach((t,n)=>{
      const bx=C[0]+vx*t,by=C[1]+vy*t,lean=(n%2?1:-1)*.6*z;
      cx.strokeStyle='rgba(31,29,25,.42)';cx.lineWidth=Math.max(2,3.5*z);cx.beginPath();cx.moveTo(bx-px*7.2*z-ux*lean,by-py*6.5*z-uy*lean);cx.lineTo(bx+px*7.2*z+ux*lean,by+py*6.5*z+uy*lean);cx.stroke();
      cx.strokeStyle='#786447';cx.lineWidth=Math.max(1,2.3*z);cx.beginPath();cx.moveTo(bx-px*7*z-ux*lean,by-py*6.3*z-uy*lean);cx.lineTo(bx+px*7*z+ux*lean,by+py*6.3*z+uy*lean);cx.stroke();
    });
    // 레일은 어두운 웹과 밝은 상단 헤드 두 겹으로 금속 단면을 표현한다.
    cx.strokeStyle='#34383b';cx.lineWidth=Math.max(2,3.2*z);cx.beginPath();
    for(const side of [-1,1]){cx.moveTo(C[0]+px*3.6*z*side,C[1]+py*3.2*z*side);cx.lineTo(M[0]+px*3.6*z*side,M[1]+py*3.2*z*side);}
    cx.stroke();
    cx.strokeStyle='#c2c7c9';cx.lineWidth=Math.max(1,1.15*z);cx.beginPath();
    for(const side of [-1,1]){cx.moveTo(C[0]+px*3.6*z*side-.35*z,C[1]+py*3.2*z*side-.35*z);cx.lineTo(M[0]+px*3.6*z*side-.35*z,M[1]+py*3.2*z*side-.35*z);}
    cx.stroke();
  }
}
function drawRoadTile(x,y,i){
  const k=G.road[i];if(!k||G.up[i]===1)return;
  const z=cam.z,L=roadLinks(x,y,k);
  if(k===3){railGfx(x,y,L,true);return;}
  const C=toS(x+.5,y+.5);
  if(k===1){
    tileDia(x,y,0);cx.fillStyle=hsh(x,y)>.5?'#4d5055':'#53565b';cx.fill();
    const has=(dx,dy)=>L.some(l=>l[0]===dx&&l[1]===dy);
    cx.strokeStyle='rgba(175,178,180,.75)';cx.lineWidth=Math.max(1,1.6*z);cx.beginPath();
    if(!has(1,0)){const a=toS(x+1,y),b=toS(x+1,y+1);cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);}
    if(!has(-1,0)){const a=toS(x,y),b=toS(x,y+1);cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);}
    if(!has(0,1)){const a=toS(x,y+1),b=toS(x+1,y+1);cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);}
    if(!has(0,-1)){const a=toS(x,y),b=toS(x+1,y);cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);}
    cx.stroke();
    if(L.length){
      cx.strokeStyle='rgba(235,220,130,.8)';cx.lineWidth=Math.max(1,1.3*z);cx.setLineDash([5*z,6*z]);cx.beginPath();
      for(const [dx,dy] of L){const M=toS(x+.5+dx*.5,y+.5+dy*.5);cx.moveTo(C[0],C[1]);cx.lineTo(M[0],M[1]);}
      cx.stroke();cx.setLineDash([]);
    }
  }else{
    tileDia(x,y,.06);cx.fillStyle='rgba(139,110,74,.92)';cx.fill();
    cx.fillStyle='rgba(95,72,46,.5)';
    for(let s=0;s<3;s++){cx.beginPath();cx.ellipse(C[0]+(hsh(x+s,y)-.5)*30*z,C[1]+(hsh(y+s,x)-.5)*12*z,2.5*z,1.2*z,0,0,6.3);cx.fill();}
    if(L.length){
      cx.strokeStyle='rgba(70,52,33,.55)';cx.lineWidth=Math.max(1,1.4*z);cx.beginPath();
      for(const [dx,dy] of L){const M=toS(x+.5+dx*.5,y+.5+dy*.5),vx=M[0]-C[0],vy=M[1]-C[1],len=Math.hypot(vx,vy)||1,px=-vy/len,py=vx/len;
        for(const s of [-1,1]){cx.moveTo(C[0]+px*4*z*s,C[1]+py*3.5*z*s);cx.lineTo(M[0]+px*4*z*s,M[1]+py*3.5*z*s);}}
      cx.stroke();
    }
  }
}
function drawUndRail(x,y,i){
  const L=[];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(inb(nx,ny)&&G.urail[ny*G.w+nx]&&G.under[ny*G.w+nx])L.push([dx,dy]);}
  railGfx(x,y,L,false);
}
function drawBush(x,y){
  const z=cam.z,[sx,sy]=toS(x+.5,y+.5),pl=TREEPAL[G.biome].leaf,h=hsh(x,y);
  cx.fillStyle='rgba(0,0,0,.2)';cx.beginPath();cx.ellipse(sx,sy+1*z,19*z,7*z,0,0,6.3);cx.fill();
  for(let k=0;k<5;k++){
    const ox=(hsh(x+k,y*3)-.5)*26*z,oy=(hsh(x*3,y+k)-.5)*8*z,r=(8+hsh(k,x+y)*4)*z;
    cx.fillStyle=pl[(k+((h*4)|0))%4];cx.beginPath();cx.arc(sx+ox,sy-5*z+oy,r,0,6.3);cx.fill();
  }
  cx.fillStyle='rgba(255,255,255,.1)';
  for(let k=0;k<4;k++){cx.beginPath();cx.arc(sx+(hsh(x,y+k*7)-.5)*24*z,sy-10*z+(hsh(y,x+k*5)-.5)*6*z,2.3*z,0,6.3);cx.fill();}
}
// ---- 도로 건설 작업 ----
const _tcR=taskCheck;
const BUSH_WORK=1.4;
taskCheck=function(team,kind,x,y,type){
  if(kind==='clr'){
    if(!inb(x,y))return '맵 밖입니다';
    const i=y*G.w+x;
    if(G.obst[i])return '장애물이 있습니다';
    if(!G.brush[i])return '덤불이 없습니다';
    if(G.tasks.has(tkey('clr',i)))return '이미 예약된 작업입니다';
    return null;
  }
  if(kind!=='road')return _tcR(team,kind,x,y,type);
  const B=ROADB[type];if(!B)return '알 수 없는 도로';
  if(!inb(x,y))return '맵 밖입니다';
  const i=y*G.w+x;
  if(G.tt[i]===2||G.up[i])return '물·다리·개량 칸 위에는 놓을 수 없습니다';
  if(G.obst[i])return '장애물이 있어 놓을 수 없습니다';
  if(G.trench[i])return '참호·구덩이 위에는 놓을 수 없습니다';
  if(G.mouth[i])return '동굴 입구입니다';
  if(padAt(x,y)>=0)return '헬리패드 위에는 불가합니다';
  if(G.road[i]===3)return '철로 위에는 놓을 수 없습니다';
  if(G.road[i]===B.code)return '이미 같은 도로입니다';
  if(G.road[i]===1)return '이미 포장도로입니다';
  if(G.tasks.has(tkey('road',i)))return '이미 예약된 작업입니다';
  if(!canAfford(G.teams[team],B.cost))return '자원이 부족합니다';
  return null;
};
const _gtR=getTask;
getTask=function(team,kind,x,y,type,create){
  if(kind==='clr'){
    const i=y*G.w+x,ex=G.tasks.get(tkey('clr',i));
    if(ex||!create)return ex||null;
    if(!G.brush[i]||G.obst[i])return null;
    return mkTaskX(team,'clr',x,y,null,BUSH_WORK,null,0);
  }
  if(kind!=='road')return _gtR(team,kind,x,y,type,create);
  const i=y*G.w+x,k=tkey('road',i),ex=G.tasks.get(k);
  if(ex||!create)return ex||null;
  const B=ROADB[type],T=G.teams[team];
  if(!B||!canAfford(T,B.cost))return null;
  pay(T,B.cost);return mkTaskX(team,'road',x,y,type,B.work,B.cost,0);
};
const _ftR=finishTask;
finishTask=function(t){
  if(t.kind==='clr'){
    G.tasks.delete(t.key);G.brush[t.idx]=0;
    const w=rint(Math.random,1,2);G.teams[t.team].res.wood+=w;if(t.team===0){G.lastGain=`덤불 제거 +${w}나무`;G.gainShow=3;}
    fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.5,kind:'demo'});sfx('dig',t.x+.5,t.y+.5);
    for(const id of [...t.workers,...t.res]){const u=G.uid.get(id);if(!u)continue;u.task=null;u.state='idle';u.path=[];pickTask(u);}
    return;
  }
  if(t.kind==='road'){
    G.tasks.delete(t.key);G.road[t.idx]=ROADB[t.type].code;G.brush[t.idx]=0;
    fxPush({k:'dust',x:t.x+.5,y:t.y+.5,t:0,d:.5});sfx('done',t.x+.5,t.y+.5);
    for(const id of [...t.workers,...t.res]){const u=G.uid.get(id);if(!u)continue;u.task=null;u.state='idle';u.path=[];pickTask(u);}
    return;
  }
  _ftR(t);
  if(t.kind==='dig'&&!G.tasks.has(t.key)){G.brush[t.idx]=0;G.road[t.idx]=0;}
};
