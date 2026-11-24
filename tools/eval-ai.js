// Reproducible, report-only AI-vs-AI scenarios. This is a baseline evaluator,
// not a balance test: use the same flags and seeds when comparing revisions.
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

function arg(name, fallback) {
  const p = process.argv.find(x => x.startsWith(`--${name}=`));
  return p ? Number(p.slice(name.length + 3)) : fallback;
}
const seedCount = Math.max(1, Math.min(32, arg('seeds', 3) | 0));
const seconds = Math.max(30, Math.min(1800, arg('seconds', 240) | 0));
const size = Math.max(64, Math.min(192, arg('size', 80) | 0));
const enemies = Math.max(1, Math.min(3, arg('enemies', 3) | 0));
const soldiers = Math.max(6, Math.min(40, arg('soldiers', 12) | 0));
const dt = .05, speed = 4, framesPerChunk = 80;
const root = path.join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
  });
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto(pathToFileURL(path.join(root, 'dist', 'index.html')).href);
    await page.waitForFunction(() => typeof startGame === 'function', null, { timeout: 15000 });
    const results = [];
    for (let n = 0; n < seedCount; n++) {
      const seed = `AI-EVAL-${String(n + 1).padStart(2, '0')}`;
      const before = errors.length;
      const wallStart = Date.now();
      await page.evaluate(({ seed, size, enemies, soldiers }) => {
        Math.random = mulberry(hashStr(seed + '#rng')());
        startGame({ seed, biome: 'plain', size, enemies, soldiers, minDist: Math.floor(size * .32) });
      }, { seed, size, enemies, soldiers });
      await page.waitForFunction(() => typeof LOAD !== 'undefined' && !LOAD.on, null, { timeout: 30000 });
      await page.evaluate(() => {
        let spot = null;
        for (let k = 0; k < 4000 && !spot; k++) {
          const x = 2 + Math.floor(Math.random() * (G.w - 4));
          const y = 2 + Math.floor(Math.random() * (G.h - 4));
          if (!flagCheck(x, y)) spot = [x, y];
        }
        if (!spot) throw new Error('No valid player start for AI evaluation');
        placeFlag(0, spot[0], spot[1]);
        aiPlaceFlags();
        for (const t of G.teams) t.human = false;
        G.phase = 'play';
        G.paused = true; // drive fixed simulation steps below; the render loop remains idle
      });

      let simulated = 0;
      const chunks = Math.ceil(seconds / (dt * speed * framesPerChunk));
      for (let c = 0; c < chunks; c++) {
        const out = await page.evaluate(({ dt, framesPerChunk, speed }) => {
          let steps = 0;
          for (let f = 0; f < framesPerChunk && G.phase === 'play'; f++) {
            for (let s = 0; s < speed && G.phase === 'play'; s++) {
              stepWorld(dt);
              for (const t of G.teams) if (teamCount(t.id) > 0 && G.phase === 'play') aiTick(t, dt);
              steps++;
            }
          }
          return { time: G.time, steps, phase: G.phase };
        }, { dt, framesPerChunk, speed });
        simulated = out.time;
        if (out.phase !== 'play') break;
      }
      const state = await page.evaluate(() => {
        const teams = G.teams.map(t => {
          const units = G.units.filter(u => u.team === t.id && !u.dead);
          const vehicles = G.vehicles.filter(v => v.team === t.id && !v.dead);
          const A = t.ai || {}, thr = A.thr || [];
          return {
            team: t.id, alive: t.alive !== false && !t.dead,
            units: units.length, vehicles: vehicles.length,
            movingUnits: units.filter(u => u.state === 'move').length,
            emptyPaths: units.filter(u => u.state === 'move' && !u.path?.length).length,
            kills: t.kills || 0, losses: t.lost || 0,
            money: Math.round(t.res.money), metal: Math.round(t.res.metal), wood: Math.round(t.res.wood),
            persona: A.persona || null, mode: A.mode || null, tactic: A.tactic || null,
            expeditions: (A.log || []).length,
            threatCells: Array.from(thr).filter(v => v >= .5).length,
            roleUnits: units.filter(u => u.aiRole).length,
            cargoPhase: A.cargo?.phase || null
          };
        });
        return { time: G.time, phase: G.phase, runtimeError: G.runtimeError || null, teams };
      });
      const runErrors = errors.slice(before);
      results.push({ seed, ...state, elapsedMs: Date.now() - wallStart, errors: runErrors });
      console.log(JSON.stringify(results[results.length - 1]));
    }
    const totals = results.reduce((a, r) => {
      a.runs++;
      a.aiTeams += r.teams.length;
      a.aiAlive += r.teams.filter(t => t.alive).length;
      a.aiKills += r.teams.reduce((s, t) => s + t.kills, 0);
      a.aiLosses += r.teams.reduce((s, t) => s + t.losses, 0);
      a.expeditions += r.teams.reduce((s, t) => s + t.expeditions, 0);
      a.runtimeErrors += r.errors.length + (r.runtimeError ? 1 : 0);
      a.elapsedMs += r.elapsedMs;
      return a;
    }, { runs: 0, aiTeams: 0, aiAlive: 0, aiKills: 0, aiLosses: 0, expeditions: 0, runtimeErrors: 0, elapsedMs: 0 });
    totals.aiSurvivalRate = totals.aiTeams ? +(totals.aiAlive / totals.aiTeams).toFixed(3) : 0;
    totals.kdRatio = +((totals.aiKills + 1) / (totals.aiLosses + 1)).toFixed(3);
    console.log('AI_EVAL_SUMMARY ' + JSON.stringify({ config: { seedCount, seconds, size, enemies, soldiers }, totals }));
    if (totals.runtimeErrors) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
