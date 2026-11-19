// ================= 지하 자원: 철광석 · 금광석 · 광산 수레 =================
// G.ore[i] : 0 없음 / 1 철광석 / 2 금광석 / 3 광산 수레 (동굴 칸 위). 지하 보기에서 병사를 보내 채굴하면 자원을 얻고 사라진다.
const ORE={
  1:{n:'철광석',work:DIG_WORK*1.8,metal:[45,80]},
  2:{n:'금광석',work:DIG_WORK*2.6,metal:[30,55],money:[140,260]},
  3:{n:'광산 수레',work:DIG_WORK*1.2,money:[220,420]}
};
const _newGameO=newGame;
newGame=function(cfg){const g=_newGameO(cfg);g.ore=new Uint8Array(g.N);try{genOres(g);}catch(e){console.error('광석 생성 오류',e);}return g;};
function genOres(g){
  const w=g.w,h=g.h,r=mulberry(hashStr(g.cfg.seed+'#ore')()),cave=[],rails=[];
  for(let i=0;i<g.N;i++){if(g.under[i]!==CAVE||g.mouth[i])continue;cave.push(i);if(g.urail[i])rails.push(i);}
  if(!cave.length)return;
  const wallAdj=(i)=>{const x=i%w,y=(i/w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a<0||b<0||a>=w||b>=h||!g.under[b*w+a])return true;}return false;};
  const wall=cave.filter(i=>!g.urail[i]&&wallAdj(i));
  const put=(i,k)=>{if(g.ore[i]||g.mouth[i])return false;g.ore[i]=k;return true;};
  let ni=0,ng=0;
  for(const i of wall){
    const q=r();
    if(q<.11){if(put(i,1)){ni++;const x=i%w,y=(i/w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const j=(y+dy)*w+x+dx;if(g.under[j]===CAVE&&!g.urail[j]&&r()<.35&&put(j,1))ni++;}}}
    else if(q<.145){if(put(i,2))ng++;}
  }
  const need=(k,min)=>{let c=0;for(let i=0;i<g.N;i++)if(g.ore[i]===k)c++;let guard=0;while(c<min&&guard++<400&&wall.length){const i=wall[Math.floor(r()*wall.length)];if(put(i,k))c++;}};
  need(1,Math.max(6,Math.round(w/9)));need(2,Math.max(2,Math.round(w/30)));
  // 광산 수레: 철로 위(서로 3칸 이상 떨어뜨림), 모자라면 동굴 바닥
  const nc=Math.max(5,Math.round(w/8)),pos=[];
  const tryCart=(i)=>{if(g.ore[i]||g.mouth[i])return false;const x=i%w,y=(i/w)|0;if(pos.some(p=>Math.hypot(p[0]-x,p[1]-y)<3.2))return false;g.ore[i]=3;pos.push([x,y]);return true;};
  const rs=rails.slice().sort(()=>r()-.5);for(const i of rs){if(pos.length>=nc)break;tryCart(i);}
  const cs=cave.slice().sort(()=>r()-.5);for(const i of cs){if(pos.length>=Math.min(nc,3))break;tryCart(i);}
}
// ---- 채굴 작업 (지하 층 작업) ----
const _taskCheckO=taskCheck;
taskCheck=function(team,kind,x,y,type){
  if(kind!=='mine')return _taskCheckO(team,kind,x,y,type);
  if(!inb(x,y))return '맵 밖입니다';
  const i=y*G.w+x;
  if(!G.ore[i])return '채굴할 광물이 없습니다';
  if(!G.open[team][i])return '아직 발견하지 못한 지하입니다';
  if(G.tasks.has(tkey('mine',i)))return '이미 예약된 작업입니다';
  return null;
};
const _getTaskO=getTask;
getTask=function(team,kind,x,y,type,create){
  if(kind!=='mine')return _getTaskO(team,kind,x,y,type,create);
  const i=y*G.w+x,k=tkey('mine',i),ex=G.tasks.get(k);
  if(ex||!create)return ex||null;
  if(!G.ore[i])return null;
  return mkTaskX(team,'mine',x,y,null,ORE[G.ore[i]].work,null,1);
};
const _finishTaskO=finishTask;
finishTask=function(t){
  if(t.kind!=='mine')return _finishTaskO(t);
  G.tasks.delete(t.key);
  const i=t.idx,k=G.ore[i],T=G.teams[t.team],d=ORE[k];
  if(d){
    const got=[];
    for(const [res,nm] of [['money','달러'],['metal','금속']])if(d[res]){const v=rint(Math.random,d[res][0],d[res][1]);T.res[res]+=v;got.push(`+${v}${nm}`);}
    G.ore[i]=0;
    if(t.team===0){G.lastGain=`${d.n} 채굴 ${got.join(' ')}`;G.gainShow=4;toast(`⛏ ${d.n} — ${got.join(' ')}`);}
  }
  for(const id of [...t.workers,...t.res]){const u=G.uid.get(id);if(!u)continue;u.task=null;u.state='idle';u.path=[];pickTask(u);}
};
// 광물을 클릭/드래그하면 채굴, 나머지 칸은 기존대로(땅굴 파기)
const _commandTilesO=commandTiles;
commandTiles=function(tiles,sel,vsel,t){
  if(viewLay===1&&(tool==='dig'||tool==='demo')){
    const ore=tiles.filter(([x,y])=>G.ore[y*G.w+x]&&G.open[0][y*G.w+x]),rest=tiles.filter(([x,y])=>!(G.ore[y*G.w+x]&&G.open[0][y*G.w+x]));
    if(ore.length){
      const e=issueWork(0,'mine',ore,null,assignN,sel);
      if(tool==='dig'&&rest.length)return _commandTilesO(rest,sel,vsel,t)||e;
      return e;
    }
    if(tool==='demo')return '지하에서는 광물만 채굴할 수 있습니다 (땅굴 파기 도구로 칸을 넓히세요)';
  }
  return _commandTilesO(tiles,sel,vsel,t);
};
const _underClickO=underClick;
underClick=function(t,sel){
  const i=t[1]*G.w+t[0];
  if(G.ore[i]&&G.open[0][i]&&(tool==='dig'||tool==='demo'))return issueWork(0,'mine',[t],null,assignN,sel);
  return _underClickO(t,sel);
};
// ---- 그리기 ----
const _drawTunnelTileO=drawTunnelTile;
drawTunnelTile=function(x,y,i){_drawTunnelTileO(x,y,i);if(G.ore&&G.ore[i])drawOre(x,y,i);};
function drawOre(x,y,i){
  const z=cam.z,k=G.ore[i],[sx,sy0]=toS(x,y),sy=sy0+16*z,h=hsh(x*1.3,y*.7);
  const t=G.tasks.get(tkey('mine',i));
  const blob=(ox,oy,rx,ry,c)=>{cx.fillStyle=c;cx.beginPath();cx.ellipse(sx+ox*z,sy+oy*z,rx*z,ry*z,0,0,6.3);cx.fill();};
  cx.fillStyle='rgba(0,0,0,.28)';cx.beginPath();cx.ellipse(sx,sy+2*z,18*z,7.5*z,0,0,6.3);cx.fill();
  if(k===3){   // 광산 수레: 철로 위의 쇠 수레 + 돈 되는 광석 더미
    const P=(ax,ay)=>[sx+ax*z,sy+ay*z];
    poly([P(-14,-4),P(14,-4),P(11,-17),P(-11,-17)],'#7a5a3a','#2b1d10',1.2);
    poly([P(-14,-4),P(0,2),P(0,-11),P(-11,-17)],'#8c6a44');
    poly([P(0,2),P(14,-4),P(11,-17),P(0,-11)],'#5f4529');
    poly([P(-11,-17),P(0,-11),P(11,-17),P(0,-23)],'#2a2118');
    blob(-3,-19,6,3,'#e6c04d');blob(4,-20,5,2.6,'#c9a13a');blob(0,-22,4,2.2,'#f3d672');
    cx.strokeStyle='#d2d6da';cx.lineWidth=Math.max(1,1.4*z);cx.beginPath();cx.moveTo(...P(-14,-9));cx.lineTo(...P(0,-3));cx.lineTo(...P(14,-9));cx.stroke();
    cx.fillStyle='#2a2d31';for(const [ax,ay] of [[-9,0],[9,0]]){cx.beginPath();cx.ellipse(sx+ax*z,sy+ay*z,3.6*z,3.6*z,0,0,6.3);cx.fill();}
  }else{
    const base=k===1?['#6c5a54','#7d6a62','#59473f']:['#5b5a55','#6e6c66','#494843'];
    blob(-6,-3,11,6,base[2]);blob(6,-2,10,6,base[0]);blob(0,-9,10,7,base[1]);
    if(k===1){for(let m=0;m<6;m++)blob((hsh(m,x)-.5)*22,-9+(hsh(y,m)-.5)*12,2.6+h*1.4,1.6,m%2?'#c27a4a':'#a45a38');}
    else{for(let m=0;m<6;m++)blob((hsh(m,x)-.5)*22,-9+(hsh(y,m)-.5)*12,2.3+h*1.4,1.5,m%2?'#f1cf55':'#ffe98a');
      cx.fillStyle='rgba(255,236,150,.2)';cx.beginPath();cx.ellipse(sx,sy-8*z,15*z,8*z,0,0,6.3);cx.fill();}
  }
  if(t&&t.prog>0){cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(sx-12*z,sy-30*z,24*z,4);cx.fillStyle='#d9ad4e';cx.fillRect(sx-12*z,sy-30*z,24*z*(t.prog/t.work),4);}
}
