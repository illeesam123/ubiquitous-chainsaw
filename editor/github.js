// GitHub 연동 (브라우저 fetch 기반, 의존성 없음). Git Data API 로 여러 파일을 한 커밋으로 올린다.
const GH = {
  async api(cfg, path, opt = {}) {
    const r = await fetch('https://api.github.com/repos/' + cfg.repo + path, {
      method: opt.method || 'GET',
      headers: Object.assign({ Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, cfg.token ? { Authorization: 'Bearer ' + cfg.token } : {}, opt.body ? { 'Content-Type': 'application/json' } : {}),
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) { } throw new Error(`GitHub ${r.status} ${m || r.statusText}`); }
    return r.status === 204 ? null : r.json();
  },
  async head(cfg) { const j = await GH.api(cfg, '/commits/' + encodeURIComponent(cfg.branch)); return j.sha; },
  async check(cfg) {
    const j = await GH.api(cfg, ''); const sha = await GH.head(cfg);
    return { name: j.full_name, canPush: !!(j.permissions && j.permissions.push), sha };
  },
  // files: { 'assets/sprites/x.svg': '<svg…>' } → 새 커밋 sha
  async commit(cfg, files, message) {
    const ref = await GH.api(cfg, '/git/ref/heads/' + encodeURIComponent(cfg.branch));
    const parent = ref.object.sha, pc = await GH.api(cfg, '/git/commits/' + parent);
    const tree = [];
    for (const [path, text] of Object.entries(files)) {
      const b = await GH.api(cfg, '/git/blobs', { method: 'POST', body: { content: text, encoding: 'utf-8' } });
      tree.push({ path, mode: '100644', type: 'blob', sha: b.sha });
    }
    const t = await GH.api(cfg, '/git/trees', { method: 'POST', body: { base_tree: pc.tree.sha, tree } });
    const c = await GH.api(cfg, '/git/commits', { method: 'POST', body: { message, tree: t.sha, parents: [parent] } });
    await GH.api(cfg, '/git/refs/heads/' + encodeURIComponent(cfg.branch), { method: 'PATCH', body: { sha: c.sha } });
    return c.sha;
  },
  raw(cfg, sha, file) { return `https://raw.githubusercontent.com/${cfg.repo}/${sha}/assets/sprites/${file}`; },
};
if (typeof module !== 'undefined') module.exports = GH;
