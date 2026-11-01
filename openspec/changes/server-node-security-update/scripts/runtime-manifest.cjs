'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function transform(input, runtime) {
  assert(Array.isArray(input) && input.length, 'empty/invalid process snapshot');
  assert(path.isAbsolute(runtime) && path.basename(runtime) === 'node', 'absolute Node path required');
  const seen = new Set();
  return structuredClone(input).map(app => {
    assert(/^[a-zA-Z0-9_-]+$/.test(app.name), 'unsafe application name');
    assert(!seen.has(app.name), 'duplicate application name'); seen.add(app.name);
    assert(!app.exec_interpreter || app.exec_interpreter === 'node' || /\/node$/.test(app.exec_interpreter), 'unexpected interpreter');
    const withRuntime = value => `${path.dirname(runtime)}:${(value || '/usr/bin:/bin').split(':').filter(p => p !== path.dirname(runtime)).join(':')}`;
    app.exec_interpreter = runtime;
    app.PATH = withRuntime(app.PATH || app.env?.PATH);
    if (app.env) app.env.PATH = withRuntime(app.env.PATH || app.PATH);
    return app;
  });
}

function atomicWrite(file, data) {
  const temporary = `${file}.node22-${process.pid}`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function installDump(home, data) {
  assert(fs.existsSync(path.join(home, 'LAB-HOME')), 'live PM2_HOME not authorized by preparation helper');
  atomicWrite(path.join(home, 'dump.pm2'), data);
  atomicWrite(path.join(home, 'dump.pm2.bak'), data);
}

if (require.main === module) {
  const [input, runtime, destination, flag] = process.argv.slice(2);
  const data = transform(JSON.parse(fs.readFileSync(input, 'utf8')), runtime);
  assert(fs.existsSync(runtime), 'runtime executable missing');
  for (const app of data) {
    assert(path.isAbsolute(app.pm_exec_path) && fs.existsSync(app.pm_exec_path), 'application entrypoint missing');
    assert(path.isAbsolute(app.pm_cwd) && fs.statSync(app.pm_cwd).isDirectory(), 'application cwd missing');
  }
  assert(destination.startsWith('/var/tmp/katuq-node22/') && !destination.includes('..'), 'private staging destination required');
  if (flag !== '--dry-run') {
    fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
    atomicWrite(path.join(destination, 'all.json'), data);
    for (const app of data) atomicWrite(path.join(destination, `${app.name}.json`), [app]);
  }
  console.log(JSON.stringify({ dryRun: flag === '--dry-run', names: data.map(a => a.name), runtime }));
}
module.exports = { transform, atomicWrite, installDump };
