// 참호전 에셋 매니저: 핫바 검색 → 표(바이옴·상태·무늬) → 셀 클릭 → 다운로드/업로드/비교, GitHub 커밋
(() => {
  const $ = (id) => document.getElementById(id);
  const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const dataUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const bc = (() => { try { return new BroadcastChannel('trench-sprites'); } catch (e) { return null; } })();
  let CAT = [], cur = null, rowAx = [], colAx = [], cell = null, ghView = false, remoteSha = '', ghGame = false;
  let pending = LS('editor.pending') || {};           // { file: { svg, committed } }
  const cfg = Object.assign({ repo: 'illeesam123/ubiquitous-chainsaw', branch: 'main', token: '' }, LS('editor.gh') || {});
  const TEAMC = ['#4f8fd6', '#d9534f', '#e0a82e', '#a56bd6']; let tintTeam = 0;
  const GROUPS = [['unit', '병사·깃발'], ['veh', '차량'], ['terrain', '지형·도로'], ['struct', '건물·장애물'], ['tint', '색상 치환형 (팀색)']];
  const origCache = {}, EMB = window.__EMBED || null;   // 단독 실행판(asset-manager.html)은 카탈로그·SVG 를 파일 안에 내장

  const toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };
  const savePending = () => { LS('editor.pending', pending); const n = Object.values(pending).filter(p => !p.committed).length; $('nPend').textContent = n; };
  const srcOf = (c) => pending[c.file] ? dataUri(pending[c.file].svg) : EMB && !(ghView && remoteSha) ? dataUri(EMB.svgs[c.file]) : (ghView && remoteSha ? GH.raw(cfg, remoteSha, c.file) : '../assets/sprites/' + c.file);
  async function origText(file) { if (EMB) return EMB.svgs[file]; if (origCache[file] === undefined) origCache[file] = await (await fetch('../assets/sprites/' + file)).text(); return origCache[file]; }


  // ---------- 조합 미리보기: 게임에서 여러 에셋이 합쳐진 모습 ----------
  const cellByKey = (k) => { for (const a of CAT) for (const c of a.cells) if (c.key === k) return c; return null; };
  const imgCache = {};
  const loadImg = (c) => new Promise((res) => { const u = srcOf(c); if (imgCache[u]) return res(imgCache[u]); const im = new Image(); im.onload = () => res(imgCache[u] = im); im.onerror = () => res(null); im.src = u; });
  const tinted = (im, color) => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'color'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0); return c; };
  const aN = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const gearPoseE = (A) => Math.abs(A) <= Math.PI / 4 + .1 ? ['side', A, false] : Math.abs(A) >= 3 * Math.PI / 4 - .1 ? ['side', A > 0 ? A - Math.PI : A + Math.PI, true] : A < 0 ? ['up', A + Math.PI / 2, false] : ['down', A - Math.PI / 2, false];
  const CM = { mode: 'unit', pose: 'stand', ang: 0, held: 'gun', team: 0, z: 5, bType: 'house', bSize: 1, nOcc: 3, skew: .5 };
  let cmpTok = 0;
  async function drawComp() {
    const tok = ++cmpTok, cv = document.createElement('canvas'); cv.width = 720; cv.height = 460; const real = $('cmpCv'), g = cv.getContext('2d'), z = CM.z; g.imageSmoothingEnabled = true;
    const ox = cv.width / 2, oy = cv.height * .72, col = TEAMC[CM.team];
    const put = (im, x, y) => { if (im) g.drawImage(im, x, y, im.width * z / 1 * 1, im.height * z / 1 * 1); };
    const draw = async (key, dx, dy, o = {}) => { const c = cellByKey(key); if (!c) return; const im = await loadImg(c); if (!im || tok !== cmpTok) return; const src = o.tint ? tinted(im, col) : im; const w = c.vb[2], h = c.vb[3]; g.save(); g.translate(ox + dx * z, oy + dy * z); if (o.skew) g.transform(1, o.skew, 0, 1, 0, 0); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1); if (o.sc) g.scale(o.sc, o.sc); g.drawImage(src, c.vb[0] * z, c.vb[1] * z, w * z, h * z); g.restore(); };
    // 바닥 기준선
    g.strokeStyle = 'rgba(128,128,128,.35)'; g.beginPath(); g.moveTo(ox - 90, oy); g.lineTo(ox + 90, oy); g.moveTo(ox, oy - 8); g.lineTo(ox, oy + 8); g.stroke();
    if (CM.mode === 'unit') {
      const A = CM.ang * Math.PI / 180, [shape, rot, flip] = gearPoseE(A), isG = CM.held === 'gun', behind = shape === 'up';
      const hk = isG ? 'gun|rifle|' + shape : 'tool|shovel|' + shape, hy = isG ? -10 : -9;
      const body = async () => { await draw('ubody|' + CM.pose, 0, 0); await draw('ubodyt|' + CM.pose, 0, 0, { tint: true }); };
      const held = () => (CM.pose === 'fuse' || CM.held === 'none') ? 0 : draw(hk, 0, hy, { rot, flip });
      if (behind) { await held(); await body(); } else { await body(); await held(); }
    } else if (CM.mode === 'bld') {
      const a = CAT.find(x => x.id === CM.bType); const c = a && (a.cells.find(c => c.key.split('|')[2] === String(CM.bSize) && c.key.split('|')[1] === 'plain' && /\|0\|0\|\|n\|\|/.test(c.key)) || a.cells.find(c => c.key.split('|')[2] === String(CM.bSize)));
      if (c) await draw(c.key, 0, 0);
      for (let j = 0; j < CM.nOcc; j++) { const k = `occ|${CM.bType}|${CM.bSize}|${j}`; if (!cellByKey(k)) break; await draw(k, 0, 0); await draw('occt|' + CM.bType + '|' + CM.bSize + '|' + j, 0, 0, { tint: true }); }
    } else {
      await draw('flag|pole', 0, 0); await draw('flagc|0', 0, 0, { tint: true, skew: Math.sin(CM.skew * 6.2832) * .1 });
    }
    if (tok === cmpTok) { const rg = real.getContext('2d'); rg.clearRect(0, 0, real.width, real.height); rg.drawImage(cv, 0, 0); }
    $('cmpInfo').textContent = CM.mode === 'unit' ? '몸통(중립) → 몸통 팀색(명암 유지) → 총기/삽(방향에 따라 앞·뒤 레이어, 좌우반전·회전)' : CM.mode === 'bld' ? '건물 → 점령자 중립 레이어 → 점령 팀색 레이어' : '기둥 + 천(1장, 기울임으로 펄럭임)';
  }
  function openCompose(mode) {
    if (mode) CM.mode = mode; $('cmp').hidden = false;
    const opt = (arr, v) => arr.map(([k, l]) => `<option value="${k}" ${String(k) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
    const bTypes = [...new Set(CAT.filter(a => a.id !== 'occ' && a.cells.length && CAT.find(o => o.id === 'occ').cells.some(c => c.key.split('|')[1] === a.id)).map(a => a.id))];
    const sizes = [...new Set(CAT.find(o => o.id === 'occ').cells.filter(c => c.key.split('|')[1] === CM.bType).map(c => c.key.split('|')[2]))];
    $('cmpCtl').innerHTML = `<label>대상 <select id="cMode">${opt([['unit', '병사 (몸통+총기)'], ['bld', '점령된 건물'], ['flag', '깃발']], CM.mode)}</select></label>
     <label>팀 <select id="cTeam">${opt([0, 1, 2, 3].map(i => [i, '팀 ' + (i + 1)]), CM.team)}</select></label>
     ${CM.mode === 'unit' ? `<label>자세 <select id="cPose">${opt(['stand', 'move0', 'move1', 'move2', 'move3', 'gar', 'fuse'].map(k => [k, k]), CM.pose)}</select></label><label>든 것 <select id="cHeld">${opt([['gun', '소총'], ['shovel', '삽'], ['none', '없음']], CM.held)}</select></label><label>조준 각도 <input id="cAng" type="range" min="-180" max="180" value="${CM.ang}"><b id="cAngV">${CM.ang}°</b></label>` : ''}
     ${CM.mode === 'bld' ? `<label>건물 <select id="cB">${opt(bTypes.map(k => [k, k]), CM.bType)}</select></label><label>크기 <select id="cS">${opt(sizes.map(k => [k, k]), CM.bSize)}</select></label><label>점령자 수 <input id="cN" type="range" min="0" max="6" value="${CM.nOcc}"></label>` : ''}
     ${CM.mode === 'flag' ? `<label>펄럭임 <input id="cSk" type="range" min="0" max="1" step=".01" value="${CM.skew}"></label>` : ''}
     <label>확대 <input id="cZ" type="range" min="2" max="9" value="${CM.z}"></label>`;
    const on = (id, f) => { const e = $(id); if (e) e.oninput = e.onchange = () => { f(e); drawComp(); if (id === 'cMode' || id === 'cB') openCompose(); }; };
    on('cMode', e => CM.mode = e.value); on('cTeam', e => CM.team = +e.value); on('cPose', e => CM.pose = e.value); on('cHeld', e => CM.held = e.value);
    on('cAng', e => { CM.ang = +e.value; $('cAngV').textContent = CM.ang + '°'; }); on('cB', e => { CM.bType = e.value; CM.bSize = 1; }); on('cS', e => CM.bSize = +e.value); on('cN', e => CM.nOcc = +e.value);
    on('cSk', e => CM.skew = +e.value); on('cZ', e => CM.z = +e.value);
    drawComp();
  }
  $('bCompose').onclick = () => openCompose(cur && ['flag', 'flagc'].includes(cur.id) ? 'flag' : cur && ['occ', 'occt'].includes(cur.id) ? 'bld' : 'unit');
  $('cmpClose').onclick = () => { $('cmp').hidden = true; };

  // ---------- 핫바 / 검색 ----------
  const PREF = ['ubody', 'ubodyt', 'gun', 'tool', 'occ', 'occt', 'flag', 'flagc', 'unit', 'tank', 'truck', 'tile', 'road', 'crater', 'tree', 'rock', 'house', 'apartment', 'warehouse', 'shed', 'bunker', 'tower', 'mg', 'medbay', 'armory', 'fence', 'wire', 'sandbag', 'crate', 'ruin'];
  function buildHot() {
    $('hotChips').innerHTML = '';
    for (const [g, label] of GROUPS) {
      const list = CAT.filter(a => a.group === g).sort((a, b) => (PREF.indexOf(a.id) + 1 || 99) - (PREF.indexOf(b.id) + 1 || 99)); if (!list.length) continue;
      const l = document.createElement('span'); l.className = 'grp'; l.textContent = label; $('hotChips').appendChild(l);
      for (const a of list) { const b = document.createElement('button'); b.className = 'btn' + (a.tint ? ' tintchip' : ''); b.textContent = a.name; b.dataset.id = a.id; b.onclick = () => openAsset(a.id); $('hotChips').appendChild(b); }
    }
  }
  let sel = 0, hits = [];
  function suggest() {
    const q = $('q').value.trim().toLowerCase();
    hits = q ? CAT.filter(a => a.search.toLowerCase().includes(q) || a.id.includes(q)) : [];
    const s = $('sugg'); s.innerHTML = ''; s.hidden = !q;
    if (q && !hits.length) s.innerHTML = '<div class="dim">검색 결과가 없습니다</div>';
    hits.forEach((a, i) => { const d = document.createElement('div'); d.className = i === sel ? 'on' : ''; d.innerHTML = `<span>${a.name}</span><span class="dim">${a.cells.length}개</span>`; d.onclick = () => { openAsset(a.id); $('q').value = ''; s.hidden = true; }; s.appendChild(d); });
  }
  $('q').oninput = () => { sel = 0; suggest(); };
  $('q').onkeydown = (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); suggest(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); suggest(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[sel]) { openAsset(hits[sel].id); $('q').value = ''; $('sugg').hidden = true; }
    else if (e.key === 'Escape') { $('q').value = ''; $('sugg').hidden = true; }
  };
  document.addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('q').focus(); } if (e.key === 'Escape') { $('modal').hidden = true; $('ghPanel').hidden = true; } });
  document.addEventListener('click', (e) => { if (!e.target.closest('#searchWrap')) $('sugg').hidden = true; });

  // ---------- 표 ----------
  function openAsset(id) {
    cur = CAT.find(a => a.id === id); if (!cur) return;
    const ax = cur.axes, has = (k) => ax.includes(k);
    colAx = has('dir') ? ['dir'] : ax.filter(k => k === 'biome' || k === 'variant');
    rowAx = ax.filter(k => !colAx.includes(k));
    if (!rowAx.length && colAx.length > 1) rowAx = [colAx.shift()];
    document.querySelectorAll('#hotChips .btn').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    $('empty').hidden = true; $('view').hidden = false;
    $('vTitle').textContent = cur.name; $('vCount').textContent = `모양 ${cur.cells.length}개`; $('vNote').textContent = cur.note || '';
    renderTintBar();
    renderAxes(); renderTable();
  }
  function renderTintBar() {
    const b = $('tintBar'); b.hidden = !(cur && cur.tint); b.innerHTML = '';
    if (b.hidden) return; b.insertAdjacentHTML('beforeend', '<span class="dim">미리보기 팀색</span>');
    TEAMC.forEach((c, i) => { const x = document.createElement('button'); x.style.background = c; x.className = i === tintTeam ? 'on' : ''; x.title = `팀 ${i + 1}`; x.onclick = () => { tintTeam = i; renderTintBar(); renderTable(); refreshModal(); }; b.appendChild(x); });
  }
  // 팀색 치환형: 회색 명암은 그대로, 색상·채도만 팀 색으로 ('color' 블렌드) — 게임과 같은 방식
  const imgHtml = (c, w, h, extra) => cur && cur.tint ? `<div class="tint" style="width:${w}px;height:${h}px;background:linear-gradient(${TEAMC[tintTeam]},${TEAMC[tintTeam]}),url('${srcOf(c)}') center/contain no-repeat;background-blend-mode:color;-webkit-mask-image:url('${srcOf(c)}');mask-image:url('${srcOf(c)}')"></div>` : `<img ${extra || ''} width="${w}" height="${h}" src="${srcOf(c)}" alt="">`;
  const AXN = { gun: '총기', biome: '바이옴', state: '상태', variant: '무늬(랜덤)', team: '팀', dir: '방향', size: '크기' };
  function renderAxes() {
    const box = $('axes'); box.innerHTML = '<span class="dim">축 배치:</span>';
    for (const a of cur.axes) {
      const isRow = rowAx.includes(a), d = document.createElement('span'); d.className = 'axchip';
      d.innerHTML = `${AXN[a] || a} <button>${isRow ? '행' : '열'}</button>`;
      d.querySelector('button').onclick = () => { if (isRow) { rowAx = rowAx.filter(x => x !== a); colAx.push(a); } else { colAx = colAx.filter(x => x !== a); rowAx.push(a); } renderAxes(); renderTable(); };
      box.appendChild(d);
    }
  }
  function renderTable() {
    const key = (c, ax) => ax.length ? ax.map(a => c.axes[a]).join(' · ') : '-';
    const rows = [], cols = [], map = new Map();
    for (const c of cur.cells) {
      const r = key(c, rowAx), k = key(c, colAx);
      if (!rows.includes(r)) rows.push(r); if (!cols.includes(k)) cols.push(k);
      const id = r + '\u0001' + k; (map.get(id) || map.set(id, []).get(id)).push(c);
    }
    const z = +$('zoom').value, t = $('tbl'); t.innerHTML = '';
    const head = t.createTHead().insertRow(); head.appendChild(document.createElement('th')).textContent = rowAx.map(a => AXN[a] || a).join(' · ') + ' \\ ' + colAx.map(a => AXN[a] || a).join(' · ');
    for (const k of cols) head.appendChild(document.createElement('th')).textContent = k;
    const tb = t.createTBody();
    for (const r of rows) {
      const tr = tb.insertRow(); tr.appendChild(document.createElement('th')).textContent = r;
      for (const k of cols) {
        const td = tr.insertCell(), list = map.get(r + '\u0001' + k); td.className = 'cell';
        if (!list) continue;
        const c = list[0], vb = c.vb, sc = Math.max(z, Math.min(8, 56 / Math.max(vb[2], vb[3]))), w = Math.min(vb[2] * sc, 260);
        if (pending[c.file]) td.classList.add('mod');
        td.innerHTML = `<div class="chk" style="padding:2px">${imgHtml(c, w, w * vb[3] / vb[2], 'loading="lazy"')}</div>` + (list.length > 1 ? `<div class="dim">+${list.length - 1}</div>` : '');
        td.title = c.file; td.onclick = () => openCell(c);
      }
    }
  }
  $('zoom').oninput = () => cur && renderTable();

  // ---------- 셀 모달 ----------
  function openCell(c) {
    cell = c; const m = $('modal'); m.hidden = false; $('cmp').hidden = true;
    $('mTitle').textContent = cur.name; $('mSub').textContent = Object.values(c.axes).join(' · ');
    refreshModal(); $('mMsg').textContent = '';
  }
  function refreshModal() {
    if (!cell || $("modal").hidden) return;
    const c = cell, vb = c.vb, w = Math.min(Math.max(vb[2] * 4, 200), 520);
    $('mPrev').innerHTML = imgHtml(c, w, w * vb[3] / vb[2]);
    $('mInfo').innerHTML = `<code>${c.file}</code> · 영역 ${vb[2]}×${vb[3]} (기준점 ${-vb[0]},${-vb[1]})<br>키 <code>${c.key}</code>${pending[c.file] ? '<br><b style="color:var(--ac)">교체본 적용 중' + (pending[c.file].committed ? ' (GitHub 커밋됨)' : ' (아직 커밋 안 됨)') + '</b>' : ''}`;
    $('mRev').disabled = !pending[c.file];
  }
  $('mClose').onclick = () => { $('modal').hidden = true; };
  $('modal').onclick = (e) => { if (e.target === $('modal')) $('modal').hidden = true; };
  const curSvg = async () => pending[cell.file] ? pending[cell.file].svg : await origText(cell.file);
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }
  $('mDown').onclick = async () => download(cell.file, new Blob([await curSvg()], { type: 'image/svg+xml' }));
  $('mPng').onclick = async () => {
    const img = new Image(); img.src = dataUri(await curSvg()); await img.decode().catch(() => { });
    const k = 4, cv = document.createElement('canvas'); cv.width = cell.vb[2] * k; cv.height = cell.vb[3] * k; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob(b => download(cell.file.replace(/\.svg$/, '') + '@4x.png', b));
  };
  $('mUp').onclick = () => $('file').click();
  $('file').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      let svg;
      if (/svg/i.test(f.type) || /\.svg$/i.test(f.name)) svg = normalizeSvg(await f.text(), cell.vb, $('fit').checked);
      else svg = await rasterToSvg(f, cell.vb);
      apply(cell.file, svg); $('mMsg').textContent = '교체 완료 — 게임 탭에 즉시 반영됩니다.';
    } catch (err) { $('mMsg').textContent = '업로드 실패: ' + err.message; }
  };
  $('mRev').onclick = () => { revert(cell.file); $('mMsg').textContent = '원본으로 되돌렸습니다.'; };
  $('mDisk').onclick = async () => {
    try {
      if (EMB) { $('mMsg').textContent = '단독 실행판에서는 디스크 저장이 없습니다. SVG 다운로드를 쓰세요.'; return; }
      const r = await fetch('/api/sprite/' + cell.file, { method: 'PUT', body: await curSvg() });
      $('mMsg').textContent = r.ok ? '디스크의 assets/sprites 와 dist 에 저장했습니다.' : '저장 실패(' + r.status + '): npm run editor 로 연 로컬 서버에서만 가능합니다.';
      if (r.ok) { delete origCache[cell.file]; }
    } catch (e) { $('mMsg').textContent = '로컬 서버가 아닙니다 (npm run editor 로 실행하세요)'; }
  };
  function apply(file, svg) {
    pending[file] = { svg, committed: false }; savePending();
    if (bc) bc.postMessage({ t: 'set', file, svg });
    refreshModal(); if (cur) renderTable();
  }
  function revert(file) { delete pending[file]; savePending(); if (bc) bc.postMessage({ t: 'clear', file }); refreshModal(); if (cur) renderTable(); }

  // 업로드한 그림을 이 에셋의 영역(viewBox)에 맞춘다: 비율 유지 · 가운데 정렬 · 투명 경계 사각형 포함
  function normalizeSvg(text, vb, fit) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml'), svg = doc.documentElement;
    if (svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('올바른 SVG 파일이 아닙니다');
    svg.querySelectorAll('script,foreignObject').forEach(n => n.remove());
    svg.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name)) n.removeAttribute(a.name); }));
    svg.querySelectorAll('#bounds').forEach(n => n.remove());
    const [x, y, w, h] = vb;
    if (!fit) { svg.insertAdjacentHTML('afterbegin', `<rect id="bounds" x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" fill-opacity="0"/>`); return new XMLSerializer().serializeToString(svg); }
    let u = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (u.length !== 4 || u.some(isNaN)) u = [0, 0, parseFloat(svg.getAttribute('width')), parseFloat(svg.getAttribute('height'))];
    if (!(u[2] > 0 && u[3] > 0)) throw new Error('viewBox 또는 width/height 가 필요합니다');
    const inner = [...svg.childNodes].map(n => new XMLSerializer().serializeToString(n)).join('');
    const same = Math.abs(u[0] - x) < .5 && Math.abs(u[1] - y) < .5 && Math.abs(u[2] - w) < .5 && Math.abs(u[3] - h) < .5;
    const k = Math.min(w / u[2], h / u[3]), tx = x + (w - u[2] * k) / 2 - u[0] * k, ty = y + (h - u[3] * k) / 2 - u[1] * k, r = (n) => Math.round(n * 1000) / 1000;
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><rect id="bounds" x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" fill-opacity="0"/>${same ? inner : `<g transform="translate(${r(tx)} ${r(ty)}) scale(${r(k)})">${inner}</g>`}</svg>`;
  }
  async function rasterToSvg(file, vb) {
    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
    const img = new Image(); img.src = url; await img.decode().catch(() => { throw new Error('이미지를 읽을 수 없습니다'); });
    const [x, y, w, h] = vb, k = Math.min(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><rect id="bounds" x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" fill-opacity="0"/><image x="${x + (w - iw) / 2}" y="${y + (h - ih) / 2}" width="${iw}" height="${ih}" href="${url}"/></svg>`;
  }

  // ---------- ZIP (SVG + 스프라이트 시트) ----------
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u) => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function makeZip(files) { // 압축 없이 저장(store) 하는 최소 zip
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), name); off += 30 + name.length + f.data.length;
    }
    const cl = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  const txt = (t) => new TextEncoder().encode(t);
  const curText = async (c) => pending[c.file] ? pending[c.file].svg : await origText(c.file);
  async function sheetPng(a, texts) { // 스프라이트 시트: 2배 크기, 칸마다 기준점 표시용 좌표를 sheet.json 에 기록
    const k = 2, pad = 4, cells = a.cells, mw = Math.min(260, Math.max(...cells.map(c => c.vb[2])) * k), mh = Math.min(260, Math.max(...cells.map(c => c.vb[3])) * k);
    const cols = Math.min(12, Math.max(1, Math.ceil(Math.sqrt(cells.length * 1.4)))), rows = Math.ceil(cells.length / cols), cw = mw + pad, ch = mh + pad;
    const cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = rows * ch; const g = cv.getContext('2d'), frames = [];
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i], x = (i % cols) * cw, y = Math.floor(i / cols) * ch, w = Math.min(mw, c.vb[2] * k), h = Math.min(mh, c.vb[3] * k);
      try { const im = new Image(); im.src = dataUri(texts[i]); await im.decode(); g.drawImage(im, x + pad / 2, y + pad / 2, w, h); } catch (e) { }
      frames.push({ file: c.file, key: c.key, x: x + pad / 2, y: y + pad / 2, w, h, pivot: [-c.vb[0] * k, -c.vb[1] * k], axes: c.axes });
    }
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    return { png: new Uint8Array(await blob.arrayBuffer()), json: JSON.stringify({ scale: k, image: 'sheet.png', frames }, null, 1) };
  }
  async function zipAsset(a, withSheet) {
    const files = [], texts = [];
    for (const c of a.cells) { const t = await curText(c); texts.push(t); files.push({ name: `${a.id}/${c.file}`, data: txt(t) }); }
    files.push({ name: `${a.id}/index.json`, data: txt(JSON.stringify({ id: a.id, name: a.name, group: a.group, tint: !!a.tint, note: a.note || '', cells: a.cells.map(c => ({ file: c.file, key: c.key, axes: c.axes, viewBox: c.vb })) }, null, 1)) });
    if (withSheet) { const s = await sheetPng(a, texts); files.push({ name: `${a.id}/sheet.png`, data: s.png }, { name: `${a.id}/sheet.json`, data: txt(s.json) }); }
    return files;
  }
  $('bZip').onclick = async () => { if (!cur) return; toast('zip 만드는 중…'); download(`${cur.id}-sprites.zip`, makeZip(await zipAsset(cur, true))); toast(`${cur.name} ${cur.cells.length}개를 zip 으로 받았습니다`); };
  $('bAllZip').onclick = async () => { toast('전체 zip 만드는 중… (시트 제외)'); let all = []; for (const a of CAT) all = all.concat(await zipAsset(a, false)); download('trench-war-all-sprites.zip', makeZip(all)); toast(`전체 ${all.length}개 파일 zip 완료`); };

  // ---------- 비교 ----------
  $('mCmp').onclick = async () => {
    const c = cell, vb = c.vb, w = Math.min(Math.max(vb[2] * 3, 160), 320), h = w * vb[3] / vb[2], im = (s) => `<img width="${w}" height="${h}" src="${s}" alt="">`;
    $('cmp').hidden = false;
    const orig = dataUri(await origText(c.file)), mine = pending[c.file] ? dataUri(pending[c.file].svg) : null;
    $('c1').innerHTML = im(orig); $('c2').innerHTML = mine ? im(mine) : '<span class="dim">교체 없음</span>';
    $('c3').innerHTML = '<span class="dim">불러오는 중…</span>';
    try { if (!remoteSha) remoteSha = await GH.head(cfg); $('c3').innerHTML = im(GH.raw(cfg, remoteSha, c.file)); $('c3cap').textContent = 'GitHub 최신 (' + remoteSha.slice(0, 7) + ')'; }
    catch (e) { $('c3').innerHTML = '<span class="dim">GitHub 불러오기 실패</span>'; }
    const st = $('c4'); st.style.width = w + 24 + 'px'; st.style.height = h + 24 + 'px'; st.innerHTML = `<img id="o1" width="${w}" height="${h}" src="${orig}" alt=""><img id="o2" width="${w}" height="${h}" src="${mine || orig}" alt="" style="opacity:.5">`;
    $('blend').oninput = () => { $('o2').style.opacity = $('blend').value / 100; }; $('blend').value = 50;
  };

  // ---------- GitHub ----------
  function openGh() {
    $('ghPanel').hidden = false; $('gRepo').value = cfg.repo; $('gBranch').value = cfg.branch; $('gToken').value = cfg.token;
    const list = Object.entries(pending).filter(([, p]) => !p.committed).map(([f]) => f);
    $('gOut').textContent = list.length ? `커밋 대기 ${list.length}개: ${list.slice(0, 4).join(', ')}${list.length > 4 ? ' …' : ''}` : '커밋할 변경이 없습니다';
  }
  const readCfg = () => { cfg.repo = $('gRepo').value.trim(); cfg.branch = $('gBranch').value.trim() || 'main'; cfg.token = $('gToken').value.trim(); LS('editor.gh', cfg); };
  $('bGh').onclick = openGh; $('bPending').onclick = openGh; $('gClose').onclick = () => { readCfg(); $('ghPanel').hidden = true; };
  $('gTest').onclick = async () => {
    readCfg(); $('gState').textContent = '확인 중…';
    try { const r = await GH.check(cfg); remoteSha = r.sha; $('gState').textContent = `${r.name} 연결됨 · ${cfg.token ? (r.canPush ? '쓰기 가능' : '읽기 전용(토큰 권한 확인)') : '토큰 없음(읽기만)'} · ${r.sha.slice(0, 7)}`; }
    catch (e) { $('gState').textContent = '실패: ' + e.message; }
  };
  $('gCommit').onclick = async () => {
    readCfg(); const files = {}, names = [];
    for (const [f, p] of Object.entries(pending)) if (!p.committed) { files['assets/sprites/' + f] = p.svg; names.push(f); }
    if (!names.length) return ($('gOut').textContent = '커밋할 변경이 없습니다');
    if (!cfg.token) return ($('gOut').textContent = '토큰이 필요합니다');
    $('gOut').textContent = '푸시 중…';
    try {
      const msg = $('gMsg').value + (names.length <= 3 ? ` (${names.join(', ')})` : ` (${names.length}개 파일)`) + ($('gSkip').checked ? ' [skip ci]' : '');
      const sha = await GH.commit(cfg, files, msg);
      for (const f of names) pending[f].committed = true; savePending(); remoteSha = sha;
      $('gOut').textContent = `완료: ${sha.slice(0, 7)} (${names.length}개 파일)`; toast('GitHub에 커밋했습니다'); if (cur) renderTable();
    } catch (e) { $('gOut').textContent = '실패: ' + e.message; }
  };
  $('gView').onclick = async () => {
    readCfg();
    try { if (!ghView) remoteSha = await GH.head(cfg); ghView = !ghView; $('gView').classList.toggle('on', ghView); if (cur) renderTable(); toast(ghView ? 'GitHub 최신 기준으로 표시합니다' : '로컬 파일 기준으로 표시합니다'); }
    catch (e) { toast('GitHub 불러오기 실패: ' + e.message); }
  };
  $('gGame').onclick = () => { readCfg(); ghGame = !ghGame; if (bc) bc.postMessage({ t: 'source', src: ghGame ? 'gh' : 'local', repo: cfg.repo }); $('gGame').classList.toggle('on', ghGame); toast(ghGame ? '게임이 GitHub 최신 에셋을 읽습니다' : '게임이 로컬 에셋을 읽습니다'); };

  // ---------- 시작 ----------
  (async () => {
    try { CAT = EMB ? EMB.catalog : await (await fetch('../assets/sprites/catalog.json')).json(); }
    catch (e) { $('empty').innerHTML = '<h2>카탈로그를 불러오지 못했습니다</h2><p>저장소 루트에서 <code>npm run editor</code> 로 실행하세요. (file:// 로는 열 수 없습니다)</p>'; return; }
    buildHot(); savePending();
    // 이미 GitHub 에 올라간 교체본이 로컬 원본과 같아졌으면 목록에서 정리
    for (const [f, p] of Object.entries(pending)) if (p.committed) { try { if ((await origText(f)) === p.svg) { delete pending[f]; if (bc) bc.postMessage({ t: 'clear', file: f }); } } catch (e) { } }
    savePending();
    const h = location.hash.slice(1); if (h && CAT.some(a => a.id === h)) openAsset(h);
  })();
  window.__ed = { makeZip, zipAsset, get cat() { return CAT; }, normalizeSvg, apply, revert, get pending() { return pending; }, openAsset };
})();
