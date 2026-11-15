// 게임의 절차적 그리기 코드로부터 건물·장애물 벡터(SVG) 에셋을 만들어 assets/sprites/ 에 저장한다.
// 게임은 실행 시 이 파일들을 직접 읽어 쓴다(assets/sprites/manifest.js 가 목록). 파일을 고치면 게임 그림이 바뀐다.
// 바이옴 전용 디자인은 나무(tree)만 존재하고, 나머지는 모두 'plain' 기본 디자인 하나를 공유한다.
// 사용: npm run sprites   (먼저 npm run build 가 실행됨)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'assets', 'sprites');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForTimeout(400);
  const all = {};
  const seeds = [['urbanwar', 'plain'], ['S1', 'plain'], ['S2', 'swamp'], ['S3', 'snow'], ['S4', 'arid'], ['S5', 'plain'], ['S6', 'swamp'], ['S7', 'snow'], ['S8', 'arid'], ['mineshaft', 'plain'], ['superflat', 'plain'], ['coast', 'plain']];
  for (const [seed, bio] of seeds) {
    const r = await p.evaluate(([seed, bio]) => {
      for (const k in SPRITE_MANIFEST) delete SPRITE_MANIFEST[k];      // 기존 파일 무시하고 새로 굽기
      SPR.map.clear();
      startGame({ seed, biome: bio, size: 96, enemies: 1, soldiers: 12, minDist: 30 }); G.paused = true;
      const bake = (o) => { const k = sprKey(o); if (k && !SPR.map.has(k)) sprBake(o, k); };
      for (const o of [...G.obSet]) {
        bake(o);
        if (SPR_DMG.has(o.type)) { const hp = o.hp; for (let q = 1; q <= 4; q++) { o.hp = o.max * (1 - (q + .5) / 5); bake(o); } o.hp = hp; }
      }
      // 직접 지을 수 있는 구조물 (팀 색 · 파손 · 무기고 재고 단계)
      const free = (x, y, s) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { if (!inb(x + i, y + j) || G.obst[(y + j) * G.w + x + i] || G.tt[(y + j) * G.w + x + i] === 2) return false; } return true; };
      const spots = []; for (let y = 8; y < G.h - 8 && spots.length < 4; y += 3) for (let x = 8; x < G.w - 8 && spots.length < 4; x += 5) if (free(x, y, 3)) spots.push([x, y]);
      for (const t of ['bunker', 'tower', 'mg', 'medbay', 'armory', 'crate', 'sandbag', 'wire', 'fence']) {
        for (const team of [0, 1]) {
          const sp = spots[0]; if (!sp) break;
          const o = addOb(t, sp[0], sp[1], team); if (!o) continue;
          try { if (t === 'armory') for (let n = 0; n <= 8; n++) { o.stock = { smoke: n * 3, flash: 0, molotov: 0, frag: 0 }; bake(o); } else bake(o); } catch (e) { }
          removeOb(o);
        }
      }
      return sprExportAll();
    }, [seed, bio]);
    // 바이옴 전용 디자인은 같은 키로 덮어쓰이지 않는다(키에 바이옴 포함). 나머지는 plain 키 하나.
    Object.assign(all, r);
  }
  const keysO = Object.keys(all);
  const meta = await p.evaluate(() => { const m = {}; for (const [k, e] of SPR.map) if (e.svg) m[k] = [e.x, e.y, e.w, e.h]; return m; });
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const man = {}, names = [];
  const fileOf = (k) => k.replace(/\|/g, '_').replace(/_+$/, '').replace(/[^\w.-]/g, '-') + '.svg';
  for (const k of keysO) { const n = fileOf(k); fs.writeFileSync(path.join(out, n), all[k]); man[k] = [n, ...(meta[k] || [0, 0, 0, 0])]; names.push(n); }
  fs.writeFileSync(path.join(out, 'manifest.js'), '// 자동 생성: npm run sprites\nvar SPRITE_MANIFEST=' + JSON.stringify(man) + ';\n');
  names.sort();
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>참호전 스프라이트</title><style>body{background:#2a2d22;color:#ddd;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:10px;padding:10px}figure{margin:0;background:#3b3f31;padding:6px;text-align:center}img{display:block;margin:auto;max-width:200px;max-height:200px}</style>` + names.map(n => `<figure><img src="${n}"><figcaption>${n.replace('.svg', '')}</figcaption></figure>`).join(''));
  console.log(names.length + ' sprites → assets/sprites/'); await b.close();
})();
