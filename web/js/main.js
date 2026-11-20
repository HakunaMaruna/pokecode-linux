'use strict';

(function () {
  const S = document.getElementById('status');
  const WS = document.getElementById('workspace');
  const SB_LANG = document.getElementById('sbLang');
  const SB_FILE = document.getElementById('sbFile');
  const SB_BRANCH = document.getElementById('sbBranch');
  const SB_DB = document.getElementById('sbDb');
  const socket = io({ transports: ['websocket', 'polling'] });

  function setStatus(text, cls) {
    S.textContent = text;
    S.className = 'status ' + (cls || '');
  }
  function scrollToBottom(id) {
    const el = document.getElementById(id);
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ---------- tabs ----------
  function setTab(name) {
    document.querySelectorAll('#tabsBar .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('#middle > div').forEach(d => d.classList.toggle('active', d.id === name || d.id === name + 'Area'));
  }
  document.querySelectorAll('#tabsBar .tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));

  // ---------- socket ----------
  socket.on('connect', () => setStatus('Connected'));
  socket.on('connect_error', () => setStatus('Disconnected'));
  socket.on('term:data', ({ data }) => {
    const el = document.getElementById('termArea');
    if (el) el.textContent += data;
    const out = document.getElementById('termOut');
    if (out && !out.hidden) out.textContent += data;
  });
  socket.on('term:started', () => document.getElementById('termOut').hidden = false);
  socket.on('term:exit', ({ code }) => setStatus('Terminal exited (' + code + ')'));
  socket.on('term:error', ({ error }) => setStatus('Terminal error: ' + error, 'err'));

  socket.on('agent:data', ({ type, data }) => {
    const el = document.getElementById('agentMessages');
    const last = el.children[el.children.length - 1];
    if (last && last.className === 'msg agent') {
      last.children[0].textContent += data;
    } else {
      const div = document.createElement('div');
      div.className = 'msg agent';
      const pre = document.createElement('pre');
      pre.className = 'mono';
      pre.textContent = data;
      div.appendChild(pre);
      el.appendChild(div);
    }
    scrollToBottom('agentMessages');
    setStatus('Agent: streaming...');
  });
  socket.on('agent:started', () => setStatus('Agent started'));
  socket.on('agent:exit', ({ code }) => setStatus('Agent exited (' + code + ')', code === 0 ? 'ok' : 'err'));

  socket.on('file:saved', () => setStatus('Saved'));
  socket.on('file:created', ({ path }) => { loadTree(); setStatus('Created ' + path); });
  socket.on('file:deleted', ({ path }) => { loadTree(); setStatus('Deleted ' + path); });

  // ---------- api ----------
  async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    return res.json();
  }

  // ---------- file tree ----------
  let editor = null;
  let currentFile = null;
  let treeEl = document.getElementById('fileTree');
  const fileSearch = document.getElementById('fileSearch');
  fileSearch.addEventListener('input', () => filterTree(fileSearch.value));

  function buildTree(items, container, base) {
    container = container || treeEl;
    base = base || '';
    container.innerHTML = '';
    for (const item of items || []) {
      const div = document.createElement('div');
      div.className = 'file' + (item.type === 'dir' ? ' dir' : '') + (item.path === currentFile ? ' active' : '');
      div.dataset.path = item.path;
      const icon = document.createElement('span');
      icon.textContent = item.type === 'dir' ? '▪' : '▭';
      const name = document.createElement('span');
      name.className = 'name' + (item.type === 'dir' ? ' open-file' : '');
      name.textContent = item.name;
      div.appendChild(icon);
      div.appendChild(name);
      if (item.type === 'file') {
        const size = document.createElement('span');
        size.className = 'size';
        size.textContent = (item.size / 1024).toFixed(0) + 'KB';
        div.appendChild(size);
      }
      div.addEventListener('click', () => item.type === 'dir' ? toggleDir(div, item) : openFile(item.path));
      container.appendChild(div);
      if (item.type === 'dir') {
        const wrap = document.createElement('div');
        wrap.dataset.parent = item.path;
        wrap.style.display = 'none';
        container.appendChild(wrap);
        buildTree(item.children, wrap, item.path);
        div._kids = wrap;
      }
    }
  }

  function toggleDir(div, item) {
    if (div._kids) {
      div._kids.style.display = div._kids.style.display === 'none' ? '' : 'none';
      div.querySelector('.open-file').style.display = div._kids.style.display === 'none' ? 'none' : 'block';
    }
  }

  function filterTree(query) {
    const q = query.toLowerCase();
    const walk = (els) => {
      els.forEach(el => {
        const matches = el.textContent.toLowerCase().includes(q);
        el.style.display = matches ? '' : 'none';
        if (el._kids) {
          const any = [...el._kids.querySelectorAll('.file')].some(k => k.textContent.toLowerCase().includes(q));
          el.style.display = matches || any ? '' : 'none';
          if (el.style.display !== 'none') walk([el._kids]);
        }
      });
    };
    walk([...treeEl.querySelectorAll('.file')]);
  }

  async function loadTree() {
    const res = await fetch('/api/files');
    const data = await res.json();
    buildTree(data.tree);
  }

  // ---------- editor ----------
  async function openFile(path) {
    const res = await fetch('/api/file?path=' + encodeURIComponent(path));
    const data = await res.json();
    if (data.error) { setStatus('Not found: ' + path, 'err'); return; }
    currentFile = path;
    SB_FILE.textContent = path;
    if (editor) editor.setValue(data.content);
    setLang(path);
    setStatus('Open: ' + path);
  }
  function setLang(path) {
    if (!editor) return;
    const lang = (path || '').split('.').pop();
    const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', html: 'html', htm: 'html', css: 'css', less: 'less', scss: 'scss', json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown', markdown: 'markdown', sh: 'shell', bash: 'shell', zsh: 'shell', rb: 'ruby', php: 'php', go: 'go', rs: 'rust', c: 'c', cpp: 'cpp', java: 'java', cs: 'csharp', swift: 'swift', kt: 'kotlin', dart: 'dart', lua: 'lua', sql: 'sql', txt: 'plaintext', svg: 'xml', xml: 'xml' };
    monaco.editor.setModelLanguage(editor.getModel(), map[lang] || 'plaintext');
  }
  async function saveFile() {
    if (!currentFile) { setStatus('No file open', 'warn'); return; }
    const content = editor ? editor.getValue() : '';
    await api('POST', '/api/save', { path: currentFile, content });
    setStatus('Saved: ' + currentFile);
  }
  async function newFile() {
    const p = document.getElementById('newPath').value.trim();
    if (!p) return;
    document.getElementById('newPath').value = '';
    await api('POST', '/api/save', { path: p, content: '' });
    loadTree();
    openFile(p);
  }
  async function runCmd() {
    const cmd = document.getElementById('runCmd').value.trim();
    const out = document.getElementById('termOut');
    out.hidden = false;
    out.textContent = (cmd ? '$ ' + cmd : '$ ') + '\n';
    const res = await api('POST', '/api/run', { command: cmd, cwd: '.' });
    out.textContent += (res.stdout || '') + (res.stderr ? '[stderr]\n' + res.stderr : '') + '\n[exit ' + res.code + ']\n';
  }

  // ---------- terminal ----------
  async function termStart(shell) {
    const termEl = document.getElementById('termContainer');
    termEl.innerHTML = '';
    const div = document.createElement('div');
    div.id = 'termArea';
    div.className = 'mono out';
    div.style.cssText = 'height:100%; white-space:pre-wrap; overflow:auto; padding:8px; background:var(--bg); font-size:14px;';
    termEl.appendChild(div);
    socket.emit('term:start', { shell, cwd: '.' });
    div.textContent = '$ ' + (shell || '') + '\n';
  }
  function termNew() {
    const select = document.getElementById('termSelect');
    select.innerHTML = '';
    ['/bin/bash', '/bin/sh', '/bin/zsh'].forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s; select.appendChild(o);
    });
    termStart(select.value);
  }

  // ---------- agent ----------
  async function agentSend() {
    const input = document.getElementById('agentText');
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = '';
    const el = document.getElementById('agentMessages');
    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = prompt;
    el.appendChild(div);
    socket.emit('agent:run', { prompt, cwd: '.' });
    setStatus('Agent: processing...');
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.shiftKey) && document.getElementById('agentText') === document.activeElement) {
      e.preventDefault(); agentSend();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveFile(); }
  });

  // ---------- git ----------
  async function gitPull() {
    const res = await api('GET', '/api/git/status');
    if (!res.ok) { setStatus('Git: ' + (res.error || 'error'), 'err'); return; }
    document.getElementById('gitInfo').textContent = res.branch + ' — ' + res.remote;
    const logEl = document.getElementById('gitLog');
    logEl.innerHTML = '';
    (res.log || []).forEach(c => {
      const el = document.createElement('div');
      el.className = 'mono';
      el.textContent = c.hash.slice(0, 8) + ' ' + c.message;
      logEl.appendChild(el);
    });
    (res.uncommitted || []).forEach(f => {
      const el = document.createElement('div');
      el.className = 'mono ' + (f.status === 'A' ? 'success' : '');
      el.textContent = f.status + ' ' + f.file;
      logEl.appendChild(el);
    });
  }
  async function gitCommit() {
    const msg = document.getElementById('commitMsg').value.trim();
    await api('POST', '/api/git/commit', { message: msg || 'Update from PokeCode IDE' });
    gitPull();
  }
  async function gitPush() {
    const res = await api('POST', '/api/git/push');
    setStatus('Push: ' + (res.ok ? 'done' : res.error), res.ok ? '' : 'err');
    gitPull();
  }
  document.getElementById('gitArea').addEventListener('click', e => {
    if (e.target.id === 'gitPullBtn') gitPull();
    if (e.target.id === 'gitPushBtn') gitPush();
    if (e.target.id === 'gitCommitBtn') gitCommit();
  });

  // ---------- database ----------
  async function dbConnect() {
    await api('POST', '/api/db/connect', {
      host: document.getElementById('dbHost').value,
      port: parseInt(document.getElementById('dbPort').value || '5432', 10),
      user: document.getElementById('dbUser').value,
      password: document.getElementById('dbPass').value,
      name: document.getElementById('dbName').value
    });
    SB_DB.textContent = 'DB: on';
  }
  async function dbTables() {
    const tables = await api('GET', '/api/db/tables');
    const el = document.getElementById('dbTables');
    el.innerHTML = '';
    (tables.tables || []).forEach(t => {
      const d = document.createElement('div');
      d.className = 'mono';
      d.textContent = t;
      d.onclick = () => dbQuery(t);
      el.appendChild(d);
    });
  }
  async function dbQuery(table) {
    const res = await api('GET', '/api/db/query?table=' + encodeURIComponent(table));
    if (!res.ok) { setStatus('DB: ' + res.error, 'err'); return; }
    const el = document.getElementById('dbResults');
    const keys = Object.keys((res.rows || [])[0] || {});
    el.innerHTML = '<table><tr>' + keys.map(k => '<th>' + k + '</th>').join('') + '</tr>' +
      (res.rows || []).map(r => '<tr>' + keys.map(k => '<td>' + String(r[k]).slice(0, 60) + '</td>').join('') + '</tr>').join('') + '</table>';
  }
  document.getElementById('dbArea').addEventListener('click', e => {
    if (e.target.id === 'dbConnectBtn') dbConnect();
    if (e.target.id === 'dbTablesBtn') dbTables();
  });

  // ---------- design ----------
  async function designExport() {
    const file = await api('GET', '/api/file?path=index.html');
    const css = await api('GET', '/api/file?path=css/style.css');
    const srcdoc = file.content || '<!DOCTYPE html><html><head><style>' + (css.content || '') + '</style></head><body></body></html>';
    const f = document.getElementById('designFrame');
    f.srcdoc = srcdoc;
    f.classList.add('show');
  }
  function designPreview() { setTab('design'); designExport(); }
  document.getElementById('designArea').addEventListener('click', e => {
    if (e.target.id === 'designExportBtn') designExport();
    if (e.target.id === 'designPreviewBtn') designPreview();
  });

  // ---------- sync ----------
  async function syncFromMobile() {
    const remote = document.getElementById('syncRemote').value.trim();
    if (!remote) { setStatus('Enter remote URL in Settings', 'warn'); return; }
    const res = await api('POST', '/api/sync/pull', { remote });
    if (!res.ok) { setStatus('Pull failed: ' + (res.error || 'error'), 'err'); return; }
    setStatus('Synced from mobile (' + (res.files || 0) + ' files): ' + res.branch);
    loadTree();
  }
  async function syncPushBackup() {
    const remote = document.getElementById('syncRemote').value.trim();
    if (!remote) { setStatus('Enter remote URL in Settings', 'warn'); return; }
    await api('POST', '/api/sync/push', { remote });
    setStatus('Backup pushed to: ' + remote);
  }
  document.getElementById('settingsArea').addEventListener('click', e => {
    if (e.target.id === 'syncBtn') syncFromMobile();
    if (e.target.id === 'syncPushBtn') syncPushBackup();
  });

  // ---------- themes ----------
  function toggleTheme() {
    const html = document.documentElement;
    const next = (html.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('pokecodeTheme', next);
    document.getElementById('themeToggle').textContent = next === 'dark' ? '☀' : '🌙';
  }

  // ---------- init ----------
  function init() {
    const theme = localStorage.getItem('pokecodeTheme') || 'dark';
    document.documentElement.dataset.theme = theme;
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀' : '🌙';
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
      const theme = document.documentElement.dataset.theme === 'light' ? 'vs-light' : 'vs-dark';
      editor = monaco.editor.create(document.getElementById('editorContainer'), {
        value: '', language: 'javascript', theme, automaticLayout: true,
        minimap: { enabled: true }, fontFamily: '"JetBrains Mono", monospace', fontSize: 13
      });
      editor.onDidChangeModelContent(() => {
        const pos = editor.getPosition();
        SB_FILE.textContent = (currentFile || 'New') + '  L' + (pos.lineNumber || 1) + ':C' + (pos.column || 1);
      });
      setTimeout(() => openFile('package.json'), 500);
    });
    termStart('/bin/bash');
  }

  window.pokecode = {
    api, setStatus, loadTree, openFile, saveFile, newFile, runCmd,
    agentSend, gitPull, gitCommit, gitPush, dbConnect, dbTables, dbQuery,
    designExport, designPreview, syncFromMobile, syncPushBackup,
    setTab, termNew, termStart, toggleTheme
  };

  init();
})();
