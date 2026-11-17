// src/MANIFEST.json 순서대로 모듈을 합쳐 dist/game.js 생성 (+ index.html, 스타일, 에셋 복사)
// 모듈은 전역 스코프를 공유하는 클래식 스크립트이므로, 합치면 함수 호이스팅이 파일 경계를 넘어 유지된다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/MANIFEST.json'), 'utf8'));
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
let out = '';
for (const f of manifest) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  out += `\n/* ---- ${f} ---- */\n${code}`;
}
fs.writeFileSync(path.join(dist, 'game.js'), out);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="src\/[^"]+"><\/script>\n?/g, '').replace('</body>', '<script src="pixi.min.js"></script>\n<script src="game.js"></script>\n</body>');
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.copyFileSync(path.join(root, 'style.css'), path.join(dist, 'style.css'));
fs.copyFileSync(path.join(root, 'vendor/pixi.min.js'), path.join(dist, 'pixi.min.js'));
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
console.log(`build ok: ${manifest.length} modules → dist/game.js (${(out.length / 1024).toFixed(0)} KB)`);
