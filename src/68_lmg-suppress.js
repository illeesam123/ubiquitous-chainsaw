// ================= 경기관총 제압 사격 =================
// 사거리를 넓히는 대신 '포화' 메커니즘: 겨눈 적을 맞히지 못한 탄은 사선 뒤쪽으로 계속 날아가
// 사선 가까이(LMG_SUP.width 칸)에 있는 다른 적(병사·차량)을 낮은 명중률로 다시 맞힐 수 있다.
const LMG_SUP={width:.85,accMul:.6,chance:.75,reach:1.35};   // reach: 사거리 대비 탄이 날아가는 최대 거리 배율
const _rhLmg=resolveHit;
resolveHit=function(s,u,gun){
  if(!gun||!gun.sup){return _rhLmg(s,u,gun);}
  const hp0=u.hp,hit0=u.hp!==undefined?u.hp:null;
  _rhLmg(s,u,gun);
  const missed=hit0===null?false:(u.hp>=hp0&&!u.dead);
  if(!missed||Math.random()>LMG_SUP.chance)return;
  // 빗나간 탄: 사선을 따라 계속 → 사선 근처의 다른 적
  const dx=u.x-s.x,dy=u.y-s.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,maxD=gun.range*LMG_SUP.reach;
  let best=null,bd=1e9;
  const test=e=>{
    if(e===u||e.dead||e.state==='crew'||(e.lay|0)!==(s.lay|0)||isAllyT(e.team,s.team))return;
    if(typeof hiddenUnit==='function'&&!VEH[e.type]&&hiddenUnit(e,s.x,s.y))return;
    const rx=e.x-s.x,ry=e.y-s.y,t=rx*ux+ry*uy;
    if(t<L*.5||t>maxD)return;                                  // 사선 앞쪽이 아니라 목표 근처~뒤쪽만
    const off=Math.abs(rx*uy-ry*ux);if(off>LMG_SUP.width)return;
    if(t<bd){bd=t;best=e;}
  };
  for(const e of G.units)test(e);
  if(!s.lay)for(const v of G.vehicles)test(v);
  if(!best)return;
  fxPush({k:'trace',x1:u.x,y1:u.y,x2:best.x,y2:best.y,t:0,d:.06});
  _rhLmg(s,best,Object.assign({},gun,{acc:gun.acc*LMG_SUP.accMul,sup:false}));
};
