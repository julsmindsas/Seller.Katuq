#!/usr/bin/env python3
"""Preview/install only the approved dated timer. Never starts the cutover service."""
import argparse
from datetime import datetime
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('cutover', HERE / 'scheduled-cutover.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
OPS = Path('/opt/katuq-node/operations/20261023-2300-cot')
STAGE = Path('/var/tmp/katuq-node22/20261023T162255Z-d542')
ROOTFS = STAGE / 'rootfs'
UNIT = 'katuq-node22-20261023'
NODE22 = '/opt/katuq-node/node-v22.23.4-linux-x64/bin/node'
NODE20 = '/opt/katuq-node/node-v20.20.0-rollback/bin/node'
CLI = '/usr/lib/node_modules/pm2/bin/pm2'
PATH22 = str(Path(NODE22).parent) + ':/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'


def artifacts():
    units = {}
    for watchdog in [False, True]:
        name = UNIT + ('-watchdog' if watchdog else '')
        mode = 'watchdog' if watchdog else 'execute'
        recovery = '' if watchdog else f'ExecStopPost=/usr/bin/python3 {OPS}/scheduled-cutover.py --config {OPS}/config.json recover\n'
        preflight = '' if watchdog else f'ExecStartPre=/usr/bin/python3 {OPS}/schedule-guard.py check {OPS}/scheduled-consumers.json\n'
        units[name + '.service'] = f'''[Unit]
Description=Katuq Node 22.23.4 {'independent rollback watchdog' if watchdog else 'one-shot cutover'} D-542
After=network-online.target time-sync.target
Wants=network-online.target
ConditionPathExists={OPS}/seal.json

[Service]
Type=oneshot
User=root
UMask=0077
{preflight}ExecStart=/usr/bin/python3 {OPS}/scheduled-cutover.py --config {OPS}/config.json {mode}
{recovery}TimeoutStartSec=55min
TimeoutStopSec=7min
KillMode=process
RemainAfterExit=yes
Restart=no
StandardOutput=journal
StandardError=journal
'''
        calendar = '2026-10-23 23:00:03 America/Bogota' if watchdog else '2026-10-23 23:00:00 America/Bogota'
        units[name + '.timer'] = f'''[Unit]
Description=Katuq D-542 one-time execution 2026-10-23 Colombia

[Timer]
OnCalendar={calendar}
AccuracySec=1s
RandomizedDelaySec=0
Persistent=false
Unit={name}.service

[Install]
WantedBy=timers.target
'''
    persistence = []
    for who in ['root', 'ubuntu']:
        text = f'''[Service]
Environment="PATH={PATH22}"
ExecStart=
ExecStart={NODE22} {CLI} resurrect
ExecReload=
ExecReload={NODE22} {CLI} reload all
ExecStop=
ExecStop={NODE22} {CLI} kill
'''
        persistence.append({'path': f'/etc/systemd/system/pm2-{who}.service.d/node22-runtime.conf', 'content': text, 'mode': 0o644})
    persistence.append({'path': '/usr/local/bin/pm2', 'content': f'#!/bin/sh\nPATH="{PATH22}"\nexport PATH\nexec {NODE22} {CLI} "$@"\n', 'mode': 0o755})
    return units, persistence


def configuration(persistence):
    groups = []
    for who, uid, home, apps in [('root', 0, '/root/.pm2', ['index', 'shopify-watcher']),
                                  ('ubuntu', 1000, '/home/ubuntu/.pm2', ['katuq-api'])]:
        g = {'name': who, 'uid': uid, 'gid': uid, 'home': home, 'userHome': '/root' if uid == 0 else '/home/ubuntu',
             'apps': apps, 'nativeConsumer': who == 'ubuntu'}
        daemon = int(Path(home, 'pm2.pid').read_text())
        status = Path('/proc', str(daemon), 'status').read_text().splitlines()
        g['supplementaryGids'] = list(map(int, next(line.split(':', 1)[1] for line in status if line.startswith('Groups:')).split()))
        if who == 'ubuntu':
            g['bootstrap'] = {'katuq-api': ['Servidor Express corriendo', 'Todos los servicios de cron han sido inicializados', 'WooCommerce webhook worker inicializado', r'\[flows\] \d+ trigger bindings activated']}
            g['appHttp'] = {'katuq-api': [{'url': 'http://127.0.0.1:3300/api-docs.json', 'status': 200}]}
        else:
            g['bootstrap'] = {'shopify-watcher': [r'\[watcher\] iniciando']}
            g['appHttp'] = {'index': [{'url': 'http://127.0.0.1:3890/', 'status': 404}]}
            g['requireRemoteTcp'] = ['shopify-watcher']
        groups.append(g)
    native = Path('/home/ubuntu/katuq_admin_back_firebase/functions/node_modules/re2/build/Release/re2.node')
    stat = native.stat()
    m.require(m.sha(native) == '1db46a983204b59ee0be899b54eb61b98e82bbc67f00857b2b75d8ccd7b044a9', 'native_changed_since_compatibility')
    return {'ops': str(OPS), 'lock': '/run/lock/katuq-node22-20261023.lock',
        'node22': NODE22, 'node20': NODE20, 'cli': CLI,
        'node22Hash': '94efd062ed066c1a0b332e18249859c905e920eeada5df55d24c99b919629a90',
        'node20Hash': 'd01614ef369e36eee9ab8d86fbfa93ddf44931010add45e5262a63e3ddda784e',
        'native': {'path': str(native), 'candidate': str(OPS / 're2-node22.node'),
                   'candidateHash': '74171a20fd4517a5d68600ada04773fe82c2940ffd0390ab2feb49beb08980f3',
                   'originalHash': m.sha(native), 'uid': stat.st_uid, 'gid': stat.st_gid, 'mode': stat.st_mode & 0o777},
        'dns': 'back.katuq.com', 'ip': '13.222.206.185', 'machineId': Path('/etc/machine-id').read_text().strip(),
        'windowStart': datetime.fromisoformat('2026-10-23T23:00:00-05:00').timestamp(), 'groups': groups,
        'treeRoots': ['/home/ubuntu/katuq_admin_back_firebase/functions', '/home/ubuntu/kai/functions',
                      '/usr/lib/node_modules/pm2', '/root/.pm2/modules', '/home/ubuntu/.pm2/modules',
                      '/etc/cron.d', '/var/spool/cron/crontabs'],
        'fixedFiles': [NODE20, NODE22, CLI, str(OPS / 're2-node22.node'),
                       '/var/lib/dpkg/status',
                       '/etc/passwd', '/etc/group',
                       str(OPS / 'tested-copy-parity.json'),
                       str(OPS / 'scheduled-consumers.json'), '/etc/crontab',
                       '/home/ubuntu/katuq_admin_back_firebase/ecosystem.config.js',
                       '/etc/systemd/system/pm2-root.service', '/etc/systemd/system/pm2-ubuntu.service',
                       *[p['path'] for p in persistence]],
        'persistence': persistence,
        'http': [{'name': 'api_docs', 'url': 'http://127.0.0.1:3300/api-docs.json', 'status': 200, 'jsonKeys': ['paths']},
                 {'name': 'auth_guard', 'url': 'http://127.0.0.1:3300/v1/health/crons', 'status': 401},
                 {'name': 'api_proxy', 'url': 'https://back.katuq.com/', 'status': 404},
                 {'name': 'genkit', 'url': 'http://127.0.0.1:3890/', 'status': 404},
                 {'name': 'adk', 'url': 'https://back.katuq.com/adk/health', 'status': 200, 'jsonKeys': ['status']}],
        'schedulerProbe': str(OPS / 'scheduler-probe.cjs'), 'apiFunctions': '/home/ubuntu/katuq_admin_back_firebase/functions',
        'testedManifest': str(OPS / 'tested-copy-parity.json'),
        'criticalLogPattern': 'ERR_DLOPEN_FAILED|NODE_MODULE_VERSION|FATAL ERROR|MODULE_NOT_FOUND|SyntaxError|ERR_OSSL_|CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF_SIGNATURE|watcher error|bootstrap (?:error|failed)|Error inicializando servicio de cron',
        'baselineSeconds': 120, 'betweenGroupsSeconds': 300, 'observationSeconds': 1800,
        'pollSeconds': 5, 'watchdogMaxSeconds': 3300}


def validate_evidence():
    m.require(m.load('/usr/lib/node_modules/pm2/package.json')['version'] == '5.4.3', 'pm2_version_changed')
    evidence = ROOTFS / 'results' / 'scheduled-revalidation'
    for major in ['20', '22']:
        result = m.load(evidence / ('compatibility-' + major + '.json'))
        m.require(len(result['results']) == 26 and all(r['status'] == 'PASS' for r in result['results']), 'compatibility_gate_failed')
        result = m.load(evidence / ('startup-probes-' + major + '.json'))
        m.require(len(result) == 3 and all(r['status'] == 'PASS' for r in result), 'startup_gate_failed')
    watcher = m.load(ROOTFS / 'results' / 'startup-probes-22-watcher-original-abi.json')
    m.require(len(watcher) == 1 and watcher[0]['status'] == 'PASS', 'shared_native_sequencing_gate_failed')
    result = m.load(ROOTFS / 'results' / 'scheduled-cutover-rehearsal.json')
    m.require(result['status'] == 'PASS' and len(result['results']) == 3, 'executor_rehearsal_gate_failed')
    m.require(result['executorSha256'] == m.sha(HERE / 'scheduled-cutover.py'), 'executor_not_identical_to_rehearsal')
    parity = m.load(STAGE / 'evidence' / 'scheduled-parity.json')
    m.require(parity['status'] == 'PASS', 'tested_copy_parity_gate_failed')
    return evidence


def main():
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['preview', 'install', 'arm'])
    args = p.parse_args()
    m.require(os.geteuid() == 0, 'root_required')
    os.umask(0o077)
    units, persistence = artifacts()
    if args.mode == 'preview':
        print(json.dumps({'units': units, 'deferredPersistence': persistence, 'ops': str(OPS)}, indent=2))
        return
    if args.mode == 'install':
        evidence = validate_evidence()
        m.require(not OPS.exists(), 'operations_directory_already_exists')
        m.require(all(not Path(p['path']).exists() for p in persistence), 'unexpected_existing_startup_override')
        OPS.mkdir(parents=True, mode=0o700)
        for name in ['scheduled-cutover.py', 'scheduler-probe.cjs', 'schedule-guard.py']:
            shutil.copyfile(HERE / name, OPS / name)
            os.chmod(OPS / name, 0o700)
        shutil.copyfile(ROOTFS / 'lab/re2-node22.node', OPS / 're2-node22.node')
        os.chmod(OPS / 're2-node22.node', 0o600)
        shutil.copytree(evidence, OPS / 'validated-compatibility')
        shutil.copyfile(ROOTFS / 'results/scheduled-cutover-rehearsal.json', OPS / 'executor-rehearsal.json')
        shutil.copyfile(STAGE / 'evidence/scheduled-parity.json', OPS / 'tested-copy-parity.json')
        cfg = configuration(persistence)
        m.put(OPS / 'config.json', cfg)
        m.put(OPS / 'state.json', {'phase': 'prepared', 'touched': [], 'persistence': []})
        subprocess.run(['/usr/bin/python3', str(OPS / 'schedule-guard.py'), 'seal', str(OPS / 'scheduled-consumers.json')], check=True)
        runner = m.Runner(OPS / 'config.json')
        subprocess.run(['/usr/bin/python3', str(OPS / 'schedule-guard.py'), 'check', str(OPS / 'scheduled-consumers.json')], check=True)
        runner.lock()
        seal = runner.seal()
        m.require(runner.inventory() == seal['inventory'], 'process_drift_during_sealing')
        m.require(runner.fixed() == seal['fixed'], 'startup_drift_during_sealing')
        for name, data in units.items():
            path = Path('/etc/systemd/system', name)
            m.require(not path.exists(), 'dated_unit_already_exists')
            m.atomic(path, data.encode(), mode=0o644)
        subprocess.run(['systemd-analyze', 'verify', *units.keys()], check=True, capture_output=True)
        subprocess.run(['systemctl', 'daemon-reload'], check=True)
        m.put(OPS / 'installed-units.json', {name: m.sha(Path('/etc/systemd/system', name)) for name in units})
        print(json.dumps({'status': 'INSTALLED_NOT_ARMED', 'ops': str(OPS)}))
    else:
        runner = m.Runner(OPS / 'config.json')
        runner.preflight()
        expected = m.load(OPS / 'installed-units.json')
        m.require(all(m.sha(Path('/etc/systemd/system', name)) == digest for name, digest in expected.items()), 'unit_changed_after_validation')
        for suffix in ['', '-watchdog']:
            subprocess.run(['systemctl', 'enable', '--now', UNIT + suffix + '.timer'], check=True, capture_output=True)
        print(json.dumps({'status': 'ARMED', 'when': '2026-10-23T23:00:00-05:00', 'oneShot': True, 'ops': str(OPS)}))


if __name__ == '__main__':
    try:
        main()
    except BaseException as error:
        print(json.dumps({'status': 'FAIL', 'code': str(error) if isinstance(error, RuntimeError) else type(error).__name__}))
        raise SystemExit(1)
