// GitHub 연동 (브라우저 fetch 기반, 의존성 없음). Git Data API 로 여러 파일을 한 커밋으로 올린다.
const GH = {
  async api(cfg, path, opt = {}) {
    const r = await fetch('https://api.github.com/repos/' + cfg.repo + path, {
      method: opt.method || 'GET',
      headers: Object.assign({ Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, cfg.token ? { Authorization: 'Bearer ' + cfg.token } : {}, opt.body ? { 'Content-Type': 'application/json' } : {}),
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) { } throw new Error(GH.explain(r.status, m || r.statusText, opt.method || 'GET', path)); }
    return r.status === 204 ? null : r.json();
  },
  // 권한 오류는 원인을 알아볼 수 있게 풀어서 알려 준다
  explain(status, msg, method, path) {
    let hint = '';
    if (status === 403 && /personal access token/i.test(msg)) hint = ' → 토큰에 이 저장소의 쓰기 권한이 없습니다. Fine-grained 토큰이면 (1) Repository access 에 이 저장소를 포함하고 (2) Repository permissions 의 Contents 를 "Read and write" 로 설정하세요. 클래식 토큰이면 repo 범위를 선택하세요. 조직 저장소라면 조직의 토큰 승인(SSO/승인 대기)도 확인하세요.';
    else if (status === 401) hint = ' → 토큰이 잘못되었거나 만료되었습니다.';
    else if (status === 404 && method !== 'GET') hint = ' → 저장소/브랜치 이름이 맞는지, 토큰이 해당 저장소에 접근 가능한지 확인하세요.';
    else if (status === 409 || status === 422) hint = ' → 브랜치가 보호 규칙(PR 필수 등)으로 직접 푸시가 막혀 있거나 그 사이 브랜치가 바뀌었을 수 있습니다. 다시 시도하세요.';
    return `GitHub ${status} ${msg}${hint}`;
  },
  async head(cfg) { const j = await GH.api(cfg, '/commits/' + encodeURIComponent(cfg.branch)); return j.sha; },
  async check(cfg) {
    const j = await GH.api(cfg, ''); const sha = await GH.head(cfg);
    return { name: j.full_name, canPush: j.permissions ? !!j.permissions.push : null, sha };
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
