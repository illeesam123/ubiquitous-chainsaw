// ================= AI: 실시간 상황 대응 지휘 =================
function foesNear(T,x,y,r){
  let n=0,sx=0,sy=0,veh=0;
  for(const e of G.units){
    if(e.dead||e.state==='crew'||e.team===T.id||e.lay||inRoof(e)||hiddenUnit(e))continue;
    if(Math.hypot(e.x-x,e.y-y)<=r){n++;sx+=e.x;sy+=e.y;}
  }
  for(const v of G.vehicles){
    if(v.dead||v.team===T.id)continue;
    if(Math.hypot(v.x-x,v.y-y)<=r){n+=3;veh++;sx+=v.x*3;sy+=v.y*3;}
  }
  return {n,veh,x:n?sx/n:x,y:n?sy/n:y};
}
function friendsNear(T,x,y,r){
  let n=0;
  for(const u of G.units)if(!u.dead&&u.team===T.id&&u.state!=='crew'&&!u.lay&&Math.hypot(u.x-x,u.y-y)<=r)n++;
  for(const v of G.vehicles)if(!v.dead&&v.team===T.id&&Math.hypot(v.x-x,v.y-y)<=r)n+=3;
  return n;
}
function nearestOwnTrench(T,x,y,maxd){
  let best=null,bd=maxd*maxd;
  for(const ti of T.trench){
    if(G.trench[ti]!==T.id+1||G.up[ti]===2||G.up[ti]===3)continue;
    const tx=ti%G.w,ty=(ti/G.w)|0,d=(tx-x)*(tx-x)+(ty-y)*(ty-y);
    if(d<bd){bd=d;best=[tx,ty];}
  }
  return best;
}
function aiBuildNear(T,free,take,focus,types){
  if(free.length<2||T.trench.length<=8)return;
  const type=types[Math.floor(Math.random()*types.length)];
  if(!OB[type]||!canAfford(T,OB[type].cost))return;
  let best=null,bs=1e9;
  for(let k=0;k<36;k++){
    const ti=T.trench[Math.floor(Math.random()*T.trench.length)],x=ti%G.w,y=(ti/G.w)|0;
    const nx=x+rint(Math.random,-1,1),ny=y+rint(Math.random,-1,1);
    if(taskCheck(T.id,'build',nx,ny,type))continue;
    const d=Math.hypot(nx-focus.x,ny-focus.y);if(d<bs){bs=d;best=[nx,ny];}
  }
  if(best){const t=getTask(T.id,'build',best[0],best[1],type,true);if(t)orderTasks(take(Math.min(3,free.length)),[t]);}
}
function aiTunnel(T,A,tf,free,take){
  if(G.time<140||free.length<2)return;
  if(A.shaft===undefined){
    if(Math.random()>.35||T.trench.length<12)return;
    let bi=-1,bd=1e9;
    for(const ti of T.trench){
      if(G.trench[ti]!==T.id+1||G.up[ti])continue;
      const d=Math.hypot(ti%G.w-tf.x,((ti/G.w)|0)-tf.y);if(d<bd){bd=d;bi=ti;}
    }
    if(bi<0)return;
    const x=bi%G.w,y=(bi/G.w)|0;
    if(taskCheck(T.id,'upg',x,y,'shaft'))return;
    const t=getTask(T.id,'upg',x,y,'shaft',true);
    if(t){orderTasks(take(2),[t]);A.shaft=bi;A.shaftAt=G.time;}
    return;
  }
  if(G.up[A.shaft]!==4){if(G.time-A.shaftAt>90)A.shaft=undefined;return;}
  if(A.tunHead===undefined)A.tunHead=A.shaft;
  if(G.under[A.tunHead]!==T.id+1)return; // 마지막 칸이 아직 파이는 중
  if((A.tunLen||0)>=Math.min(46,10+G.w*.35))return;
  let cx=A.tunHead%G.w,cy=(A.tunHead/G.w)|0;const tiles=[];
  for(let s=0;s<4;s++){
    const dx=tf.x-cx,dy=tf.y-cy;
    const opts=Math.abs(dx)>=Math.abs(dy)?[[Math.sign(dx),0],[0,Math.sign(dy)||1],[0,-(Math.sign(dy)||1)]]:[[0,Math.sign(dy)],[Math.sign(dx)||1,0],[-(Math.sign(dx)||1),0]];
    let moved=false;
    for(const [ox,oy] of opts){
      if(!ox&&!oy)continue;const nx=cx+ox,ny=cy+oy;
      if(!inb(nx,ny)||G.tt[ny*G.w+nx]===2||G.under[ny*G.w+nx])continue;
      tiles.push([nx,ny]);cx=nx;cy=ny;moved=true;break;
    }
    if(!moved)break;
  }
  if(tiles.length){
    const e=issueTiles(T.id,take(Math.min(3,free.length)),'tun',tiles);
    if(!e){A.tunHead=tiles[tiles.length-1][1]*G.w+tiles[tiles.length-1][0];A.tunLen=(A.tunLen||0)+tiles.length;}
  }
}

