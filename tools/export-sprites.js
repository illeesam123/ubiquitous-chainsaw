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
  // ---- 병사 · 차량 · 도로 · 구덩이 (게임의 그리기 코드에서 그대로 굽는다) + 타일 색 ----
  const ex = await p.evaluate(() => {
    startGame({ seed: 'S1', biome: 'plain', size: 96, enemies: 1, soldiers: 12, minDist: 30 }); G.paused = true;
    const o = {}, hex = (c) => { const k = document.createElement('canvas').getContext('2d'); k.fillStyle = c; return k.fillStyle; };
    const poses = [['idle', 8, 1], ['fire', 8, 1], ['gidle', 8, 1], ['gfire', 8, 1], ['move', 8, 4], ['work', 8, 4], ['fuse', 1, 1]];
    for (let t = 0; t < 4; t++) for (const [pose, nd, nf] of poses) for (let f = 0; f < nf; f++) for (let d = 0; d < nd; d++) {
      const s = sprBakeUnit(t, pose, f, d); if (s) o[`unit|${t}|${pose}${nf > 1 ? f : ''}|${d}`] = s;
    }
    for (const ty of ['tank', 'truck']) for (let t = 0; t < 4; t++) for (let q = 0; q < 16; q++) { const s = sprBakeVeh(ty, t, q); if (s) o[`veh|${ty}|${t}|${q}`] = s; }
    for (const k of [1, 2, 3]) for (let m = 0; m < 16; m++) for (let v = 0; v < (k === 3 ? 1 : 2); v++) { const s = sprBakeRoad(k, m, v); if (s) o[`road|${k}|${m}|${v}`] = s; }
    o['crater|0'] = sprBakeCrater();
    const tiles = [];
    for (const b of BIOME_KEYS) for (const kind of (b === 'snow' ? [0, 1, 2, 4] : [0, 1, 2])) for (let q = 0; q < 4; q++) {
      const g = (q + .5) / 4; tiles.push({ b, kind, q, base: hex(tileColor(b, kind, g)), lo: hex(tileColor(b, kind, Math.max(0, g - .3))), hi: hex(tileColor(b, kind, Math.min(1, g + .3))) });
    }
    return { o, tiles };
  });
  Object.assign(all, ex.o);
  const rng = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; };
  const pf = (n) => Math.round(n * 10) / 10;
  for (const T of ex.tiles) for (let v = 0; v < 3; v++) {
    const r = rng(`${T.b}${T.kind}${T.q}${v}`), inDia = () => { for (;;) { const x = (r() - .5) * 60, y = (r() - .5) * 30; if (Math.abs(x) / 32 + Math.abs(y) / 16 < .82) return [x, y]; } };
    let d = '';
    const n = T.kind === 2 ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const [x, y] = inDia();
      if (T.kind === 2) d += `<path d="M${pf(x - 6)} ${pf(y)}q3 -2 6 0t6 0" fill="none" stroke="${T.hi}" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>`;
      else if (T.kind === 4) { d += `<path d="M${pf(x)} ${pf(y)}l${pf((r() - .5) * 14)} ${pf((r() - .5) * 6)}l${pf((r() - .5) * 10)} ${pf((r() - .5) * 5)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>`; if (i > 2) break; }
      else if (T.kind === 1) d += (i % 2 ? `<ellipse cx="${pf(x)}" cy="${pf(y)}" rx="${pf(2 + r() * 4)}" ry="${pf(1 + r() * 2)}" fill="${T.lo}" fill-opacity=".6"/>` : `<ellipse cx="${pf(x)}" cy="${pf(y)}" rx="1.6" ry=".9" fill="${T.hi}" fill-opacity=".5"/>`);
      else if (T.b === 'arid') d += `<ellipse cx="${pf(x)}" cy="${pf(y)}" rx="${pf(1 + r() * 1.6)}" ry="${pf(.6 + r() * .8)}" fill="${i % 2 ? T.lo : T.hi}" fill-opacity=".55"/>`;
      else if (T.b === 'snow') d += i % 3 ? `<ellipse cx="${pf(x)}" cy="${pf(y)}" rx="${pf(3 + r() * 4)}" ry="${pf(1 + r() * 1.6)}" fill="${T.hi}" fill-opacity=".55"/>` : `<path d="M${pf(x)} ${pf(y)}l4 -1" stroke="${T.lo}" stroke-opacity=".5" stroke-width="1"/>`;
      else d += i % 3 === 0 ? `<ellipse cx="${pf(x)}" cy="${pf(y)}" rx="${pf(2 + r() * 3)}" ry="${pf(1 + r() * 1.4)}" fill="${T.lo}" fill-opacity=".45"/>` : `<path d="M${pf(x)} ${pf(y)}l${pf((r() - .5) * 2)} -3M${pf(x + 1.5)} ${pf(y)}l${pf((r() - .5) * 2)} -2.4" stroke="${T.hi}" stroke-opacity=".6" stroke-width="1" stroke-linecap="round"/>`;
    }
    all[`tile|${T.b}|${T.kind}|${T.q}|${v}`] = `<svg xmlns="http://www.w3.org/2000/svg" width="66" height="34" viewBox="-33 -17 66 34"><rect id="bounds" x="-33" y="-17" width="66" height="34" fill="#000" fill-opacity="0"/><path d="M0 -16L32 0L0 16L-32 0Z" fill="${T.base}" stroke="${T.base}" stroke-width="1"/>${d}</svg>`;
  }
  const keysO = Object.keys(all);
  const meta = await p.evaluate(() => { const m = {}; for (const [k, e] of SPR.map) if (e.svg) m[k] = [e.x, e.y, e.w, e.h]; return m; });
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const man = {}, names = [];
  const fileOf = (k) => k.replace(/\|/g, '_').replace(/_+$/, '').replace(/[^\w.-]/g, '-') + '.svg';
  for (const k of keysO) { const n = fileOf(k); fs.writeFileSync(path.join(out, n), all[k]); const vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(all[k]); if (!vb) throw new Error('viewBox 없음: ' + k); man[k] = [n, +vb[1], +vb[2], +vb[3], +vb[4]]; names.push(n); }
  fs.writeFileSync(path.join(out, 'manifest.js'), '// 자동 생성: npm run sprites\nvar SPRITE_MANIFEST=' + JSON.stringify(man) + ';\n');
  // ---- 에디터용 카탈로그: 에셋(이름) → 모양(셀) 목록. 각 셀은 축(바이옴·상태·변형·팀·방향·크기)을 가진다 ----
  const NAME = { tree: '나무', rock: '바위', house: '집', apartment: '아파트', warehouse: '창고', shed: '헛간', ruin: '폐허', rubble: '잔해', rubble2: '잔해2', rubble3: '잔해3', fence: '울타리', wire: '철조망', sandbag: '모래주머니', crate: '상자', bunker: '벙커', tower: '감시탑', mg: '기관총 진지', medbay: '의무막사', armory: '무기고', unit: '병사', tank: '전차', truck: '수송 트럭', tile: '타일(땅)', road: '도로', crater: '구덩이(포탄 자국)' };
  const EN = { tree: 'tree', rock: 'rock', house: 'house', apartment: 'apartment', warehouse: 'warehouse', shed: 'shed', ruin: 'ruin', rubble: 'rubble', fence: 'fence', wire: 'barbed wire', sandbag: 'sandbag', crate: 'crate', bunker: 'bunker', tower: 'tower watchtower', mg: 'machine gun', medbay: 'medical', armory: 'armory', unit: 'soldier infantry', tank: 'tank vehicle', truck: 'truck vehicle', tile: 'tile ground terrain', road: 'road rail path', crater: 'crater' };
  const POSE = { idle: '서 있음', fire: '사격', gidle: '진지·대기', gfire: '진지·사격', move: '이동', work: '작업(삽)', fuse: '도화선' }, KIND = { 0: '일반 땅', 1: '진흙/언 땅', 2: '얕은 물', 4: '얼음' }, ROAD = { 1: '포장도로', 2: '비포장길', 3: '철로' };
  const BIO = { plain: '평원', swamp: '습지', snow: '설원', arid: '황무지' };
  const dirName = (d, n) => n === 8 ? ['동남', '남', '남서', '서', '북서', '북', '북동', '동'][d] || d : `${d * 22.5}°`;
  const assets = {};
  const add = (id, key, axes) => { (assets[id] = assets[id] || { id, name: NAME[id] || id, search: `${NAME[id] || id} ${EN[id] || id}`, cells: [] }).cells.push({ key, file: man[key][0], axes, vb: man[key].slice(1) }); };
  for (const key of Object.keys(man)) {
    const k = key.split('|');
    if (k[0] === 'unit') { const m = /^([a-z]+)(\d?)$/.exec(k[2]); add('unit', key, { team: `팀 ${+k[1] + 1}`, state: POSE[m[1]] + (m[2] ? ` ${+m[2] + 1}` : ''), dir: k[2] === 'fuse' ? '-' : dirName(+k[3], 8) }); }
    else if (k[0] === 'veh') add(k[1], key, { team: `팀 ${+k[2] + 1}`, dir: `${+k[3] * 22.5}°` });
    else if (k[0] === 'tile') add('tile', key, { biome: BIO[k[1]], state: `${KIND[k[2]]} · 음영 ${+k[3] + 1}`, variant: `무늬 ${+k[4] + 1}` });
    else if (k[0] === 'road') add('road', key, { state: ROAD[k[1]], variant: k[1] === '3' ? '-' : `무늬 ${+k[3] + 1}`, dir: `연결 ${['E', 'W', 'S', 'N'].filter((_, i) => (+k[2] >> i) & 1).join('') || '없음'}` });
    else if (k[0] === 'crater') add('crater', key, {});
    else { // 건물·장애물: [type,biome,size,vq,id%4,hp,nb,owner,from,stock]
      const hp = +k[5], st = [hp ? `파손 ${hp}` : '정상']; if (k[6]) st.push('연결 ' + k[6]); if (k[7] && k[7] !== 'n') st.push(`팀 ${+k[7] + 1}`); if (k[9] && k[9] !== '0') st.push(`재고 ${k[9]}`);
      add(k[0], key, { biome: BIO[k[1]], size: `크기 ${k[2]}`, variant: `무늬 ${+k[3] + 1}-${+k[4] + 1}`, state: st.join(' · ') });
    }
  }
  const cat = Object.values(assets).map(a => {
    const vary = {}; for (const c of a.cells) for (const [ax, v] of Object.entries(c.axes)) (vary[ax] = vary[ax] || new Set()).add(v);
    a.axes = Object.keys(vary).filter(ax => vary[ax].size > 1);
    return a;
  }).sort((x, y) => x.name.localeCompare(y.name, 'ko'));
  fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify(cat));
  names.sort();
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>참호전 스프라이트</title><style>body{background:#2a2d22;color:#ddd;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:10px;padding:10px}figure{margin:0;background:#3b3f31;padding:6px;text-align:center}img{display:block;margin:auto;max-width:200px;max-height:200px}</style>` + names.map(n => `<figure><img src="${n}"><figcaption>${n.replace('.svg', '')}</figcaption></figure>`).join(''));
  console.log(names.length + ' sprites → assets/sprites/'); await b.close();
})();
