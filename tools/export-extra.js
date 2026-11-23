// 헬리콥터(정지/회전)·민간인 몸(모자 없음) SVG 에셋만 새로 구워 assets/sprites/ 에 추가한다. (기존 파일은 지우지 않는다)
// 사용: node tools/build.js --sprite-bake && node tools/export-extra.js && npm run build
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'assets', 'sprites');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const o = await p.evaluate(() => {
    startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30, flat: true }); G.paused = true;
    const o = {};
    for (const pose of ['stand', 'gar', 'move0', 'move1', 'move2', 'move3', 'fuse']) { const r = sprBakeUnitBody(pose, true); if (r.neutral) o['ubodyc|' + pose] = r.neutral; }
    for (const ty of ['heli', 'heliR']) for (let t = 0; t < 4; t++) for (let q = 0; q < 16; q++) { if (Math.min(q, (4 - q) & 15) !== q) continue; const s = sprBakeVeh(ty, t, q); if (s) o[`veh|${ty}|${t}|${q}`] = s; }
    return o;
  });
  const manP = path.join(out, 'manifest.js'), man = JSON.parse(/var SPRITE_MANIFEST=(.*);\s*$/s.exec(fs.readFileSync(manP, 'utf8'))[1]);
  const cat = JSON.parse(fs.readFileSync(path.join(out, 'catalog.json'), 'utf8'));
  const POSE = { stand: '서 있음/작업', gar: '진지·대기', move0: '이동 1', move1: '이동 2', move2: '이동 3', move3: '이동 4', fuse: '도화선' };
  const ent = (id, name) => { let a = cat.find(c => c.id === id); if (!a) { a = { id, name, search: name + ' ' + id, cells: [], axes: [], group: id.startsWith('heli') ? 'veh' : 'unit' }; cat.push(a); } return a; };
  let n = 0;
  for (const [k, svg] of Object.entries(o)) {
    const kk = k.split('|'), file = k.replace(/\|/g, '_').replace(/[^\w.-]/g, '-') + '.svg', vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
    fs.writeFileSync(path.join(out, file), svg); man[k] = [file, +vb[1], +vb[2], +vb[3], +vb[4]]; n++;
    const isV = kk[0] === 'veh', a = isV ? ent(kk[1], kk[1] === 'heli' ? '헬리콥터 (정지)' : '헬리콥터 (회전)') : ent('ubodyc', '민간인 몸(중립·모자 없음)');
    const cell = { key: k, file, axes: isV ? { team: `팀 ${+kk[2] + 1}`, dir: `${+kk[3] * 22.5}°` } : { state: POSE[kk[1]] }, vb: [+vb[1], +vb[2], +vb[3], +vb[4]] };
    const i = a.cells.findIndex(c => c.key === k); if (i >= 0) a.cells[i] = cell; else a.cells.push(cell);
    a.axes = isV ? ['team', 'dir'] : ['state']; if (isV) a.note = '반대편 방향은 좌우반전으로 재사용';
  }
  fs.writeFileSync(manP, '// 자동 생성: npm run sprites\nvar SPRITE_MANIFEST=' + JSON.stringify(man) + ';\n');
  fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify(cat));
  console.log(n + ' 스프라이트 추가'); await b.close();
})();
