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
