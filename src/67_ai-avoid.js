// ================= AI: 마을·자경단 근처 회피 (기지 위치 · 채굴) =================
// 자경단은 마을(건물 무리)·마피아 중앙 거점 주변에 몰려 있으므로,
//  1) AI 깃발(=기지)은 그 지역에서 충분히 떨어진 곳에 우선 꽂고(단계적으로 기준을 낮춤),
//  2) 채굴·동굴 탐사는 마을/살아 있는 자경단 무리 근처의 광석·입구를 건너뛰고 다른 곳을 찾는다.
const AV={flagGap:[16,10,5,0,-3,-6,-9,-99],mineGap:10,villR:8,mafiaR:20};
function avZones(){
  if(G._avz)return G._avz;
  const z=[];
  try{for(const v of villageCells())z.push({x:v.x,y:v.y,r:AV.villR+Math.min(4,v.n/4)});}catch(e){}
  if(G.mafia)z.push({x:G.mafia.x,y:G.mafia.y,r:AV.mafiaR});
  return G._avz=z;
}
// 마을/거점 가장자리까지 거리(안이면 음수)
function avZoneDist(x,y){let m=1e9;for(const z of avZones())m=Math.min(m,Math.hypot(x-z.x,y-z.y)-z.r);return m;}
// 살아 있는 자경단 무리 가장자리까지 거리
function avMilDist(x,y){let m=1e9;if(!G.civs||!G.militia)return m;for(const g of G.militia){if(g.n!==undefined&&g.n<=0)continue;m=Math.min(m,Math.hypot(x-g.cx,y-g.cy)-g.R);}return m;}
function avSafe(x,y,gap){return avZoneDist(x,y)>=gap&&avMilDist(x,y)>=gap;}
// AI 깃발 배치(08_flags.js aiPlaceFlags)는 AV.flagGap 단계(16→10→5→0→-3→-6…)로 기준을 낮춰 가며 avZoneDist 가 큰 곳을 찾는다.
