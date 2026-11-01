'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { transform, installDump, atomicWrite } = require('./runtime-manifest.cjs');
assert(fs.existsSync('/ISOLATED-LAB') && !fs.existsSync('/var/backups'));
const cli = '/usr/lib/node_modules/pm2/bin/pm2';
const runtime = major => `/runtimes/node${major}/bin/node`;
const evidence = { startedAt: new Date().toISOString(), events: [], groups: {}, cleanup: {} };
const groups = [
  { name: 'root', uid: 0, gid: 0, home: '/lab/pm2-root', apps: [['index-fixture', 7001, 'fork'], ['watcher-fixture', 7002, 'fork']] },
  { name: 'ubuntu', uid: 1000, gid: 1000, home: '/lab/pm2-ubuntu', apps: [['api-fixture', 7003, 'cluster']] },
];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function processHash(pid, group) {
  if (!group.uid) return hash(`/proc/${pid}/exe`);
  // SYS_PTRACE is deliberately absent in this sandbox. Read /proc as its owner.
  const r = spawnSync(runtime(20), ['-e', "const fs=require('fs'),c=require('crypto');process.stdout.write(c.createHash('sha256').update(fs.readFileSync('/proc/'+process.argv[1]+'/exe')).digest('hex'))", String(pid)],
    { uid: group.uid, gid: group.gid, encoding: 'utf8', timeout: 5000 });
  assert.equal(r.status, 0, 'owner-scoped executable verification failed');
  return r.stdout;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function ownership(directory, group) {
  fs.lchownSync(directory, group.uid, group.gid);
  if (fs.lstatSync(directory).isDirectory()) for (const name of fs.readdirSync(directory)) ownership(path.join(directory, name), group);
}
function pm2(group, major, args, allowFailure = false) {
  assert(group.home.startsWith('/lab/pm2-') && fs.existsSync(`${group.home}/LAB-HOME`));
  const env = { ...process.env, PM2_HOME: group.home, HOME: group.uid ? '/home/ubuntu' : '/root',
    PATH: `${path.dirname(runtime(major))}:/usr/bin:/bin`, PM2_NO_INTERACTION: 'true' };
  const r = spawnSync(runtime(major), [cli, ...args], { env, cwd: '/lab', uid: group.uid, gid: group.gid,
    timeout: 30000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
  evidence.events.push({ group: group.name, major, operation: args[0], exit: r.status, signal: r.signal });
  fs.appendFileSync(`/results/rehearsal-${group.name}.log`, `${args.join(' ')}\n${r.stdout || ''}${r.stderr || ''}\n`, { mode: 0o600 });
  if (!allowFailure) assert.equal(r.status, 0, `${group.name} ${args[0]} failed`);
  return r;
}
function list(group, major) { return JSON.parse(pm2(group, major, ['jlist']).stdout); }
function putDump(group, data) { installDump(group.home, data); ownership(group.home, group); }
async function readHealth(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 1000 }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }); req.on('error', reject); req.on('timeout', () => req.destroy(new Error('health timeout')));
  });
}
async function healthy(group, major) {
  const wanted = major === 20 ? 'v20.20.0' : 'v22.23.4';
  for (const [name, port] of group.apps) {
    let body;
    for (let attempt = 0; attempt < 50; attempt++) { try { body = await readHealth(port); break; } catch { await sleep(100); } }
    assert(body, `health missing: ${name}`); assert.equal(body.version, wanted);
    assert.equal(body.preserved, 'synthetic-unchanged');
    if (group.name === 'ubuntu') assert.equal(body.re2, true);
  }
  const rows = list(group, major);
  assert.deepEqual(rows.map(p => p.name).sort(), [...group.apps.map(a => a[0]), 'pm2-logrotate'].sort());
  for (const p of rows) {
    assert.equal(p.pm2_env.status, 'online');
    assert.equal(p.pm2_env.node_version, wanted.slice(1));
    assert.equal(processHash(p.pid, group), hash(runtime(major)), 'child effective executable differs');
  }
  const daemon = Number(fs.readFileSync(`${group.home}/pm2.pid`, 'utf8'));
  assert.equal(processHash(daemon, group), hash(runtime(major)), 'daemon effective executable differs');
  evidence.events.push({ group: group.name, health: 'PASS', version: wanted, processes: rows.length });
}
function stopGroup(group, major) {
  for (const [name] of [...group.apps].reverse()) pm2(group, major, ['stop', name], true);
  pm2(group, major, ['stop', 'pm2-logrotate'], true);
  pm2(group, major, ['kill']);
}
async function startSaved(group, major, dump) {
  for (const entry of dump) {
    putDump(group, [entry]);
    pm2(group, major, ['resurrect']);
    const started = list(group, major).find(p => p.name === entry.name);
    assert(started && started.pm2_env.status === 'online', `restore failed: ${entry.name}`);
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { await readHealth(Number(entry.env.LAB_PORT)); ready = true; break; }
      catch { await sleep(100); }
    }
    assert(ready, `restored process has no health: ${entry.name}`);
  }
  await healthy(group, major);
  pm2(group, major, ['save']);
  const final = JSON.parse(fs.readFileSync(`${group.home}/dump.pm2`, 'utf8'));
  assert.deepEqual(final.map(a => a.name).sort(), group.apps.map(a => a[0]).sort(), 'incomplete saved list or module leaked into dump');
  putDump(group, final);
}
function installNative(source) {
  const dest = '/lab/native/re2/build/Release/re2.node';
  fs.copyFileSync(source, `${dest}.next`); fs.chmodSync(`${dest}.next`, 0o644); fs.renameSync(`${dest}.next`, dest);
  return hash(dest);
}

