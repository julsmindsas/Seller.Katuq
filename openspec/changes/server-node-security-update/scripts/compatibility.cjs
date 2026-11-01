'use strict';
// Runs only inside the disposable namespace/chroot with network egress disabled.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
assert(fs.existsSync('/ISOLATED-LAB'));
assert(!fs.existsSync('/home/ubuntu/.pm2'));
assert(!fs.existsSync('/workspace/api/.env'));
const results = [];
const req = createRequire('/workspace/api/package.json');
const genkitReq = createRequire('/workspace/genkit/package.json');
const node = process.execPath;
const label = process.version.replace(/^v/, '');
const out = `/results/compatibility-${label}`;
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
async function check(name, fn) {
  try { const detail = await fn(); results.push({ name, status: 'PASS', detail }); }
  catch (error) {
    results.push({ name, status: 'FAIL', code: error.code || error.name,
      detail: String(error.message).split('\n').slice(0, 6).join('\n') });
  }
}
function command(name, args, cwd) {
  const r = spawnSync(node, args, { cwd, encoding: 'utf8', timeout: 45000,
    maxBuffer: 8 * 1024 * 1024, env: { ...process.env, NODE_ENV: 'test',
      ...(name === 'genkit-build' ? { NODE_OPTIONS: '--max-old-space-size=1024' } : {}) } });
  fs.writeFileSync(path.join(out, name.replace(/[^a-z0-9-]/gi, '_') + '.log'),
    (r.stdout || '') + (r.stderr || ''), { mode: 0o600 });
  assert.equal(r.status, 0, `command exit=${r.status}; signal=${r.signal}; code=${r.error?.code || 'none'}`);
  return { exit: r.status };
}
(async () => {
  await check('isolation', async () => {
    assert(!fs.existsSync('/var/backups'));
    assert(!fs.existsSync('/root/.pm2'));
    assert.equal(process.env.GCLOUD_PROJECT, 'demo-katuq-node22');
    const routes = fs.readFileSync('/proc/net/route', 'utf8').trim().split('\n');
    assert.equal(routes.length, 1, 'unexpected external route');
    return { version: process.version, abi: process.versions.modules, napi: process.versions.napi };
  });
  await check('native-re2', async () => {
    const RE2 = req('re2');
    assert.equal(new RE2('^(hola|adiós)$', 'u').test('adiós'), true);
    assert.equal(new RE2('^hola$').test('otro'), false);
    assert.equal(new RE2('(ka)(tuq)').exec('katuq')[2], 'tuq');
    assert.equal('katuq'.replace(new RE2('katuq'), 'ok'), 'ok');
    return { version: req('re2/package.json').version };
  });
  await check('native-sharp', async () => {
    const sharp = req('sharp');
    const input = Buffer.alloc(8 * 8 * 3, 127);
    const png = await sharp(input, { raw: { width: 8, height: 8, channels: 3 } }).resize(4, 4).png().toBuffer();
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, 4); assert.equal(meta.height, 4); assert.equal(meta.format, 'png');
    return { version: req('sharp/package.json').version };
  });
  for (const name of ['express', 'axios', 'firebase-admin', 'ws', 'jwt-simple']) {
    await check(`api-import-${name}`, async () => { assert(req(name)); });
  }
  for (const name of Object.keys(genkitReq('./package.json').dependencies || {}).filter(n => /genkit/.test(n))) {
    await check(`genkit-import-${name}`, async () => { assert(genkitReq(name)); });
  }
  await check('crypto-jwt', async () => {
    const crypto = require('node:crypto'); const jwt = req('jwt-simple');
    const key = crypto.randomBytes(32).toString('hex');
    const token = jwt.encode({ sub: 'isolated-user', company: 'DEMO', exp: 9999999999 }, key);
    assert.equal(jwt.decode(token, key).company, 'DEMO');
    assert.throws(() => jwt.decode(token, key + 'bad'));
    assert.notEqual(crypto.randomUUID(), crypto.randomUUID());
    assert.equal(crypto.createHmac('sha256', key).update('fixture').digest('hex').length, 64);
  });
  for (const [name, file] of [
    ['api', '/workspace/api/index.js'], ['watcher', '/workspace/api/_watch-e2e.js'],
    ['genkit', '/workspace/genkit/lib/index.js'], ['pm2', '/usr/lib/node_modules/pm2/bin/pm2'],
  ]) await check(`syntax-${name}`, async () => command(`syntax-${name}`, ['--check', file], '/'));
  const tests = [
    'scripts/test-inventory-safety-contract.js',
    'tests/inventory/transactionalAbsoluteStock.test.js',
    'tests/inventory/orderInventoryEffectPolicy.test.js',
    'tests/flows/resolverIdentidadProveedor.test.js',
    'tests/flows/webhooksVivosRegresion.test.js',
    'tests/messaging/webhook.contract.test.js',
    'tests/messaging/tenantWhatsapp.contract.test.js',
  ];
  for (const test of tests) await check(`contract-${test}`, async () => command(test, [test], '/workspace/api'));
  await check('genkit-typescript-build', async () => command('genkit-build',
    ['node_modules/typescript/bin/tsc', '--outDir', `/results/genkit-build-${label}`], '/workspace/genkit'));
  const record = { version: process.version, createdAt: new Date().toISOString(), results };
  fs.writeFileSync(`${out}.json`, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ version: process.version, results: results.map(({name,status,code}) => ({name,status,code})) }, null, 2));
  process.exit(0);
})().catch(error => { console.error(error.name); process.exitCode = 1; });
