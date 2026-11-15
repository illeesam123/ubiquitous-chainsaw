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
function aiPickTactic(P,strengthRatio,hasBush){
  const w=Object.assign({},P.w);
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
  A.next-=dt;if(A.next>0)return;
  A.next=1.3+Math.random()*.5;
  aiShop(T);
  const mine=G.units.filter(u=>u.team===T.id&&!u.dead&&u.state!=='crew');if(!mine.length)return;
  const foes=G.flags.filter(f=>f.team!==T.id&&G.teams[f.team].alive);if(!foes.length)return;
  const my=T.flag,W2=G.w;
  const mineStr=teamCount(T.id);
  // 목표 선택: 가깝고 약한 상대를 우선
  let tf=foes[0],bs=1e9;
  for(const f of foes){const s=Math.hypot(f.x-my.x,f.y-my.y)+teamCount(f.team)*1.4;if(s<bs){bs=s;tf=f;}}
  const enemyStr=Math.max(1,teamCount(tf.team));
  // 지하 작업이 끝나 노는 병사는 지상으로 복귀
  if(A.shaft!==undefined&&G.up[A.shaft]===4){
    const ug=mine.filter(u=>u.lay&&!u.task&&!u.queue.length&&u.state==='idle'&&!u.after);
    if(ug.length)orderMoveL(ug,A.shaft%W2,(A.shaft/W2)|0,0);
  }
  const fighters=mine.filter(u=>!u.gar&&!u.lay&&!['med','medwait','medmove','medqueue'].includes(u.state));
  A.squad=(A.squad||[]).filter(id=>{const u=G.uid.get(id);return u&&!u.dead&&u.team===T.id;});
  const inSquad=new Set(A.squad);
  let free=mine.filter(u=>!u.gar&&!u.lay&&!u.garTarget&&!u.task&&u.state!=='move'&&u.state!=='work'&&!u.queue.length&&!inSquad.has(u.id));
  const take=(n)=>free.splice(0,n);
  const tanks=G.vehicles.filter(v=>v.team===T.id&&!v.dead&&v.type==='tank');
  const homeR=12+G.w*.05;
  const home=foesNear(T,my.x,my.y,homeR);
  if(!A.persona){const r=Math.random();A.persona=r<.26?'aggressive':r<.5?'defensive':r<.76?'tricky':'balanced';A.side=Math.random()<.5?-1:1;}
  const P=AIP[A.persona];
  if(A.attackAt===undefined)A.attackAt=(80+G.w*1.1+Math.random()*50)*P.delay;

  // ── 1. 본진 방어: 가까운 적이 있으면 즉시 대응 ──
  if(home.n>0){
    A.mode='defend';
    const rally=nearestOwnTrench(T,home.x,home.y,homeR+4)||[my.x,my.y];
    // 원정 부대가 열세인데 본진이 위험하면 복귀
    const homeFr=friendsNear(T,my.x,my.y,homeR);
    let react=fighters.filter(u=>!u.task||u.state!=='work');
    if(home.n>homeFr*1.2){
      react=fighters; // 위급: 작업 중인 병사까지 전원 투입
      if(A.squad.length){A.f=Math.max(0,(A.f||0)-.4);A.attackAt=G.time+35;}
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
  const ready=G.time>A.attackAt&&(strengthRatio>.85*P.ready||G.time>A.attackAt+90);
  if(!A.squad.length&&ready&&fighters.length>=5){
    const pool=fighters.filter(u=>!u.task||u.state!=='work').sort((a,b)=>Math.hypot(a.x-tf.x,a.y-tf.y)-Math.hypot(b.x-tf.x,b.y-tf.y));
    // 전술 선택: 매복 후보 덤불을 진격선 60% 지점 근처에서 찾는다
    const bushSpot=aiFindBush(my.x+dxl*.6+(-dyl/L)*A.side*L*.1,my.y+dyl*.6+(dxl/L)*A.side*L*.1,12);
    A.tactic=aiPickTactic(P,strengthRatio,!!bushSpot);
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
      A.f=Math.max(.05,(A.f||0)-.25);A.attackAt=G.time+30+Math.random()*20;A.squad=[];
    }else if(local.n>0){
      A.mode='fight'; // 교전 중에는 전진하지 않고 진지 유지 · 전차는 화력 지원
      if(tanks.length)orderVehicles(tanks.filter(v=>Math.hypot(v.x-sx,v.y-sy)>5),Math.round(sx),Math.round(sy));
      A.hold=(A.hold||0)+1;
      if(A.hold>14&&mineLocal>local.n*1.4){const wp=wpAt(Math.min(1,(A.f||0)+.06));orderMove(sq,wp[0],wp[1]);A.hold=0;}
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
    for(const o of G.obSet){
      if(!free.length)break;
      const d=OB[o.type];
      if(!d.slots||(!d.gun&&o.type!=='mortar'&&o.type!=='medbay')||o.occ.length>=d.slots)continue;
      if(!(o.natural||o.team===T.id)||(o.occTeam!==-1&&o.occTeam!==T.id&&o.occ.length))continue;
      if(Math.hypot(o.x-my.x,o.y-my.y)>11)continue;
      orderGarrison(take(1),o);
    }
  }
}
