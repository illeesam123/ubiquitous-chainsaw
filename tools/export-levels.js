// 구조물 강화 단계(lv)별 SVG 에셋만 새로 구워 assets/sprites/ 에 추가한다. (기존 파일은 지우지 않는다 — 손으로 고친 에셋 보존)
// 대상: 감시탑·HESCO·감시포·구급함 의 모든 단계, 모래주머니 방벽. 매니페스트·카탈로그에도 항목을 합친다.
// 사용: npm run build && node tools/export-levels.js
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'assets', 'sprites');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    for (const k in SPRITE_MANIFEST) delete SPRITE_MANIFEST[k];
    SPR.map.clear();
    startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30, flat: true }); G.paused = true;
    const mir = {};
    const bake = (o) => { const k = sprKey(o); if (!k) return; if (SPR.kf) { if (SPR.ki) return; const kr = SPR.kr; if (!SPR.map.has(kr)) sprBake(o, kr); mir[kr] = k; return; } if (!SPR.map.has(k)) sprBake(o, k); };
    const free = (x, y, s) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { if (!inb(x + i, y + j) || G.obst[(y + j) * G.w + x + i] || G.tt[(y + j) * G.w + x + i] === 2) return false; } return true; };
    const spots = []; for (let y = 8; y < G.h - 8 && spots.length < 4; y += 4) for (let x = 8; x < G.w - 8 && spots.length < 4; x += 6) if (free(x, y, 4)) spots.push([x, y]);
    const sp = spots[0];
    for (const t of ['tower', 'mg', 'mortar', 'medbay']) for (const team of [0, 1]) for (let lv = 0; lv <= 2; lv++) {
      const o = addOb(t, sp[0], sp[1], team); if (!o) continue; o.lv = lv; bake(o); removeOb(o);
    }
    // 방벽: 단일 + 가로/세로 줄 (이웃 연결 모양마다)
    for (const team of [0, 1]) for (const dir of ['x', 'y', 'one']) {
      const n = dir === 'one' ? 1 : 3, os = [];
      for (let i = 0; i < n; i++) { const x = sp[0] + (dir === 'x' ? i : 0), y = sp[1] + (dir === 'y' ? i : 0); const o = addOb('sandbag', x, y, team); if (o) { o.lv = 1; os.push(o); } }
      for (const o of os) bake(o);
      for (const o of os) removeOb(o);
    }
    return { svgs: sprExportAll(), mir, meta: (() => { const m = {}; for (const [k, e] of SPR.map) if (e.svg) m[k] = [e.x, e.y, e.w, e.h]; return m; })() };
  });
  const mirrorSvg = (t) => {
    const m = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(t), x = +m[1], y = +m[2], w = +m[3], h = +m[4], nx = -(x + w);
    t = t.replace(m[0], `viewBox="${nx} ${y} ${w} ${h}"`).replace(/<rect id="bounds"[^>]*\/>/, `<rect id="bounds" x="${nx}" y="${y}" width="${w}" height="${h}" fill="#000" fill-opacity="0"/>`);
    const i = t.indexOf('/>', t.indexOf('id="bounds"')) + 2; return t.slice(0, i) + '<g transform="scale(-1 1)">' + t.slice(i, t.lastIndexOf('</svg>')) + '</g></svg>';
  };
  const all = r.svgs;
  for (const [kr, k] of Object.entries(r.mir)) if (all[kr]) { if (!all[k]) all[k] = mirrorSvg(all[kr]); delete all[kr]; }
  const fileOf = (k) => k.replace(/\|/g, '_').replace(/_+$/, '').replace(/[^\w.-]/g, '-') + '.svg';
  const manP = path.join(out, 'manifest.js'), man = JSON.parse(/var SPRITE_MANIFEST=(.*);\s*$/s.exec(fs.readFileSync(manP, 'utf8'))[1]);
  const cat = JSON.parse(fs.readFileSync(path.join(out, 'catalog.json'), 'utf8'));
  const NAMES = { tower: ['감시탑', '엄폐 감시탑', '저격진지'], mg: ['HESCO', '위장막 초소', '방호진지'], mortar: ['감시포', '소이포', 'SAM 터렛'], medbay: ['구급함', '의무 막사', '급조 병원'], sandbag: ['모래주머니', '방벽'] };
  let n = 0;
  for (const [k, svg] of Object.entries(all)) {
    const kk = k.split('|'); if (!NAMES[kk[0]] || kk[1] !== 'plain') continue;
    if (kk[0] === 'sandbag' && kk[9] === '0') continue;                // 기존 모래주머니는 그대로 둔다
    if (kk[0] === 'tower' && kk[9] === '0') continue;                  // 감시탑 기본형은 바뀌지 않았다
    const name = fileOf(k), vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
    fs.writeFileSync(path.join(out, name), svg); man[k] = [name, +vb[1], +vb[2], +vb[3], +vb[4]]; n++;
    let a = cat.find(c => c.id === kk[0]); if (!a) continue;
    const lvName = NAMES[kk[0]][+kk[9]] || '';
    const st = ['정상']; if (kk[6]) st.push('연결 ' + kk[6]); if (kk[7] && kk[7] !== 'n') st.push(`팀 ${+kk[7] + 1}`); st.push(`${+kk[9] + 1}단계 ${lvName}`);
    const cell = { key: k, file: name, axes: { biome: '평원', size: `크기 ${kk[2]}`, variant: `무늬 ${+kk[3] + 1}-${+kk[4] + 1}`, state: st.join(' · ') }, vb: [+vb[1], +vb[2], +vb[3], +vb[4]] };
    const i = a.cells.findIndex(c => c.key === k); if (i >= 0) a.cells[i] = cell; else a.cells.push(cell);
    const vary = {}; for (const c of a.cells) for (const [ax, v] of Object.entries(c.axes)) (vary[ax] = vary[ax] || new Set()).add(v);
    a.axes = Object.keys(vary).filter(ax => vary[ax].size > 1);
  }
  fs.writeFileSync(manP, '// 자동 생성: npm run sprites\nvar SPRITE_MANIFEST=' + JSON.stringify(man) + ';\n');
  fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify(cat));
  console.log(n + ' 단계별 스프라이트 → assets/sprites/'); await b.close();
})();