// ---- AI 성향 · 전술 ----
// 성향(persona)은 팀마다 한 번 정해지고, 원정 부대를 보낼 때마다 전술(tactic)을 새로 고른다.
//  frontal 정면 진격 · rush 전력 돌격(후퇴 없음) · flank 측면 우회 · ambush 덤불 매복 후 기습
const AIP={
  aggressive:{delay:.55,frac:.8,ready:.6,ret:2.6,dig:.8,w:{rush:.35,frontal:.25,flank:.25,ambush:.15}},
  defensive:{delay:1.45,frac:.5,ready:1.3,ret:1.2,dig:1.5,w:{frontal:.4,flank:.2,ambush:.4,rush:0}},
  tricky:{delay:1,frac:.55,ready:.95,ret:1.5,dig:1,w:{ambush:.4,flank:.45,frontal:.1,rush:.05}},
  balanced:{delay:1,frac:.6,ready:1,ret:1.6,dig:1,w:{frontal:.4,flank:.3,ambush:.2,rush:.1}}
};
function aiPickTactic(P,strengthRatio,hasBush,A){
  const w=Object.assign({},P.w);
  if(A&&A.tw)for(const k in w)w[k]*=A.tw[k]||1;   // 지난 원정 성과로 보정
  if(!hasBush)w.ambush=0;
  if(strengthRatio>1.5)w.rush=(w.rush||0)+.25;
  if(strengthRatio<.9){w.rush=0;w.flank=(w.flank||0)+.15;}
  let tot=0;for(const k in w)tot+=w[k];let r=Math.random()*tot;
  for(const k in w){r-=w[k];if(r<=0)return k;}
  return 'frontal';
}
function aiFindBush(px,py,r){
  let best=null,bd=1e9;
  for(let dy=-r;dy<=r;dy+=1)for(let dx=-r;dx<=r;dx+=1){
    const x=Math.round(px+dx),y=Math.round(py+dy);
    if(!inb(x,y))continue;const i=y*G.w+x;
    if(!G.brush[i]||G.obst[i]||G.tt[i]===2||G.trench[i])continue;
    const d=Math.hypot(dx,dy);if(d<bd){bd=d;best=[x,y];}
  }
  return best;
}
function aiTick(T,dt){
  const A=T.ai;
  T.apT=(T.apT||0)-dt;
  if(T.apT<=0&&G.phase==='play'){T.apT=AIX.every*(.9+Math.random()*.2);try{aiPlus(T);}catch(e){console.error('[AI+]',e);}}
  A.next-=dt;if(A.next>0)return;
  A.next=1.3+Math.random()*.5;
  aiShop(T);
  const mine=G.units.filter(u=>u.team===T.id&&!u.dead&&u.state!=='crew');if(!mine.length)return;
  const foes=G.flags.filter(f=>f.team!==T.id&&G.teams[f.team].alive);if(!foes.length)return;
  const my=T.flag,W2=G.w;
  const mineStr=teamCount(T.id);
  // 목표 선택: 가깝고 약한 상대를 우선
  let tf=foes[0],bs=1e9;
  for(const f of foes){const s=Math.hypot(f.x-my.x,f.y-my.y)*.6+teamCount(f.team)*1.8-Math.min(30,aiUnderAttack(T,f)*2.5);if(s<bs){bs=s;tf=f;}}
  const enemyStr=Math.max(1,teamCount(tf.team));
  // 지하 작업이 끝나 노는 병사는 지상으로 복귀
  {
    const ug=mine.filter(u=>u.lay&&!u.dead&&!u.task&&!u.queue.length&&u.state==='idle'&&!u.after&&!u.medTarget);
    for(const u of ug){
      u.ugIdle=(u.ugIdle||0)+1;
      if(u.ugIdle<2)continue;u.ugIdle=0;
      const sh=A.shaft!==undefined&&G.up[A.shaft]===4?A.shaft:null;
      orderMoveL([u],sh!==null?sh%W2:Math.floor(u.x),sh!==null?(sh/W2)|0:Math.floor(u.y),0);
    }
  }
  const fighters=mine.filter(u=>!u.gar&&!u.lay&&!['med','medwait','medmove','medqueue'].includes(u.state));
  A.squad=(A.squad||[]).filter(id=>{const u=G.uid.get(id);return u&&!u.dead&&u.team===T.id;});
  const inSquad=new Set(A.squad);
  let free=mine.filter(u=>!u.gar&&!u.lay&&!u.garTarget&&!u.task&&u.state!=='move'&&u.state!=='work'&&!u.queue.length&&!inSquad.has(u.id)&&!u.aiRole);
  const take=(n)=>free.splice(0,n);
  const tanks=G.vehicles.filter(v=>v.team===T.id&&!v.dead&&v.type==='tank');
  const homeR=12+G.w*.05;
  const home=foesNear(T,my.x,my.y,homeR);
  if(!A.persona){const r=Math.random();A.persona=r<.26?'aggressive':r<.5?'defensive':r<.76?'tricky':'balanced';A.side=Math.random()<.5?-1:1;}
  const P=AIP[A.persona];
  if(A.attackAt===undefined)A.attackAt=(40+G.w*.6+Math.random()*25)*P.delay;

  // ── 1. 본진 방어: 가까운 적이 있으면 즉시 대응 ──
  if(home.n>0){
    A.mode='defend';
    const rally=nearestOwnTrench(T,home.x,home.y,homeR+4)||[my.x,my.y];
    // 원정 부대가 열세인데 본진이 위험하면 복귀
    const homeFr=friendsNear(T,my.x,my.y,homeR);
    let react=fighters.filter(u=>!u.task||u.state!=='work');
    if(home.n>homeFr*1.2){
      react=fighters; // 위급: 작업 중인 병사까지 전원 투입
      if(A.squad.length){A.f=Math.max(0,(A.f||0)-.4);A.attackAt=G.time+18;}
    }
    const mv=react.filter(u=>Math.hypot(u.x-rally[0],u.y-rally[1])>3.5).slice(0,Math.max(3,Math.ceil(fighters.length*.8)));
    if(mv.length)orderMove(mv,rally[0],rally[1]);
    if(tanks.length)orderVehicles(tanks.filter(v=>Math.hypot(v.x-home.x,v.y-home.y)>6),Math.round(home.x+(my.x-home.x)*.35),Math.round(home.y+(my.y-home.y)*.35));
    const enemyVeh=home.veh>0;
    aiBuildNear(T,free,take,home,enemyVeh?['mortar','bunker','mg','tank','sandbag']:['mg','sandbag','sandbag','tower','bunker']);
    A.squad=[]; // 방어 중에는 원정 부대를 해체해 전력을 본진에 집중
    return;
  }
  A.mode='macro';

  // ── 2. 원정 부대 운용: 집결 → 진격(단계별 전진) → 접촉 판단 → 후퇴 ──
  const dxl=tf.x-my.x,dyl=tf.y-my.y,L=Math.hypot(dxl,dyl)||1;
  const lat=A.tactic==='flank'?A.side*L*.3:0,px0=-dyl/L,py0=dxl/L;   // 우회 전술: 진격선에서 옆으로 호를 그리며 접근
  const wpAt=(f)=>{const o=lat*Math.sin(Math.PI*Math.min(1,f));return [clamp(Math.round(my.x+dxl*f+px0*o),1,G.w-2),clamp(Math.round(my.y+dyl*f+py0*o),1,G.h-2)];};
  const strengthRatio=mineStr/enemyStr;
  const prepared=fighters.length>=8&&strengthRatio>.9;
  const ready=G.time>A.attackAt*(prepared?.5:1)&&(strengthRatio>.6*P.ready||prepared||G.time>A.attackAt+35);
  if(!A.squad.length&&ready&&fighters.length>=4){
    const pool=fighters.filter(u=>(!u.task||u.state!=='work')&&!u.aiRole).sort((a,b)=>aiRoleRank(a)-aiRoleRank(b)||Math.hypot(a.x-tf.x,a.y-tf.y)-Math.hypot(b.x-tf.x,b.y-tf.y));   // 돌격소총·소총수 우선, 저격·경기관총은 진지 역할
    // 전술 선택: 매복 후보 덤불을 진격선 60% 지점 근처에서 찾는다
    const bushSpot=aiFindBush(my.x+dxl*.6+(-dyl/L)*A.side*L*.1,my.y+dyl*.6+(dxl/L)*A.side*L*.1,12);
    A.tactic=aiPickTactic(P,strengthRatio,!!bushSpot,A);
    if(A.tactic==='flank')A.side=aiPickSide(T,my,tf,dxl,dyl,L);   // 위협이 약한 쪽으로 우회
    A.ambush=A.tactic==='ambush'?bushSpot:null;A.ambushGo=false;A.ambushT=0;
    const frac=A.tactic==='rush'?.9:(strengthRatio>1.3?P.frac+.15:P.frac);
    const take2=pool.slice(0,Math.max(4,Math.floor(fighters.length*frac)));
    A.squad=take2.map(u=>u.id);A.f=A.tactic==='rush'?.3:.12;A.hold=0;A.mode='gather';
    const wp=A.ambush?A.ambush:wpAt(A.f);orderMove(take2,wp[0],wp[1]);
    if(tanks.length)orderVehicles(tanks,wp[0],wp[1]);
  }else if(A.squad.length&&A.tactic==='ambush'&&A.ambush&&!A.ambushGo){
    // 매복: 덤불에 모여 숨어 있다가, 적이 접근하거나 시간이 지나면 기습으로 전환
    A.mode='ambush';
    const sq=A.squad.map(id=>G.uid.get(id)).filter(Boolean),sp=A.ambush;
    const there=sq.filter(u=>Math.hypot(u.x-sp[0],u.y-sp[1])<4.5);
    if(there.length<sq.length*.6){const far=sq.filter(u=>!there.includes(u)&&u.state!=='move');if(far.length)orderMove(far,sp[0],sp[1]);}
    else{
      A.ambushT++;
      const trig=foesNear(T,sp[0],sp[1],11);
      if(trig.n>0||A.ambushT>20){A.ambushGo=true;A.f=Math.max(A.f||0,.65);A.tactic='frontal';}
    }
  }else if(A.squad.length){
    const sq=A.squad.map(id=>G.uid.get(id));
    let sx=0,sy=0;for(const u of sq){sx+=u.x;sy+=u.y;}sx/=sq.length;sy/=sq.length;
    const local=foesNear(T,sx,sy,11),mineLocal=friendsNear(T,sx,sy,9);
    const tight=sq.filter(u=>Math.hypot(u.x-sx,u.y-sy)<6).length/sq.length;
    if(A.tactic!=='rush'&&local.n>mineLocal*P.ret+1&&local.n>=3){
      // 후퇴: 가까운 아군 참호/의무막사로 물러나 재편성
      A.mode='retreat';
      const back=nearestOwnTrench(T,sx+(my.x-sx)*.4,sy+(my.y-sy)*.4,18)||[my.x,my.y];
      orderMove(sq,back[0],back[1]);
      if(tanks.length)orderVehicles(tanks,back[0],back[1]);
      A.f=Math.max(.05,(A.f||0)-.25);A.attackAt=G.time+12+Math.random()*10;A.squad=[];
    }else if(local.n>0){
      A.mode='fight'; // 교전 중에는 전진하지 않고 진지 유지 · 전차는 화력 지원
      if(tanks.length)orderVehicles(tanks.filter(v=>Math.hypot(v.x-sx,v.y-sy)>5),Math.round(sx),Math.round(sy));
      A.hold=(A.hold||0)+1;
      if(A.hold>8&&mineLocal>local.n*1.15){const wp=wpAt(Math.min(1,(A.f||0)+.06));orderMove(sq,wp[0],wp[1]);A.hold=0;}
    }else if(tight>=.65||(A.hold||0)>6){
      A.mode='advance';A.hold=0;
      A.f=Math.min(1,(A.f||0)+(10/L));
      const stop=Math.max(0,1-5/L),f=Math.min(A.f,stop),wp=wpAt(f);
      orderMove(sq,wp[0],wp[1]);
      if(tanks.length)orderVehicles(tanks,wpAt(Math.max(0,f-2/L))[0],wpAt(Math.max(0,f-2/L))[1]);
      if(A.f>=1){A.f=.9;}
    }else{A.hold=(A.hold||0)+1;A.mode='gather';} // 뒤처진 병력을 기다림
    // 증원: 놀고 있는 병사를 합류시킴
    if(A.squad.length&&free.length>=3&&mineStr>enemyStr){
      const add=take(2);for(const u of add)A.squad.push(u.id);
      const wp=wpAt(Math.max(.1,(A.f||.1)-.08));orderMove(add,wp[0],wp[1]);
    }
  }

  // ── 3. 후방 운영: 철거·건설·굴착·주둔 ──
  if(free.length>=2&&(T.res.wood<25||T.res.metal<8||T.res.money<30)){
    let best=null,b2=1e9;
    for(const o of G.obSet){
      if(!o.natural||OB[o.type].nodemo||G.tasks.has(tkey('demo',o.idx)))continue;
      const d=Math.hypot(o.x-my.x,o.y-my.y);
      if(d<16&&d<b2){b2=d;best=o;}
    }
    if(best){const t=getTask(T.id,'demo',best.x,best.y,null,true);if(t)orderTasks(take(Math.min(3,free.length)),[t]);}
  }
  const enemyNearAll=foesNear(T,my.x,my.y,26);
  let types;
  if(enemyNearAll.veh>0)types=['mortar','bunker','mg','tank','mg'];
  else if(mineStr<8)types=['medbay','mg','tower'];
  else if(mineStr>enemyStr*1.3)types=['tank','truck','mortar','mg','sandbag'];
  else types=['mg','tower','bunker','mortar','medbay','tank','truck','sandbag','sandbag'];
  if(A.persona==='defensive')types=types.concat(['mg','bunker','mortar','tower']);
  if(A.persona==='aggressive')types=types.concat(['tank','truck']);
  types=types.concat(aiTuneTypes(T,types));
  aiBuildNear(T,free,take,tf,types);
  // 참호 굴착 / 포탄 구덩이 개조 / 개량
  if(free.length>=2&&T.trench.length<Math.round((40+G.w*1.1)*P.dig)){
    let fi=T.trench[0],fd=1e9;
    for(const ti of T.trench){const d=Math.hypot(ti%G.w-tf.x,((ti/G.w)|0)-tf.y);if(d<fd){fd=d;fi=ti;}}
    let cx2=fi%G.w,cy2=(fi/G.w)|0;const tiles=[];
    for(let s=0;s<5;s++){
      const dx=tf.x-cx2,dy=tf.y-cy2;
      const opts=Math.abs(dx)>=Math.abs(dy)?[[Math.sign(dx),0],[0,Math.sign(dy)||1],[0,-(Math.sign(dy)||1)]]:[[0,Math.sign(dy)],[Math.sign(dx)||1,0],[-(Math.sign(dx)||1),0]];
      let moved=false;
      for(const [ox,oy] of opts){
        if(!ox&&!oy)continue;const nx=cx2+ox,ny=cy2+oy;
        if(!inb(nx,ny)||G.obst[ny*G.w+nx]||(G.trench[ny*G.w+nx]&&G.trench[ny*G.w+nx]!==255))continue;
        tiles.push([nx,ny]);cx2=nx;cy2=ny;moved=true;break;
      }
      if(!moved)break;
    }
    if(tiles.length)issueTiles(T.id,take(Math.min(5,free.length)),'dig',tiles);
  }
  if(free.length>=2&&Math.random()<.22){
    // 최전방 참호에 천장+사다리, 또는 물가에 다리
    let fi=-1,fd=1e9;
    for(const ti of T.trench){if(G.trench[ti]!==T.id+1||G.up[ti])continue;const d=Math.hypot(ti%G.w-tf.x,((ti/G.w)|0)-tf.y);if(d<fd){fd=d;fi=ti;}}
    if(fi>=0){
      const x=fi%G.w,y=(fi/G.w)|0;
      if(!taskCheck(T.id,'upg',x,y,'roof')){const t=getTask(T.id,'upg',x,y,'roof',true);if(t)orderTasks(take(2),[t]);A.roofIdx=fi;}
    }
  }
  if(A.roofIdx!==undefined&&G.up[A.roofIdx]===2&&free.length>=1){
    const x=A.roofIdx%G.w,y=(A.roofIdx/G.w)|0;
    if(!taskCheck(T.id,'upg',x,y,'ladder')){const t=getTask(T.id,'upg',x,y,'ladder',true);if(t)orderTasks(take(1),[t]);}
    A.roofIdx=undefined;
  }
  aiTunnel(T,A,tf,free,take);
  if(free.length&&Math.random()<.5){ // 가까운 포탄 구덩이를 메워 길을 정리
    let c=null;
    for(let k=0;k<12&&!c;k++){const ti=T.trench[Math.floor(Math.random()*T.trench.length)];if(ti===undefined)break;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=ti+dy*G.w+dx;if(G.trench[n]===255&&!G.obst[n]&&!G.tasks.has(tkey('fill',n))){c=n;break;}}}
    if(c!==null){const t=getTask(T.id,'dig',c%G.w,(c/G.w)|0,null,true);if(t)orderTasks(take(1),[t]);} // 구덩이를 참호로 개조
  }
  if(free.length){
    let garN=mine.filter(u=>u.gar||u.garTarget).length;
    const garCap=Math.ceil(mine.length*(A.persona==='aggressive'?.12:A.persona==='defensive'?.38:.22));
    for(const o of G.obSet){
      if(!free.length||garN>=garCap)break;
      const d=OB[o.type];
      if(!d.slots||(!d.gun&&o.type!=='mortar'&&o.type!=='medbay')||o.occ.length>=d.slots)continue;
      if(!(o.natural||o.team===T.id)||(o.occTeam!==-1&&o.occTeam!==T.id&&o.occ.length))continue;
      if(Math.hypot(o.x-my.x,o.y-my.y)>11)continue;
      orderGarrison(take(1),o);garN++;
    }
  }
}

