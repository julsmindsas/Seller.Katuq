#!/usr/bin/env python3
"""Exercise the actual scheduled executor, never the live PM2 homes."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

assert Path('/ISOLATED-LAB').exists() and not Path('/var/backups').exists()
spec = importlib.util.spec_from_file_location('cutover', '/lab/scheduled-cutover.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
results = []
node20 = '/runtimes/node20/bin/node'
node22 = '/runtimes/node22/bin/node'
cli = '/usr/lib/node_modules/pm2/bin/pm2'
fixture = '/lab/scheduled-fixture.cjs'
Path(fixture).write_text("""const http=require('http');
if(process.env.FAIL22==='yes' && process.version.startsWith('v22'))process.exit(73);
if(process.env.RE2_PATH)new (require(process.env.RE2_PATH))('^ok$').test('ok');
const server=http.createServer((q,s)=>{s.end(JSON.stringify({version:process.version}));});
server.listen(Number(process.env.PORT),'127.0.0.1',()=>{console.log('FIXTURE_READY');if(process.send)process.send('ready');});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
""")
os.chmod(fixture, 0o644)
sha = module.sha


def recursive_owner(directory, uid):
    for parent, dirs, files in os.walk(directory):
        os.chown(parent, uid, uid)
        for name in files:
            os.chown(Path(parent, name), uid, uid)


def run_case(name, fail=False, watchdog=False):
    ops = Path('/lab/ops-' + name)
    ops.mkdir(mode=0o700)
    native = '/lab/native/re2/build/Release/re2.node'
    shutil.copyfile('/lab/re2-node20.node', native)
    groups = []
    for who, uid, apps in [('root', 0, ['index-fixture', 'watcher-fixture']), ('ubuntu', 1000, ['api-fixture'])]:
        home = '/lab/scheduled-' + name + '-' + who
        Path(home).mkdir(mode=0o700)
        template = '/module-templates-root' if who == 'root' else '/module-templates'
        shutil.copytree(template + '/pm2-logrotate', home + '/modules/pm2-logrotate')
        module.put(Path(home, 'module_conf.json'), {'module-db-v2': {'pm2-logrotate': {}}, 'pm2-logrotate': {'retain': 1}})
        recursive_owner(home, uid)
        groups.append({'name': who, 'uid': uid, 'gid': uid, 'home': home, 'userHome': '/root' if uid == 0 else '/home/ubuntu',
                       'supplementaryGids': [uid],
                       'apps': apps, 'nativeConsumer': who == 'ubuntu', 'bootstrap': {a: ['FIXTURE_READY'] for a in apps}, 'appHttp': {}})
    port = 7100
    for group in groups:
        for app in group['apps']:
            port += 1
            group['appHttp'][app] = [{'url': f'http://127.0.0.1:{port}/', 'status': 200}]
            env = {'PORT': str(port)}
            if group['name'] == 'ubuntu':
                env['RE2_PATH'] = '/lab/native/re2/re2.js'
                env['FAIL22'] = 'yes' if fail else 'no'
            config = {'apps': [{'name': app, 'script': fixture, 'cwd': '/lab', 'env': env, 'exec_interpreter': node20,
                               'exec_mode': 'cluster' if group['name'] == 'ubuntu' else 'fork', 'instances': 1,
                               'wait_ready': group['name'] == 'ubuntu', 'listen_timeout': 2000, 'kill_timeout': 1000,
                               'autorestart': False, 'watch': False}]}
            file = Path('/lab/' + name + '-' + app + '.json')
            file.write_text(json.dumps(config)); os.chmod(file, 0o644)
            command = [node20, cli, 'start', str(file)]
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           user=group['uid'], group=group['gid'], cwd='/lab',
                           extra_groups=group['supplementaryGids'],
                           env=dict(os.environ, PM2_HOME=group['home'], HOME=group['userHome'], PATH='/runtimes/node20/bin:/usr/bin:/bin'))
    persistence = [{'path': '/lab/' + name + '-startup.conf', 'content': 'candidate-node22\n', 'mode': 0o644}]
    Path(persistence[0]['path']).write_text('original-node20\n')
    proof = Path('/lab/' + name + '-proof')
    proof.mkdir(mode=0o700)
    (proof / 'source.cjs').write_text('tested-source\n')
    roots = [str(proof), '/lab/native/re2']
    manifest = {str(p): {'sha256': sha(p)} for root in roots for p in Path(root).rglob('*') if p.is_file()}
    module.put(ops / 'tested-copy.json', {'manifest': manifest})
    cfg = {'ops': str(ops), 'laboratory': True, 'lock': '/lab/' + name + '.lock', 'groups': groups,
           'node20': node20, 'node20Hash': sha(node20), 'node22': node22, 'node22Hash': sha(node22), 'cli': cli,
           'native': {'path': native, 'originalHash': sha(native), 'candidate': '/lab/re2-node22.node',
                      'candidateHash': sha('/lab/re2-node22.node'), 'uid': 0, 'gid': 0, 'mode': 0o644},
           'treeRoots': roots, 'testedManifest': str(ops / 'tested-copy.json'),
           'fixedFiles': [persistence[0]['path'], node20, node22], 'persistence': persistence,
           'http': [{'name': 'api', 'url': 'http://127.0.0.1:7103/', 'status': 200, 'jsonKeys': ['version']}],
           'criticalLogPattern': 'ERR_DLOPEN_FAILED|FATAL ERROR|MODULE_NOT_FOUND', 'baselineSeconds': 0,
           'betweenGroupsSeconds': 20 if watchdog else 0, 'observationSeconds': 1, 'pollSeconds': 0.2,
           'laboratoryMigrationSeconds': 90, 'watchdogMaxSeconds': 300}
    module.put(ops / 'config.json', cfg)
    runner = module.Runner(ops / 'config.json')
    for group in groups:
        runner.pm2(group, node20, ['save'])
    runner.seal()
    runner.preflight()
    (proof / 'source.cjs').write_text('untested-code\n')
    try:
        runner.preflight()
        raise AssertionError('untested code was accepted')
    except RuntimeError as error:
        assert str(error) == 'tested_file_changed'
    (proof / 'source.cjs').write_text('tested-source\n')
    # Prove drift is rejected without touching a daemon or native.
    Path(persistence[0]['path']).write_text('unexpected-drift\n')
    try:
        runner.preflight()
        raise AssertionError('drift was accepted')
    except RuntimeError as error:
        assert str(error) == 'startup_or_global_runtime_drift'
    Path(persistence[0]['path']).write_text('original-node20\n')
    module.put(ops / 'state.json', {'phase': 'prepared', 'touched': [], 'persistence': []})
    output = open('/results/cutover-' + name + '.private.log', 'wb')
    main = subprocess.Popen(['/usr/bin/python3', '/lab/scheduled-cutover.py', '--config', str(ops / 'config.json'), 'execute'], stdout=output, stderr=output)
    if watchdog:
        for _ in range(900):
            time.sleep(0.1)
            state = module.load(ops / 'state.json')
            if state.get('migrated') == ['root']:
                break
            assert main.poll() is None
        else:
            raise AssertionError('root migration not reached')
        os.kill(main.pid, signal.SIGSTOP)
        state = module.load(ops / 'state.json')
        state['deadline'] = time.time() - 5
        pending = subprocess.Popen(['/usr/bin/sleep', '120'])
        state['commandPid'] = pending.pid
        state['commandIdentity'] = module.identity(pending.pid)
        module.put(ops / 'state.json', state)
        watcher = subprocess.run(['/usr/bin/python3', '/lab/scheduled-cutover.py', '--config', str(ops / 'config.json'), 'watchdog'], stdout=output, stderr=output, timeout=90)
        assert watcher.returncode == 0
        assert pending.wait(timeout=5) == -9, 'orphaned executor command survived recovery'
    exitcode = main.wait(timeout=300)
    state = module.load(ops / 'state.json')
    expected = 'reverted' if fail or watchdog else 'completed'
    assert state['phase'] == expected, state
    assert (exitcode == 0) == (expected == 'completed')
    if expected == 'reverted':
        assert sha(native) == cfg['native']['originalHash']
        assert Path(persistence[0]['path']).read_text() == 'original-node20\n'
    checks = {'case': name, 'phase': state['phase'], 'exit': exitcode, 'driftRejected': True,
              'recovery': 'PASS' if expected == 'reverted' else 'not_needed'}
    for group in groups:
        runner = module.Runner(ops / 'config.json')
        rows = runner.rows(group, node20)
        wanted = cfg['node20Hash'] if expected == 'reverted' or (watchdog and group['name'] == 'ubuntu') else cfg['node22Hash']
        assert runner.process_hash(runner.pid(group)) == wanted
        assert all(runner.process_hash(row['pid']) == wanted for row in rows)
        runner.pm2(group, node20, ['kill'])
    # Duplicate execution is refused even though the last run succeeded/reverted.
    duplicate = subprocess.run(['/usr/bin/python3', '/lab/scheduled-cutover.py', '--config', str(ops / 'config.json'), 'execute'], capture_output=True)
    assert duplicate.returncode != 0 and b'one_shot_already_attempted' in duplicate.stdout
    checks['duplicateRejected'] = True
    results.append(checks)


try:
    run_case('success')
    run_case('startup-failure', fail=True)
    run_case('watchdog', watchdog=True)
    Path('/results/scheduled-cutover-rehearsal.json').write_text(json.dumps({'status': 'PASS', 'results': results,
        'executorSha256': sha('/lab/scheduled-cutover.py'), 'harnessSha256': sha('/lab/cutover-rehearsal.py')}, indent=2))
    print(json.dumps({'status': 'PASS', 'results': results}, indent=2))
finally:
    # PID namespace termination also removes any fixture left by a failed harness.
    pass
