// 자기대전 진화 일괄 실행기(여러 브라우저 탭에 판을 나눠 병렬 처리).
// 사용:  npm run build && node tools/selfplay.js [--workers 4] [--gens 20] [--pop 8] [--games 2] [--cap 360] [--size 64] [--personas aggressive,swarm] [--out assets/ai-genomes.js] [--fresh]
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
  const cfg = { size: SIZE, soldiers: 14, cap: CAP, pop: POP, games: GAMES };
  let store = null;
  if (!FRESH && fs.existsSync(OUT)) { try { const t = fs.readFileSync(OUT, 'utf8'); const m = /var AI_GENOMES=(.*);\s*$/s.exec(t); if (m && m[1] !== 'null') store = JSON.parse(m[1]); } catch (e) { } }
  const p0 = pages[0];
  await Promise.all(pages.map(p => p.evaluate(([c, s]) => { Object.assign(SP.cfg, c); SP.headless = true; SP.budget = 60; SP.useBest = false; SP.store = s || { best: {}, hist: {} }; SP.store.hist = SP.store.hist || {}; SP.pop = {}; }, [cfg, FRESH ? null : store])));
  const save = async () => { const s = await p0.evaluate(() => spExport()); fs.writeFileSync(OUT, 'var AI_GENOMES=' + s + ';\n'); };
  for (let g = 0; g < GENS; g++) for (const persona of PERS) {
    const jobs = await p0.evaluate(p => spPlan(p), persona), res = []; let next = 0;
    await Promise.all(pages.map(async pg => {
      while (next < jobs.length) {
        const j = jobs[next++];
        // 모든 탭이 같은 명예의 전당을 쓰도록 상대 유전자는 job 에 실려 있다.
        const fit = await pg.evaluate(async job => await spRunJob(job), j);
        res.push({ i: j.i, fit });
      }
    }));
    const r = await p0.evaluate(([p, r]) => spFinish(p, r), [persona, res]);
    // 다른 탭의 명예의 전당도 갱신
    const best = await p0.evaluate(() => JSON.stringify(SP.store.best));
    await Promise.all(pages.slice(1).map(pg => pg.evaluate(s => { SP.store.best = JSON.parse(s); }, best)));
    console.log(`세대 ${g + 1}/${GENS} ${persona.padEnd(10)} 세대수 ${r.gen} 최고 ${r.best.toFixed(2)} 평균 ${r.avg.toFixed(2)}`);
    await save();
  }
  await save(); console.log('저장:', OUT); await b.close();
})();
