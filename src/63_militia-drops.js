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
    if(g.tt<=0){g.tt=5+Math.random()*5;for(let i=0;i<8;i++){const a=Math.random()*6.283,r=Math.random()*g.R*.8,x=g.cx+Math.cos(a)*r,y=g.cy+Math.sin(a)*r;if(civOK(Math.floor(x),Math.floor(y))){g.tx=x;g.ty=y;break;}}}}
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
  if(G.drops.length>60)G.drops.shift();
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
  const ok=unitSprite(c,sx,sy+(c.state==='fuse'?2.5*z:0),z,'#8e8e89',false);
  c.state=st0;
  if(!ok)return _dcP(c);
  if(c.mode==='surr'){cx.fillStyle='#f4f1e6';cx.fillRect(sx+4*z,sy-40*z,9*z,6*z);cx.strokeStyle='#cfcfc4';cx.lineWidth=1.4*z;cx.beginPath();cx.moveTo(sx+4*z,sy-40*z);cx.lineTo(sx+4*z,sy-28*z);cx.stroke();}
  if(c.mode==='melee'||c.mode==='shoot'){cx.fillStyle='#ff5a44';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!',sx,sy-30*z);cx.textAlign='start';}
  else if(c.mode==='flee'){cx.fillStyle='#ffd34a';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!!',sx,sy-30*z);cx.textAlign='start';}
  else if(c.mil&&c.tg){cx.fillStyle='#ff5a44';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!',sx,sy-30*z);cx.textAlign='start';}
  if(c.hp<c.max)hpBar(sx,sy-27*z,14*z,Math.max(0,c.hp/c.max),'#d0583f');
};
