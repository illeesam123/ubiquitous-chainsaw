// 건물 잔해(rubble/rubble2/rubble3) SVG 굽기(비파괴). 사용: npm run build && node tools/bake-rubble.js && npm run build
const { chromium } = require('playwright'); const path = require('path'), root = path.join(__dirname, '..');
const addDefs = require('./add-svg.js');
const FROM = ['house', 'apartment', 'warehouse', 'shed'], NM = { house: '주택', apartment: '아파트', warehouse: '창고', shed: '헛간' };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const res = await p.evaluate((FROM) => {
    startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30, flat: true }); G.paused = true;
    const out = {};
    for (const [sz, ty] of [[1, 'rubble'], [2, 'rubble2'], [3, 'rubble3']]) {
      let o = null;
      for (let y = 20; y < 80 && !o; y += 4) for (let x = 20; x < 80 && !o; x += 4) o = addOb(ty, x, y);
      if (!o) continue;
      for (const from of FROM) for (let vq = 0; vq < 4; vq++) for (let id = 0; id < 2; id++) {
        o.from = from; o.idx = 1000 + vq * 37 + id * 101 + sz * 7;
        const key = [ty, 'plain', sz, vq, id, 0, '0000', o.natural ? 'n' : o.team, from, 0].join('|');
        const e = sprBake(o, key); if (e && e.svg) out[key] = e.svg;
      }
    }
    return out;
  }, FROM);
  const defs = Object.entries(res).map(([k, svg]) => {
    const kk = k.split('|'), vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg).slice(1).map(Number);
    return { key: k, file: k.replace(/\|/g, '_').replace(/_+$/, '') + '.svg', vb, svg, id: kk[0], name: '건물 잔해' + (kk[0] === 'rubble' ? '(1칸)' : kk[0] === 'rubble2' ? '(2칸)' : '(3칸)'), group: 'obstacle', axes: { variant: '변형 ' + kk[3] + '-' + kk[4], from: NM[kk[8]] } };
  });
  console.log(defs.length + ' 개 굽기'); addDefs(defs); await b.close();
})();
