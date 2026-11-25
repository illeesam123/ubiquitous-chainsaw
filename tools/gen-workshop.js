// 공방 3단계(공방·공예소·군수공장) 건물 SVG 를 손으로 조립해 assets/sprites/ 에 더한다(비파괴). 사용: node tools/gen-workshop.js
// 좌표: 2×2 발판 중심이 (0,0). 타일 좌표 (x,y)∈[0,2], 높이 z → 화면 ((x-y)*32, (x+y-2)*16 - z)
const addDefs = require('./add-svg.js');
const P = (x, y, z = 0) => [(x - y) * 32, (x + y - 2) * 16 - z];
const f = n => +n.toFixed(2);
const pts = a => a.map(p => f(p[0]) + ' ' + f(p[1])).join(' ');
const poly = (a, fill, stroke = '#2a261d', w = 1.1, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
// 상자: 위·남쪽(y1)면·동쪽(x1)면
function box(x0, y0, x1, y1, z0, z1, c, o = {}) {
  const s = o.stroke || '#2a261d';
  return poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], c[2], s) +
    poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], c[1], s) +
    (o.noTop ? '' : poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], c[0], s));
}
// 판자 줄(남쪽면 / 동쪽면에 가로선)
function planksS(x0, x1, y, z0, z1, n, col = 'rgba(0,0,0,.28)') { let s = ''; for (let k = 1; k < n; k++) { const z = z0 + (z1 - z0) * k / n; s += `<path d="M${pts([P(x0, y, z)])}L${pts([P(x1, y, z)])}" stroke="${col}" stroke-width=".8"/>`; } return s; }
function planksE(x, y0, y1, z0, z1, n, col = 'rgba(0,0,0,.28)') { let s = ''; for (let k = 1; k < n; k++) { const z = z0 + (z1 - z0) * k / n; s += `<path d="M${pts([P(x, y0, z)])}L${pts([P(x, y1, z)])}" stroke="${col}" stroke-width=".8"/>`; } return s; }
// 남쪽면 위의 사각형(문·창): x 범위 [a,b], z 범위
const quadS = (a, b, y, z0, z1, fill, stroke = '#201c14', w = 1) => poly([P(a, y, z0), P(b, y, z0), P(b, y, z1), P(a, y, z1)], fill, stroke, w);
const quadE = (x, a, b, z0, z1, fill, stroke = '#201c14', w = 1) => poly([P(x, a, z0), P(x, b, z0), P(x, b, z1), P(x, a, z1)], fill, stroke, w);
// 박공지붕(용마루가 x축 방향)
function gable(x0, y0, x1, y1, zb, rise, c, o = {}) {
  const ym = (y0 + y1) / 2, zr = zb + rise, ov = o.ov ?? .08;
  const a0 = x0 - ov, a1 = x1 + ov, b0 = y0 - ov, b1 = y1 + ov, bm = ym;
  return poly([P(a0, b0, zb), P(a1, b0, zb), P(a1, bm, zr), P(a0, bm, zr)], c[2]) +
    poly([P(x1, y0, zb), P(x1, y1, zb), P(x1, ym, zr)], o.gable || c[3] || '#8a7a58') +
    poly([P(a0, b1, zb), P(a1, b1, zb), P(a1, bm, zr), P(a0, bm, zr)], c[0]) +
    (o.ribs ? Array.from({ length: o.ribs }, (_, k) => { const x = a0 + (a1 - a0) * (k + 1) / (o.ribs + 1); return `<path d="M${pts([P(x, b1, zb)])}L${pts([P(x, bm, zr)])}" stroke="${c[1]}" stroke-width="1"/>`; }).join('') : '') +
    `<path d="M${pts([P(a0, bm, zr)])}L${pts([P(a1, bm, zr)])}" stroke="${c[1]}" stroke-width="1.6"/>`;
}
// 굴뚝(세로 기둥, 위에 연기)
function stack(x, y, z0, z1, w, fill, band) {
  let s = box(x - w, y - w, x + w, y + w, z0, z1, fill);
  if (band) s += poly([P(x + w, y - w, z1 - 6), P(x + w, y + w, z1 - 6), P(x + w, y + w, z1 - 3), P(x + w, y - w, z1 - 3)], band, 'none', 0) + poly([P(x - w, y + w, z1 - 6), P(x + w, y + w, z1 - 6), P(x + w, y + w, z1 - 3), P(x - w, y + w, z1 - 3)], band, 'none', 0);
  return s;
}
const smoke = (x, y, z, n = 3) => { const [sx, sy] = P(x, y, z); let s = ''; for (let k = 0; k < n; k++) s += `<circle cx="${f(sx + k * 3 - 2)}" cy="${f(sy - 6 - k * 9)}" r="${f(3.4 + k * 1.8)}" fill="#cfcfc6" opacity="${f(.62 - k * .15)}"/>`; return s; };
const barrel = (x, y, c = '#6a4a30') => { const [sx, sy] = P(x, y, 0); return `<ellipse cx="${f(sx)}" cy="${f(sy)}" rx="5" ry="2.5" fill="#1a1710" opacity=".4"/><rect x="${f(sx - 4)}" y="${f(sy - 10)}" width="8" height="10" rx="1.5" fill="${c}" stroke="#2a1c10" stroke-width=".8"/><path d="M${f(sx - 4)} ${f(sy - 7)}h8M${f(sx - 4)} ${f(sy - 3)}h8" stroke="#2a1c10" stroke-width=".8"/><ellipse cx="${f(sx)}" cy="${f(sy - 10)}" rx="4" ry="2" fill="${c}" stroke="#2a1c10" stroke-width=".8"/>`; };
const crate = (x, y, s = .22, h = 8, c = ['#b08850', '#8f6c3c', '#6f5230']) => box(x, y, x + s, y + s, 0, h, c, { stroke: '#2f2210' });
function logs(x, y) { const [sx, sy] = P(x, y, 0); let s = ''; for (let r = 0; r < 2; r++) for (let k = 0; k < 3 - r; k++) s += `<rect x="${f(sx - 8 + k * 6 + r * 3)}" y="${f(sy - 4 - r * 4.5)}" width="6" height="4.5" rx="2" fill="#9c7440" stroke="#4a3418" stroke-width=".7"/><circle cx="${f(sx - 8 + k * 6 + r * 3 + 5.2)}" cy="${f(sy - 4 - r * 4.5 + 2.2)}" r="1.6" fill="#d9b06a" stroke="#4a3418" stroke-width=".5"/>`; return s; }
function anvil(x, y) { const [sx, sy] = P(x, y, 0); return `<ellipse cx="${f(sx)}" cy="${f(sy)}" rx="7" ry="3" fill="#1a1710" opacity=".4"/><rect x="${f(sx - 3)}" y="${f(sy - 7)}" width="6" height="6" fill="#5b4a36" stroke="#2a1c10" stroke-width=".7"/><path d="M${f(sx - 8)} ${f(sy - 7)}h16l-2 -4h-9z" fill="#7d8388" stroke="#2c3034" stroke-width=".9"/>`; }
function bench(x, y) { return box(x, y, x + .7, y + .26, 0, 9, ['#a98450', '#8a6a3c', '#6b5230'], { stroke: '#2f2210' }) + (() => { const [sx, sy] = P(x + .35, y + .13, 9); return `<rect x="${f(sx - 4)}" y="${f(sy - 3)}" width="5" height="3" fill="#8b9096" stroke="#30343a" stroke-width=".6"/><path d="M${f(sx + 3)} ${f(sy - 2)}l5 -4" stroke="#6b5230" stroke-width="1.6"/><rect x="${f(sx + 6)}" y="${f(sy - 8)}" width="4" height="3" fill="#7d8388" stroke="#30343a" stroke-width=".5"/>`; })(); }
const gear = (cx0, cy0, r, fill = '#d9ad4e') => { let t = ''; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; t += `<rect x="${f(cx0 + Math.cos(a) * r - 1.3)}" y="${f(cy0 + Math.sin(a) * r - 1.3)}" width="2.6" height="2.6" fill="${fill}" transform="rotate(${k * 45} ${f(cx0 + Math.cos(a) * r)} ${f(cy0 + Math.sin(a) * r)})"/>`; } return t + `<circle cx="${f(cx0)}" cy="${f(cy0)}" r="${r}" fill="${fill}" stroke="#4a3a14" stroke-width=".8"/><circle cx="${f(cx0)}" cy="${f(cy0)}" r="${f(r * .38)}" fill="#2a261d"/>`; };
const ground = (pad) => poly([P(-.05, -.05), P(2.05, -.05), P(2.05, 2.05), P(-.05, 2.05)], pad, '#1f1c15', 1) + `<ellipse cx="0" cy="18" rx="62" ry="22" fill="#000" opacity=".16"/>`;
const WALLW = ['#a98f62', '#8e7650', '#6f5c3f'], WALLB = ['#b76a4c', '#9c553b', '#7b4130'], WALLC = ['#a9aaa2', '#8b8c84', '#6c6d66'], METAL = ['#9aa3a8', '#7c858b', '#5e666b'], DARK = '#1c1a14';
const ROOFW = ['#7a5b3c', '#5d4128', '#4a331f', '#9a7a52'], ROOFM = ['#8e9aa0', '#69747a', '#59636a', '#a9b4ba'];
const D = [];
// ---------- 1단계 공방: 목조 작업장 ----------
{
  let s = ground('#5a523f');
  s += logs(.2, 1.85) + crate(1.72, .45) + crate(1.74, .7, .2, 6) + barrel(1.85, 1.2);
  s += box(.35, .25, 1.55, 1.5, 0, 22, WALLW);
  s += planksS(.35, 1.55, 1.5, 0, 22, 5) + planksE(1.55, .25, 1.5, 0, 22, 5);
  // 큰 문(열려서 안쪽이 보임) + 불 켜진 창
  s += quadS(.55, 1.1, 1.5, 0, 16, '#2a1f14', '#1a120a', 1.2) + quadS(.62, 1.03, 1.5, 0, 12, '#d98a3a', 'none', 0) + `<path d="M${pts([P(.62, 1.5, 7)])}l8 -4 7 3 6 -3" stroke="#ffd98a" stroke-width="1.2" fill="none"/>`;
  s += quadE(1.55, .55, 1.1, 8, 17, '#e0b062', '#3d2c18', 1) + `<path d="M${pts([P(1.55, .825, 8)])}L${pts([P(1.55, .825, 17)])}M${pts([P(1.55, .55, 12.5)])}L${pts([P(1.55, 1.1, 12.5)])}" stroke="#3d2c18" stroke-width=".8"/>`;
  s += gable(.35, .25, 1.55, 1.5, 22, 14, ROOFW, { ribs: 5, ov: .1 });
  s += stack(.55, .45, 24, 46, .09, ['#8c8f94', '#6d7076', '#55585d']) + smoke(.55, .45, 46);
  s += anvil(.4, 1.8) + bench(1.15, 1.74);
  const [gx, gy] = P(.95, 1.5, 20); s += `<rect x="${f(gx - 12)}" y="${f(gy - 3)}" width="24" height="8" rx="1" fill="#4a331f" stroke="#2a1c10" stroke-width=".8"/>` + gear(gx, gy + 1, 3.2);
  D.push(s);
}
// ---------- 2단계 공예소: 벽돌 본관 + 곁채, 금속 지붕, 굴뚝 2개 ----------
{
  let s = ground('#4f4d44');
  s += crate(1.84, .4) + crate(1.84, .66, .2, 7) + barrel(.2, 1.85, '#5a6b58') + barrel(.4, 1.92, '#5a6b58') + logs(1.6, 1.95);
  // 곁채(서쪽 낮은 건물)
  s += box(.2, 1.0, .8, 1.75, 0, 14, WALLB) + planksS(.2, .8, 1.75, 0, 14, 4, 'rgba(0,0,0,.2)');
  s += gable(.2, 1.0, .8, 1.75, 14, 8, ROOFM, { ribs: 3 });
  s += box(.45, .15, 1.75, 1.55, 0, 26, WALLB);
  // 벽돌 줄눈
  for (let k = 1; k < 6; k++) { s += `<path d="M${pts([P(.45, 1.55, k * 4.3)])}L${pts([P(1.75, 1.55, k * 4.3)])}" stroke="rgba(40,18,10,.28)" stroke-width=".7"/><path d="M${pts([P(1.75, .15, k * 4.3)])}L${pts([P(1.75, 1.55, k * 4.3)])}" stroke="rgba(40,18,10,.28)" stroke-width=".7"/>`; }
  s += quadS(.8, 1.4, 1.55, 0, 19, DARK, '#d9ad4e', 1.4) + quadS(.86, 1.34, 1.55, 0, 16, '#e8a448', 'none', 0) + `<path d="M${pts([P(.86, 1.55, 8)])}l9 -5 8 3 9 -4 7 3" stroke="#fff0b8" stroke-width="1.2" fill="none"/>`;
  s += quadE(1.75, .35, .75, 10, 20, '#f0c46e', '#3a2616', 1) + quadE(1.75, .95, 1.35, 10, 20, '#f0c46e', '#3a2616', 1);
  s += gable(.45, .15, 1.75, 1.55, 26, 14, ROOFM, { ribs: 6, gable: '#9c553b' });
  s += stack(.7, .35, 28, 56, .1, ['#8d5a46', '#6e4332', '#573528'], '#d9d3c0') + stack(1.5, .45, 30, 50, .08, ['#8d5a46', '#6e4332', '#573528']) + smoke(.7, .35, 56) + smoke(1.5, .45, 50, 2);
  s += anvil(.95, 1.9) + bench(1.35, 1.85);
  const [gx, gy] = P(1.1, 1.55, 23); s += `<rect x="${f(gx - 15)}" y="${f(gy - 4)}" width="30" height="9" rx="1" fill="#3a2a18" stroke="#d9ad4e" stroke-width=".9"/>` + gear(gx - 7, gy, 3.4) + gear(gx + 6, gy + .5, 2.6, '#c28a3a');
  D.push(s);
}
// ---------- 3단계 군수공장: 콘크리트 공장, 톱니 지붕, 굴뚝, 하역장 ----------
{
  let s = ground('#45443d');
  // 하역장·컨베이어
  s += box(1.35, 1.55, 2.0, 1.95, 0, 6, WALLC) + crate(1.5, 1.62, .2, 7) + crate(1.74, 1.66, .2, 7, ['#8a8f6c', '#6f7456', '#575b43']);
  s += barrel(.18, 1.85, '#7a3a30') + barrel(.36, 1.93, '#7a3a30') + barrel(.54, 1.85, '#6b6f45');
  s += box(.12, .15, 1.88, 1.55, 0, 32, WALLC);
  for (let k = 1; k < 4; k++) s += `<path d="M${pts([P(.12 + k * .44, 1.55, 0)])}L${pts([P(.12 + k * .44, 1.55, 32)])}" stroke="rgba(0,0,0,.22)" stroke-width=".9"/>`;
  s += `<path d="M${pts([P(.12, 1.55, 24)])}L${pts([P(1.88, 1.55, 24)])}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`;
  // 노랑-검정 줄무늬 셔터 문
  s += quadS(.55, 1.2, 1.55, 0, 21, '#33342e', '#e0b83a', 1.6);
  for (let k = 0; k < 7; k++) { const a = .55 + k * .65 / 7, b = a + .65 / 14; s += quadS(a, b, 1.55, 0, 21, k % 2 ? '#222' : '#e0b83a', 'none', 0); }
  s += quadS(1.3, 1.78, 1.55, 11, 25, '#9fc8dc', '#2c3034', 1) + quadS(.17, .45, 1.55, 11, 25, '#9fc8dc', '#2c3034', 1);
  s += quadE(1.88, .3, .7, 14, 26, '#9fc8dc', '#2c3034', 1) + quadE(1.88, .85, 1.25, 14, 26, '#9fc8dc', '#2c3034', 1);
  // 톱니 지붕 3열: 동쪽 수직 유리면 + 완만한 금속 경사면
  for (let k = 0; k < 3; k++) {
    const a = .12 + k * .5867, b = a + .5867;
    s += poly([P(a, 1.55, 32), P(b, 1.55, 32), P(b, 1.55, 44)], '#4a545a', '#2a261d', .8);
    s += poly([P(a, .15, 32), P(b, .15, 44), P(b, 1.55, 44), P(a, 1.55, 32)], ROOFM[0], '#2a261d', 1);
    s += poly([P(b, .15, 32), P(b, 1.55, 32), P(b, 1.55, 44), P(b, .15, 44)], '#9fc8dc', '#2a261d', .9);
  }
  // 굴뚝 2개(적백 띠)
  s += stack(.5, .3, 40, 92, .1, ['#b8b4a6', '#9a968a', '#7c786e'], '#c0392b') + stack(1.5, .4, 40, 78, .1, ['#b8b4a6', '#9a968a', '#7c786e'], '#c0392b');
  s += `<path d="M${pts([P(.5, .3, 76)])}h0" stroke="#c0392b"/>` + smoke(.5, .3, 92, 4) + smoke(1.5, .4, 78, 3);
  // 옥상 환기탑 + 간판 톱니바퀴
  s += box(.9, .55, 1.2, .85, 44, 52, METAL);
  const [gx, gy] = P(1.0, 1.55, 29); s += `<rect x="${f(gx - 18)}" y="${f(gy - 6)}" width="36" height="12" rx="1.5" fill="#2e312a" stroke="#d9ad4e" stroke-width="1.1"/>` + gear(gx - 9, gy, 4.2) + gear(gx + 3, gy + .5, 3.2, '#c28a3a') + `<path d="M${f(gx + 9)} ${f(gy - 2.5)}h7M${f(gx + 9)} ${f(gy + 2)}h7" stroke="#d9ad4e" stroke-width="1.4"/>`;
  D.push(s);
}
// ---------- 팀색 깃발(마스크, 회색 명암 유지) ----------
const flagMask = h => { const [sx, sy] = P(.45, .25, h); return `<path d="M${f(sx)} ${f(sy)}v-24" stroke="#777" stroke-width="1.6"/><path d="M${f(sx)} ${f(sy - 24)}l17 4 -17 5z" fill="#c8c8c8" stroke="#555" stroke-width=".8"/><path d="M${f(sx)} ${f(sy - 24)}l17 4 -3 1.8 -14 -1z" fill="#eee"/>`; };
const FM = [flagMask(34), flagMask(40), flagMask(46)];
const svg = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="160" viewBox="-96 -112 192 160"><rect id="bounds" x="-96" y="-112" width="192" height="160" fill="#000" fill-opacity="0"/>${b}</svg>`;
const defs = [];
const NM = ['공방', '공예소', '군수공장'];
D.forEach((b, i) => {
  defs.push({ key: 'workshop|' + i, file: `workshop_${i}.svg`, vb: [-96, -112, 192, 160], svg: svg(b), id: 'workshop', name: '공방 건물', group: 'struct', axes: { tier: NM[i] } });
  defs.push({ key: 'workshopt|' + i, file: `workshopt_${i}.svg`, vb: [-96, -112, 192, 160], svg: svg(FM[i]), id: 'workshopt', name: '공방 팀색 깃발(마스크)', group: 'tint', axes: { tier: NM[i] } });
});
addDefs(defs);
