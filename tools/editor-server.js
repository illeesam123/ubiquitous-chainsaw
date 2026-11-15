// 에셋 매니저용 로컬 서버: 저장소 루트를 정적 서빙(/editor/, /dist/, /assets/)하고, 에셋 SVG 를 디스크에 저장하는 API 를 제공한다.
// 사용: npm run editor  →  http://localhost:5173/editor/  (게임: /dist/index.html)
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = +process.env.PORT || 5173;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'PUT' && u.startsWith('/api/sprite/')) {
    const f = u.slice('/api/sprite/'.length);
    if (!/^[\w.-]+\.svg$/.test(f) || !fs.existsSync(path.join(root, 'assets/sprites', f))) { res.writeHead(400); return res.end('bad file'); }
    let b = ''; req.on('data', d => { b += d; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => {
      if (!/^\s*<svg[\s>]/.test(b)) { res.writeHead(400); return res.end('not svg'); }
      fs.writeFileSync(path.join(root, 'assets/sprites', f), b);
      const d = path.join(root, 'dist/assets/sprites', f); if (fs.existsSync(path.dirname(d))) fs.writeFileSync(d, b);
      res.writeHead(200); res.end('ok');
    }); return;
  }
  if (u === '/') { res.writeHead(302, { Location: '/editor/' }); return res.end(); }
  let p = path.normalize(path.join(root, u)); if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d); });
}).listen(port, () => console.log(`에셋 매니저  http://localhost:${port}/editor/\n게임        http://localhost:${port}/dist/index.html`));
