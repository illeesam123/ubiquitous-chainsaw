// 스모크 테스트: 게임 시작·맵 생성·시뮬레이션 진행과 런타임 오류를 확인
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href);
    await p.waitForFunction(() => typeof startGame === 'function', null, { timeout: 15000 });
    await p.evaluate(() => {
      Math.random = mulberry(hashStr('SMOKE_TEST')());
      startGame({ seed: 'SMOKE', biome: 'plain', size: 96, enemies: 2, soldiers: 24, minDist: 30 });
    });
    await p.waitForFunction(() => typeof LOAD !== 'undefined' && !LOAD.on, { timeout: 30000 });
    const audit = await p.evaluate(() => ({
      required: G.assetAudit?.required || 0,
      ready: G.assetAudit?.ready || 0,
      failed: G.assetAudit?.failed || [],
      directionAssets: Object.keys(SPRITE_MANIFEST).filter(k => k.startsWith('veh|')).length
    }));
    if (audit.required !== 118 || audit.ready !== audit.required || audit.failed.length || audit.directionAssets !== 72) {
      errs.push('필수 SVG 에셋이 준비되지 않았습니다: ' + JSON.stringify(audit));
    }
    const started = await p.evaluate(() => {
      let q = null;
      for (let k = 0; k < 3000 && !q; k++) {
        const x = 20 + Math.floor(Math.random() * 56), y = 20 + Math.floor(Math.random() * 56);
        if (!flagCheck(x, y)) q = [x, y];
      }
      if (!q) throw new Error('유효한 플레이어 기지 위치를 찾지 못했습니다');
      placeFlag(0, q[0], q[1]);
      aiPlaceFlags();
      G.phase = 'play';
      G.speed = 4;
      return G.units.length;
    });
    if (started <= 0) errs.push('게임 시작 시 유닛이 생성되지 않았습니다');
    await p.evaluate(() => {
      for (let r = 1; r < 4; r++) { setRot(r); render(); }
      setRot(0); render();
    });
    await p.waitForTimeout(2500);
    const state = await p.evaluate(() => ({
      time: G.time,
      units: G.units.length,
      paused: G.paused,
      runtimeError: G.runtimeError || null,
      spriteErrors: Object.entries(SPRITE_MANIFEST).filter(([, m]) => !(m[3] > 0 && m[4] > 0)).length
    }));
    if (!(state.time > 0.2)) errs.push('시뮬레이션 시간이 진행되지 않았습니다: ' + state.time);
    if (state.units <= 0) errs.push('시뮬레이션 중 유닛이 생성되지 않았습니다');
    if (state.paused || state.runtimeError) errs.push('시뮬레이션이 오류로 멈췄습니다: ' + state.runtimeError);
    if (state.spriteErrors) errs.push('크기가 0인 스프라이트 ' + state.spriteErrors + '개');
    if (errs.length) throw new Error(errs.join('\n'));
    console.log(JSON.stringify(state), 'no errors');
  } finally {
    await b.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
