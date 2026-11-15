// 스모크 테스트: dist 빌드를 열어 게임 시작·시뮬레이션 오류가 없는지 확인
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html')); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => {
    startGame({ seed: 'SMOKE', biome: 'plain', size: 96, enemies: 2, soldiers: 24, minDist: 30 });
    let q = null; for (let k = 0; k < 3000 && !q; k++) { const x = 20 + Math.floor(Math.random() * 56), y = 20 + Math.floor(Math.random() * 56); if (!flagCheck(x, y)) q = [x, y]; }
    placeFlag(0, q[0], q[1]); aiPlaceFlags(); G.phase = 'play'; G.speed = 4;
    await new Promise(r => setTimeout(r, 8000)); return { t: Math.round(G.time), units: G.units.length };
  });
  console.log(JSON.stringify(r), errs.length ? errs : 'noerr'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
