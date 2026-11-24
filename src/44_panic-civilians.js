// ================= 패닉(자결·투항) · 민간인 =================
TEAM_COL[9]='#a89878';              // 민간인 (팀 번호 9: 어느 팀에도 속하지 않음)
const PANIC={hpFrac:.3,tick:1,t:0,surr:6,civSurr:8};
function weatherSeverity(){
  const w=G.weather.type;let s=w==='snow'?.7:w==='rain'?.5:w==='fog'?.4:0;
  if(G.weather.night)s+=.3;return s;
}
function teamHasMedbay(team){for(const o of G.obSet)if(o.type==='medbay'&&!o.natural&&o.team===team)return true;return false;}
function dropCommitments(u){
  if(u.medTarget)clearMedical(u);
  if(u.task){u.task.res.delete(u.id);u.task.workers.delete(u.id);u.task=null;}
  if(u.gar)leaveGar(u);
  u.queue=[];u.path=[];u.after=null;u.item=null;if(u.fetch){u.fetch=null;}
}
// ---- 병사 패닉 ----
function nearestEnemyDist(u){
  let bd=1e9,bt=-1;
  for(const e of G.units){if(e.dead||isAllyT(e.team,u.team)||e.surr>0||e.state==='crew')continue;const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<bd){bd=d;bt=e.team;}}
  return [bd,bt];
}
function panicSoldier(u,med,sev){
  const hf=u.hp/u.max;
  if(hf>=PANIC.hpFrac)return;
  if(med&&sev<=0)return;                                  // 의무 막사가 있고 날씨도 좋으면 버틴다
  const [ed,et]=nearestEnemyDist(u);
  let p=(1-hf/PANIC.hpFrac)*.045*(1+(med?0:1)+sev*1.3);
  if(ed>18)p*=.3;
  if(Math.random()>Math.min(.15,p))return;
  if(ed<=14&&Math.random()<.65)surrenderUnit(u,et);else suicideUnit(u,med,sev);
}
function surrenderUnit(u,captor){
  dropCommitments(u);
  u.surr=PANIC.surr;u.captor=captor;u.state='surr';u.sel=false;
  if(u.team===0)toast('병사가 패닉에 빠져 투항했습니다','warn');
  else if(captor===0)toast('적 병사가 투항합니다');
}
function finishSurrender(u){
  // 항복한 병사는 항복을 받은 팀의 병사가 된다 (무기는 그대로, 없으면 소총)
  const T=G.teams[u.captor];
  if(!T){u.dead=true;u.hp=0;G.uid.delete(u.id);return;}
  G.teams[u.team].lost++;
  u.team=u.captor;u.surr=0;u.captor=undefined;u.state='idle';u.path=[];u.queue=[];u.sel=false;u.flash=0;u.wait=.4;u.medCooldown=0;u.medIgnore=false;
  if(!u.gun||!WEAP[u.gun])u.gun='rifle';
  if(u.captor===undefined&&T.id===0){G.lastGain='포로가 아군이 되었습니다';G.gainShow=3;toast('항복한 적 병사가 아군이 되었습니다','ok');}
}
function suicideUnit(u,med,sev){
  if(u.team===0)toast(med?'병사가 악천후 속에서 절망해 스스로 목숨을 끊었습니다':'의무 막사가 없어 절망한 병사가 스스로 목숨을 끊었습니다','warn');
  G.teams[u.team].lost++;
  sfx('rifle',u.x,u.y);killUnit(u);
}
const _su2=stepUnit;
stepUnit=function(u,dt){
  if(u.surr>0){u.surr-=dt;u.anim+=dt;u.flash=Math.max(0,u.flash-dt);if(u.surr<=0)finishSurrender(u);return;}
  return _su2(u,dt);
};
const _hid2=hiddenUnit;
hiddenUnit=function(e,ox,oy){
  if(ox!==undefined&&e.surr>0)return true;                // 항복한 병사는 표적이 되지 않는다
  return _hid2(e,ox,oy);
};
function stepPanic(dt){
  PANIC.t-=dt;if(PANIC.t>0)return;PANIC.t=PANIC.tick;
  const sev=weatherSeverity(),med={};
  for(const T of G.teams)med[T.id]=teamHasMedbay(T.id);
  for(const u of [...G.units]){
    if(u.dead||u.surr>0||u.state==='crew')continue;
    panicSoldier(u,med[u.team],sev);
  }
}
// ---- 민간인 ----
const CIV={cap:44,sight:6.5,speed:.95,run:1.7};
function villageCells(){
  const cells=new Map();
  for(const o of G.obSet){if(!o.natural||!(o.type==='house'||o.type==='apartment'||o.type==='shed'||o.type==='warehouse'))continue;
    const k=((o.x/10)|0)+','+((o.y/10)|0);let c=cells.get(k);if(!c){c={n:0,x:0,y:0};cells.set(k,c);}c.n++;c.x+=o.x;c.y+=o.y;}
  return [...cells.values()].filter(c=>c.n>=3).map(c=>({x:c.x/c.n,y:c.y/c.n,n:c.n}));
}
function civOK(x,y){if(!inb(x,y))return false;const i=y*G.w+x;return !G.obst[i]&&G.tt[i]!==2&&G.tt[i]!==4&&!G.trench[i]&&!G.mouth[i]&&!G.up[i];}
function genCivs(){
  G.civs=[];G.civsInit=true;
  if(G.special==='superflat'||G.special==='mineshaft')return;
  const rnd=mulberry(hashStr(G.cfg.seed+'#civ'));
  if(G.special==='mafia'){
    const home=G.mafia||{x:G.w/2,y:G.h/2},grp={cx:home.x,cy:home.y,R:11,tx:home.x,ty:home.y,tt:0,alert:0,ax:home.x,ay:home.y},hostile={};
    for(const T of G.teams)hostile[T.id]=true;
    const guns=['rifle','pistol','assault','sniper','lmg'],spots=[];
    for(let ty=Math.floor(home.y-11);ty<=home.y+11;ty++)for(let tx=Math.floor(home.x-11);tx<=home.x+11;tx++)if(Math.hypot(tx+.5-home.x,ty+.5-home.y)>=3.8&&Math.hypot(tx+.5-home.x,ty+.5-home.y)<=11&&civOK(tx,ty))spots.push([tx,ty]);
    for(let i=spots.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]];}
    for(let made=0;made<Math.min(44,spots.length);made++){
      const [tx,ty]=spots[made];
      const mil=made<26,gun=guns[Math.floor(rnd()*guns.length)];
      G.civs.push({id:G.nextId++,team:9,civ:true,mil,x:tx+.5,y:ty+.5,hp:mil?40:60,max:mil?40:60,state:'idle',path:[],queue:[],task:null,gar:null,cd:rnd(),face:rnd()*6.28,anim:rnd()*6,wait:0,flash:0,sel:false,
        armed:true,gun,item:null,mag:WEAP[gun].mag,rl:0,home:[tx+.5,ty+.5],mode:mil?'patrol':'shoot',mafiaHostile:!mil,tm:0,tgt:null,seen:{},hostile:mil?{}:Object.assign({},hostile),reveal:0,variant:Math.floor(rnd()*4),grp,off:[(rnd()-.5)*3,(rnd()-.5)*3]});
      made++;
    }
    genMafiaMilitia(rnd,home);
    return;
  }
  const vs=villageCells().filter(v=>G.flags.every(f=>Math.hypot(f.x-v.x,f.y-v.y)>14));
  const urban=G.special==='urbanwar'||G.special==='occupied';
  for(const v of vs){
    if(G.civs.length>=CIV.cap)break;
    if(!urban&&rnd()>.55)continue;
    const n=Math.min(CIV.cap-G.civs.length,1+Math.floor(rnd()*Math.min(5,2+v.n/3)));
    for(let k=0;k<n;k++){
      for(let tr=0;tr<12;tr++){
        const x=Math.floor(v.x+(rnd()-.5)*12),y=Math.floor(v.y+(rnd()-.5)*12);
        if(!civOK(x,y))continue;
        G.civs.push({id:G.nextId++,team:9,civ:true,x:x+.5,y:y+.5,hp:60,max:60,state:'idle',path:[],queue:[],task:null,gar:null,cd:rnd(),face:rnd()*6.28,anim:rnd()*6,wait:0,flash:0,sel:false,
          armed:rnd()<.3,gun:rnd()<.5?'pistol':'rifle',home:[x+.5,y+.5],mode:'wander',tm:rnd()*3,tgt:null,seen:{},hostile:{},reveal:0,variant:Math.floor(rnd()*4)});
        break;
      }
    }
  }
  if(!(isReclaim()||G.special==='occupied'))genMilitia(vs,rnd,urban);
}
function civStep(c,tx,ty,sp,dt){
  const dx=tx-c.x,dy=ty-c.y,d=Math.hypot(dx,dy);if(d<.05)return true;
  const st=Math.min(d,sp*dt*(G.brush[Math.floor(c.y)*G.w+Math.floor(c.x)]?.7:1)),nx=c.x+dx/d*st,ny=c.y+dy/d*st;
  if(civOK(Math.floor(nx),Math.floor(ny))||G.trench[Math.floor(ny)*G.w+Math.floor(nx)]){c.x=nx;c.y=ny;c.mvT=.25;c.face=Math.atan2(dy,dx);return d<=st+.01;}
  return true; // 막힘: 도착 처리
}
function civReact(c,u){
  // 병사에게 발각되었을 때의 반응
  c.seen[u.team]=true;
  const r=Math.random();
  if(c.armed){
    if(r<.5){c.mode='shoot';c.hostile[u.team]=true;}
    else if(r<.7)civSurrender(c,u.team);
    else civFlee(c,u);
  }else{
    if(r<.25){c.mode='melee';c.hostile[u.team]=true;}
    else if(r<.7)civSurrender(c,u.team);
    else civFlee(c,u);
  }
}
function civSurrender(c,team){c.mode='surr';c.tm=PANIC.civSurr;c.captor=team;}
function civFlee(c,from){c.mode='flee';c.tm=5+Math.random()*3;c.fx=from.x;c.fy=from.y;}
function killCiv(c,shooter){
  c.dead=true;c.hp=0;sfx('death',c.x,c.y);fxPush({k:'dead',x:c.x,y:c.y,t:0,d:6,c:9});
  civDrop(c);
  if(shooter&&shooter.team===0&&!c.hostile[0])toast('민간인이 사망했습니다','warn');
}
const _hurt=hurt;
hurt=function(u,dmg,shooter){
  if(u.civ){
    if(u.dead)return;
    u.hp-=dmg;u.flash=.12;u.reveal=2;
    if(u.mil){if(shooter&&shooter.team!==undefined)u.hostile[shooter.team]=true;if(u.hp<=0)killCiv(u,shooter);return;}   // 자경단은 도망·투항하지 않는다
    if(shooter&&shooter.team!==undefined){u.seen[shooter.team]=true;}
    if(u.hp<=0)killCiv(u,shooter);
    else if(u.mode==='wander'||u.mode==='flee'){
      if(shooter&&Math.random()<(u.armed?.5:.2)){u.mode=u.armed?'shoot':'melee';u.hostile[shooter.team]=true;}
      else civFlee(u,shooter||u);
    }
    return;
  }
  return _hurt(u,dmg,shooter);
};
const _findTarget=findTarget;
findTarget=function(u,range){
  const e=_findTarget(u,range);
  if(!G.civs||!G.civHostile)return e;
  const rg=range*weatherSight();let bd=e?Math.hypot(e.x-u.x,e.y-u.y):rg+1,best=e;
  for(const c of G.civs){
    if(c.dead||!c.hostile[u.team]||c.mode==='surr'||u.lay)continue;
    const d=Math.hypot(c.x-u.x,c.y-u.y);if(d<=rg&&d<bd){bd=d;best=c;}
  }
  return best;
};
function stepCivs(dt){
  if(G.phase!=='play')return;
  if(!G.civsInit)genCivs();
  let hostile=false;
  for(const c of G.civs){
    if(c.dead)continue;
    c.anim+=dt;c.flash=Math.max(0,c.flash-dt);c.cd-=dt;c.tm-=dt;c.mvT=Math.max(0,(c.mvT||0)-dt);
    if(c.mil){if(milStep(c,dt))hostile=true;c.muz=Math.max(0,(c.muz||0)-dt);continue;}
    // 발각 판정 (병사 시야) — 0.4초마다
    c.det=(c.det||0)-dt;
    if(c.det<=0){c.det=.4;
      if(c.mode==='wander'||c.mode==='flee'){
        for(const u of G.units){
          if(u.dead||u.surr>0||u.state==='crew'||u.lay||c.seen[u.team])continue;
          if(Math.hypot(u.x-c.x,u.y-c.y)<=CIV.sight&&!hiddenUnit(u,c.x,c.y)&&losOk(c,u)){civReact(c,u);break;}
        }
        // 패닉: 병사가 가까이 있으면 확률적으로 겁에 질린다
        if(c.mode==='wander'&&Math.random()<.04){
          for(const u of G.units){if(!u.dead&&u.state!=='crew'&&!u.lay&&Math.hypot(u.x-c.x,u.y-c.y)<3.2){civFlee(c,u);break;}}
        }
        if(c.hp<c.max*PANIC.hpFrac&&Math.random()<.12){if(Math.random()<.6)civSurrender(c,nearestEnemyDist(c)[1]);else civFlee(c,c);}
      }
    }
    if(c.mode==='wander'){
      if(c.tm<=0){c.tgt=[c.home[0]+(Math.random()-.5)*10,c.home[1]+(Math.random()-.5)*10];c.tm=2+Math.random()*4;c.moving=true;}
      if(c.moving&&c.tgt){if(civStep(c,c.tgt[0],c.tgt[1],CIV.speed*.7,dt))c.moving=false;}
    }else if(c.mode==='flee'){
      const dx=c.x-c.fx,dy=c.y-c.fy,d=Math.hypot(dx,dy)||1;
      civStep(c,c.x+dx/d*3,c.y+dy/d*3,CIV.run,dt);
      if(c.tm<=0){c.mode='wander';c.tm=1;c.seen={};}
    }else if(c.mode==='surr'){
      if(c.tm<=0){
        c.dead=true;const T=G.teams[c.captor];
        if(T){   // 항복한 민간인은 항복을 받은 팀의 병사가 된다 (무장 민간인은 든 총 그대로, 맨손이면 소총)
          const u=mkUnit(c.captor,c.x,c.y);u.hp=Math.max(30,Math.round(u.max*c.hp/c.max));u.face=c.face;
          u.gun=c.armed&&WEAP[c.gun]?c.gun:'rifle';
          if(c.captor===0){G.lastGain='민간인이 아군이 되었습니다';G.gainShow=3;toast('민간인이 항복하여 아군 병사가 되었습니다','ok');}
        }
      }
    }else if(c.mode==='melee'||c.mode==='shoot'){
      let t=null,bd=1e9;
      for(const u of G.units){if(u.dead||u.surr>0||u.state==='crew'||u.lay||!c.hostile[u.team])continue;const d=Math.hypot(u.x-c.x,u.y-c.y);if(d<bd){bd=d;t=u;}}
      if(!t||bd>14&&!c.mafiaHostile){c.mode='wander';c.tm=1;c.seen={};c.hostile={};}
      else{
        hostile=true;
        if(c.mode==='melee'){
          if(bd>.85)civStep(c,t.x,t.y,CIV.run,dt);
          else if(c.cd<=0){c.cd=.9;hurt(t,14+Math.random()*6,c);sfx('hammer',c.x,c.y);fxPush({k:'spark',x:t.x,y:t.y,t:0,d:.18});}
          c.face=Math.atan2(t.y-c.y,t.x-c.x);
        }else{
          if(bd>7.5)civStep(c,t.x,t.y,CIV.speed*1.2,dt);
          if(bd<=8&&c.cd<=0){
            c.cd=1.1+Math.random()*.4;c.face=Math.atan2(t.y-c.y,t.x-c.x);c.muz=.08;c.reveal=2;
            fxPush({k:'trace',x1:c.x,y1:c.y,x2:t.x,y2:t.y,t:0,d:.08});sfx('rifle',c.x,c.y);
            if(Math.random()<.5*(1-.3*bd/8)*weatherAccuracy()){hurt(t,9*(.85+Math.random()*.3),c);}
          }
        }
      }
    }
    c.muz=Math.max(0,(c.muz||0)-dt);
  }
  G.civs=G.civs.filter(c=>!c.dead);
  G.civHostile=hostile;
}
const _ss4=stepShells;stepShells=function(dt){_ss4(dt);stepPanic(dt);stepCivs(dt);};
// ---- 그리기 ----
function drawCiv(c){
  const z=cam.z,[sx,sy]=toS(c.x,c.y);
  cx.fillStyle='rgba(0,0,0,.28)';cx.beginPath();cx.ellipse(sx,sy,6*z,3*z,0,0,6.3);cx.fill();
  const sw=(c.mode==='wander'&&c.moving||c.mode==='flee'||c.mode==='melee'||c.mode==='shoot')?Math.sin(c.anim*9)*2.2*z:0;
  const cols=['#7a6a54','#566a7a','#7a5a5a','#6a7a58'],body=cols[c.variant||0],flash=c.flash>0;
  cx.strokeStyle=flash?'#fff':'#3a342a';cx.lineWidth=2.4*z;cx.lineCap='round';
  cx.beginPath();cx.moveTo(sx-1.6*z,sy-7*z);cx.lineTo(sx-1.6*z+sw*.5,sy);cx.moveTo(sx+1.6*z,sy-7*z);cx.lineTo(sx+1.6*z-sw*.5,sy);cx.stroke();
  cx.fillStyle=flash?'#fff':body;cx.fillRect(sx-3.6*z,sy-17*z,7.2*z,10.5*z);
  cx.fillStyle='#e4c9a4';cx.beginPath();cx.arc(sx,sy-20*z,3.4*z,0,6.3);cx.fill();
  cx.fillStyle='#4a3b2c';cx.beginPath();cx.arc(sx,sy-21.2*z,3.5*z,Math.PI,6.3);cx.fill();
  cx.strokeStyle=body;cx.lineWidth=2*z;
  if(c.mode==='surr'){cx.beginPath();cx.moveTo(sx-3*z,sy-15*z);cx.lineTo(sx-6*z,sy-26*z);cx.moveTo(sx+3*z,sy-15*z);cx.lineTo(sx+6*z,sy-26*z);cx.stroke();
    cx.fillStyle='#f4f1e6';cx.fillRect(sx+4*z,sy-34*z,8*z,6*z);cx.strokeStyle='#cfcfc4';cx.lineWidth=1.3*z;cx.beginPath();cx.moveTo(sx+4*z,sy-34*z);cx.lineTo(sx+4*z,sy-24*z);cx.stroke();}
  else{cx.beginPath();cx.moveTo(sx-3.4*z,sy-15*z);cx.lineTo(sx-4.6*z,sy-9*z+sw);cx.moveTo(sx+3.4*z,sy-15*z);cx.lineTo(sx+4.6*z,sy-9*z-sw);cx.stroke();}
  if(c.armed&&c.mode!=='surr'){const a=c.face;cx.strokeStyle='#26241e';cx.lineWidth=1.8*z;cx.beginPath();cx.moveTo(sx+Math.cos(a)*2*z,sy-12*z+Math.sin(a)*1*z);cx.lineTo(sx+Math.cos(a)*12*z,sy-12*z+Math.sin(a)*6*z);cx.stroke();
    if(c.muz>0){cx.fillStyle='#ffd34a';cx.beginPath();cx.arc(sx+Math.cos(a)*14*z,sy-12*z+Math.sin(a)*7*z,3*z,0,6.3);cx.fill();}}
  if(c.mode==='melee'||c.mode==='shoot'){cx.fillStyle='#ff5a44';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!',sx,sy-28*z);cx.textAlign='start';}
  else if(c.mode==='flee'){cx.fillStyle='#ffd34a';cx.font=`bold ${Math.round(11*z)}px sans-serif`;cx.textAlign='center';cx.fillText('!!',sx,sy-28*z);cx.textAlign='start';}
  if(c.hp<c.max)hpBar(sx,sy-30*z,22*z,Math.max(0,c.hp/c.max),'#d0583f');
}
const _du3=drawUnit;
drawUnit=function(u){
  _du3(u);
  if(u.surr>0){const z=cam.z,[sx,sy]=toS(u.x,u.y);cx.fillStyle='#f4f1e6';cx.fillRect(sx+4*z,sy-40*z,9*z,6*z);cx.strokeStyle='#cfcfc4';cx.lineWidth=1.4*z;cx.beginPath();cx.moveTo(sx+4*z,sy-40*z);cx.lineTo(sx+4*z,sy-28*z);cx.stroke();}
};
