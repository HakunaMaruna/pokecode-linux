#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const simpleGit = require('simple-git').default;

const APP_NAME = 'pokecode';
const APP_VERSION = '2.1.0';
const PORT = parseInt(process.env.POKECODE_PORT || '8765', 10);
const ROOT = process.env.POKECODE_WORKSPACE || path.join(os.homedir(), '.pokecode', 'projects');
const WORKSPACE = path.resolve(ROOT);
fs.mkdirSync(WORKSPACE, { recursive: true });

const app = express();
app.use(express.json({ limit: '10mb' }));
const serverHttp = http.createServer(app);
const io = new Server(serverHttp, { cors: { origin: '*' } });

let dbPool = null;
try {
  dbPool = new Pool({
    host: process.env.POKECODE_DB_HOST || 'localhost',
    port: parseInt(process.env.POKECODE_DB_PORT || '5432', 10),
    user: process.env.POKECODE_DB_USER || 'postgres',
    password: process.env.POKECODE_DB_PASSWORD || 'postgres',
    database: process.env.POKECODE_DB_NAME || 'pokecode'
  });
  dbPool.on('error', () => {});
} catch (e) { dbPool = null; }

function safeRel(rel) {
  if (!rel || rel.includes('..')) return null;
  const p = path.resolve(WORKSPACE, rel);
  if (!p.startsWith(WORKSPACE + path.sep) && p !== WORKSPACE) return null;
  return p;
}
function listTree(dir, base) {
  const entries = [];
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return entries; }
  for (const it of items) {
    if (it.name.startsWith('.')) continue;
    const full = path.join(dir, it.name);
    const rel = path.posix.join(base, it.name);
    if (it.isDirectory()) entries.push({ name: it.name, path: rel, type: 'dir', children: listTree(full, rel) });
    else entries.push({ name: it.name, path: rel, type: 'file', size: fs.statSync(full).size });
  }
  return entries;
}

app.get('/api/status', (req, res) => res.json({ name: APP_NAME, version: APP_VERSION, workspace: WORKSPACE, db: !!dbPool }));
app.get('/api/files', (req, res) => res.json({ root: WORKSPACE, tree: listTree(WORKSPACE, '') }));
app.get('/api/file', (req, res) => {
  const p = safeRel(req.query.path);
  if (!p || !fs.existsSync(p) || !fs.statSync(p).isFile()) return res.status(404).json({ error: 'not found' });
  try { res.json({ path: req.query.path, content: fs.readFileSync(p, 'utf8') }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/save', (req, res) => {
  const { path: rel, content } = req.body || {};
  const p = safeRel(rel);
  if (!p) return res.status(400).json({ error: 'invalid path' });
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  io.emit('file:saved', { path: rel });
  res.json({ ok: true });
});
app.post('/api/mkdir', (req, res) => { const { path: rel } = req.body || {}; const p = safeRel(rel); if (!p) return res.status(400).json({ error: 'invalid path' }); fs.mkdirSync(p, { recursive: true }); io.emit('file:created', { path: rel }); res.json({ ok: true }); });
app.post('/api/delete', (req, res) => { const { path: rel } = req.body || {}; const p = safeRel(rel); if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'not found' }); fs.rmSync(p, { recursive: true, force: true }); io.emit('file:deleted', { path: rel }); res.json({ ok: true }); });
app.post('/api/run', (req, res) => {
  const { command, cwd } = req.body || {};
  if (!command) return res.status(400).json({ error: 'empty command' });
  const dir = safeRel(cwd || '.') || WORKSPACE;
  exec(command, { cwd: dir, timeout: 120000 }, (err, stdout, stderr) => res.json({ stdout: stdout || '', stderr: stderr || '', code: err ? (err.code || 1) : 0 }));
});
app.get('/api/db/test', async (req, res) => {
  if (!dbPool) return res.status(503).json({ error: 'db disabled' });
  try { const r = await dbPool.query('SELECT 1 AS ok'); res.json({ ok: true, row: r.rows[0] }); }
  catch (e) { res.status(503).json({ error: e.message }); }
});