// ================= AI 강화 (구 58_ai-plus.js, 지휘 AI 에 통합): 플레이어가 쓸 수 있는 수단을 AI 도 쓴다 =================
//  1) 무기고를 짓고, 성향에 맞는 총기·수류탄을 헬기로 사서 병사에게 바꿔 준다
//  2) 지형에 막히면(절벽·물) 사다리/다리를 놓아 적 본진까지 길을 낸다
//  3) 동굴을 탐사하고 광석을 캔다
// 기본 지휘(18_ai-brain.js)는 그대로 두고, 이 모듈은 몇 초마다 한 번 '보조 판단'만 한다.
const AIX={every:4.5,linkEvery:14};
const AI_WPREF={   // 성향별 총기 선호 (가중치)
  aggressive:{assault:4,at:2,pistol:2,lmg:2,sniper:1},
  defensive:{lmg:4,sniper:3,assault:2,at:2,pistol:1},
  tricky:{sniper:4,pistol:3,assault:2,lmg:1,at:1},
  balanced:{assault:4,lmg:2,sniper:2,pistol:1,at:2}
};
function aiPick(w){let t=0;for(const k in w)t+=w[k];let r=Math.random()*t;for(const k in w){r-=w[k];if(r<=0)return k;}return Object.keys(w)[0];}
function aiUnderAttack(T,f){
  let n=0;
  for(const u of G.units){if(u.dead||u.team===f.team||u.team===T.id||u.team<0)continue;if(Math.hypot(u.x-f.x,u.y-f.y)<26)n++;}
  return n;
}
function aiFreeUnits(T){
  const sq=new Set((T.ai&&T.ai.squad)||[]);
  return G.units.filter(u=>u.team===T.id&&!u.dead&&u.state==='idle'&&!u.gar&&!u.garTarget&&!u.lay&&!u.task&&!u.queue.length&&!u.fetch&&!u.wf&&!u.item&&!sq.has(u.id));
}
// ---- 1. 무기고 · 총기 · 수류탄 ----
function aiArms(T,free){
  const A=T.ai,P=AIP[A.persona||'balanced']||AIP.balanced,mineN=popOf(T.id);
  if(!armories(T.id).length){
    A.saving=mineN>=10&&G.time>100&&T.trench.length>10;   // 무기고 값을 모으는 동안 충원을 잠시 미룬다
    if(mineN>=8&&T.trench.length>10&&free.length>=2&&canAfford(T,OB.armory.cost))
      aiBuildNear(T,free,(n)=>free.splice(0,n),T.flag,['armory']);
    return;
  }
  A.saving=false;
  // 입고된 총기를 병사에게 (소총 → 새 무기)
  const rifles=wCount(T.id,'rifle');
  for(const k of WEAPBUY){
    const have=wst(T)[k]|0;if(have<1||rifles<1)continue;
    if((T.swaps||[]).some(s=>s.to===k&&(s.left>0||s.fly>0)))continue;
    swapAdd(T.id,'rifle',k,Math.min(have,Math.max(1,Math.floor(rifles*.7))));
  }
}
// 헬기 구매 한 건(총기 또는 수류탄). 샀으면 true
function aiArmsBuy(T){
  const A=T.ai;if(!A||!T.pad||!armories(T.id).length||T.order.lines.length>=5)return false;
  const mineN=popOf(T.id),enemyVeh=G.vehicles.some(v=>!v.dead&&v.team!==T.id);
  const w=Object.assign({},AI_WPREF[A.persona||'balanced']);
  if(enemyVeh)w.at=(w.at||0)+4;else w.at=Math.min(w.at||0,1);
  aiTuneW(T,w);
  const held=WEAPBUY.reduce((a,k)=>a+wCount(T.id,k)+(wst(T)[k]|0)+pendingWk(T,k),0);
  if(held<Math.ceil(mineN*.7)){
    const k=aiPick(w),want=WEAP[k].price<=60?4:WEAP[k].price<=100?3:2,n=Math.min(want,Math.floor((T.res.money-20)/WEAP[k].price));
    if(n>=1&&!shopAddWeapon(T.id,k,n))return true;
  }
  if(armFree(T.id)>=3&&pendingExp(T)<6&&T.res.money>=90){
    const k=aiPick(aiTuneExp(T,{frag:4,molotov:2,flash:2,smoke:1}));
    if(!shopAddExp(T.id,k,3))return true;
  }
  return false;
}
function pendingWk(T,k){let n=0;for(const l of T.order.lines)if(l.kind==='wpn'&&l.item===k)n+=l.n;return n;}
const _aiShopP=aiShop;
aiShop=function(T){
  if(T.ai&&T.ai.saving)return;
  if(T.ai&&aiTrade(T))return;
  if(T.ai&&popOf(T.id)>=10&&Math.random()<.8&&aiArmsBuy(T))return;
  return _aiShopP(T);
};
// ---- 2. 지형 연결 (사다리 · 다리) ----
function aiReach(T){
  const w=G.w,N=G.N,seen=new Uint8Array(N),q=[];
  const s=T.flag.y*w+T.flag.x;seen[s]=1;q.push(s);
  const walk=(i)=>{const o=G.obst[i];if(o&&(OB[o.type].block||o.blk))return false;if(G.tt[i]===2&&G.up[i]!==1)return false;return true;};
  for(let h=0;h<q.length;h++){
    const a=q[h],x=a%w,y=(a/w)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=G.h)continue;const b=ny*w+nx;
      if(seen[b]||!walk(b)||!stepOK(a,b))continue;
      seen[b]=1;q.push(b);
    }
  }
  return {seen,q};
}
function aiLink(T,free,tf){
  const A=T.ai;if(free.length<1)return;
  if(A.linkAt&&G.time-A.linkAt<22)return;   // 직전 연결 공사가 끝나길 기다린다
  const w=G.w,R=aiReach(T),t0=tf.y*w+tf.x;
  if(R.seen[t0])return;                      // 이미 닿는다
  let best=null,bs=1e9;
  const dist=(i)=>Math.hypot(i%w-tf.x,((i/w)|0)-tf.y);
  for(const a of R.q){
    const x=a%w,y=(a/w)|0;
    if(G.obst[a]||G.trench[a]&&G.trench[a]!==T.id+1)continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=G.h)continue;const b=ny*w+nx;
      if(R.seen[b])continue;
      const d=dist(b);if(d>=bs)continue;
      if(G.tt[b]===2&&G.up[b]!==1){   // 물: 다리
        if(taskCheck(T.id,'upg',nx,ny,'bridge')===null){bs=d;best=['bridge',nx,ny];}
      }else if(G.hill&&Math.abs(G.lv[b]-G.lv[a])>=CLIMB_MIN){   // 절벽: 사다리
        const p=ladderPair(a);
        if(p&&((p.lo===a&&p.hi===b)||(p.hi===a&&p.lo===b))&&taskCheck(T.id,'upg',x,y,'climb')===null){bs=d;best=['climb',x,y];}
      }
    }
  }
  if(!best)return;
  const t=getTask(T.id,'upg',best[1],best[2],best[0],true);
  if(t){orderTasks(free.splice(0,2),[t]);A.linkAt=G.time;}
}
// ---- 3. 동굴 탐사 · 채굴 ----
function aiMine(T,free){
  if(!G.ore||free.length<2)return;
  const A=T.ai,w=G.w;
  // 열린 광석부터
  let best=null,bd=1e9;
  for(let i=0;i<G.N;i++){
    if(!G.ore[i]||!G.open[T.id][i]||G.tasks.has(tkey('mine',i)))continue;
    const d=Math.hypot(i%w-T.flag.x,((i/w)|0)-T.flag.y);if(d<bd){bd=d;best=i;}
  }
  if(best!==null&&(T.res.metal<70||T.res.money<350||ORE[G.ore[best]].work<12)){
    const e=issueWork(T.id,'mine',[[best%w,(best/w)|0]],null,2,free);if(!e)return;
  }
  // 아직 못 찾았으면 가까운 동굴 입구로 정찰 병사를 보낸다
  if(best===null&&(!A.scoutAt||G.time-A.scoutAt>60)&&G.time>120){
    let m=-1,md=1e9;
    for(const i of G.trans){if(!G.mouth[i]||G.open[T.id][i])continue;const d=Math.hypot(i%w-T.flag.x,((i/w)|0)-T.flag.y);if(d<md&&d<G.w*.6){md=d;m=i;}}
    if(m>=0){const u=free.splice(0,2);orderMoveL(u,m%w,(m/w)|0,1);A.scoutAt=G.time;}
  }
}
// ---- 수입: 돈이 마르면 자연 건물을 '범위'로 철거해 달러·자재를 번다 ----
function aiIncome(T,free){
  if(free.length<2||T.res.money>=260)return;
  const A=T.ai;if(A.incAt&&G.time-A.incAt<10)return;
  let best=null,b2=1e9;
  for(const o of G.obSet){
    const d=OB[o.type];if(!o.natural||d.nodemo||!d.gain||!d.gain.money||G.tasks.has(tkey('demo',o.idx)))continue;
    const dd=Math.hypot(o.x-T.flag.x,o.y-T.flag.y);
    if(dd<b2&&dd<40){b2=dd;best=o;}
  }
  if(!best)return;
  // 가까운 같은 구역(반경 5)의 자연 건물을 한꺼번에 묶어 범위 해체
  const tiles=[];
  for(const o of G.obSet){
    const d=OB[o.type];if(!o.natural||d.nodemo||G.tasks.has(tkey('demo',o.idx)))continue;
    if(d.building&&!canAfford(T,{bullets:(d.ammo||10)*(tiles.length+1)}))continue;
    if(Math.hypot(o.x-best.x,o.y-best.y)<=5&&tiles.length<6)tiles.push([o.x,o.y]);
  }
  if(!tiles.length)return;
  const e=issueWork(T.id,'demo',tiles,null,Math.min(4,free.length),free);
  if(!e)A.incAt=G.time;
}
// ---- 적 구조물 해체: 아군이 닿는 곳의 적 방어 시설을 범위로 허문다 ----
function aiRaze(T,free,tf){
  const A=T.ai;if(free.length<3||(A.razeAt&&G.time-A.razeAt<18))return;
  if(G.time<90)return;
  // 가장 가까운 적 구조물(타깃 팀 우선) 하나를 고른다
  let best=null,b2=1e9;
  for(const o of G.obSet){
    const d=OB[o.type];if(o.natural||o.team===T.id||o.team<0||d.nodemo||G.tasks.has(tkey('demo',o.idx)))continue;
    if(!(d.gun||o.type==='mortar'||o.type==='sandbag'||o.type==='wire'||o.type==='tower'||o.type==='bunker'))continue;
    const dd=Math.hypot(o.x-T.flag.x,o.y-T.flag.y)+(o.team===tf.team?0:12);
    if(dd<b2){b2=dd;best=o;}
  }
  if(!best||b2>G.w*.9)return;
  if(foesNear(T,best.x,best.y,7).n>2)return;   // 수비병이 많으면 병력 전투가 먼저
  const tiles=[];
  for(const o of G.obSet){
    const d=OB[o.type];if(o.natural||o.team===T.id||o.team<0||d.nodemo||G.tasks.has(tkey('demo',o.idx)))continue;
    if(d.building&&!canAfford(T,{bullets:(d.ammo||10)*(tiles.length+1)}))continue;
    if(Math.hypot(o.x-best.x,o.y-best.y)<=4&&tiles.length<6)tiles.push([o.x,o.y]);
  }
  if(!tiles.length)return;
  const e=issueWork(T.id,'demo',tiles,null,Math.min(4,free.length),free);
  if(!e)A.razeAt=G.time;
}
// ---- 물자 교환: 남는 자원을 모자란 자원으로 바꾼다 ----
function aiTrade(T){
  if(T.order.lines.length>=SHOP.maxLines-2||T.order.lines.some(l=>l.kind==='trade'))return false;
  const r=T.res,need=[],spare=[];
  if(r.bullets<130)need.push(['bullets',130-r.bullets]);
  if(r.metal<30)need.push(['metal',30-r.metal]);
  if(r.wood<40)need.push(['wood',40-r.wood]);
  if(r.money<140)need.push(['money',140-r.money]);
  if(!need.length)return false;
  const sp={wood:r.wood-130,metal:r.metal-90,bullets:r.bullets-320,money:r.money-420};
  for(const k in sp)if(sp[k]>=40)spare.push([k,sp[k]]);
  if(!spare.length)return false;
  spare.sort((a,b)=>b[1]-a[1]);
  const [from,amt]=spare[0],[to]=need.find(n=>n[0]!==from)||[];
  if(!to)return false;
  return !shopAddTrade(T.id,from,to,Math.floor(amt*.8));
}
function aiPlus(T){
  if(!T.ai||!T.flag||isDef())return;
  const free=aiFreeUnits(T);
  const foes=G.flags.filter(f=>f.team!==T.id&&G.teams[f.team].alive);if(!foes.length)return;
  let tf=foes[0],bs=1e9;for(const f of foes){const s=Math.hypot(f.x-T.flag.x,f.y-T.flag.y);if(s<bs){bs=s;tf=f;}}
  aiArms(T,free);
  {T.ai.lk=(T.ai.lk||0)-AIX.every;if(T.ai.lk<=0){T.ai.lk=AIX.linkEvery;aiLink(T,free,tf);}}
  aiMine(T,free);
  aiIncome(T,free);
  aiRaze(T,free,tf);
  if(typeof stAiUpgrade==='function')stAiUpgrade(T);
}
