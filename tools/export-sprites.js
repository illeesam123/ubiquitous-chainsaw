// 게임이 생성하는 모든 건물·장애물 벡터(SVG) 스프라이트를 assets/sprites/ 로 내보낸다.
// 사용: npm run sprites   (먼저 npm run build 가 실행됨)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'assets', 'sprites');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const all = {};
  for (const [seed, bio] of [['urbanwar', 'plain'], ['S1', 'plain'], ['S2', 'swamp'], ['S3', 'snow'], ['S4', 'arid'], ['mineshaft', 'plain']]) {
    const r = await p.evaluate(async ([seed, bio]) => {
      startGame({ seed, biome: bio, size: 96, enemies: 1, soldiers: 12, minDist: 30 }); G.paused = true;
      // 모든 장애물을 직접 굽는다 (화면 밖 포함)
      for (const o of G.obSet) { const k = sprKey(o); if (k && !SPR.map.has(k)) sprBake(o, k); }
      return sprExportAll();
    }, [seed, bio]);
    Object.assign(all, r);
  }
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const names = [];
  for (const [k, svg] of Object.entries(all)) { const n = k.replace(/\|/g, '_').replace(/_+$/, '').replace(/[^\w가-힣.-]/g, '-') + '.svg'; fs.writeFileSync(path.join(out, n), svg); names.push(n); }
  names.sort();
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>참호전 스프라이트</title><style>body{background:#2a2d22;color:#ddd;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:10px;padding:10px}figure{margin:0;background:#3b3f31;padding:6px;text-align:center}img{display:block;margin:auto;max-width:200px;max-height:200px}</style>` + names.map(n => `<figure><img src="${n}"><figcaption>${n.replace('.svg', '')}</figcaption></figure>`).join(''));
  console.log(names.length + ' sprites → assets/sprites/'); await b.close();
})();
