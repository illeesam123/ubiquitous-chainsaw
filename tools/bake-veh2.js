// 오토바이(bike)·기관차량(gunv) 스프라이트 굽기(비파괴): 팀 5 × 방향 9 × 2종 = 90개. 사용: npm run build && node tools/bake-veh2.js && npm run build
const { chromium } = require('playwright'); const path = require('path'), root = path.join(__dirname, '..');
const addDefs = require('./add-svg.js');
const NM = { bike: '오토바이', gunv: '기관차량' };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const o = await p.evaluate(() => {
    startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30, flat: true }); G.paused = true;
    const o = {};
    for (const ty of ['bike', 'gunv']) for (let t = 0; t < 5; t++) for (let q = 0; q < 16; q++) { if (Math.min(q, (4 - q) & 15) !== q) continue; const s = sprBakeVeh(ty, t, q); if (s) o[`veh|${ty}|${t}|${q}`] = s; }
    return o;
  });
  const defs = Object.entries(o).map(([k, svg]) => {
    const kk = k.split('|'), vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg).slice(1).map(Number);
    return { key: k, file: k.replace(/\|/g, '_') + '.svg', vb, svg, id: kk[1], name: NM[kk[1]], group: 'veh', axes: { team: '팀 ' + (+kk[2] + 1), dir: (+kk[3] * 22.5) + '°' } };
  });
  console.log(defs.length + ' 개 굽기'); addDefs(defs); await b.close();
})();
