// ================= 무기고 · 폭발물 =================
const EXP={
  smoke:{n:'연막탄',col:'#b9bcc0',cost:{money:14,metal:1},desc:'아군 부상병이 떨어뜨려 시야를 가림 · 14초'},
  flash:{n:'섬광탄',col:'#fff6c8',cost:{money:20,metal:1},desc:'적 병사 약 4초 기절(사격 불가·둔화)'},
  molotov:{n:'화염병',col:'#ff8a2a',cost:{money:16,wood:2},desc:'7초간 타오르는 불길 · 덤불 소각'},
  frag:{n:'세열수류탄',col:'#5f7a3a',cost:{money:26,metal:2},desc:'반경 1.9칸 폭발 피해'}
};
const EXPK=['smoke','flash','molotov','frag'];
const ARM={range:7,cap:24,rest:.5};
OB.armory={n:'무기고',hp:520,absorb:.6,block:true,size:2,demo:14,build:30,cost:{money:60,wood:20,metal:20}};
BUILDS.splice(BUILDS.indexOf('medbay')+1,0,'armory');
LODH.armory=16;LODC.armory=['#9a9a86','#74745f','#5a5a49'];
function armories(team){const r=[];for(const o of G.obSet)if(o.type==='armory'&&!o.natural&&o.team===team)r.push(o);return r;}
function armStock(o){const s=o.stock||(o.stock={smoke:0,flash:0,molotov:0,frag:0});return s;}
function armTotal(o){const s=armStock(o);return s.smoke+s.flash+s.molotov+s.frag;}
function armFree(team){let f=0;for(const o of armories(team))f+=Math.max(0,ARM.cap-armTotal(o));return f;}
function pendingExp(T){let n=0;for(const l of T.order.lines)if(l.kind==='exp')n+=l.n;return n;}
function shopAddExp(team,item,n){
  const T=G.teams[team],d=EXP[item];
  if(!armories(team).length)return '무기고를 먼저 건설해야 합니다';
  if(T.order.lines.length>=SHOP.maxLines)return '주문 목록이 가득 찼습니다';
  if(pendingExp(T)+n>armFree(team))return '무기고 저장 공간이 부족합니다 (무기고당 '+ARM.cap+'개)';
  const cost={};for(const k in d.cost)cost[k]=d.cost[k]*n;
  if(!canAfford(T,cost))return '자원이 부족합니다';
  pay(T,cost);T.order.lines.push({id:G.nextId++,kind:'exp',item,n,cost});return null;
}
const _deliver=deliverOrder;
deliverOrder=function(T){
  const ex=T.order.lines.filter(l=>l.kind==='exp');
  if(ex.length){
    T.order.lines=T.order.lines.filter(l=>l.kind!=='exp');
    const got={};
    for(const l of ex){
      let left=l.n;
      for(const o of armories(T.id)){const s=armStock(o);while(left>0&&armTotal(o)<ARM.cap){s[l.item]++;left--;}}
      if(left>0){const c={};for(const k in l.cost)c[k]=Math.round(l.cost[k]*left/l.n);refund(T,c);}
      if(l.n-left>0)got[l.item]=(got[l.item]||0)+l.n-left;
    }
    if(T.id===0&&Object.keys(got).length){const p=EXPK.filter(k=>got[k]).map(k=>`${EXP[k].n} +${got[k]}`).join(' · ');toast('헬기 도착: 무기고에 '+p,'ok');G.lastGain='무기고 입고 '+p;G.gainShow=5;}
  }
  _deliver(T);
};
// ---- 병사 수령 ----
function stepArmory(dt){
  G.armT=(G.armT||0)-dt;
  // 수령 도착/중단 처리
  for(const u of G.units){
    const f=u.fetch;if(!f)continue;
    if(u.dead){delete u.fetch;continue;}
    const o=f.o,near=G.obSet.has(o)&&Math.hypot(u.x-(o.x+o.size/2),u.y-(o.y+o.size/2))<=2.3;
    f.t+=dt;
    if(!G.obSet.has(o)){u.fetch=null;continue;}
    if(near&&u.state!=='move'){u.item=f.k;u.fetch=null;fxPush({k:'dust',x:u.x,y:u.y,t:0,d:.3,kind:'heal'});sfx('hammer',u.x,u.y);continue;}
    if(u.state!=='move'&&!near||f.t>25){armStock(o)[f.k]++;u.fetch=null;}
  }
  if(G.armT>0)return;G.armT=ARM.rest;
  for(const T of G.teams){
    for(const o of armories(T.id)){
      const s=armStock(o);if(armTotal(o)<=0)continue;
      const cx0=o.x+o.size/2,cy0=o.y+o.size/2,c=[];
      for(const u of G.units){
        if(u.dead||u.team!==T.id||u.state!=='idle'||u.item||u.fetch||u.lay||u.gar||u.queue.length||u.task||(u.medTarget))continue;
        const d=Math.hypot(u.x-cx0,u.y-cy0);if(d<=ARM.range)c.push([d,u]);
      }
      c.sort((a,b)=>a[0]-b[0]);
      for(const [d,u] of c){
        let k=null,best=0;for(const q of EXPK)if(s[q]>best){best=s[q];k=q;}
        if(!k)break;
        s[k]--;u.fetch={o,k,t:0};
        if(d<=2.3)continue;
        const p=findPathL(0,u.team,Math.floor(u.x),Math.floor(u.y),o.x,o.y,true);
        if(p&&p.length){u.path=p;u.state='move';u.after=null;}else{s[k]++;u.fetch=null;}
      }
    }
  }
}
// ---- 투척 · 효과 ----
function inSmoke(x,y){if(!G.zones)return false;for(const z of G.zones)if(z.kind==='smoke'&&z.t>0&&Math.hypot(z.x-x,z.y-y)<=z.r)return true;return false;}
const _hid=hiddenUnit;
hiddenUnit=function(e,ox,oy){
  if(ox!==undefined&&!e.lay&&G.zones&&G.zones.length&&inSmoke(e.x,e.y)&&Math.hypot(e.x-ox,e.y-oy)>2.2)return true;
  return _hid(e,ox,oy);
};
function throwNade(u,kind,tx,ty){
  G.nades=G.nades||[];
  const d=Math.hypot(tx-u.x,ty-u.y);
  u.item=null;u.face=Math.atan2(ty-u.y,tx-u.x);u.reveal=3;u.cd=Math.max(u.cd,.7);
  G.nades.push({kind,team:u.team,x:u.x,y:u.y,tx,ty,t:0,d:.35+d*.06});
  sfx('click',u.x,u.y);
}
function landNade(n){
  G.zones=G.zones||[];
  const {kind,team,tx:x,ty:y}=n;
  if(kind==='frag'){
    const r=1.9;
    for(const u of G.units){if(u.dead||u.team===team||u.state==='crew'||u.lay||inRoof(u))continue;const d=Math.hypot(u.x-x,u.y-y);if(d>r)continue;let dmg=85*(1-.65*d/r);if(sameTeamTrench(u))dmg*=.72;hurt(u,dmg,null);if(u.gar&&G.obSet.has(u.gar))damageOb(u.gar,dmg*.4);}
    for(const v of G.vehicles){if(v.dead||v.team===team)continue;if(Math.hypot(v.x-x,v.y-y)<=r)damageVehicle(v,45);}
    for(const o of [...G.obSet])if((o.natural||o.team!==team)&&Math.hypot(o.x+o.size/2-x,o.y+o.size/2-y)<=r*.7)damageOb(o,22);
    fxPush({k:'boom',x,y,t:0,d:.5});sfx('boom',x,y);clearBush(x,y,1.6);
  }else if(kind==='molotov'){
    G.zones.push({kind:'fire',team,x,y,r:1.5,t:7,tick:.3,seed:Math.random()*9});
    clearBush(x,y,1.7);sfx('boom',x,y);fxPush({k:'smoke',x,y,t:0,d:1});
  }else if(kind==='flash'){
    G.zones.push({kind:'flash',x,y,r:3.4,t:.45,max:.45});
    for(const u of G.units){if(u.dead||u.team===team||u.lay||u.state==='crew')continue;const d=Math.hypot(u.x-x,u.y-y);if(d<=3.4)u.stun=Math.max(u.stun||0,4.4-d*.7);}
    sfx('beep',x,y);
  }else if(kind==='smoke'){
    G.zones.push({kind:'smoke',team,x,y,r:2.4,t:14,max:14,seed:Math.random()*9});
  }
}
function stepExp(dt){
  G.nades=G.nades||[];G.zones=G.zones||[];
  for(const n of G.nades){n.t+=dt;if(n.t>=n.d){n.done=true;landNade(n);}}
  G.nades=G.nades.filter(n=>!n.done);
  for(const z of G.zones){
    z.t-=dt;
    if(z.kind==='fire'){
      z.tick-=dt;
      if(z.tick<=0){z.tick=.5;
        for(const u of G.units){if(u.dead||u.team===z.team||u.lay||u.state==='crew'||inRoof(u))continue;if(Math.hypot(u.x-z.x,u.y-z.y)<=z.r)hurt(u,8,null);}
        for(const v of G.vehicles){if(!v.dead&&v.team!==z.team&&Math.hypot(v.x-z.x,v.y-z.y)<=z.r)damageVehicle(v,5);}
      }
    }
  }
  G.zones=G.zones.filter(z=>z.t>0);
  stepArmory(dt);
  // 투척 판단
  G.throwT=(G.throwT||0)-dt;
  if(G.throwT>0)return;G.throwT=.4;
  for(const u of G.units){
    if(!u.item||u.dead||u.lay||u.state==='gar'||u.state==='work'||u.state==='crew'||u.state==='med'||u.state==='medmove'||u.stun>0)continue;
    const e=findTarget(u,9.5);if(!e)continue;
    const d=Math.hypot(e.x-u.x,e.y-u.y),k=u.item;
    if(k==='smoke'){
      if(u.hp<u.max*.65&&d<=9){const f=1.2,dx=(e.x-u.x)/Math.max(d,.1),dy=(e.y-u.y)/Math.max(d,.1);throwNade(u,k,u.x+dx*f,u.y+dy*f);}
      continue;
    }
    if(d<2.8||d>8.5)continue;
    let cl=0;for(const q of G.units)if(!q.dead&&q.team!==u.team&&!q.lay&&Math.hypot(q.x-e.x,q.y-e.y)<=2)cl++;
    if(cl<2&&d>5.2&&!VEH[e.type])continue;
    if(k==='flash'&&VEH[e.type])continue;
    // 아군 근처 착탄은 피한다
    let near=false;for(const q of G.units)if(!q.dead&&q.team===u.team&&q!==u&&Math.hypot(q.x-e.x,q.y-e.y)<2.3){near=true;break;}
    if(near&&k!=='flash')continue;
    throwNade(u,k,e.x+(Math.random()-.5)*.6,e.y+(Math.random()-.5)*.6);
  }
}
const _ss2=stepShells;stepShells=function(dt){_ss2(dt);stepExp(dt);};
const _su=stepUnit;
stepUnit=function(u,dt){if(u.stun>0){u.stun-=dt;dt*=.4;}return _su(u,dt);};
const _fire=fire;
fire=function(u,g,o){if(u.stun>0)return false;return _fire(u,g,o);};
// ---- 그리기 ----
function drawArmoryOb(o,L){
  const z=cam.z,xa=o.x+.12,xb=o.x+o.size-.12,ya=o.y+.12,yb=o.y+o.size-.12,cxw=(xa+xb)/2,cyw=(ya+yb)/2;
  shadowAt(cxw+.2,cyw+.15,58,22);
  wbox(xa-.05,ya-.05,xb+.05,yb+.05,0,2,'#6a6a58','#5a5a4b','#494a3d');
  wbox(xa,ya,xb,yb,2,15,'#7a7a68',L('#9b9b86'),L('#76765f'),'#4a4a3c');
  wbox(xa-.04,ya-.04,xb+.04,yb+.04,15,18,'#6b6b59',L('#8a8a76'),L('#686853'),'#44443a');
  // 문 + 위험 표지
  const dx0=cxw-.45,dx1=cxw+.45;
  poly([pt(dx0,yb+.002,2),pt(dx1,yb+.002,2),pt(dx1,yb+.002,12),pt(dx0,yb+.002,12)],'#2e3128','#15160f',1);
  for(let k=0;k<4;k++){const a=dx0+k*.225;poly([pt(a,yb+.003,13),pt(a+.11,yb+.003,13),pt(a+.11,yb+.003,15),pt(a,yb+.003,15)],k%2?'#e0b92e':'#25241c');}
  // 지붕 위 팀 깃발
  if(!o.natural){const p=pt(xa+.2,ya+.2,18);cx.strokeStyle='#2b2a22';cx.lineWidth=1.4*z;cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(p[0],p[1]-14*z);cx.stroke();cx.fillStyle=TEAM_COL[o.team];cx.fillRect(p[0],p[1]-14*z,8*z,5*z);}
  // 입구 앞 폭발물 상자 더미 (재고 시각화)
  const s=armStock(o),tot=armTotal(o),nb=Math.min(8,Math.ceil(tot/3));
  for(let k=0;k<nb;k++){
    const bx=xa+.1+(k%4)*.42,by=yb+.12+Math.floor(k/4)*.3;
    wbox(bx,by,bx+.32,by+.24,0,6,'#a58b55','#8d7545','#745f37','#463a20');
  }
  if(!REC)drawArmoryLabel(o);
}
function drawArmoryLabel(o){
  const z=cam.z;if(o.team!==0||z<.8)return;
  const yb=o.y+o.size-.12,cxw=o.x+o.size/2,s=armStock(o),p=pt(cxw,yb+.7,0),txt=EXPK.map(k=>`${EXP[k].n.slice(0,2)}${s[k]}`).join(' ');
  cx.font=`${Math.round(10*z)}px ui-monospace,monospace`;cx.textAlign='center';cx.fillStyle='rgba(0,0,0,.55)';cx.fillText(txt,p[0]+1,p[1]+9*z+1);cx.fillStyle='#ffe29a';cx.fillText(txt,p[0],p[1]+9*z);cx.textAlign='start';
}
const _du=drawUnit;
drawUnit=function(u){
  _du(u);
  if(u.item){const [sx,sy]=toS(u.x,u.y),z=cam.z;cx.fillStyle='#15150f';cx.beginPath();cx.arc(sx+7*z,sy-11*z,3.6*z,0,6.3);cx.fill();cx.fillStyle=EXP[u.item].col;cx.beginPath();cx.arc(sx+7*z,sy-11*z,2.6*z,0,6.3);cx.fill();}
};
function drawExp(){
  const z=cam.z;
  if(G.zones)for(const q of G.zones){
    const [sx,sy]=toS(q.x,q.y);
    if(sx<-150||sx>W+150||sy<-150||sy>H+150)continue;
    if(q.kind==='smoke'){
      const age=q.max-q.t,fade=Math.min(1,q.t/3)*Math.min(1,age/1.2+.2);
      for(let k=0;k<9;k++){
        const a=q.seed+k*2.4,r=(k%3)*.55*(q.r/2.4),ox=Math.cos(a+age*.15)*r*32*z*.9,oy=Math.sin(a+age*.15)*r*16*z;
        cx.globalAlpha=.42*fade;cx.fillStyle=k%2?'#a9aaa6':'#c3c3be';cx.beginPath();cx.arc(sx+ox,sy+oy-(12+Math.sin(age*.8+k)*3)*z,(20+(k%4)*3)*z,0,6.3);cx.fill();
      }
      cx.globalAlpha=1;
    }else if(q.kind==='fire'){
      const age=7-q.t,fade=Math.min(1,q.t/1.5);
      cx.globalAlpha=.35*fade;cx.fillStyle='#3a1a08';cx.beginPath();cx.ellipse(sx,sy,q.r*30*z,q.r*15*z,0,0,6.3);cx.fill();
      for(let k=0;k<10;k++){
        const a=q.seed+k*1.7,rr=(.25+(k%5)*.2)*q.r,fx=sx+Math.cos(a)*rr*30*z,fy=sy+Math.sin(a)*rr*15*z,fl=.6+.4*Math.sin(age*9+k*2.1),h=(12+fl*14)*z;
        cx.globalAlpha=.85*fade;cx.fillStyle='#e8541c';cx.beginPath();cx.moveTo(fx-5*z,fy);cx.quadraticCurveTo(fx,fy-h*1.25,fx+5*z,fy);cx.fill();
        cx.fillStyle='#ffc23d';cx.beginPath();cx.moveTo(fx-3*z,fy);cx.quadraticCurveTo(fx,fy-h*.8,fx+3*z,fy);cx.fill();
      }
      cx.globalAlpha=1;
    }else if(q.kind==='flash'){
      const p=q.t/q.max;cx.globalAlpha=Math.min(1,p*1.6);const g=cx.createRadialGradient(sx,sy-10*z,2,sx,sy-10*z,80*z);g.addColorStop(0,'rgba(255,255,240,1)');g.addColorStop(1,'rgba(255,255,240,0)');cx.fillStyle=g;cx.beginPath();cx.arc(sx,sy-10*z,80*z,0,6.3);cx.fill();cx.globalAlpha=1;
    }
  }
  if(G.nades)for(const n of G.nades){
    const p=Math.min(1,n.t/n.d),x=n.x+(n.tx-n.x)*p,y=n.y+(n.ty-n.y)*p,arc=Math.sin(p*Math.PI)*2.6,[sx,sy]=toS(x,y);
    cx.fillStyle='#15150f';cx.beginPath();cx.arc(sx,sy-(10+arc*8)*z,3.4*z,0,6.3);cx.fill();cx.fillStyle=EXP[n.kind].col;cx.beginPath();cx.arc(sx,sy-(10+arc*8)*z,2.4*z,0,6.3);cx.fill();
  }
  // 기절 표시
  for(const u of G.units){if(u.dead||!(u.stun>0)||u.lay)continue;const [sx,sy]=toS(u.x,u.y);cx.strokeStyle='#ffe96b';cx.lineWidth=1.4*z;cx.beginPath();cx.ellipse(sx,sy-26*z,6*z,2.2*z,u.anim*3,0,6.3);cx.stroke();}
}
const _dwo=drawWeatherOverlay;
drawWeatherOverlay=function(){drawExp();return _dwo.apply(this,arguments);};
// ---- 상점 UI ----
(function(){
  const body=document.querySelector('#shopDrawer .shopBody');if(!body)return;
  const secs=body.querySelectorAll('section'),last=secs[secs.length-1];
  const sec=document.createElement('section');sec.id='shExp';
  sec.innerHTML='<h3>폭발물</h3><div id="shExpMsg" style="font-size:12px;color:var(--dim);line-height:1.45;margin-bottom:6px"></div>'+EXPK.map(k=>`<div class="shExpRow" data-k="${k}" style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;margin:4px 0"><div><b style="color:${EXP[k].col}">${EXP[k].n}</b><br><small style="color:var(--dim)">${EXP[k].desc}<br>${costText(EXP[k].cost)} / 개</small></div><button class="btn" data-n="1">+1</button><button class="btn" data-n="5">+5</button></div>`).join('');
  body.insertBefore(sec,last);
  sec.addEventListener('click',e=>{const b=e.target.closest('button[data-n]');if(!b||!G)return;const k=b.closest('.shExpRow').dataset.k;const er=shopAddExp(0,k,+b.dataset.n);if(er)toast(er);renderShop(true);});
})();
function updateExpUI(){
  const sec=document.getElementById('shExp');if(!sec||!G)return;
  const A=armories(0),ok=A.length>0;
  const msg=document.getElementById('shExpMsg');
  if(!ok)msg.innerHTML='🔒 <b>무기고</b>를 건설하면 해금됩니다 (건설 시설 → 무기고).';
  else{const t={smoke:0,flash:0,molotov:0,frag:0};for(const o of A){const s=armStock(o);for(const k of EXPK)t[k]+=s[k];}
    msg.innerHTML=`무기고 ${A.length}동 · 재고 ${EXPK.map(k=>`${EXP[k].n} ${t[k]}`).join(' · ')}<br>입고 대기 ${pendingExp(G.teams[0])} · 여유 ${armFree(0)}칸<br>무기고 ${ARM.range}칸 안의 대기 병사가 가까운 순으로 1개씩 수령합니다.`;}
  sec.querySelectorAll('button').forEach(b=>b.disabled=!ok);
  sec.style.opacity=ok?1:.55;
}
const _rs=renderShop;
renderShop=function(force){_rs(force);try{if(shopOpen())updateExpUI();}catch(e){}};

window.addEventListener('resize',resize);
new ResizeObserver(resize).observe($('stage'));
buildBar();initShop();resize();
$('fSeed').value=Math.random().toString(36).slice(2,8).toUpperCase();
$('fSeed').addEventListener('input',specialHint);$('bDice').addEventListener('click',()=>setTimeout(specialHint,0));specialHint();
window.__dbg={get G(){return G;},startGame};
requestAnimationFrame(frame);