(async () => {
  fs.mkdirSync('/lab/native/re2/build/Release', { recursive: true, mode: 0o755 });
  fs.copyFileSync('/workspace/api/node_modules/re2/re2.js', '/lab/native/re2/re2.js');
  fs.chmodSync('/lab/native/re2/re2.js', 0o644);
  const originalNative = '/lab/re2-node20.node';
  const candidateNative = '/workspace/api/node_modules/re2/build/Release/re2.node';
  assert.notEqual(hash(originalNative), hash(candidateNative), 'candidate ABI artifact not prepared');
  installNative(originalNative);
  fs.writeFileSync('/lab/fixture.cjs', `
const http=require('http');
const re2=process.env.LAB_RE2_PATH ? new (require(process.env.LAB_RE2_PATH))('^ok$').test('ok') : null;
const server=http.createServer((q,s)=>{s.setHeader('content-type','application/json');s.end(JSON.stringify({version:process.version,preserved:process.env.LAB_PRESERVED,re2}));});
server.listen(Number(process.env.LAB_PORT),'127.0.0.1',()=>{if(process.send)process.send('ready');});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
`, { mode: 0o644 });
  for (const group of groups) {
    assert(!fs.existsSync(group.home), 'rehearsal home already exists');
    fs.mkdirSync(group.home, { mode: 0o700 });
    fs.writeFileSync(`${group.home}/LAB-HOME`, 'disposable\n', { mode: 0o600 });
    const moduleTemplate = group.name === 'root' ? '/module-templates-root/pm2-logrotate' : '/module-templates/pm2-logrotate';
    fs.cpSync(moduleTemplate, `${group.home}/modules/pm2-logrotate`, { recursive: true });
    atomicWrite(`${group.home}/module_conf.json`, { 'module-db-v2': { 'pm2-logrotate': {} }, 'pm2-logrotate': { max_size: '100M', retain: 1, compress: false, workerInterval: '30', rotateInterval: '0 0 * * *', rotateModule: true } });
    ownership(group.home, group);
    const configs = group.apps.map(([name, port, mode]) => ({ name, script: '/lab/fixture.cjs', cwd: '/lab',
      exec_mode: mode, instances: 1, exec_interpreter: runtime(20), watch: false, autorestart: true,
      wait_ready: mode === 'cluster', listen_timeout: 20000, kill_timeout: mode === 'cluster' ? 10000 : 1600,
      env: { LAB_PORT: String(port), LAB_PRESERVED: 'synthetic-unchanged', ...(group.name === 'ubuntu' ? { LAB_RE2_PATH: '/lab/native/re2/re2.js' } : {}) } }));
    for (const config of configs) {
      const file = `/lab/${group.name}-${config.name}.json`; fs.writeFileSync(file, JSON.stringify({ apps: [config] }), { mode: 0o644 });
      pm2(group, 20, ['start', file]);
    }
    await healthy(group, 20); pm2(group, 20, ['save']);
    group.original = JSON.parse(fs.readFileSync(`${group.home}/dump.pm2`, 'utf8'));
    group.moduleConf = fs.readFileSync(`${group.home}/module_conf.json`);
    group.launchFile = `/lab/${group.name}-startup.conf`;
    fs.writeFileSync(group.launchFile, `ExecStart=${runtime(20)} ${cli} resurrect\n`, { mode: 0o600 });
    group.launchOriginal = fs.readFileSync(group.launchFile);
  }
  for (const group of groups) {
    const start = Date.now(); stopGroup(group, 20);
    if (group.name === 'ubuntu') installNative(candidateNative);
    fs.writeFileSync(group.launchFile, `ExecStart=${runtime(22)} ${cli} resurrect\n`);
    await startSaved(group, 22, transform(group.original, runtime(22)));
    evidence.groups[group.name] = { migrationSeconds: (Date.now() - start) / 1000, migration: 'PASS' };
  }
  const affected = groups[1]; stopGroup(affected, 22);
  const bad = transform(affected.original, runtime(22));
  fs.writeFileSync('/lab/INTENTIONAL-STARTUP-FAILURE.cjs', 'process.exit(73);\n', { mode: 0o644 });
  bad[0].script = '/lab/INTENTIONAL-STARTUP-FAILURE.cjs';
  bad[0].pm_exec_path = bad[0].script; bad[0].autorestart = false;
  putDump(affected, bad);
  const injected = pm2(affected, 22, ['resurrect'], true);
  await sleep(1000);
  const failedRows = list(affected, 22);
  let httpReachable = false;
  try { await readHealth(7003); httpReachable = true; } catch {}
  const failed = failedRows.find(p => p.name === 'api-fixture');
  const livePid = !!failed?.pid && fs.existsSync(`/proc/${failed.pid}`);
  assert(!httpReachable && !livePid, 'failure not induced according to PID and health');
  evidence.failureInjection = { detected: true, cliExit: injected.status, reportedStatus: failed?.pm2_env.status,
    pid: failed?.pid, applicationExit: failed?.pm2_env.exit_code, httpReachable, independentStateCheck: 'PASS' };
  for (const group of [...groups].reverse()) {
    const decision = Date.now(); stopGroup(group, 22);
    if (group.name === 'ubuntu') assert.equal(installNative(originalNative), hash(originalNative));
    fs.writeFileSync(group.launchFile, group.launchOriginal);
    fs.writeFileSync(`${group.home}/module_conf.json`, group.moduleConf);
    await startSaved(group, 20, group.original);
    assert(fs.readFileSync(group.launchFile).equals(group.launchOriginal));
    assert(fs.readFileSync(`${group.home}/module_conf.json`).equals(group.moduleConf));
    const seconds = (Date.now() - decision) / 1000;
    assert(seconds <= 180, 'rollback exceeds budget');
    Object.assign(evidence.groups[group.name], { rollbackSeconds: seconds, rollback: 'PASS', nativeRestored: group.name === 'ubuntu' });
  }
  evidence.status = 'PASS';
})().catch(error => { evidence.status = 'FAIL'; evidence.error = String(error.message); }).finally(() => {
  for (const group of groups) {
    try {
      if (fs.existsSync(`${group.home}/pm2.pid`)) pm2(group, 20, ['kill'], true);
      const pid = fs.existsSync(`${group.home}/pm2.pid`) ? Number(fs.readFileSync(`${group.home}/pm2.pid`, 'utf8')) : null;
      evidence.cleanup[group.name] = { daemonRemaining: !!pid && fs.existsSync(`/proc/${pid}`) };
    } catch (e) { evidence.cleanup[group.name] = { error: e.name }; }
  }
  fs.writeFileSync('/results/pm2-rehearsal.json', JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ status: evidence.status, error: evidence.error, groups: evidence.groups,
    failureInjection: evidence.failureInjection, cleanup: evidence.cleanup }, null, 2));
  process.exit(evidence.status === 'PASS' ? 0 : 1);
});
