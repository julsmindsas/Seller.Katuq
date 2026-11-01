'use strict';
const fs = require('node:fs'); const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
assert(fs.existsSync('/ISOLATED-LAB'));
const major = process.argv[2]; assert(['20', '22'].includes(major));
const node = `/runtimes/node${major}/bin/node`;
const results = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function probe(name, cwd, entry, port) {
  const state = `/results/startup-${major}-${name}.state.json`;
  const diagnostics = { missingModules: [], errorTypes: [] };
  const child = spawn(node, ['--require', '/lab/startup-hooks.cjs', entry], { cwd,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { ...process.env, NODE_ENV: 'test', NODE_OPTIONS: '--max-old-space-size=768',
      LAB_STATE_FILE: state, LAB_ENTRYPOINT: name, SECRET_TOKEN: 'synthetic-lab-secret',
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'demo-katuq-node22', client_email: 'lab@example.invalid', private_key: 'synthetic-not-a-real-key' }),
      FIREBASE_PROJECT_ID: 'demo-katuq-node22', FIREBASE_STORAGE_BUCKET: 'demo-katuq-node22.invalid',
      FIREBASE_DATABASE_URL: 'http://127.0.0.1:9000', AWS_EC2_METADATA_DISABLED: 'true' } });
  let exit = null, signal = null, ended = false, ready = 0;
  // Do not persist arbitrary application logs: they can contain old hardcoded credentials.
  function collect(chunk) {
    const text = String(chunk);
    for (const match of text.matchAll(/Cannot find module ['"]([A-Za-z0-9_./@-]{1,200})['"]/g)) diagnostics.missingModules.push(match[1]);
    for (const type of ['TypeError', 'ReferenceError', 'SyntaxError', 'ERR_DLOPEN_FAILED', 'MODULE_NOT_FOUND', 'FATAL ERROR']) {
      if (text.includes(type) && !diagnostics.errorTypes.includes(type)) diagnostics.errorTypes.push(type);
    }
  }
  child.stdout.on('data', collect); child.stderr.on('data', collect);
  child.on('exit', (code, sig) => { exit = code; signal = sig; ended = true; });
  child.on('message', message => { if (message === 'ready') ready++; });
  let reachable = false;
  for (let i = 0; i < 100 && !ended; i++) {
    if (port) reachable = await new Promise(resolve => {
      const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 150 }, res => { res.resume(); resolve(true); });
      req.on('error', () => resolve(false)); req.on('timeout', () => { req.destroy(); resolve(false); });
    });
    else if (fs.existsSync(state)) reachable = JSON.parse(fs.readFileSync(state)).subscriptions > 0;
    if (reachable) break;
    await sleep(200);
  }
  if (!ended) child.kill('SIGINT');
  for (let i = 0; i < 80 && !ended; i++) await sleep(100);
  let forcedKill = false;
  if (!ended) { child.kill('SIGKILL'); forcedKill = true; await sleep(200); }
  results.push({ name, versionMajor: major, status: reachable && !forcedKill && ready <= 1 ? 'PASS' : 'FAIL',
    reachable, readyCount: ready, exit, signal, forcedKill, diagnostics,
    mockedTransport: fs.existsSync(state) ? JSON.parse(fs.readFileSync(state)) : null });
}
(async () => {
  await probe('api', '/workspace/api', '/workspace/api/index.js', 3300);
  await probe('genkit', '/workspace/genkit', '/workspace/genkit/lib/index.js', 3890);
  await probe('watcher', '/workspace/api', '/workspace/api/_watch-e2e.js', null);
  fs.writeFileSync(`/results/startup-probes-${major}.json`, JSON.stringify(results, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(results, null, 2)); process.exit(0);
})().catch(error => { console.error(error.name); process.exit(1); });
