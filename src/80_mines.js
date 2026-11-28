// ================= 지뢰 · 차량 폭발 =================
// 1) 차량(전차·수송트럭·헬리콥터)이 파괴되면 큰 폭발로 근방(피아 구분 없이)에 광역 피해를 주고 포탄 구덩이를 남긴다.
// 2) 지뢰(2×2 칸, 그림은 작게): 적이 닿으면 폭발해 중상. 강화 트리에서 갈래 중 하나로 개조한다.
//    - 대전차 지뢰: 차량(착륙한 헬기 포함)만 격발, 큰 차량 피해
//    - 펄서 지뢰: 지뢰 기능 + 근방에 지속적인 소규모 광역 피해
//    - 폭발물 상자: 닿으면 무작위 투척물 5개를 사방으로 던진다 (상자 자체 피해 없음)
// 모두 아군(동맹 포함)에게는 반응하지 않는다.
const MINE_COST={money:30,metal:6};
OB.mine={n:'지뢰',size:2,hp:60,absorb:0,block:false,demo:3,build:8,cost:MINE_COST,gain:{metal:[1,3]},mine:'mine',
  desc:'적이 밟으면 폭발해 중상을 입힙니다. 강화 메뉴에서 대전차·펄서·폭발물 상자로 개조할 수 있습니다.'};
OB.mineAT={n:'대전차 지뢰',size:2,hp:90,absorb:0,block:false,demo:3,build:8,cost:MINE_COST,gain:{metal:[1,3]},mine:'at',
  desc:'차량(착륙한 헬기 포함)이 닿으면 큰 폭발. 보병은 밟아도 격발되지 않습니다.'};
OB.minePulse={n:'펄서 지뢰',size:2,hp:90,absorb:0,block:false,demo:3,build:8,cost:MINE_COST,gain:{metal:[1,3]},mine:'pulse',
  desc:'근방 적에게 지속적인 소규모 광역 피해를 주고, 밟으면 지뢰처럼 폭발합니다.'};
OB.minebox={n:'폭발물 상자',size:2,hp:80,absorb:0,block:false,demo:3,build:8,cost:MINE_COST,gain:{metal:[1,3]},mine:'box',
  desc:'적이 닿으면 무작위 투척물(연막·섬광·화염병·세열) 5개를 사방으로 던집니다. 상자 자체의 폭발 피해는 없습니다.'};
const MINET=new Set(['mine','mineAT','minePulse','minebox']);
OBDESC.mine=OB.mine.desc;OBDESC.mineAT=OB.mineAT.desc;OBDESC.minePulse=OB.minePulse.desc;OBDESC.minebox=OB.minebox.desc;
BUILDS.splice(BUILDS.indexOf('wire')+1,0,'mine');
UPT.mine={names:['지뢰'],info:['적이 닿으면 폭발해 중상 (반경 1.6칸)'],cost:[null],branch:['mineAT','minePulse','minebox'],
  bcost:{mineAT:{money:40,metal:12},minePulse:{money:80,metal:24,bullets:20},minebox:{money:50,wood:10,metal:8}}};
UPT.mineAT={names:['대전차 지뢰'],info:['차량(착륙한 헬기 포함)만 격발 · 반경 2.1칸 · 큰 차량 피해'],cost:[null]};
UPT.minePulse={names:['펄서 지뢰'],info:['근방 3.4칸 적에게 0.5초마다 소규모 피해 · 밟으면 지뢰 폭발'],cost:[null]};
UPT.minebox={names:['폭발물 상자'],info:['닿으면 무작위 투척물 5개를 사방으로 투척 · 상자 자체 피해 없음'],cost:[null]};
LODH.mine=2;LODH.mineAT=2;LODH.minePulse=2;LODH.minebox=7;
LODC.mine=['#5a5f4a','#444838','#34372a'];LODC.mineAT=['#6a6a52','#4c4c3a','#38382a'];LODC.minePulse=['#4a6a74','#364f58','#283c42'];LODC.minebox=['#bd9054','#9a6f3a','#7c5830'];
for(const k of MINET){SPR_TYPES.add(k);SPR_UNIFORM.add(k);}
{const _fi=facilityIcon;facilityIcon=function(type){
  if(!MINET.has(type))return _fi(type);
  const sh={mine:'<ellipse cx="48" cy="30" rx="18" ry="8" fill="#3d4231" stroke="#8a8f78" stroke-width="2"/><ellipse cx="48" cy="28" rx="9" ry="4" fill="#5a5f4a"/><circle cx="48" cy="27" r="2.5" fill="#d9483b"/>'}[type];
  return `<svg viewBox="0 0 96 50" role="img" aria-label="${OB[type].n}"><rect x="1" y="1" width="94" height="48" rx="3" fill="#171a12"/>${sh||''}</svg>`;};}

