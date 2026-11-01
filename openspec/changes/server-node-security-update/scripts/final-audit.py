#!/usr/bin/env python3
"""Read-only verification of live baseline and private backup integrity."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

RUN = '20261023T162255Z-d542'
BACKUP = Path('/var/backups/katuq-node22') / RUN
STAGE = Path('/var/tmp/katuq-node22') / RUN


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for part in iter(lambda: f.read(1024 * 1024), b''):
            h.update(part)
    return h.hexdigest()


def main():
    assert os.geteuid() == 0
    baseline = json.loads((BACKUP / 'summary.json').read_text())
    checks = json.loads((BACKUP / 'checksums.json').read_text())
    result = {'backupVerifiedFiles': len(checks), 'backupValid': all(sha(BACKUP / p) == h for p, h in checks.items()), 'groups': {}, 'sources': {}, 'http': {}}
    result['node20Unchanged'] = sha('/usr/bin/node') == baseline['node20']['sha256']
    result['nativeUnchanged'] = all(sha(row['path']) == row['sha256'] for row in baseline['native'])
    result['moduleConfigUnchanged'] = all(sha(BACKUP / who / 'module_conf.json.before') == sha(home + '/module_conf.json') for who, home in [('root', '/root/.pm2'), ('ubuntu', '/home/ubuntu/.pm2')])
    for who, home in [('root', '/root/.pm2'), ('ubuntu', '/home/ubuntu/.pm2')]:
        before = baseline['groups'][who]
        daemon = int(Path(home, 'pm2.pid').read_text())
        assert daemon == before['daemonPid'], 'live daemon PID changed'
        assert sha(f'/proc/{daemon}/exe') == before['daemonExecutableSha256']
        prefix = ['sudo', '-H', '-u', who] if who == 'ubuntu' else []
        raw = subprocess.check_output(prefix + ['env', f'PM2_HOME={home}', 'PATH=/usr/bin:/bin:/usr/sbin:/sbin', '/usr/bin/node', '/usr/lib/node_modules/pm2/bin/pm2', 'jlist'])
        rows = json.loads(raw)
        assert {p['name'] for p in rows} == {p['name'] for p in before['processes']}
        verified = []
        for saved in before['processes']:
            current = next(p for p in rows if p['name'] == saved['name'])
            assert current['pid'] == saved['pid'], 'live child PID changed'
            assert sha(f'/proc/{current["pid"]}/exe') == saved['executableSha256']
            for key in ['node_version', 'status', 'restart_time', 'pm_uptime']:
                assert current['pm2_env'].get(key) == saved[key], 'live state drift'
            verified.append({'name': saved['name'], 'pid': current['pid'], 'runtime': saved['node_version'], 'unchanged': True})
        result['groups'][who] = {'daemonPid': daemon, 'daemonRuntime': before['daemonVersion'], 'unchanged': True, 'processes': verified}
    for label, repo in [('api', 'katuq_admin_back_firebase'), ('genkit', 'kai')]:
        root = Path('/home/ubuntu') / repo
        commit = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
        result['sources'][label] = {'commit': commit, 'sameCommit': commit == baseline['source'][label]['commit'], 'trackedFilesMatched': all(sha(root / p) == h for p, h in baseline['source'][label]['files'].items())}
    result['dropinsUnchanged'] = all(not Path(f'/etc/systemd/system/pm2-{owner}.service.d/node22-runtime.conf').exists() for owner in ['root', 'ubuntu'])
    result['wrapperUnchanged'] = not Path('/usr/local/bin/pm2').exists()
    for label, url in [('api', 'https://back.katuq.com/'), ('auth', 'https://back.katuq.com/v1/health/crons'), ('adk', 'https://back.katuq.com/adk/health')]:
        result['http'][label] = subprocess.check_output(['curl', '--max-time', '5', '-s', '-o', '/dev/null', '-w', '%{http_code}', url], text=True)
    result['services'] = subprocess.check_output(['systemctl', 'is-active', 'kai-adk', 'nginx'], text=True).splitlines()
    for key in ['backupValid', 'node20Unchanged', 'nativeUnchanged', 'moduleConfigUnchanged', 'dropinsUnchanged', 'wrapperUnchanged']:
        assert result[key], key
    assert result['http'] == {'api': '404', 'auth': '401', 'adk': '200'}
    assert all(d['sameCommit'] and d['trackedFilesMatched'] for d in result['sources'].values())
    (STAGE / 'evidence' / 'final-audit.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
