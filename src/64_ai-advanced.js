// ================= AI vs 자경단: 우회 + 총동원 소탕 후 복귀 =================
// 1) 우회: AI 의 이동 명령은 자경단 활동 구역(도시 반경+여유)을 지나는 경로 비용이 크게 올라가 되도록 피해서 간다.
// 2) 소탕: 본진이 안전하고 병력이 충분하면 가까운 자경단 무리를 향해 통솔 가능한 병력 전체를 보내 전멸시킨 뒤 본진으로 복귀한다.
const PURGE={avoid:6,pad:7,every:6,cool:70,minN:6,ratio:1.1,maxDist:80,timeout:110};
function milGroups(){return (G.militia||[]).filter(g=>milAlive(g).length>=2);}
function milAlive(g){return G.civs.filter(c=>c.mil&&!c.dead&&c.grp===g);}
function milDangerBuild(){
  if(G.milDT===G.time)return;G.milDT=G.time;
  const gs=milGroups();if(!gs.length){MILD=null;return;}
  if(!MILD||MILD.length!==G.N)MILD=new Float32Array(G.N);else MILD.fill(0);
  for(const g of gs){
    const R=g.R+PURGE.pad,x0=Math.max(0,Math.floor(g.cx-R)),x1=Math.min(G.w-1,Math.ceil(g.cx+R)),y0=Math.max(0,Math.floor(g.cy-R)),y1=Math.min(G.h-1,Math.ceil(g.cy+R));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const d=Math.hypot(x+.5-g.cx,y+.5-g.cy);if(d<=R){const k=1+(PURGE.avoid-1)*(1-d/R*.5);if(k>MILD[y*G.w+x])MILD[y*G.w+x]=k;}}
  }
}
function aiPathWrap(f){
  return function(us,...a){
    const ai=us&&us.length&&G.teams[us[0].team]&&G.teams[us[0].team].ai;
    if(!ai)return f(us,...a);
    const T=G.teams[us[0].team],g=typeof aiDangerGrid==='function'?aiDangerGrid(T,us):(milDangerBuild(),MILD),sv=MILD;
    MILD=g;MILD_ON=!!g;
    try{return f(us,...a);}finally{MILD_ON=false;MILD=sv;}
  };
}
orderMove=aiPathWrap(orderMove);orderMoveL=aiPathWrap(orderMoveL);
function aiHomeThreat(T){const my=T.flag,r=12+G.w*.05;return foesNear(T,my.x,my.y,r).n>0;}
function aiPurgeStart(T,A,fighters){
  const my=T.flag,gs=milGroups().map(g=>({g,d:Math.hypot(g.cx-my.x,g.cy-my.y),n:milAlive(g).length})).filter(o=>o.d<=PURGE.maxDist).sort((a,b)=>a.d-b.d);
  for(const o of gs){
    if(fighters.length<Math.max(PURGE.minN,Math.ceil(o.n*PURGE.ratio)+2))continue;
    const ids=fighters.map(u=>u.id);
    A.purge={g:o.g,ids,t:0,phase:'go'};A.squad=[];
    o.g.purge=o.g.purge||{};o.g.purge[T.id]=true;
    if(T.id===0)return true;
    return true;
  }
  return false;
}
function aiPurgeEnd(T,A,why){
  const p=A.purge;A.purge=null;A.purgeCd=G.time+PURGE.cool;
  if(p&&p.g.purge){delete p.g.purge[T.id];if(!Object.keys(p.g.purge).length)p.g.purge=null;}
  const my=T.flag,back=(typeof nearestOwnTrench==='function'&&nearestOwnTrench(T,my.x,my.y,10))||[my.x,my.y];
  const us=(p?p.ids:[]).map(id=>G.uid.get(id)).filter(u=>u&&!u.dead&&u.team===T.id&&!u.lay);
  if(us.length)orderMove(us,Math.round(back[0]),Math.round(back[1]));   // 복귀
}
function aiPurgeStep(T,dt){
  const A=T.ai;if(!A||G.phase!=='play'||!T.flag||isDef())return false;
  A.pn=(A.pn||0)-dt;
  if(A.purge){
    if(aiHomeThreat(T)){aiPurgeEnd(T,A,'home');return false;}   // 본진이 위험하면 소탕 중단 → 통상 방어
    if(A.pn>0)return true;A.pn=1.4;
    const p=A.purge;p.t+=1.4;
    const sq=p.ids.map(id=>G.uid.get(id)).filter(u=>u&&!u.dead&&u.team===T.id);
    const M=milAlive(p.g);
    if(!M.length||sq.length<Math.max(2,p.ids.length*.25)||p.t>PURGE.timeout){aiPurgeEnd(T,A);return false;}
    // 가장 가까운 자경단원 쪽으로 밀고 들어간다. 사거리 안에서는 제자리 사격
    const work=sq.filter(u=>!u.lay&&u.state!=='med'&&u.state!=='medmove'&&u.state!=='medwait'&&u.state!=='medqueue');
    const go=[];
    for(const u of work){
      let bd=1e9,bm=null;for(const m of M){const d=Math.hypot(m.x-u.x,m.y-u.y);if(d<bd){bd=d;bm=m;}}
      if(bm&&(bd>6.5&&u.state!=='move'||bd>14&&u.state==='move'&&!u.path.length)){go.push([u,bm]);}
    }
    if(p.phase==='go'||go.length){
      // 한 번에 같은 목표로 묶어서 이동시킨다
      const first=M[0];
      const grouped=go.map(o=>o[0]);if(grouped.length)orderMove(grouped,Math.floor(first.x),Math.floor(first.y));
      p.phase='fight';
    }
    aiShop(T);
    return true;
  }
  // 시작 판단
  if((A.purgeCd||0)>G.time||G.time<75)return false;
  if(A.pchk===undefined)A.pchk=0;A.pchk-=dt;if(A.pchk>0)return false;A.pchk=PURGE.every;
  if(!G.militia||!G.militia.length||aiHomeThreat(T)||Math.random()<.35)return false;
  const mine=G.units.filter(u=>u.team===T.id&&!u.dead&&u.state!=='crew'&&!u.gar&&!u.lay&&!['med','medwait','medmove','medqueue'].includes(u.state));
  return aiPurgeStart(T,A,mine);
}
const _aiTickP=aiTick;
aiTick=function(T,dt){if(T.ai&&aiPurgeStep(T,dt))return;return _aiTickP(T,dt);};


