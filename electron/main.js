const { app, BrowserWindow, Menu, protocol } = require('electron');
const path = require('path'), fs = require('fs');
// file:// 에서 읽은 SVG 는 캔버스를 오염(tainted)시켜 WebGL 텍스처로 올릴 수 없다 → dist 를 같은 출처의 사용자 지정 스킴(trench://app/)으로 서빙한다.
protocol.registerSchemesAsPrivileged([{ scheme: 'trench', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };
function serveDist() {
  const dist = path.join(__dirname, '..', 'dist');
  protocol.handle('trench', async (req) => {
    try {
      let rel = decodeURIComponent(new URL(req.url).pathname); if (rel === '/' || !rel) rel = '/index.html';
      const f = path.normalize(path.join(dist, rel));
      if (!f.startsWith(dist + path.sep)) return new Response('forbidden', { status: 403 });
      const buf = await fs.promises.readFile(f), type = MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');      // 오디오 반복·탐색용 Range 요청
      if (m) {
        const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1;
        return new Response(buf.subarray(a, b + 1), { status: 206, headers: { 'content-type': type, 'content-range': `bytes ${a}-${b}/${buf.length}`, 'accept-ranges': 'bytes' } });
      }
      return new Response(buf, { headers: { 'content-type': type, 'accept-ranges': 'bytes' } });
    } catch (e) { return new Response('not found', { status: 404 }); }
  });
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: '#12140e', title: '참호전', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.loadURL('trench://app/index.html');
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (i.type === 'keyDown' && i.key === 'F12') win.webContents.toggleDevTools();
  });
}
// 오디오 자동재생 허용 (사용자 입력 없이도 BGM 시작 가능)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(() => {
  serveDist();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
