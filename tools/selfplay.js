// 자기대전 진화 일괄 실행기(여러 브라우저 탭에 판을 나눠 병렬 처리).
// 사용:  npm run build && node tools/selfplay.js [--workers 4] [--gens 20] [--pop 8] [--games 2] [--cap 360] [--size 64] [--personas aggressive,swarm] [--out assets/ai-genomes.js] [--mode duel|3|4|5|mixed] [--fresh] [--no-turbo] [--no-joint] [--no-vary] [--dt 0.12] [--idle 70]
// 결과: assets/ai-genomes.js (var AI_GENOMES=…) — 게임이 기본 유전자로 읽는다. 이어하기: 이미 있는 파일에서 시작한다(--fresh 면 새로 시작).
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : process.argv[i + 1]); };
const W = +arg('workers', 4), GENS = +arg('gens', 20), POP = +arg('pop', 8), GAMES = +arg('games', 2), CAP = +arg('cap', 360), SIZE = +arg('size', 64);
const OUT = path.resolve(arg('out', path.join(__dirname, '..', 'assets', 'ai-genomes.js'))), FRESH = process.argv.includes('--fresh');
const ALL = ['aggressive', 'defensive', 'tricky', 'balanced', 'swarm'], PERS = String(arg('personas', ALL.join(','))).split(',');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
(async () => {
  const b = await chromium.launch(), pages = [];
  for (let i = 0; i < W; i++) { const p = await b.newPage({ viewport: { width: 480, height: 320 } }); p.on('pageerror', e => console.log('pageerror', e.message)); await p.goto(url); await p.waitForFunction(() => typeof SP !== 'undefined'); pages.push(p); }
  const cfg = { size: SIZE, soldiers: 14, cap: CAP, pop: POP, games: GAMES, mode: String(arg('mode', 'duel')), turbo: !process.argv.includes('--no-turbo'), vary: !process.argv.includes('--no-vary'), dt: +arg('dt', .12), idle: +arg('idle', 70) };
  let store = null;
  if (!FRESH && fs.existsSync(OUT)) { try { const t = fs.readFileSync(OUT, 'utf8'); const m = /var AI_GENOMES=(.*);\s*$/s.exec(t); if (m && m[1] !== 'null') store = JSON.parse(m[1]); } catch (e) { } }
  const p0 = pages[0];
  await Promise.all(pages.map(p => p.evaluate(([c, s]) => { Object.assign(SP.cfg, c); SP.headless = true; SP.budget = 60; SP.useBest = false; SP.store = s || { best: {}, hist: {} }; SP.store.hist = SP.store.hist || {}; SP.pop = {}; }, [cfg, FRESH ? null : store])));
  const save = async () => { const s = await p0.evaluate(() => spExport()); fs.writeFileSync(OUT, 'var AI_GENOMES=' + s + ';\n'); };
  let stopping = false; process.on('SIGINT', () => { stopping = true; console.log('중지 요청: 현재 세대를 마치고 저장합니다'); });
  for (let g = 0; (GENS <= 0 || g < GENS) && !stopping; g++) {
    // 공동 학습: 한 판에 나온 모든 성향이 같이 평가된다(--no-joint 로 성향별 순차 학습)
    const joint = !process.argv.includes('--no-joint') && PERS.length >= 2;
    const groups = joint ? [PERS] : PERS.map(p => [p]);
    for (const grp of groups) {
      if (stopping) break;
      const jobs = await p0.evaluate(([ps, jt]) => jt ? spPlanJoint(ps) : spPlan(ps[0]), [grp, joint]), res = []; let next = 0;
      await Promise.all(pages.map(async pg => {
        while (next < jobs.length) {
          const j = jobs[next++];
          if (joint) res.push(...await pg.evaluate(async job => await spRunJoint(job), j));
          else res.push({ p: grp[0], i: j.i, fit: await pg.evaluate(async job => await spRunJob(job), j) });
        }
      }));
      const rs = await p0.evaluate(([ps, r]) => spFinishJoint(ps, r), [grp, res]);
      const best = await p0.evaluate(() => JSON.stringify(SP.store.best));
      await Promise.all(pages.slice(1).map(pg => pg.evaluate(s => { SP.store.best = JSON.parse(s); }, best)));
      for (const r of rs) console.log(`세대 ${g + 1}/${GENS || '∞'} ${r.p.padEnd(10)} 세대수 ${r.gen} 최고 ${r.best.toFixed(2)} 평균 ${r.avg.toFixed(2)} 신뢰 ${r.rel.toFixed(2)}${r.stall ? ' 정체 ' + r.stall : ''}`);
      await save();
    }
  }
  await save(); console.log('저장:', OUT); await b.close();
})();
