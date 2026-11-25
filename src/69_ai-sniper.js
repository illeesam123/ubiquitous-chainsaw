// ================= AI 저격수 운용: 덤불 매복 · 사거리 끝 사격 · 쏘고 빠지기 =================
// 1) 적이 없으면 위협 방향 근처의 덤불로 들어가 숨는다(덤불 속 병사는 발사 후 3초를 빼면 보이지 않는다).
// 2) 적이 사거리 밖(SNP.edge 비율 이상)이면 사거리 끝 ~SNP.edge 거리까지만 다가가 사격 자리를 잡는다.
// 3) 적이 너무 가깝거나(SNP.near 비율 미만) 체력이 낮으면 뒤로 빠진다.
// 4) 사격해서 노출되면(reveal) 다른 덤불·엄폐 자리로 옮겨 다시 숨는다(쏘고 이동).
// 원정대·소탕대·주둔·작업 중인 저격수는 건드리지 않는다. 조종 중에는 u.snT 로 aiRoles 의 재배치를 막는다.
const SNP={every:1.2,near:.55,edge:.9,seek:9,hideR:11,scoot:4.5,hold:3};
function snOK(x,y){if(!inb(x,y))return false;const i=y*G.w+x;return !G.obst[i]&&G.tt[i]!==2&&G.tt[i]!==4&&G.trench[i]!==255&&!G.up[i]&&!G.mouth[i];}
function snFoes(T,u,R){
  const out=[];
  for(const e of G.units){
    if(e.dead||e.state==='crew'||(e.lay|0)!==(u.lay|0)||isAllyT(e.team,T.id))continue;
    const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<=R)out.push([e,d]);
  }
  if(G.civs)for(const c of G.civs){
    if(c.dead||!c.mil)continue;
    const d=Math.hypot(c.x-u.x,c.y-u.y);if(d<=R)out.push([c,d]);
  }
  return out;
}
// (cx,cy) 부근에서 조건에 맞는 최선 칸: 덤불 > 참호 > 평지. ok(x,y)로 거리 조건을 건다.
function snPick(u,cx,cy,rad,ok,prefAway){
  let best=null,bs=-1e9;
  for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){
    const x=Math.floor(cx)+dx,y=Math.floor(cy)+dy;
    if(!snOK(x,y)||!ok(x+.5,y+.5))continue;
    const i=y*G.w+x;
    let s=(G.brush[i]?4:0)+(G.trench[i]===u.team+1?2:0)+(G.hill?G.lv[i]*.5:0)-Math.hypot(x+.5-u.x,y+.5-u.y)*.25;
    if(prefAway)s+=Math.hypot(x+.5-prefAway[0],y+.5-prefAway[1])*.05;
    if(s>bs){bs=s;best=[x,y];}
  }
  return best;
}
function aiSnipers(T){
  const A=T.ai;if(!A)return;
  const R0=WEAP.sniper.range,busy=new Set([...(A.squad||[]),...((A.purge&&A.purge.ids)||[])]);
  for(const u of G.units){
    if(u.team!==T.id||u.dead||u.gun!=='sniper'||u.lay||u.gar||u.garTarget||u.task||u.fetch||u.medTarget||u.wf||u.af||u.after||busy.has(u.id)||u.state==='work'||u.state==='crew'||u.state==='gar')continue;
    if(u.queue&&u.queue.length)continue;
    const R=R0*(typeof weatherSight==='function'?weatherSight():1);
    const foes=snFoes(T,u,R+SNP.seek);
    const here=G.brush[Math.floor(u.y)*G.w+Math.floor(u.x)];
    let nearest=null,nd=1e9;for(const [e,d] of foes)if(d<nd){nd=d;nearest=e;}
    const act=(p,why)=>{if(!p)return false;orderMove([u],p[0],p[1]);u.snT=G.time+SNP.hold;u.snW=why;return true;};
    if(!nearest){
      // 매복: 위협 방향 근처 덤불로 들어가 숨는다
      if(here||u.state==='move')continue;
      const my=T.flag,thr=typeof aiThrCentroid==='function'?aiThrCentroid(A,my.x,my.y,28):{s:0},tf=thr.s>0?thr:(G.flags.find(f=>f.team!==T.id&&G.teams[f.team].alive)||my);
      const dirx=tf.x-my.x,diry=tf.y-my.y,dl=Math.hypot(dirx,diry)||1;
      const p=snPick(u,u.x,u.y,SNP.hideR,(x,y)=>{const i=Math.floor(y)*G.w+Math.floor(x);return G.brush[i]&&Math.hypot(x-my.x,y-my.y)<=24&&((x-my.x)*dirx+(y-my.y)*diry)/dl>-2;},null);
      if(p&&G.brush[p[1]*G.w+p[0]])act(p,'ambush');
      continue;
    }
    const lowHp=u.hp<(u.max||150)*.45;
    if(nd<R*SNP.near||(lowHp&&nd<R*.8)){
      // 후퇴: 적 반대편(가능하면 본진 쪽)으로 사거리 안쪽 간격을 다시 벌린다
      if(here&&nd>R*.3&&!lowHp)continue;                       // 덤불 속이고 아직 완전히 붙지 않았으면 가만히
      const ax=u.x-nearest.x,ay=u.y-nearest.y,al=Math.hypot(ax,ay)||1,my=T.flag;
      const tx=u.x+ax/al*R*.6,ty=u.y+ay/al*R*.6;
      const p=snPick(u,tx,ty,4,(x,y)=>Math.hypot(x-nearest.x,y-nearest.y)>=nd+3,[my.x,my.y]);
      act(p||[Math.floor(clamp(tx,2,G.w-3)),Math.floor(clamp(ty,2,G.h-3))],'retreat');
      continue;
    }
    if(nd>R*SNP.edge&&nd<=R+SNP.seek){
      // 사거리 끝 사격 자리까지 접근(적 쪽으로 가되 edge 거리 이상 유지)
      if(u.state==='move'&&u.snW==='edge')continue;
      const ax=u.x-nearest.x,ay=u.y-nearest.y,al=Math.hypot(ax,ay)||1;
      const tx=nearest.x+ax/al*R*SNP.edge,ty=nearest.y+ay/al*R*SNP.edge;
      const p=snPick(u,tx,ty,3,(x,y)=>Math.hypot(x-nearest.x,y-nearest.y)<=R*.96&&Math.hypot(x-nearest.x,y-nearest.y)>=R*SNP.near+2,null);
      act(p,'edge');
      continue;
    }
    // 사거리 안: 쏜 직후(노출)면 자리를 옮겨 다시 숨는다
    if((u.reveal||0)>.5&&(u.snMv||0)<G.time){
      const p=snPick(u,u.x,u.y,Math.ceil(SNP.scoot+3),(x,y)=>{const dd=Math.hypot(x-nearest.x,y-nearest.y),m=Math.hypot(x-u.x,y-u.y);return m>=SNP.scoot&&dd<=R*.96&&dd>=R*SNP.near+2;},null);
      if(p){act(p,'scoot');u.snMv=G.time+SNP.scoot*1.6;}
    }
  }
}
const _aiTickSn=aiTick;
aiTick=function(T,dt){
  const r=_aiTickSn(T,dt);
  if(T.ai&&T.id!==0&&G.phase==='play'){T.ai.snT=(T.ai.snT||0)-dt;if(T.ai.snT<=0){T.ai.snT=SNP.every;try{aiSnipers(T);}catch(e){console.error('AI 저격수 오류',e);}}}
  return r;
};
