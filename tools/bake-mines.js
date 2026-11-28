// 지뢰 4종(mine/mineAT/minePulse/minebox) × 팀 0~4 SVG 굽기(비파괴). 사용: npm run build && node tools/bake-mines.js && npm run build
const { chromium } = require('playwright'); const path = require('path'), root = path.join(__dirname, '..');
const addDefs = require('./add-svg.js');
const NM = { mine: '지뢰', mineAT: '대전차 지뢰', minePulse: '펄서 지뢰', minebox: '폭발물 상자' };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const res = await p.evaluate(() => {
    startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30, flat: true }); G.paused = true;
    const out = {};
    for (const ty of ['mine', 'mineAT', 'minePulse', 'minebox']) for (let team = 0; team < 5; team++) {
      let o = null; for (let y = 20; y < 80 && !o; y += 4) for (let x = 20; x < 80 && !o; x += 4) o = addOb(ty, x, y, team);
      if (!o) continue;
      const key = [ty, 'plain', 2, 0, 0, 0, '', team, '', 0].join('|');
      const e = sprBake(o, key); if (e && e.svg) out[key] = e.svg;
      removeOb(o);
    }
    return out;
  });
  const defs = Object.entries(res).map(([k, svg]) => {
    const kk = k.split('|'), vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg).slice(1).map(Number);
    return { key: k, file: k.replace(/\|/g, '_').replace(/_+$/, '') + '.svg', vb, svg, id: kk[0], name: NM[kk[0]], group: 'obstacle', axes: { team: '팀 ' + kk[7] } };
  });
  console.log(defs.length + ' 개 굽기'); addDefs(defs); await b.close();
})();
