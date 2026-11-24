// ================= 구조물 개편 + 강화 트리 =================
// 감시탑 · HESCO(구 기관총좌) · 벙커 · 철조망 · 감시포(구 박격포 진지) · 구급함(구 의무 막사) · 모래주머니.
// 구조물 객체의 o.lv(0~2)가 강화 단계이고, 모래주머니는 1단계(방벽)에서 o.blk=true 로 통행 불가가 된다.
OB.mg.n='HESCO';OB.mortar.n='감시포';OB.medbay.n='구급함';
OB.mortar.slots=0;OB.medbay.beds=1;OB.medbay.slots=0;OB.medbay.staff=0;   // 구급함은 주둔할 수 없는 장애물
const MEDLV=[{beds:1,dur:3,sr:0},{beds:3,dur:5,sr:.15},{beds:5,dur:6,sr:.3}];
const UPT={
  tower:{names:['감시탑','엄폐 감시탑','저격진지'],
    info:['주둔 병사의 무기 성능 +, 날씨와 무관한 사거리 +3, 피격 확률 감소','피해 −20%','날씨와 무관한 사거리 +5, 85% 확률로 즉사 공격'],
    cost:[null,{money:40,wood:12,metal:10},{money:80,wood:14,metal:26}]},
  mg:{names:['HESCO','위장막 초소','방호진지'],
    info:['주둔 병사의 무기 성능 + 명중률 보너스, 받는 피해 −30%(올림)','덤불처럼 숨는다 (사격하면 잠시 드러남)','받는 피해 감소 +50%p (총 −80%, 올림)'],
    cost:[null,{money:45,wood:10,metal:12},{money:95,wood:12,metal:32}]},
  mortar:{names:['감시포','소이포','SAM 터렛'],
    info:['병사 없이 근거리 자동 사격 · 한 번에 한 명 · 속사','발사 속도 크게 감소, 탄착 지점에 불길 생성','지상 공격 불가 · 사거리 +15 · 근처 적 헬기와 구조물을 즉시 파괴'],
    cost:[null,{money:70,metal:24,bullets:30},{money:140,metal:60,bullets:60}]},
  medbay:{names:['구급함','의무 막사','급조 병원'],
    info:['1명씩 치료 · 치료 3초','3명 동시 치료 · 치료 5초 · 아군 자결률 −15%','5명 동시 치료 · 치료 6초 · 아군 자결률 −30%'],
    cost:[null,{money:55,wood:20,metal:10},{money:110,wood:30,metal:24}]},
  sandbag:{names:['모래주머니','방벽'],
    info:['엄폐물 (지나갈 수 있음)','통과할 수 없는 장애물 · 우회해야 함 · 체력 증가'],
    cost:[null,{money:10,wood:6,metal:2}]},
  bunker:{names:['벙커'],info:['주둔 병사들의 무기 성능 평균(올림)이 전원에게 적용 · 받는 피해와 피격 확률 감소'],cost:[null]},
  wire:{names:['철조망'],info:['넘어가는 모든 적에게 큰 체력 피해'],cost:[null]}
};
function stLv(o){return o.lv|0;}
function stName(o){const t=UPT[o.type];return t?t.names[Math.min(stLv(o),t.names.length-1)]:OB[o.type].n;}
// ---- 주둔 병사의 화기: 구조물이 병사의 무기 성능을 키워 준다 ----
function garGun(u,o){
  const t=o.type;if(o.natural||(t!=='tower'&&t!=='mg'&&t!=='bunker'))return null;
  const base=gunOf(u),lv=stLv(o),ws=Math.max(.3,weatherSight());
  if(t==='tower'){
    const g=Object.assign({},base);g.dmg=Math.ceil(base.dmg*1.2);g.acc=Math.min(.98,base.acc+.04);
    g.range=base.range+(lv>=2?5:3)/ws;            // findTarget 이 날씨 시야를 곱하므로 보정해 날씨와 무관하게
    if(lv>=2)g.ik=.85;
    return g;
  }
  if(t==='mg'){const g=Object.assign({},base);g.acc=Math.min(.98,base.acc+.1);return g;}
  const L=[];for(const id of o.occ){const q=G.uid.get(id);if(q)L.push(gunOf(q));}
  if(!L.length)return null;
  const av=k=>L.reduce((s,g)=>s+g[k],0)/L.length;
  const g=Object.assign({},base);
  g.dmg=Math.ceil(av('dmg')*1.1);g.range=Math.ceil(av('range'));g.acc=Math.min(.98,av('acc')+.03);g.int=av('int');
  return g;
}
// ---- 피해·피격 감소 ----
function stDmgMul(o){
  if(o.natural)return 1;
  if(o.type==='tower')return stLv(o)>=1?.8:1;
  if(o.type==='mg')return stLv(o)>=2?.2:.7;
  if(o.type==='bunker')return .75;
  return 1;
}
function stMiss(o){return o.natural?0:o.type==='tower'?.2:o.type==='bunker'?.15:0;}
const _hurtS=hurt;
hurt=function(u,dmg,s){
  if(u.gar&&G.obSet.has(u.gar)){const m=stDmgMul(u.gar);if(m<1)dmg=Math.max(1,Math.ceil(dmg*m));}
  return _hurtS(u,dmg,s);
};
const _rhS=resolveHit;
resolveHit=function(s,u,gun){
  if(u.gar&&G.obSet.has(u.gar)&&!VEH[u.type]){const m=stMiss(u.gar);if(m&&Math.random()<m)return;}
  if(gun.ik&&!VEH[u.type]){
    const dist=Math.hypot(s.x-u.x,s.y-u.y),acc=gun.acc*(1-.35*dist/Math.max(1,gun.range))*weatherAccuracy();
    if(Math.random()>acc)return;
    if(Math.random()<gun.ik){hurt(u,u.hp+999,s);fxPush({k:'spark',x:u.x,y:u.y,t:0,d:.2});return;}
    gun=Object.assign({},gun,{ik:0});
  }
  return _rhS(s,u,gun);
};
// ---- 위장막 초소: 주둔 병사는 덤불 속처럼 숨는다 ----
const _hidS=hiddenUnit;
hiddenUnit=function(e,ox,oy){
  const o=e.gar;
  if(o&&G.obSet.has(o)&&o.type==='mg'&&stLv(o)>=1&&!(e.reveal>0)){
    if(ox===undefined||Math.hypot(e.x-ox,e.y-oy)>3)return true;
  }
  return _hidS(e,ox,oy);
};
// ---- 구급함: 단계별 자결률 감소 ----
function medReduce(team){let r=0;for(const o of G.obSet)if(o.type==='medbay'&&!o.natural&&o.team===team)r=Math.max(r,MEDLV[stLv(o)].sr);return r;}
const _suiS=suicideUnit;
suicideUnit=function(u,med,sev){if(Math.random()<medReduce(u.team))return;return _suiS(u,med,sev);};
// ---- 소이포: 탄착 지점에 불길 ----
const _miS=mortarImpact;
mortarImpact=function(team,x,y,def){
  _miS(team,x,y,def);
  if(def&&def.fire){G.zones=G.zones||[];G.zones.push({kind:'fire',team,x,y,r:1.7,t:8,tick:.3,seed:Math.random()*9});clearBush(x,y,1.8);}
};
const INC={shell:26,trenchDmg:30,fire:true};
// ---- 감시포 / 소이포 / SAM 터렛 (병사 없이 자동 사격) + 철조망 ----
function turretRange(o){const l=stLv(o);return l===0?8.5:l===1?12:27;}
function heliKill(T,o){
  const h=T.heli;h.state='wait';h.t=0;h.timer=HELI.interval;
  const p=T.pad;if(p){fxPush({k:'boom',x:p.x+1.5,y:p.y+1.5,t:0,d:.8});sfx('boom',p.x+1.5,p.y+1.5);}
  if(G.teams[o.team]===G.teams[0]||T.id===0)toast(T.id===0?'적 SAM 이 보급 헬기를 격추했습니다!':'SAM 터렛이 적 헬기를 격추했습니다');
}
function stepTurrets(dt){
  for(const o of G.obSet){
    if(o.type!=='mortar'||o.natural)continue;
    const T=G.teams[o.team];if(!T)continue;
    const lv=stLv(o),cx0=o.x+.5,cy0=o.y+.5;
    o.cd=(o.cd||0)-dt;if(o.cd>0)continue;
    if(lv>=2){   // SAM: 지상 병력은 공격하지 않는다
      if(T.res.bullets<6){o.cd=1;continue;}
      const R=turretRange(o);let done=false;
      for(const E of G.teams){
        if(E.id===o.team||!E.heli||!E.pad||E.heli.state==='wait'||E.heli.delivered||E.heli.state==='leaving')continue;
        if(Math.hypot(E.pad.x+1.5-cx0,E.pad.y+1.5-cy0)<=R){T.res.bullets-=6;o.aim=Math.atan2(E.pad.y+1.5-cy0,E.pad.x+1.5-cx0);o.muz=.25;fxPush({k:'trace',x1:cx0,y1:cy0,x2:E.pad.x+1.5,y2:E.pad.y+1.5,t:0,d:.25});sfx('mortar',cx0,cy0);heliKill(E,o);done=true;break;}
      }
      if(!done){
        let best=null,bd=1e9;
        for(const q of G.obSet){if(q.natural||isAllyT(q.team,o.team)||q.team<0)continue;const d=Math.hypot(q.x+q.size/2-cx0,q.y+q.size/2-cy0);if(d<=R&&d<bd){bd=d;best=q;}}
        if(best){T.res.bullets-=6;o.aim=Math.atan2(best.y-cy0,best.x-cx0);o.muz=.25;fxPush({k:'trace',x1:cx0,y1:cy0,x2:best.x+.5,y2:best.y+.5,t:0,d:.25});sfx('mortar',cx0,cy0);damageOb(best,best.hp+999);o.cd=6;done=true;}
      }
      if(!done)o.cd=.8;else if(!(o.cd>0))o.cd=3;
      continue;
    }
    if(T.res.bullets<(lv?4:.4)){o.cd=.8;continue;}
    const R=turretRange(o)*weatherSight(),src={x:cx0,y:cy0};
    // 한 번에 한 명: 직전 표적이 유효하면 계속 노린다
    let tg=o.tgt;
    const okT=e=>e&&!e.dead&&!isAllyT(e.team,o.team)&&!e.lay&&e.state!=='crew'&&!inRoof(e)&&!hiddenUnit(e,cx0,cy0)&&Math.hypot(e.x-cx0,e.y-cy0)<=R;
    if(!okT(tg)){
      tg=null;let bd=R*R;
      for(const e of G.units){if(!okT(e))continue;const dx=e.x-cx0,dy=e.y-cy0,d=shotQ(src,e,dx*dx+dy*dy,bd,lv>0);if(d<bd){bd=d;tg=e;}}
      if(!tg)for(const v of G.vehicles){if(v.dead||isAllyT(v.team,o.team))continue;const dx=v.x-cx0,dy=v.y-cy0,d=shotQ(src,v,dx*dx+dy*dy,bd,lv>0);if(d<bd){bd=d;tg=v;}}
      o.tgt=tg;
    }
    if(!tg){o.cd=.4;continue;}
    o.aim=Math.atan2(tg.y-cy0,tg.x-cx0);o.muz=.12;
    if(lv===0){
      T.res.bullets-=.4;o.cd=.42;
      fxPush({k:'trace',x1:cx0,y1:cy0,x2:tg.x,y2:tg.y,t:0,d:.07});sfx('mg',cx0,cy0);
      resolveHit({x:cx0,y:cy0,team:o.team,state:'idle'},tg,{dmg:10,int:.42,range:9,cost:.4,acc:.82});
    }else{
      T.res.bullets-=4;o.cd=5.2*(.9+Math.random()*.2);
      const sc=(1-weatherAccuracy())*2;
      G.shells.push({team:o.team,x:cx0,y:cy0,tx:tg.x+(Math.random()-.5)*sc,ty:tg.y+(Math.random()-.5)*sc,t:0,d:.9,def:INC});
      fxPush({k:'smoke',x:cx0,y:cy0,t:0,d:1.1});sfx('mortar',cx0,cy0);
    }
  }
}
stepMortars=function(dt){
  stepTurrets(dt);
  // 철조망: 넘어가는 적에게 큰 피해 (아군에게는 무해)
  for(const u of G.units){
    if(u.dead||u.lay||u.gar||u.state==='crew'||u.state==='med')continue;
    u.wt=(u.wt||0)-dt;if(u.wt>0)continue;
    const tx=Math.floor(u.x),ty=Math.floor(u.y);if(!inb(tx,ty))continue;
    const o=G.obst[ty*G.w+tx];
    if(o&&o.type==='wire'&&!o.natural&&!isAllyT(o.team,u.team)){
      u.wt=.7;hurt(u,26,null);damageOb(o,14);fxPush({k:'spark',x:u.x,y:u.y,t:0,d:.2});
    }
  }
  for(const v of G.vehicles){
    if(v.dead)continue;v.wt=(v.wt||0)-dt;if(v.wt>0)continue;
    const tx=Math.floor(v.x),ty=Math.floor(v.y);if(!inb(tx,ty))continue;
    const o=G.obst[ty*G.w+tx];
    if(o&&o.type==='wire'&&!o.natural&&!isAllyT(o.team,v.team)){v.wt=.9;damageVehicle(v,12);damageOb(o,20);}
  }
};
// ---- 강화 ----
function stUpgradeErr(o,team){
  const t=UPT[o.type];if(!t||o.natural||o.team!==team)return '강화할 수 없는 구조물입니다';
  const lv=stLv(o);if(lv>=t.names.length-1)return '이미 최종 단계입니다';
  const c=t.cost[lv+1],T=G.teams[team];
  if(!canAfford(T,c))return '자원이 부족합니다';
  if(o.type==='sandbag'){for(const u of G.units)if(!u.dead&&!u.lay&&Math.floor(u.x)===o.x&&Math.floor(u.y)===o.y)return '병사가 위에 있어 방벽으로 바꿀 수 없습니다';}
  return null;
}
function stUpgrade(o,team){
  const er=stUpgradeErr(o,team);if(er)return er;
  const t=UPT[o.type],lv=stLv(o)+1;pay(G.teams[team],t.cost[lv]);
  o.lv=lv;
  if(o.type==='sandbag'){o.blk=true;o.max=Math.round(o.max*2.4);o.hp=Math.round(o.hp+o.max*.4);}
  else if(o.type==='tower'||o.type==='mg'){o.max=Math.round(o.max*1.35);o.hp=Math.min(o.max,o.hp+o.max*.3);}
  fxPush({k:'dust',x:o.x+.5,y:o.y+.5,t:0,d:.6});sfx('toast');
  return null;
}
// AI: 여유 자원이 있으면 구조물을 강화한다
function stAiUpgrade(T){
  if(T.res.money<160||(T.stAt&&G.time-T.stAt<14))return;
  const L=[];for(const o of G.obSet)if(!o.natural&&o.team===T.id&&UPT[o.type]&&!stUpgradeErr(o,T.id))L.push(o);
  if(!L.length)return;
  T.stAt=G.time;stUpgrade(L[Math.floor(Math.random()*L.length)],T.id);
}
// ---- 강화 메뉴 ----
(function(){
  const am=document.getElementById('armMenu');if(!am)return;
  const st=document.createElement('style');
  st.textContent=`#stMenu{position:absolute;top:56px;right:12px;z-index:26;width:330px;background:var(--panel);border:1px solid var(--line);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:9px}
#stMenu[hidden]{display:none}#stMenu h3{margin:0;font:600 14px var(--body);display:flex;justify-content:space-between;align-items:center}
#stMenu .hpb{height:5px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden}#stMenu .hpb i{display:block;height:100%;background:#7fbf6a}
#stMenu .tree{display:flex;flex-direction:column;gap:0}
#stMenu .nd{border:1px solid var(--line);border-radius:4px;padding:6px 8px;opacity:.55}#stMenu .nd.cur{opacity:1;border-color:var(--accent);background:rgba(217,173,78,.1)}#stMenu .nd.done{opacity:.85}
#stMenu .nd b{display:block;font-size:13px}#stMenu .nd span{color:var(--dim);line-height:1.4}
#stMenu .ln{width:2px;height:8px;background:var(--line);margin:0 auto}
#stMenu .cost{color:var(--dim);font-size:11px;margin-top:3px}`;
  document.head.appendChild(st);
  const m=document.createElement('aside');m.id='stMenu';m.hidden=true;am.parentNode.appendChild(m);
  let cur=null,sig='';
  function costTxt(c){return RK.filter(k=>c[k]).map(k=>RN[k]+' '+c[k]).join(' · ');}
  function render(force){
    if(m.hidden)return;
    if(!G||!cur||!G.obSet.has(cur)){m.hidden=true;return;}
    const o=cur,t=UPT[o.type],lv=stLv(o),T=G.teams[0];
    const s=[o.id,lv,Math.round(o.hp),RK.map(k=>Math.floor(T.res[k])).join()].join('|');
    if(!force&&s===sig)return;sig=s;
    const next=t.names.length-1>lv?t.cost[lv+1]:null,er=next?stUpgradeErr(o,0):null;
    m.innerHTML=`<h3><span>${stName(o)} <small style="color:var(--dim);font-weight:400">${t.names.length>1?`${lv+1}/${t.names.length}단계`:''}</small></span><button class="btn" id="stX" type="button">닫기 ✕</button></h3>
<div class="hpb"><i style="width:${Math.max(0,Math.min(100,o.hp/o.max*100))}%"></i></div>
<div class="tree">${t.names.map((n,i)=>`${i?'<div class="ln"></div>':''}<div class="nd ${i===lv?'cur':i<lv?'done':''}"><b>${i<lv?'✔ ':i===lv?'▶ ':''}${n}</b><span>${t.info[i]}</span>${i>lv&&t.cost[i]?`<div class="cost">강화 비용: ${costTxt(t.cost[i])}</div>`:''}</div>`).join('')}</div>
${next?`<button class="btn" id="stUp" type="button" ${er?'disabled':''} style="${er?'':'border-color:var(--accent)'}">${t.names[lv+1]}(으)로 강화 · ${costTxt(next)}</button>${er?`<div style="color:#e08a7a">${er}</div>`:''}`:(t.names.length>1?'<div style="color:var(--dim)">최종 단계입니다.</div>':'')}`;
  }
  m.addEventListener('click',e=>{
    if(e.target.id==='stX'){m.hidden=true;return;}
    if(e.target.id==='stUp'&&G&&cur){const er=stUpgrade(cur,0);if(er)toast(er);sig='';render(true);}
  });
  window.structMenu=function(o){
    if(!UPT[o.type]||BUILDS.includes(tool))return false;
    cur=o;m.hidden=false;if(typeof armMenu==='function')armMenu(false);sig='';render(true);return true;
  };
  setInterval(()=>render(false),300);
  const _am=window.armMenu;window.armMenu=function(v){if(v)m.hidden=true;return _am(v);};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)m.hidden=true;});
})();
// ---- 강화 단계 표시 (구조물 위 금색 점) ----
{const _dwS=drawWeatherOverlay;drawWeatherOverlay=function(){
  const r=_dwS.apply(this,arguments);
  try{
    const z=cam.z;
    for(const o of G.obSet){
      if(o.natural||!(o.lv>0))continue;
      const [sx,sy]=toS(o.x+o.size/2,o.y+o.size/2);if(sx<-40||sx>W+40||sy<-40||sy>H+40)continue;
      const n=o.lv,oy=sy-(o.type==='tower'?44:o.type==='bunker'?30:24)*z;
      for(let k=0;k<n;k++){cx.beginPath();cx.arc(sx+(k-(n-1)/2)*8*z,oy,3.2*z,0,6.3);cx.fillStyle='#f2c14e';cx.fill();cx.lineWidth=1;cx.strokeStyle='#2a1c06';cx.stroke();}
    }
  }catch(e){}
  return r;
};}
