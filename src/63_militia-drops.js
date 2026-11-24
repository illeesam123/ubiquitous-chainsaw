// ================= 민간인 스프라이트 · 자경단(검은 민간인) · 무기/투척물 드롭 =================
// 민간인은 병사 몸 에셋(ubodyc: 모자 없는 중립 몸 + ubodyt 마스크)을 회색으로 칠해 재사용한다. 자경단은 같은 에셋을 검정으로 칠한다.
const MIL={guns:['rifle','pistol','assault','sniper','lmg'],gw:[3,3,2,1,1],sight:6.5,molo:.5,leash:2.5,cityP:.22,maxN:30,hp:40,rng:.7,dmg:.8,acc:.7};   // 너프: 체력 40, 사거리 70%, 피해 80%, 명중 70%
const milRange=(c)=>WEAP[c.gun].range*MIL.rng;
function milPick(rnd){let t=0;for(const w of MIL.gw)t+=w;let r=rnd()*t;for(let i=0;i<MIL.guns.length;i++){r-=MIL.gw[i];if(r<=0)return MIL.guns[i];}return 'rifle';}
// ---- 생성: 도시마다 4~15명이 한 무리로 ----
function genMilitia(vs,rnd,urban){
  G.militia=[];
  for(const v of vs){
    if(rnd()>(urban?.5:MIL.cityP)||G.civs.filter(c=>c.mil).length>=MIL.maxN)continue;
    const n=4+Math.floor(rnd()*rnd()*12),grp={cx:v.x,cy:v.y,R:Math.min(9,5+v.n*.15),tx:v.x,ty:v.y,tt:0,alert:0,ax:0,ay:0,n};
    let made=0;
    for(let k=0;k<n;k++)for(let tr=0;tr<16;tr++){
      const x=Math.floor(v.x+(rnd()-.5)*9),y=Math.floor(v.y+(rnd()-.5)*9);
      if(!civOK(x,y))continue;
      const gun=milPick(rnd),g=WEAP[gun];
      G.civs.push({id:G.nextId++,team:9,civ:true,mil:true,x:x+.5,y:y+.5,hp:MIL.hp,max:MIL.hp,state:'idle',path:[],queue:[],task:null,gar:null,cd:rnd(),face:rnd()*6.28,anim:rnd()*6,wait:0,flash:0,sel:false,
        armed:true,gun,item:rnd()<MIL.molo?'molotov':null,mag:g.mag,rl:0,home:[v.x,v.y],mode:'patrol',tm:0,tgt:null,seen:{},hostile:{},reveal:0,grp,off:[(rnd()-.5)*3,(rnd()-.5)*3]});
      made++;break;
    }
    if(made>=3)G.militia.push(grp);
  }
}
// ---- 행동 ----
function milTarget(c){
  const sg=Math.max(MIL.sight,milRange(c)+.5);let best=null,bd=1e9;
  for(const u of G.units){
    if(u.dead||u.surr>0||u.state==='crew'||u.lay&&Math.random()<.7)continue;
    const d=Math.hypot(u.x-c.x,u.y-c.y);if(d>sg||d>=bd)continue;
    if(hiddenUnit(u,c.x,c.y)||!losOk(c,u))continue;
    best=u;bd=d;
  }
  return best;
}
function milStep(c,dt){
  const g=c.grp,w=WEAP[c.gun],rg=milRange(c);
  if(c.rl>0)c.rl-=dt;
  if(g.stamp!==G.time){g.stamp=G.time;g.tt-=dt;g.alert=Math.max(0,g.alert-dt);
    if(g.tt<=0&&!g.fixed){g.tt=5+Math.random()*5;for(let i=0;i<8;i++){const a=Math.random()*6.283,r=Math.random()*g.R*.8,x=g.cx+Math.cos(a)*r,y=g.cy+Math.sin(a)*r;if(civOK(Math.floor(x),Math.floor(y))){g.tx=x;g.ty=y;break;}}}}
  c.sc=(c.sc||0)-dt;
  if(c.sc<=0||!c.tg||c.tg.dead||c.tg.state==='crew'||c.tg.surr>0){c.sc=.35;c.tg=milTarget(c);if(!c.tg)c.hostile={};}
  const t=c.tg,dc=Math.hypot(c.x-g.cx,c.y-g.cy);
  if(t){
    g.alert=6;g.ax=t.x;g.ay=t.y;c.hostile[t.team]=true;
    const bd=Math.hypot(t.x-c.x,t.y-c.y);c.face=Math.atan2(t.y-c.y,t.x-c.x);
    if(c.item==='molotov'&&bd>=2.4&&bd<=7&&c.cd<=0){throwNade(c,'molotov',t.x,t.y);c.item=null;c.cd=1.2;return true;}
    if(bd>rg*.85&&Math.hypot(t.x-g.cx,t.y-g.cy)<=g.R+MIL.leash+3)civStep(c,t.x,t.y,CIV.speed*1.1,dt);   // 도시 밖으로는 쫓지 않는다
    if(bd<=rg&&c.cd<=0&&!(c.rl>0)){
      c.cd=w.int*(.9+Math.random()*.2);c.muz=.08;c.reveal=2;
      fxPush({k:'trace',x1:c.x,y1:c.y,x2:t.x,y2:t.y,t:0,d:.08});sfx('rifle',c.x,c.y);
      if(w.mag){c.mag--;if(c.mag<=0){c.rl=w.reload;c.mag=w.mag;}}
      WXE=w.wx===undefined?1:w.wx;
      try{if(Math.random()<w.acc*MIL.acc*(1-.35*bd/rg)*weatherAccuracy())hurt(t,w.dmg*MIL.dmg*(.85+Math.random()*.3),c);}finally{WXE=1;}
    }
    return true;
  }
  if(g.purge)c.hostile=Object.assign({},g.purge);   // 소탕 작전 중인 팀은 보이지 않아도 사격 대상으로 삼는다
  // 무리가 교전 중이면 그쪽으로 모인다(도시 안에서만)
  if(g.alert>0&&Math.hypot(g.ax-g.cx,g.ay-g.cy)<=g.R+MIL.leash+3&&Math.hypot(g.ax-c.x,g.ay-c.y)>rg*.8){civStep(c,g.ax,g.ay,CIV.speed*.9,dt);return false;}
  const tx=dc>g.R+MIL.leash?g.cx:g.tx+c.off[0],ty=dc>g.R+MIL.leash?g.cy:g.ty+c.off[1];   // 무리 목적지로 함께 이동, 멀어지면 도시로 복귀
  if(Math.hypot(tx-c.x,ty-c.y)>.7)civStep(c,tx,ty,CIV.speed*.8,dt);
  return !!g.purge;
}
// ---- 드롭 ----
function addDrop(x,y,kind,k){
  G.drops=G.drops||[];
  G.drops.push({id:G.nextId++,drop:true,kind,k,x:x+(Math.random()-.5)*.5,y:y+(Math.random()-.5)*.5,rot:(Math.random()-.5)*.9,t:0});
  if(G.drops.length>(G.special==='mafia'?160:60))G.drops.shift();
}
function addDrops(x,y,gun,item){
  if(gun&&gun!=='rifle'&&WEAP[gun])addDrop(x,y,'gun',gun);
  if(item&&EXP[item])addDrop(x,y,'item',item);
}
function civDrop(c){if(c.mil)addDrops(c.x,c.y,c.gun,c.item);}
const _kuD=killUnit;
killUnit=function(u){const was=u.dead;_kuD(u);if(!was&&!u.civ&&u.team>=0&&u.team<=3)addDrops(u.x,u.y,u.gun,u.item);};
function dropDeposit(team,d){
  if(d.kind==='gun'){if(!armories(team).length)return false;wst(G.teams[team])[d.k]++;return true;}
  for(const o of armories(team))if(armTotal(o)<ARM.cap){armStock(o)[d.k]++;return true;}
  return false;
}
function stepDrops(dt){
  if(!G.drops||!G.drops.length)return;
  G.dropT=(G.dropT||0)-dt;if(G.dropT>0)return;G.dropT=.25;
  for(const d of G.drops){
    for(const u of G.units){
      if(u.dead||u.surr>0||u.state==='crew'||!(u.team>=0&&u.team<=3))continue;
      if(Math.hypot(u.x-d.x,u.y-d.y)>1.1)continue;
      if(dropDeposit(u.team,d)){
        d.done=true;
        if(u.team===0){const n=d.kind==='gun'?WEAP[d.k].n:EXP[d.k].n;toast(`${n} 회수 → 무기고`,'ok');}
        break;
      }
    }
  }
  G.drops=G.drops.filter(d=>!d.done);
}
const _ss5=stepShells;stepShells=function(dt){_ss5(dt);stepDrops(dt);};
function drawDrop(d){
  const z=cam.z,[sx,sy]=toS(d.x,d.y),pu=.5+.5*Math.sin(G.time*4+d.id);
  shadowEll(sx,sy,5*z,2.5*z,.25);
  cx.strokeStyle=`rgba(255,226,120,${.35+.35*pu})`;cx.lineWidth=1.2*z;cx.beginPath();cx.ellipse(sx,sy,8*z,4*z,0,0,6.3);cx.stroke();
  if(d.kind==='gun'){
    const e=sprGetX('gun|'+((GUNS[d.k]||GUNS.rifle).look)+'|side');
    if(sprOk(e)){cx.save();cx.translate(sx,sy-2*z);cx.rotate(d.rot);cx.scale(1.15,1.15);const b=sprBkt(z),bm=sprRaster(e,b),k=z/b;cx.drawImage(bm,e.x*z,e.y*z,bm.width*k,bm.height*k);cx.restore();return;}
    cx.strokeStyle=WEAP[d.k].col;cx.lineWidth=2.4*z;cx.beginPath();cx.moveTo(sx-6*z,sy-2*z);cx.lineTo(sx+6*z,sy-3*z);cx.stroke();return;
  }
  const col=EXP[d.k].col;
  cx.fillStyle='#2a2a24';cx.fillRect(sx-2.4*z,sy-7*z,4.8*z,6*z);cx.fillStyle=col;cx.fillRect(sx-2.4*z,sy-4.6*z,4.8*z,2.4*z);
  cx.fillStyle=d.k==='molotov'?'#ffb84a':'#bbb';cx.fillRect(sx-1*z,sy-9.5*z,2*z,2.6*z);
}
// ---- 민간인 그리기: 병사 에셋 재사용 ----
const _dcP=drawCiv;
drawCiv=function(c){
  if(c.drop)return drawDrop(c);
  const z=cam.z,[sx,sy]=toS(c.x,c.y),st0=c.state;
  c.state=c.mode==='surr'?'fuse':c.mode==='flee'?'flee':c.mvT>0?'move':'idle';
  shadowEll(sx,sy,7*z,3.5*z,.3);
  const ok=unitSprite(c,sx,sy+(c.state==='fuse'?2.5*z:0),z,c.mil?'#242322':'#8e8e89',false);
  c.state=st0;
  if(!ok)return _dcP(c);
  if(c.mode==='surr'){cx.fillStyle='#f4f1e6';cx.fillRect(sx+4*z,sy-40*z,9*z,6*z);cx.strokeStyle='#cfcfc4';cx.lineWidth=1.4*z;cx.beginPath();cx.moveTo(sx+4*z,sy-40*z);cx.lineTo(sx+4*z,sy-28*z);cx.stroke();}
  if(c.mode==='melee'||c.mode==='shoot'){cx.fillStyle='#ff5a44';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!',sx,sy-30*z);cx.textAlign='start';}
  else if(c.mode==='flee'){cx.fillStyle='#ffd34a';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!!',sx,sy-30*z);cx.textAlign='start';}
  else if(c.mil&&c.tg){cx.fillStyle='#ff5a44';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!',sx,sy-30*z);cx.textAlign='start';}
  if(c.hp<c.max)hpBar(sx,sy-27*z,14*z,Math.max(0,c.hp/c.max),'#d0583f');
};

// ================= Mafia 시드: 자경단이 맵의 주인 =================
// 아파트·감시탑·각종 구조물에 거점 무리, 중심부 둘레에 저격수·경기관총 사수 대군, 도시마다 순찰 무리,
// 중심 지구 밖 들판의 순찰 무리. 본진까지 진군하지는 않는다. (거점 무리는 'fixed' : 제자리 경계)
function milMk(rnd,grp,x,y,gun,item){
  const g=WEAP[gun],c={id:G.nextId++,team:9,civ:true,mil:true,x:x+.5,y:y+.5,hp:MIL.hp,max:MIL.hp,state:'idle',path:[],queue:[],task:null,gar:null,cd:rnd(),face:rnd()*6.28,anim:rnd()*6,wait:0,flash:0,sel:false,
    armed:true,gun,item:item||null,mag:g.mag,rl:0,home:[grp.cx,grp.cy],mode:'patrol',tm:0,tgt:null,seen:{},hostile:{},reveal:0,grp,off:[(rnd()-.5)*(grp.fixed?1.2:3),(rnd()-.5)*(grp.fixed?1.2:3)]};
  G.civs.push(c);grp.n=(grp.n||0)+1;return c;
}
function milGroup(cx,cy,R,o){const g=Object.assign({cx,cy,R,tx:cx,ty:cy,tt:0,alert:0,ax:0,ay:0,n:0},o||{});G.militia.push(g);return g;}
function milSpot(rnd,cx,cy,rad){for(let t=0;t<24;t++){const x=Math.floor(cx+(rnd()-.5)*2*rad),y=Math.floor(cy+(rnd()-.5)*2*rad);if(civOK(x,y))return [x,y];}return null;}
function milFill(rnd,grp,guns,rad,molo){
  let n=0;for(const gun of guns){const p=milSpot(rnd,grp.cx,grp.cy,rad);if(!p)continue;milMk(rnd,grp,p[0],p[1],gun,molo&&rnd()<molo?'molotov':null);n++;}return n;
}
function milGuns(rnd,n,heavy){const o=[];for(let i=0;i<n;i++)o.push(heavy&&rnd()<heavy?(rnd()<.55?'sniper':'lmg'):milPick(rnd));return o;}
function genMafiaMilitia(rnd,home){
  G.militia=G.militia||[];
  {const cg=G.civs.find(c=>c.mil&&c.grp);if(cg){cg.grp.n=G.civs.filter(c=>c.grp===cg.grp).length;G.militia.push(cg.grp);}}   // 중앙 무리도 소탕 대상에 포함
  const hx=home.x,hy=home.y,teams=G.teams.length;
  // 1) 아파트·감시탑 거점
  for(const o of G.obSet){
    if(!o.natural)continue;const sz=OB[o.type].size||1,cx=o.x+sz/2,cy=o.y+sz/2,center=Math.hypot(cx-hx,cy-hy)<16;
    if(o.type==='apartment'){const g=milGroup(cx,cy,2.4,{fixed:true});milFill(rnd,g,['sniper','sniper','lmg','assault','assault','pistol','rifle'],sz/2+1.6,.5);}
    else if(o.type==='tower'){const g=milGroup(cx,cy,1.8,{fixed:true});milFill(rnd,g,['sniper','sniper','lmg'],sz/2+1.4,0);}
    else if(!center&&['house','shed','warehouse','ruin','bunker','mg','tower'].includes(o.type)&&G.civs.length<260&&rnd()<.22){
      const g=milGroup(cx,cy,2.2,{fixed:true}),heavy=o.type==='bunker'||o.type==='mg'?.6:.15;
      milFill(rnd,g,milGuns(rnd,2+Math.floor(rnd()*3),heavy),sz/2+1.8,.4);
    }
  }
  // 2) 중심 지구 둘레: 저격수·경기관총 사수 대군
  for(let k=0;k<22;k++){
    const a=rnd()*6.283,r=11+rnd()*13,x=hx+Math.cos(a)*r,y=hy+Math.sin(a)*r;if(!civOK(Math.floor(x),Math.floor(y)))continue;
    const g=milGroup(x,y,1.6,{fixed:true});milFill(rnd,g,k%5<3?['sniper','assault']:['lmg','lmg','pistol'],1.5,.3);
  }
  // 3) 도시마다 순찰 무리
  for(const v of villageCells()){
    if(Math.hypot(v.x-hx,v.y-hy)<14||G.flags.some(f=>Math.hypot(f.x-v.x,f.y-v.y)<=14))continue;
    const g=milGroup(v.x,v.y,Math.min(9,5+v.n*.15)),n=5+Math.floor(rnd()*7);milFill(rnd,g,milGuns(rnd,n,.2),5,.5);
  }
  // 4) 중심 지구 밖 들판의 순찰 무리 (제자리 반경 안에서만 돌아다닌다. 본진으로 진군하지 않는다)
  for(let k=0;k<Math.min(14,teams*4);k++){
    const a=rnd()*6.283,r=14+rnd()*Math.min(26,G.w*.25),x=hx+Math.cos(a)*r,y=hy+Math.sin(a)*r;
    if(G.flags.some(f=>Math.hypot(f.x-x,f.y-y)<=20))continue;const p=milSpot(rnd,x,y,3);if(!p)continue;
    const g=milGroup(p[0]+.5,p[1]+.5,7);milFill(rnd,g,milGuns(rnd,7+Math.floor(rnd()*6),.25),5,.6);
  }
  G.militia=G.militia.filter(g=>g.n>0);
}
