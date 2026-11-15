// ================= HUD =================
function updateHUD(){
  if(G&&G.weather){const w=WEATHER[G.weather.type];const el=$('weather');if(el)el.textContent=`${w.icon} ${w.name} · ${G.weather.night?'밤':'낮'} · 탐지 ${Math.round(weatherSight()*100)}%`;}
  const T=G.teams[0];
  let h='';
  for(const k of RK){const v=Math.floor(T.res[k]);h+=`<span class="chip ${v<10?'low':''}">${RN[k]} <b>${v}</b></span>`;}
  h+=`<span class="chip">병사 <b>${mineUnits().length}</b></span><span class="chip">차량 <b>${G.vehicles.filter(v=>v.team===0).length}</b></span>`;
  if(G.gainShow>0&&G.lastGain)h+=`<span class="chip"><b>${G.lastGain}</b></span>`;
  $('res').innerHTML=h;
  let th='';
  for(const t of G.teams){const vc=G.vehicles.filter(v=>v.team===t.id).length;th+=`<span class="chip"><i style="background:${TEAM_COL[t.id]}"></i>${t.name} ${teamCount(t.id)-vc}명 · 차량 ${vc}</span>`;}
  $('teams').innerHTML=th;
  const free=G.units.filter(u=>u.team===0&&!u.dead&&u.state==='idle'&&isFreeUnit(u)).length;
  $('res').insertAdjacentHTML('beforeend',`<span class="chip">대기 병사 <b>${free}</b></span>`);
  {const esc=orderEscrow(T),eh=RK.filter(k=>esc[k]>0).map(k=>`${RN[k]} ${esc[k]}`).join(' · ');
   if(eh)$('res').insertAdjacentHTML('beforeend',`<span class="chip" title="헬기 주문에 묶인 자원 (취소 전까지 사용 불가)">보류 <b>${eh}</b></span>`);
   if(T.pad){const e=heliEta(T);$('res').insertAdjacentHTML('beforeend',`<span class="chip">🚁 <b>${e.txt.replace('다음 헬기 도착까지 ','')}</b></span>`);const ss=$('shopSub');if(ss)ss.textContent=e.txt.replace('다음 헬기 도착까지 ','도착 ').replace('이번 편 거래는 완료됨','완료');}}
  for(const b of $('bar').children){
    if(!b.dataset||!b.dataset.id)continue;
    const d=OB[b.dataset.id];b.classList.toggle('no',!!(d&&d.cost&&!canAfford(T,d.cost)));
  }
  const sel=selUnits(),vsel=selVehicles();
  if(vsel.length){const v=vsel[0],d=VEH[v.type];$('sel').innerHTML=`<b>${v.type==='tank'?'전차':'수송트럭'} ${vsel.length}대</b><br>이동 ${vsel.filter(q=>q.state==='move').length} · 체력 ${Math.round(v.hp)}/${v.max}<br>승무원 ${v.crew?.length||0}/${d.crew}명<br>${v.type==='truck'?`적재 탄약 ${Math.ceil(v.cargo)}`:`주포 사거리 ${d.range} · 피해 감소 ${Math.round(d.armor*100)}%`} `;}else if(sel.length){
    const w=sel.filter(u=>u.state==='work').length,m=sel.filter(u=>u.state==='move').length,g=sel.filter(u=>u.state==='gar').length,med=sel.filter(u=>u.state==='med'||u.state==='medmove'||u.state==='medwait'||u.state==='medqueue').length;
    $('sel').innerHTML=`<b>선택 ${sel.length}명</b><br>작업 ${w} · 이동 ${m} · 주둔 ${g} · 의무 ${med}<br>체력 평균 ${Math.round(sel.reduce((a,u)=>a+u.hp,0)/sel.length)} / 150${g?'<br>R 또는 주둔 해제 버튼으로 해제':''}`;
  }else $('sel').innerHTML=G.phase==='play'?'병사를 클릭하거나<br>Shift+끌기로 선택':'';
  const b=$('banner');
  if(G.phase==='setup'){b.hidden=false;b.textContent=`맵을 눌러 아군 깃발을 꽂으세요 (다른 깃발과 ${G.cfg.minDist}칸 이상)`;$('status').textContent='깃발 배치 중';}
  else if(G.phase==='countdown'){b.hidden=false;b.textContent=`모든 깃발 배치 완료 · ${Math.ceil(G.countdown)}`;$('status').textContent='전투 준비';}
  else{b.hidden=true;$('status').textContent=G.paused?'일시정지':`경과 ${Math.floor(G.time/60)}:${String(Math.floor(G.time%60)).padStart(2,'0')}`;}
}
function showOver(){
  sfx(G.over==='win'?'win':'lose');
  $('ovT').textContent=G.over==='win'?'승리':'패배';
  $('ovS').textContent=G.over==='win'?'모든 적 병력과 차량을 제압했습니다.':'아군 병사가 전멸했습니다.';
  let h='<table class="st"><tr><th>팀</th><th>생존</th><th>처치</th><th>손실</th></tr>';
  for(const t of G.teams)h+=`<tr><td style="color:${TEAM_COL[t.id]}">${t.name}</td><td>${teamCount(t.id)}</td><td>${t.kills}</td><td>${t.lost}</td></tr>`;
  $('ovTab').innerHTML=h+'</table>';
  $('over').hidden=false;
}
