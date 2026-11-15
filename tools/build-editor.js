// 에셋 매니저를 서버 없이 더블클릭으로 열 수 있는 단일 HTML(dist/asset-manager.html)로 묶는다.
// 카탈로그와 모든 SVG 를 파일 안에 내장한다. (GitHub Actions 가 이 파일을 산출물로 올린다)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), sp = path.join(root, 'assets/sprites'), ed = path.join(root, 'editor');
const catalog = JSON.parse(fs.readFileSync(path.join(sp, 'catalog.json'), 'utf8'));
const svgs = {}; for (const f of fs.readdirSync(sp)) if (f.endsWith('.svg')) svgs[f] = fs.readFileSync(path.join(sp, f), 'utf8');
const safe = (o) => JSON.stringify(o).replace(/<\//g, '<\\/').replace(/[\u2028\u2029]/g, '');
let html = fs.readFileSync(path.join(ed, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="editor.css">', '<style>' + fs.readFileSync(path.join(ed, 'editor.css'), 'utf8') + '</style>')
  .replace(/<script src="\.\.\/assets\/sprites\/manifest\.js"><\/script>\n?/, '')
  .replace('<script src="github.js"></script>', '<script>window.__EMBED=' + safe({ catalog, svgs }) + ';</script>\n<script>' + fs.readFileSync(path.join(ed, 'github.js'), 'utf8').replace(/<\//g, '<\\/') + '</script>')
  .replace('<script src="editor.js"></script>', '<script>' + fs.readFileSync(path.join(ed, 'editor.js'), 'utf8').replace(/<\//g, '<\\/') + '</script>')
  .replace('<p class="dim">게임이 같은 주소의 다른 탭에서 열려 있으면 교체한 에셋이 즉시 반영됩니다. (<code>npm run editor</code> 로 열면 됩니다)</p>', '<p class="dim">GitHub 패널에서 토큰을 넣으면 변경분을 저장소에 바로 커밋할 수 있습니다.</p>');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/asset-manager.html'), html);
console.log(`asset-manager.html: ${Object.keys(svgs).length} SVG, ${(html.length / 1048576).toFixed(1)} MB`);
