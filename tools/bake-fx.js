// 효과·사다리·폭약·포탄 SVG 굽기(비파괴). 사용: npm run build && node tools/bake-fx.js && npm run build
const { chromium } = require('playwright'); const path = require('path'), root = path.join(__dirname, '..');
const addDefs = require('./add-svg.js');
const NM = { 'fx|boom': '폭발', 'fx|smoke': '연기', 'fx|dust': '먼지·파편', 'fx|spark': '불꽃', 'fx|shell': '포탄', charge: '폭약', ladder: '사다리' };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const o = await p.evaluate(() => { startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30, flat: true }); G.paused = true; return sprBakeFx(); });
  const defs = Object.entries(o).map(([k, svg]) => {
    const kk = k.split('|'), vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg).slice(1).map(Number);
    const base = kk[0] === 'fx' ? 'fx|' + kk[1] : kk[0], id = base.replace('|', '_');
    const axes = kk[0] === 'ladder' ? { dir: ['E', 'W', 'S', 'N'][kk[1]], rise: kk[2] + '칸' } : kk[0] === 'charge' ? { state: ['꺼짐', '점등', '임박'][kk[1]] } : kk[1] === 'dust' ? { kind: kk[2], frame: kk[3] } : { frame: kk[2] || '0' };
    return { key: k, file: k.replace(/\|/g, '_') + '.svg', vb, svg, id, name: NM[base], group: kk[0] === 'ladder' ? 'terrain' : 'unit', axes };
  });
  addDefs(defs); await b.close();
})();