// ---- 차량 폭발 ----
const VBOOM={tank:{r:2.6,u:105,v:130,tr:90,ob:70,cr:2},truck:{r:3.0,u:95,v:120,tr:80,ob:60,cr:2},heli:{r:2.5,u:85,v:100,tr:70,ob:55,cr:1}};
function craterAt(x,y){
  const tx=Math.floor(x),ty=Math.floor(y);if(!inb(tx,ty))return false;
  const i=ty*G.w+tx;
  if(G.obst[i]||G.tt[i]===2||G.trench[i]===255)return false;
  G.trench[i]=255;G.trenchHP[i]=0;if(G.up)G.up[i]=0;return true;
}
function vehBoom(v,shooter){
  const b=VBOOM[v.type];if(!b)return;
  const x=v.x,y=v.y,r=b.r;
  for(const u of G.units){
    if(u.dead||u.state==='crew'||u.lay||inRoof(u))continue;
    const d=Math.hypot(u.x-x,u.y-y);if(d>r)continue;
    let dmg=b.u*(1-.6*d/r);if(sameTeamTrench(u))dmg*=.75;
    hurt(u,dmg,null);if(u.gar&&G.obSet.has(u.gar))damageOb(u.gar,dmg*.4);
  }
  for(const w of [...G.vehicles]){
    if(w===v||w.dead||(VEH[w.type].air&&w.alt>.02))continue;
    const d=Math.hypot(w.x-x,w.y-y);if(d<=r)damageVehicle(w,b.v*(1-.5*d/r),shooter);
  }
  for(const o of [...G.obSet]){
    if(MINET.has(o.type)){if(Math.hypot(o.x+o.size/2-x,o.y+o.size/2-y)<=r*.8)damageOb(o,o.hp+1);continue;}
    const d=Math.hypot(o.x+o.size/2-x,o.y+o.size/2-y);if(d<=r*.8)damageOb(o,b.ob*(1-.5*d/r));
  }
  const rr=r*.75;
  for(let ty=Math.floor(y-rr);ty<=Math.ceil(y+rr);ty++)for(let tx=Math.floor(x-rr);tx<=Math.ceil(x+rr);tx++){
    if(!inb(tx,ty))continue;const i=ty*G.w+tx;
    if(G.trench[i]>0&&G.trench[i]!==255&&!roofedI(i)&&Math.hypot(tx+.5-x,ty+.5-y)<=rr){G.trenchHP[i]-=b.tr;if(G.trenchHP[i]<=0){G.trench[i]=255;G.trenchHP[i]=0;G.up[i]=0;}}
  }
  craterAt(x,y);
  for(let k=1;k<b.cr;k++){const a=Math.random()*6.28;craterAt(x+Math.cos(a)*.95,y+Math.sin(a)*.95);}
  fxPush({k:'boom',x,y,t:0,d:.9});fxPush({k:'boom',x:x+(Math.random()-.5),y:y+(Math.random()-.5),t:0,d:.6});fxPush({k:'smoke',x,y,t:0,d:1.4});
  sfx('boom',x,y);clearBush(x,y,r);
}
{const _dv=damageVehicle;damageVehicle=function(v,dmg,shooter){const was=v.dead;_dv(v,dmg,shooter);if(!was&&v.dead&&VBOOM[v.type]&&!v._boom){v._boom=true;vehBoom(v,shooter);}};}

