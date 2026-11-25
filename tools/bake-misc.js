// 광석·동굴 입구·수직갱 뚜껑·투척물 드롭 SVG 굽기(비파괴). 사용: npm run build && node tools/bake-misc.js && npm run build
const { chromium } = require('playwright'); const path = require('path'), root = path.join(__dirname, '..');
const addDefs = require('./add-svg.js');
const META = { ore: ['ore', '광석', 'terrain'], mouth: ['mouth', '동굴 입구', 'terrain'], hatch: ['hatch', '수직갱 뚜껑', 'terrain'], dropx: ['dropx', '투척물 드롭', 'unit'], urail: ['urail', '지하 철로', 'terrain'], bush: ['bush', '덤불', 'terrain'] };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const o = await p.evaluate(() => { startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30, flat: true }); G.paused = true; return sprBakeMisc(); });
  const NM = { ore: ['철광석', '금광석', '광산 수레'] };
  const defs = Object.entries(o).map(([k, svg]) => {
    const kk = k.split('|'), vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg).slice(1).map(Number), m = META[kk[0]];
    const id = kk[0] === 'ore' ? 'ore' + kk[1] : kk[0];
    return { key: k, file: k.replace(/\|/g, '_') + '.svg', vb, svg, id, name: kk[0] === 'ore' ? NM.ore[kk[1] - 1] : m[1], group: m[2], axes: kk[0] === 'urail' ? { mask: '연결 ' + kk[1] } : kk[0] === 'bush' ? { biome: kk[1], variant: '변형 ' + kk[2] } : kk[0] === 'ore' ? { variant: '변형 ' + kk[2] } : kk[0] === 'dropx' ? { kind: kk[1] } : {} };
  });
  addDefs(defs); await b.close();
})();
