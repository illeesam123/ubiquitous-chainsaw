// ================= 다리 밑 통행 =================
// 참호 칸에 놓인 다리: 참호를 따라 들어온 병사는 상판 '아래'로 지나간다(u.under). 상판에 가려 반투명하게 보이고 적의 눈에는 띄지 않는다(가까이 2.2칸 이내는 보임).
const _stepUnitB=stepUnit;
stepUnit=function(u,dt){
  _stepUnitB(u,dt);
  if(u.lay||u.dead){u.under=false;return;}
  const w=G.w,i=Math.floor(u.y)*w+Math.floor(u.x);
  if(i===u.pt)return;
  const p=u.pt;u.pt=i;
  if(G.up[i]!==1){u.under=false;return;}
  if(G.up[p]===1)return;                 // 다리 위/아래 상태 유지
  u.under=p!==undefined&&G.trench[p]>0&&G.trench[i]>0;   // 참호에서 이어 들어오면 아래로, 그 밖엔 상판 위로
};
const _hidB=hiddenUnit;
hiddenUnit=function(e,ox,oy){
  if(e.under&&!e.lay&&!((e.reveal||0)>0)){if(ox===undefined||Math.hypot(e.x-ox,e.y-oy)>2.2)return true;return false;}
  return _hidB(e,ox,oy);
};