// ---- 지뢰 동작 ----
function mineDetonate(o){
  const kind=OB[o.type].mine,x=o.x+o.size/2,y=o.y+o.size/2,team=o.team;
  const ox=o.x,oy=o.y;
  if(kind==='box'){
    G.nades=G.nades||[];
    const a0=Math.random()*6.28;
    for(let k=0;k<5;k++){
      const a=a0+k*6.2832/5+(Math.random()-.5)*.7,d=2.4+Math.random()*3.6,tx=clamp(x+Math.cos(a)*d,.5,G.w-.5),ty=clamp(y+Math.sin(a)*d,.5,G.h-.5);
      G.nades.push({kind:EXPK[Math.floor(Math.random()*EXPK.length)],team,x,y,tx,ty,t:0,d:.35+d*.06});
    }
    fxPush({k:'dust',x,y,t:0,d:.5});sfx('click',x,y);sfx('boom',x,y);
    damageOb(o,o.hp+1);return;
  }
  const at=kind==='at',r=at?2.1:1.6;
  damageOb(o,o.hp+1);
  for(const u of G.units){
    if(u.dead||u.state==='crew'||u.lay||isAllyT(u.team,team)||inRoof(u))continue;
    const d=Math.hypot(u.x-x,u.y-y);if(d>r)continue;
    hurt(u,(at?55:90)*(1-.45*d/r),null);
  }
  for(const v of [...G.vehicles]){
    if(v.dead||isAllyT(v.team,team)||(VEH[v.type].air&&v.alt>.02)||v.type==='drone')continue;
    const d=Math.hypot(v.x-x,v.y-y);if(d<=r+.4)damageVehicle(v,(at?520:140)*(1-.35*d/(r+.4)),null);
  }
  craterAt(ox+.5,oy+.5);
  fxPush({k:'boom',x,y,t:0,d:.7});fxPush({k:'smoke',x,y,t:0,d:1});sfx('boom',x,y);clearBush(x,y,r);
}
function mineTouch(o,kind){
  const x0=o.x-.1,x1=o.x+o.size+.1,y0=o.y-.1,y1=o.y+o.size+.1,team=o.team;
  if(kind!=='at'){
    for(const u of G.units){
      if(u.dead||u.state==='crew'||u.lay||u.gar||isAllyT(u.team,team))continue;
      if(u.x>=x0&&u.x<=x1&&u.y>=y0&&u.y<=y1)return true;
    }
  }
  for(const v of G.vehicles){
    if(v.dead||v.type==='drone'||isAllyT(v.team,team))continue;
    if(VEH[v.type].air&&v.alt>.02)continue;
    if(v.x>=x0&&v.x<=x1&&v.y>=y0&&v.y<=y1)return true;
  }
  return false;
}
function stepMines(dt){
  for(const o of [...G.obSet]){
    const d=OB[o.type];if(!d||!d.mine||o.natural)continue;
    if(d.mine==='pulse'){
      o.pt=(o.pt||0)-dt;o.pulse=Math.max(0,(o.pulse||0)-dt);
      if(o.pt<=0){
        o.pt=.5;o.pulse=.5;
        const x=o.x+o.size/2,y=o.y+o.size/2;
        for(const u of G.units){if(u.dead||u.state==='crew'||u.lay||isAllyT(u.team,o.team)||inRoof(u))continue;if(Math.hypot(u.x-x,u.y-y)<=3.4)hurt(u,4,null);}
        for(const v of G.vehicles){if(v.dead||v.type==='drone'||isAllyT(v.team,o.team)||(VEH[v.type].air&&v.alt>.02))continue;if(Math.hypot(v.x-x,v.y-y)<=3.4)damageVehicle(v,5,null);}
      }
    }
    if(G.obSet.has(o)&&mineTouch(o,d.mine))mineDetonate(o);
  }
}
{const _ss3=stepShells;stepShells=function(dt){_ss3(dt);stepMines(dt);};}

