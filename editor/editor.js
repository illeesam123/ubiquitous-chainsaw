// 참호전 에셋 매니저: 핫바 검색 → 표(바이옴·상태·무늬) → 셀 클릭 → 다운로드/업로드/비교, GitHub 커밋
(() => {
  const $ = (id) => document.getElementById(id);
  const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const dataUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const bc = (() => { try { return new BroadcastChannel('trench-sprites'); } catch (e) { return null; } })();
  let CAT = [], cur = null, rowAx = [], colAx = [], cell = null, ghView = false, remoteSha = '', ghGame = false;
  let pending = LS('editor.pending') || {};           // { file: { svg, committed } }
  const cfg = Object.assign({ repo: 'illeesam123/ubiquitous-chainsaw', branch: 'main', token: '' }, LS('editor.gh') || {});
  const origCache = {};

  const toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };
  const savePending = () => { LS('editor.pending', pending); const n = Object.values(pending).filter(p => !p.committed).length; $('nPend').textContent = n; };
  const srcOf = (c) => pending[c.file] ? dataUri(pending[c.file].svg) : (ghView && remoteSha ? GH.raw(cfg, remoteSha, c.file) : '../assets/sprites/' + c.file);
  async function origText(file) { if (origCache[file] === undefined) origCache[file] = await (await fetch('../assets/sprites/' + file)).text(); return origCache[file]; }

  // ---------- 핫바 / 검색 ----------
  const PREF = ['unit', 'tank', 'truck', 'tile', 'road', 'crater', 'tree', 'rock', 'house', 'apartment', 'warehouse', 'shed', 'bunker', 'tower', 'mg', 'medbay', 'armory', 'fence', 'wire', 'sandbag', 'crate', 'ruin'];
  function buildHot() {
    const ord = [...CAT].sort((a, b) => (PREF.indexOf(a.id) + 1 || 99) - (PREF.indexOf(b.id) + 1 || 99));
    $('hotChips').innerHTML = '';
    for (const a of ord) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = a.name; b.dataset.id = a.id; b.onclick = () => openAsset(a.id); $('hotChips').appendChild(b); }
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
    $('vTitle').textContent = cur.name; $('vCount').textContent = `모양 ${cur.cells.length}개`;
    renderAxes(); renderTable();
  }
  const AXN = { biome: '바이옴', state: '상태', variant: '무늬(랜덤)', team: '팀', dir: '방향', size: '크기' };
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
        const c = list[0], vb = c.vb, w = Math.min(vb[2] * z, 260);
        if (pending[c.file]) td.classList.add('mod');
        td.innerHTML = `<div class="chk" style="padding:2px"><img loading="lazy" width="${w}" height="${w * vb[3] / vb[2]}" src="${srcOf(c)}" alt=""></div>` + (list.length > 1 ? `<div class="dim">+${list.length - 1}</div>` : '');
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
    $('mPrev').innerHTML = `<img width="${w}" height="${w * vb[3] / vb[2]}" src="${srcOf(c)}" alt="">`;
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
    try { CAT = await (await fetch('../assets/sprites/catalog.json')).json(); }
    catch (e) { $('empty').innerHTML = '<h2>카탈로그를 불러오지 못했습니다</h2><p>저장소 루트에서 <code>npm run editor</code> 로 실행하세요. (file:// 로는 열 수 없습니다)</p>'; return; }
    buildHot(); savePending();
    // 이미 GitHub 에 올라간 교체본이 로컬 원본과 같아졌으면 목록에서 정리
    for (const [f, p] of Object.entries(pending)) if (p.committed) { try { if ((await origText(f)) === p.svg) { delete pending[f]; if (bc) bc.postMessage({ t: 'clear', file: f }); } } catch (e) { } }
    savePending();
    const h = location.hash.slice(1); if (h && CAT.some(a => a.id === h)) openAsset(h);
  })();
  window.__ed = { normalizeSvg, apply, revert, get pending() { return pending; }, openAsset };
})();