io.on('connection', (socket) => {
  let termProc = null;
  socket.on('term:start', ({ shell = process.env.SHELL || '/bin/bash', cwd = '.' }) => {
    const dir = safeRel(cwd) || WORKSPACE;
    try {
      termProc = spawn(shell, [], { cwd: dir, env: { ...process.env, TERM: 'xterm-256color' } });
      termProc.stdout.on('data', d => socket.emit('term:data', { data: d.toString() }));
      termProc.stderr.on('data', d => socket.emit('term:data', { data: d.toString() }));
      termProc.on('close', (code) => { socket.emit('term:exit', { code }); termProc = null; });
      socket.emit('term:started', { ok: true });
    } catch (e) { socket.emit('term:error', { error: e.message }); }
  });
  socket.on('term:input', ({ data }) => { if (termProc && termProc.stdin) termProc.stdin.write(data); });
  socket.on('disconnect', () => { if (termProc) termProc.kill(); });

  socket.on('agent:run', async ({ prompt, cwd = '.', model }) => {
    const dir = safeRel(cwd) || WORKSPACE;
    const child = spawn('opencode', [prompt], { cwd: dir });
    socket.emit('agent:started', { ok: true });
    child.stdout.on('data', d => socket.emit('agent:data', { type: 'stdout', data: d.toString() }));
    child.stderr.on('data', d => socket.emit('agent:data', { type: 'stderr', data: d.toString() }));
    child.on('close', code => socket.emit('agent:exit', { code }));
    socket.on('agent:stop', () => child.kill());
  });
});

app.get('/api/git/status', async (req, res) => {
  const git = simpleGit(WORKSPACE);
  try {
    const status = await git.status();
    const log = await git.log(['-10', '--format=%h %s']);
    res.json({ ok: true, branch: status.current || '', remote: '', log: log.all.map(c => ({ hash: c.hash, message: c.message })), uncommitted: status.files.map(f => ({ status: f.working_dir + f.index, file: f.file })) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
app.post('/api/git/commit', async (req, res) => {
  const { message = 'Update from PokeCode IDE' } = req.body || {};
  try { const r = await simpleGit(WORKSPACE).add('-A').commit(message); res.json({ ok: true, commit: r.commit }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});
app.post('/api/git/push', async (req, res) => {
  try { const out = await simpleGit(WORKSPACE).push(['-u', 'origin', 'main']); res.json({ ok: true, output: out.stdout || '' }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});
app.post('/api/git/pull', async (req, res) => {
  try { const out = await simpleGit(WORKSPACE).pull(); res.json({ ok: true, output: out.stdout || '' }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/db/connect', (req, res) => {
  const { host = 'localhost', port = 5432, user = 'postgres', password = 'postgres', name = 'pokecode' } = req.body || {};
  const pool = new Pool({ host, port: parseInt(port, 10), user, password, database: name });
  pool.query('SELECT 1').then(() => { dbPool = pool; res.json({ ok: true }); }).catch(e => { pool.end(); res.json({ ok: false, error: e.message }); });
});
app.get('/api/db/tables', async (req, res) => {
  const pool = dbPool; if (!pool) return res.json({ ok: false, error: 'db not connected' });
  try { const r = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY tablename"); res.json({ ok: true, tables: r.rows.map(x => x.tablename) }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});
app.get('/api/db/query', async (req, res) => {
  const pool = dbPool; if (!pool) return res.json({ ok: false, error: 'db not connected' });
  const table = req.query.table;
  if (!table) return res.json({ ok: false, error: 'table required' });
  try { const r = await pool.query('SELECT * FROM "' + table + '" LIMIT 200'); res.json({ ok: true, rows: r.rows }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/sync/pull', (req, res) => {
  const { remote } = req.body || {};
  exec(`cd "${WORKSPACE}" && git pull --ff-only 2>&1 || git clone --depth 1 "${remote || ''}" "${WORKSPACE}" 2>&1`, { timeout: 300000 }, (err) => {
    res.json({ ok: !err, error: err ? err.message : null, files: listTree(WORKSPACE, '').flat().length });
  });
});
app.post('/api/sync/push', (req, res) => {
  const { remote } = req.body || {};
  exec(`cd "${WORKSPACE}" && (git remote get-url origin >/dev/null 2>&1 || git remote add origin "${remote || ''}") && git push origin "$(git rev-parse --abbrev-ref HEAD)" 2>&1`, { timeout: 300000 }, (err) => {
    res.json({ ok: !err, error: err ? err.message : null });
  });
});

serverHttp.listen(PORT, '127.0.0.1', () => {
  console.log(`PokeCode IDE ${APP_VERSION} listening on http://127.0.0.1:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
});