// ---- 그리기 (2×2 칸의 한가운데에 작게) ----
function drawMineShape(o){
  const z=cam.z,t=o.type,fl=o.fl>0,L=c=>fl?'#fff':c,cxw=o.x+o.size/2,cyw=o.y+o.size/2,[sx,sy]=toS(cxw,cyw);
  const tc=o.natural?null:TEAM_COL[o.team];
  const disc=(rx,ry,h,fill,line)=>{cx.fillStyle=fill;cx.strokeStyle=line;cx.lineWidth=Math.max(1,1.2*z);cx.beginPath();cx.ellipse(sx,sy-h*z,rx*z,ry*z,0,0,6.3);cx.fill();cx.stroke();};
  if(t==='minebox'){
    shadowAt(cxw+.05,cyw+.04,10,4.5);
    const a=cxw-.3,b=cxw+.3,c=cyw-.3,d=cyw+.3;
    wbox(a,c,b,d,0,10,L('#bd9054'),L('#9a6f3a'),L('#7c5830'),'#47301a');
    wline(pt(a,d,5),pt(b,d,5),'rgba(60,40,20,.55)',1);
    wline(pt(a,c,10),pt(b,d,10),'rgba(70,48,24,.6)',1.1);wline(pt(b,c,10),pt(a,d,10),'rgba(70,48,24,.6)',1.1);
    poly([pt(cxw-.12,d,3),pt(cxw+.12,d,3),pt(cxw+.12,d,7),pt(cxw-.12,d,7)],L('#d9483b'));
    if(tc){cx.fillStyle=tc;cx.fillRect(sx-1*z,sy-19*z,2*z,6*z);cx.fillRect(sx,sy-19*z,5*z,3*z);}
    return;
  }
  shadowAt(cxw+.04,cyw+.03,t==='mineAT'?12:9,t==='mineAT'?5:4);
  if(t==='mine'){
    disc(8.5,4.2,0,L('#3d4231'),'#1c1f16');disc(8.5,4.2,2,L('#5a5f4a'),'#2a2d21');
    disc(3.4,1.7,2.8,L('#7c8168'),'#2a2d21');
    cx.fillStyle=Math.sin(G.time*5+o.x)>0?'#ff5a4a':'#8a2a22';cx.beginPath();cx.arc(sx,sy-3.2*z,1.1*z,0,6.3);cx.fill();
  }else if(t==='mineAT'){
    disc(12,6,0,L('#4a4a38'),'#1c1c14');disc(12,6,2.2,L('#6a6a52'),'#2a2a1e');
    disc(7.5,3.7,3,L('#d4b13c'),'#2a2a1e');disc(4.8,2.4,3.4,L('#3a3a2c'),'#1c1c14');
    cx.strokeStyle='#1c1c14';cx.lineWidth=Math.max(1,1.4*z);cx.beginPath();cx.moveTo(sx-10*z,sy-2*z);cx.lineTo(sx+10*z,sy-5*z);cx.moveTo(sx-10*z,sy-5*z);cx.lineTo(sx+10*z,sy-2*z);cx.stroke();
  }else{ // minePulse
    disc(9.5,4.7,0,L('#2d3f45'),'#12191c');disc(9.5,4.7,2,L('#4a6a74'),'#1c2a2f');
    disc(5,2.5,2.8,L('#7fe0ee'),'#1c2a2f');disc(2.4,1.2,3.2,L('#e8fcff'),'#1c2a2f');
    cx.strokeStyle=L('#9ad8e4');cx.lineWidth=Math.max(1,z);for(const a of [0,2.09,4.19]){cx.beginPath();cx.moveTo(sx+Math.cos(a)*6*z,sy-2*z+Math.sin(a)*3*z);cx.lineTo(sx+Math.cos(a)*10*z,sy-2*z+Math.sin(a)*5*z);cx.stroke();}
  }
  if(tc){cx.fillStyle=tc;cx.fillRect(sx-1*z,sy-12*z,1.6*z,7*z);cx.fillRect(sx,sy-12*z,5*z,3*z);}
}
{const _dof=drawObFull;drawObFull=function(o){if(MINET.has(o.type))return drawMineShape(o);return _dof(o);};}
// 펄서 지뢰의 파동 링
{const _dwM=drawWeatherOverlay;drawWeatherOverlay=function(){
  const r=_dwM.apply(this,arguments);
  try{
    const z=cam.z;
    for(const o of G.obSet){
      if(o.type!=='minePulse'||!(o.pulse>0))continue;
      const [sx,sy]=toS(o.x+o.size/2,o.y+o.size/2);if(sx<-120||sx>W+120||sy<-120||sy>H+120)continue;
      const f=1-o.pulse/.5,R=3.4*32*f*z;
      cx.strokeStyle=`rgba(127,224,238,${(.5*(1-f)).toFixed(3)})`;cx.lineWidth=Math.max(1,2*z);
      cx.beginPath();cx.ellipse(sx,sy,R,R*.5,0,0,6.3);cx.stroke();
    }
  }catch(e){}
  return r;
};}