// ================= AI 고도화: 위협 지도 · 병과별 역할 · 수송 · 결과 학습 · 적 구성에 따른 구매 =================
const AIS={cell:4,decay:.965,roleEvery:4.5};
// ---- 1. 위협 지도: 본 적의 위치를 기억(시간이 지나면 흐려짐). 경로 비용·우회 방향·방어 배치에 쓴다 ----
function thrW(){return Math.ceil(G.w/AIS.cell);}
function aiThrGrid(A){const n=thrW()*Math.ceil(G.h/AIS.cell);if(!A.thr||A.thr.length!==n)A.thr=new Float32Array(n);return A.thr;}
function aiThrAt(A,x,y){const g=aiThrGrid(A),W=thrW();return g[((y/AIS.cell)|0)*W+((x/AIS.cell)|0)]||0;}
function aiThrUpdate(T,A,mine){
  const g=aiThrGrid(A),W=thrW();
  for(let i=0;i<g.length;i++)g[i]*=AIS.decay;
  const add=(x,y,w)=>{if(!inb(x|0,y|0))return;const i=((y/AIS.cell)|0)*W+((x/AIS.cell)|0);g[i]=Math.min(12,g[i]+w);};
  for(const e of G.units){
    if(e.dead||e.team===T.id||e.state==='crew'||e.lay||!(e.team>=0&&e.team<=3))continue;
    let seen=false;for(const o of mine){if(Math.hypot(o.x-e.x,o.y-e.y)<=10&&!hiddenUnit(e,o.x,o.y)){seen=true;break;}}
    if(seen)add(e.x,e.y,1);
  }
  for(const v of G.vehicles){
    if(v.dead||v.team===T.id)continue;
    for(const o of mine){if(Math.hypot(o.x-v.x,o.y-v.y)<=12){add(v.x,v.y,3);break;}}
  }
  for(const c of G.civs||[]){if(c.mil&&!c.dead&&c.tg&&c.tg.team===T.id)add(c.x,c.y,.7);}
}
function aiThrCentroid(A,cx,cy,r){
  const g=aiThrGrid(A),W=thrW();let s=0,sx=0,sy=0;
  for(let y=Math.max(0,((cy-r)/AIS.cell)|0);y<=Math.min(Math.ceil(G.h/AIS.cell)-1,((cy+r)/AIS.cell)|0);y++)for(let x=Math.max(0,((cx-r)/AIS.cell)|0);x<=Math.min(W-1,((cx+r)/AIS.cell)|0);x++){
    const v=g[y*W+x];if(v<.5)continue;s+=v;sx+=(x+.5)*AIS.cell*v;sy+=(y+.5)*AIS.cell*v;
  }
  return s?{s,x:sx/s,y:sy/s}:{s:0,x:cx,y:cy};
}
// 경로 비용 격자(자경단 구역 + 팀이 기억하는 위협). 같은 초 안에서는 재사용
function aiDangerGrid(T,us){
  const A=T.ai;if(A.dgT===G.time)return A.dg;A.dgT=G.time;
  if(typeof milDangerBuild==='function')milDangerBuild();
  const rush=A.tactic==='rush'&&us&&us.length&&(A.squad||[]).includes(us[0].id);
  const g=aiThrGrid(A),W=thrW();let any=false;
  if(!rush)for(let i=0;i<g.length;i++)if(g[i]>=1.5){any=true;break;}
  if(!any){A.dg=MILD||null;return A.dg;}
  const out=new Float32Array(G.N);if(MILD)out.set(MILD);
  for(let cy=0;cy<Math.ceil(G.h/AIS.cell);cy++)for(let cx=0;cx<W;cx++){
    const v=g[cy*W+cx];if(v<1.5)continue;const k=1+Math.min(2.2,v*.35);
    for(let y=cy*AIS.cell;y<Math.min(G.h,(cy+1)*AIS.cell);y++)for(let x=cx*AIS.cell;x<Math.min(G.w,(cx+1)*AIS.cell);x++){const i=y*G.w+x;if(k>out[i])out[i]=k;}
  }
  return A.dg=out;
}
function aiPickSide(T,my,tf,dxl,dyl,L){
  const A=T.ai,px=-dyl/L,py=dxl/L;let best=A.side||1,bs=1e9;
  for(const side of [-1,1]){
    let s=0;for(const f of [.2,.35,.5,.65,.8]){const o=side*L*.3*Math.sin(Math.PI*f);s+=aiThrAt(A,clamp(my.x+dxl*f+px*o,1,G.w-2),clamp(my.y+dyl*f+py*o,1,G.h-2));}
    s+=Math.random()*.3;if(s<bs){bs=s;best=side;}
  }
  return best;
}
// ---- 2. 병과별 역할 ----
function aiRoleRank(u){const k=u.gun||'rifle';return k==='assault'?0:k==='pistol'||k==='rifle'||k==='at'?1:k==='sling'?2:k==='lmg'?3:4;}
function aiRoles(T,A,mine){
  A.rt=(A.rt||0)-1;if(A.rt>0)return;A.rt=AIS.roleEvery;
  const my=T.flag,sq=new Set(A.squad||[]),taken=new Set();
  for(const u of mine)if(u.aiRole&&u.aiTo)taken.add(u.aiTo[1]*G.w+u.aiTo[0]);
  const tf=G.flags.find(f=>f.team!==T.id&&G.teams[f.team].alive)||my;
  const thr=aiThrCentroid(A,my.x,my.y,26),face=thr.s>0?thr:tf;
  let nS=0,nL=0;
  for(const u of mine){
    const k=u.gun;if(k!=='sniper'&&k!=='lmg'){if(u.aiRole){u.aiRole=null;u.aiTo=null;}continue;}
    if(sq.has(u.id)||u.gar||u.garTarget||u.task||u.queue.length||u.fetch||u.lay||u.medTarget||u.state==='work')continue;
    if(u.aiRole&&u.aiTo){
      const d=Math.hypot(u.x-u.aiTo[0]-.5,u.y-u.aiTo[1]-.5);
      if(d<=3||u.state==='move')continue;
    }
    if(k==='sniper'){
      // 1순위: 빈 감시탑/저격진지 주둔, 2순위: 본진 근처 고지 · 참호
      let tw=null,td=1e9;
      for(const o of G.obSet){if(o.type!=='tower'||o.natural||o.team!==T.id||o.occ.length>=(OB.tower.slots||0))continue;const d=Math.hypot(o.x-my.x,o.y-my.y);if(d<24&&d<td){td=d;tw=o;}}
      if(tw){orderGarrison([u],tw);u.aiRole='snipe';u.aiTo=[tw.x,tw.y];nS++;continue;}
      let best=null,bs=-1e9;
      for(let t=0;t<50;t++){
        const a=Math.random()*6.283,r=3+Math.random()*13,x=Math.floor(my.x+Math.cos(a)*r+(face.x-my.x)/Math.max(8,Math.hypot(face.x-my.x,face.y-my.y))*4),y=Math.floor(my.y+Math.sin(a)*r+(face.y-my.y)/Math.max(8,Math.hypot(face.x-my.x,face.y-my.y))*4);
        if(!inb(x,y))continue;const i=y*G.w+x;if(G.obst[i]||G.tt[i]===2||G.trench[i]===255||taken.has(i))continue;
        const s=(G.hill?G.lv[i]*3:0)+(G.trench[i]===T.id+1?2.5:0)+(G.brush[i]?1.5:0)-Math.hypot(x-my.x,y-my.y)*.12-Math.hypot(x-face.x,y-face.y)*.03;
        if(s>bs){bs=s;best=[x,y];}
      }
      if(best){orderMove([u],best[0],best[1]);u.aiRole='snipe';u.aiTo=best;taken.add(best[1]*G.w+best[0]);nS++;}
    }else{
      // 경기관총: 적 쪽에 가장 가까운 아군 참호 칸
      let best=null,bd=1e9;
      for(const ti of T.trench){if(G.trench[ti]!==T.id+1||taken.has(ti)||G.obst[ti])continue;const x=ti%G.w,y=(ti/G.w)|0,d=Math.hypot(x-face.x,y-face.y);if(d<bd&&Math.hypot(x-my.x,y-my.y)<26){bd=d;best=[x,y];}}
      if(best){orderMove([u],best[0],best[1]);u.aiRole='lmg';u.aiTo=best;taken.add(best[1]*G.w+best[0]);nL++;}
    }
  }
}
// 위협이 본진 쪽으로 몰리면 놀고 있는 병사 일부를 그쪽 참호로 미리 배치
function aiThreatRally(T,A,free){
  A.tr=(A.tr||0)-1;if(A.tr>0)return;A.tr=10;
  if(A.purge||A.squad.length||free.length<3)return;
  const my=T.flag,R=14+G.w*.1,c=aiThrCentroid(A,my.x,my.y,R*1.6);
  if(c.s<4)return;
  const rally=nearestOwnTrench(T,my.x+(c.x-my.x)*.5,my.y+(c.y-my.y)*.5,10);if(!rally)return;
  const mv=free.filter(u=>!u.aiRole&&Math.hypot(u.x-rally[0],u.y-rally[1])>4).slice(0,Math.max(2,Math.floor(free.length*.3)));
  if(mv.length)orderMove(mv,rally[0],rally[1]);
}
// ---- 3. 수송: 원정 부대 일부를 트럭/헬기로 목표 앞까지 실어 나른다 ----
function aiTransport(T,A,mine){
  const C=A.cargo;
  if(C){
    const v=C.v;C.t+=1;
    const us=C.ids.map(id=>G.uid.get(id)).filter(u=>u&&!u.dead&&u.team===T.id);
    const back=()=>{for(const u of us)if(u.state!=='crew'){u.boardV=undefined;if(!A.squad.includes(u.id))A.squad.push(u.id);}A.cargo=null;};
    if(v.dead||!us.length){A.cargo=null;return;}
    if(C.phase==='pick'){
      const pax=vehPax(v).length,pend=seatsPending(v);
      if(pax>0&&(pend===0||C.t>25)||C.t>40){
        if(!pax){back();return;}
        for(const u of us)if(u.state!=='crew'){u.boardV=undefined;u.path=[];if(!A.squad.includes(u.id))A.squad.push(u.id);}   // 못 탄 병사는 걸어서 합류
        C.ids=us.filter(u=>u.state==='crew').map(u=>u.id);
        orderVehicles([v],C.drop[0],C.drop[1]);C.phase='ride';C.t=0;
      }
    }else{
      const stopped=v.state==='idle'&&!v.dest&&!(v.alt>.02);
      if(stopped&&Math.hypot(v.x-C.drop[0],v.y-C.drop[1])<8||C.t>70&&stopped){
        if(vehPax(v).length)unloadVehicle(v);
        for(const u of us)if(u.state!=='crew'&&!A.squad.includes(u.id))A.squad.push(u.id);
        A.f=Math.max(A.f||0,C.f);A.cargo=null;
      }else if(C.t>110){if(stopped&&vehPax(v).length)unloadVehicle(v);back();}
    }
    return;
  }
  if(A.squad.length<4||A.purge||(A.mode!=='gather'&&A.mode!=='macro')||(A.f||0)>.3)return;
  if((A.cargoCd||0)>G.time)return;
  const v=G.vehicles.find(q=>q.team===T.id&&!q.dead&&vehSeats(q)>0&&q.state==='idle'&&!q.dest&&!(q.alt>.02)&&!vehPax(q).length);
  if(!v)return;
  const tf=G.flags.find(f=>f.team!==T.id&&G.teams[f.team].alive);if(!tf)return;
  const my=T.flag,L=Math.hypot(tf.x-my.x,tf.y-my.y);if(L<32)return;
  // 하차 지점: 적 본진 앞 62% 지점 근처에서 위협이 약한 곳
  let drop=null,bs=1e9;
  for(let t=0;t<14;t++){
    const f=.5+Math.random()*.2,x=Math.round(my.x+(tf.x-my.x)*f+(Math.random()-.5)*8),y=Math.round(my.y+(tf.y-my.y)*f+(Math.random()-.5)*8);
    if(!inb(x,y)||!vehiclePass(x+.5,y+.5,v))continue;const s=aiThrAt(A,x,y)*3-f*4;if(s<bs){bs=s;drop=[x,y,f];}
  }
  if(!drop)return;
  const sq=A.squad.map(id=>G.uid.get(id)).filter(u=>u&&!u.dead&&u.state!=='crew');
  const seats=vehSeats(v),ids=sq.sort((a,b)=>Math.hypot(a.x-v.x,a.y-v.y)-Math.hypot(b.x-v.x,b.y-v.y)).slice(0,seats);
  if(ids.length<3||Math.hypot(ids[0].x-v.x,ids[0].y-v.y)>22){A.cargoCd=G.time+20;return;}
  if(!tryBoard(ids,v)){A.cargoCd=G.time+20;return;}
  A.squad=A.squad.filter(id=>!ids.some(u=>u.id===id));
  A.cargo={v,ids:ids.map(u=>u.id),phase:'pick',t:0,drop:[drop[0],drop[1]],f:Math.max(.35,drop[2]-.05)};
  A.cargoCd=G.time+45;
}
// ---- 4. 결과 학습: 원정 전술별 성과로 선택 확률 보정 ----
function aiLearn(T,A){
  if(A.purge){A.rec=null;return;}
  if(A.squad.length&&!A.rec){A.rec={tac:A.tactic||'frontal',t0:G.time,k0:T.kills||0,l0:T.lost||0,n0:A.squad.length};return;}
  if(!A.squad.length&&A.rec&&!A.cargo){
    const r=A.rec;A.rec=null;
    if(G.time-r.t0<10||A.mode==='defend')return;
    const kills=(T.kills||0)-r.k0,loss=(T.lost||0)-r.l0,ratio=(kills+1)/(loss+1);
    A.tw=A.tw||{};const cur=A.tw[r.tac]||1;
    A.tw[r.tac]=Math.max(.35,Math.min(2.5,ratio>=1.3?cur*1.25:ratio<.8?cur*.7:cur));
    A.log=(A.log||[]);A.log.push({tac:r.tac,kills,loss,t:G.time|0});if(A.log.length>12)A.log.shift();
  }
}
// ---- 5. 적 구성 분석 → 구매·건설 가중치 ----
function aiProfile(T,A){
  if(A.prof&&G.time-A.prof.t<5)return A.prof;
  let n=0,ent=0,snip=0,lmg=0,hp=0,mh=0;
  for(const e of G.units){
    if(e.dead||e.team===T.id||e.state==='crew'||!(e.team>=0&&e.team<=3))continue;
    n++;if(e.gar||sameTeamTrench(e))ent++;if(e.gun==='sniper')snip++;if(e.gun==='lmg')lmg++;
  }
  let veh=0,air=0;for(const v of G.vehicles){if(v.dead||v.team===T.id)continue;if(VEH[v.type].air)air++;else if(v.type==='tank')veh++;}
  return A.prof={t:G.time,n,ent:n?ent/n:0,snip,lmg,veh,air};
}
function aiTuneW(T,w){
  const p=aiProfile(T,T.ai);
  if(p.n>=4&&p.ent>.35){w.sniper=(w.sniper||0)+3;w.assault=(w.assault||0)+1;}     // 참호 속 적에겐 정밀·저격
  if(p.n>=4&&p.ent<.15){w.lmg=(w.lmg||0)+3;w.assault=(w.assault||0)+2;}           // 노출된 적에겐 제압 화력
  if(p.snip>=2||p.lmg>=3){w.pistol=Math.max(0,(w.pistol||0)-1);}
  return w;
}
function aiTuneExp(T,w){
  const p=aiProfile(T,T.ai);
  if(p.n>=4&&p.ent>.35){w.frag=(w.frag||0)+4;w.molotov=(w.molotov||0)+2;}
  if(p.snip>=2||p.lmg>=3)w.smoke=(w.smoke||0)+3;
  if(p.n>=4&&p.ent<.15)w.flash=(w.flash||0)+1;
  return w;
}
function aiTuneTypes(T,types){
  const A=T.ai,p=aiProfile(T,A),out=[];
  if(p.air>0)out.push('mortar','mortar','mortar');                  // 적 헬기 → 감시포(대공 단계)
  if(p.n>=4&&p.ent>.4)out.push('mortar','mortar');                  // 참호전 → 포
  if(p.veh>0)out.push('mg','mg');
  if(!G.vehicles.some(v=>v.team===T.id&&!v.dead&&vehSeats(v)>0)&&T.res.money>=160)out.push('truck','truck');
  if(T.res.money>=520&&!G.vehicles.some(v=>v.team===T.id&&!v.dead&&v.type==='heli'))out.push('heli');
  return out;
}
// ---- 통합 ----
const _aiTickS=aiTick;
aiTick=function(T,dt){
  const r=_aiTickS(T,dt);
  const A=T.ai;if(!A||G.phase!=='play'||!T.flag)return r;
  A.smT=(A.smT||0)-dt;if(A.smT>0)return r;A.smT=1;
  if(!A.squad)A.squad=[];
  const mine=G.units.filter(u=>u.team===T.id&&!u.dead&&u.state!=='crew');if(!mine.length)return r;
  try{
    aiThrUpdate(T,A,mine);aiLearn(T,A);
    if(!A.purge){
      aiRoles(T,A,mine);
      aiTransport(T,A,mine);
      aiThreatRally(T,A,mine.filter(u=>u.state==='idle'&&!u.gar&&!u.lay&&!u.task&&!u.queue.length&&!(A.squad||[]).includes(u.id)));
    }
  }catch(e){console.error('[AI-smart]',e);}
  return r;
};
orderVehicles=aiPathWrap(orderVehicles);
