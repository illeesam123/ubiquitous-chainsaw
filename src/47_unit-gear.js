// ================= 병사: 몸 / 총·삽 분리 + 총기칸 =================
// 몸은 팀색(상의)만 다르므로 '중립 몸'(다리·머리·헬멧)과 '팀색 마스크'(상의)로 나눠 팀 구분 없이 한 벌만 쓴다.
// 총과 삽은 별도 스프라이트(옆·위·아래 모양만, 왼쪽은 좌우반전)를 회전시켜 얹는다.
//  - 각도는 매 프레임 목표 각도로 보간(트위닝): 이동 중엔 총을 아래로 내려 들고, 사격·진지·대기엔 겨눈다
//  - 위쪽(멀어지는 방향)을 향하면 총이 몸 뒤로, 그 외엔 몸 앞으로 그려진다(레이어 순서)
//  - 총기칸: u.gun (기본 'rifle'). GUNS 에 항목을 더하면 해당 모양의 SVG(gun_<id>_side/up/down)를 쓴다.
const GUNS={rifle:{n:'소총',look:'rifle'}};
function giveGun(u,k){if(GUNS[k])u.gun=k;return u;}
const _angN=(a)=>{while(a>Math.PI)a-=6.2832;while(a<=-Math.PI)a+=6.2832;return a;};
function gearPose(A){ // 화면 각도 → [모양, 회전, 좌우반전]
  if(Math.abs(A)<=Math.PI/4+.1)return ['side',A,false];
  if(Math.abs(A)>=3*Math.PI/4-.1)return ['side',A>0?A-Math.PI:A+Math.PI,true];
  return A<0?['up',A+Math.PI/2,false]:['down',A-Math.PI/2,false];
}
function unitSprite(u,sx,by,z,body,inG){
  if(REC||!(u.civ||(u.team>=0&&u.team<=4)))return false;
  const st=u.state,mv=st==='move'||st==='flee';
  let pose='stand';
  if(st==='fuse')pose='fuse';else if(inG)pose='gar';else if(mv)pose='move'+((((u.anim*(st==='flee'?17:12))/6.2832)%1)*4|0);
  const kb=(u.civ?'ubodyc|':'ubody|')+pose,eb=sprGetX(kb),et=sprGetX('ubodyt|'+pose);
  if(!sprOk(eb)||!sprOk(et)){if(!eb)sprMissing(kb);return false;}
  const c=Math.cos(vFace(u.face)),s=Math.sin(vFace(u.face)),ix=(c-s)*.9,iy=(c+s)*.5,bob=mv?Math.sin(u.anim*(st==='flee'?17:12))*1.2*z:0;
  let held=null,tip=null;
  if(st==='fuse'){}
  else if(st==='work'&&u.task&&u.task.bomb)held='proc';
  else if(st==='work'){
    const sw=Math.sin(u.anim*9),vx=ix*(6+3*sw),vy=8+5*iy+3*sw,th=Math.atan2(vy,vx),len=Math.max(.5,Math.hypot(vx,vy)/10);
    if(u.tA===undefined)u.tA=th;u.tA=_angN(u.tA+_angN(th-u.tA)*.45);
    const [shape,rot,flip]=gearPose(u.tA),e=sprGetX('tool|shovel|'+shape);
    held=sprOk(e)?{e,x:sx+ix*4*z,y:by-9*z,rot,flip,sc:len,behind:shape==='up'}:'proc';
  }else if(u.civ&&!u.gun){      // 맨손 민간인
  }else{
    let th=Math.atan2(iy,ix);if(mv&&!(u.muz>0))th+=(ix>=0?.5:-.5);   // 이동 중엔 총구를 내려 든다
    if(u.gA===undefined)u.gA=th;u.gA=_angN(u.gA+_angN(th-u.gA)*.3);
    const [shape,rot,flip]=gearPose(u.gA),look=(GUNS[u.gun]||GUNS.rifle).look,e=sprGetX('gun|'+look+'|'+shape),L=Math.min(1.03,Math.max(.5,Math.hypot(ix,iy)));
    held=sprOk(e)?{e,x:sx,y:by-10*z+bob,rot,flip,sc:shape==='side'?L:1,sc2:1,behind:shape==='up'}:'proc';
    if(held!=='proc'&&u.muz>0){const tl=(GUNS[u.gun]||GUNS.rifle).tip||13;tip=[sx+Math.cos(u.gA)*tl*L*z,by-10*z+bob+Math.sin(u.gA)*tl*L*z];}
  }
  const dBody=()=>{sprBlit(eb,sx,by,z,false);if(u.mil)sprBlitTint(et,sx,by,z,'#222',false);   // 자경단: 검은 옷
    else sprBlitTint(et,sx,by,z,u.civ?'#8e8e89':TEAM_COL[u.team],false);
    if(u.arm&&!u.civ){const ab=sprGetX('armor|'+u.arm+'|body'),ah=sprGetX('armor|'+u.arm+'|head');if(sprOk(ab))sprBlit(ab,sx,by,z,false);if(sprOk(ah))sprBlit(ah,sx,by,z,false);}};
  const dHeld=()=>{
    if(held==='proc'){unitHeld(u,sx,by,z,body);return;}
    if(!held)return;
    cx.save();cx.translate(held.x,held.y);cx.rotate(held.rot);cx.scale(held.flip?-held.sc:held.sc,held.sc2||held.sc);
    const b=sprBkt(z),bm=sprRaster(held.e,b),k=z/b;cx.drawImage(bm,held.e.x*z,held.e.y*z,bm.width*k,bm.height*k);cx.restore();
    if(tip){cx.fillStyle='#ffd76a';cx.beginPath();cx.arc(tip[0],tip[1],3.5*z,0,6.3);cx.fill();}
  };
  if(held&&held!=='proc'&&held.behind){dHeld();dBody();}else{dBody();dHeld();}
  return true;
}
// ---- 생성기 ----
function sprBakeUnitBody(pose,civ){
  const mv=pose.startsWith('move'),fr=mv?+pose.slice(4):0;
  const u={civ:!!civ,team:0,x:-1,y:-1,face:0,flash:0,muz:0,task:null,state:pose==='fuse'?'fuse':mv?'move':'idle',anim:mv?(fr+.5)/4*6.2832/12:0};
  return sprRecordSplit(()=>unitBodyParts(u,0,0,1,'#fffffe',pose==='gar'),0,0,'#fffffe');
}

// ---- 깃발: 기둥(중립) + 천(팀색 마스크 1장). 펄럭임은 천을 기둥 축 기준으로 세로 기울임(skewY)해서 만든다 ----
function flagSprite(f){
  if(REC)return false;
  const ep=sprGetX('flag|pole'),ec=sprGetX('flagc|0');
  if(!sprOk(ep)||!sprOk(ec))return true;
  const [sx,sy]=toS(f.x+.5,f.y+.5),z=cam.z,k=Math.sin(G.time*3+f.team)*.1;
  sprBlit(ep,sx,sy,z,false);
  cx.save();cx.translate(sx,sy);cx.transform(1,k,0,1,0,0);sprBlitTint(ec,0,0,z,TEAM_COL[f.team],false);cx.restore();return true;
}
