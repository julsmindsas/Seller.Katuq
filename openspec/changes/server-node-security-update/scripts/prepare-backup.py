#!/usr/bin/env python3
"""Private, additive backup only. Does not stop/restart services or install packages."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone


def command(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs).stdout


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def main():
    assert os.geteuid() == 0, 'requires root for private snapshots'
    run_id = sys.argv[1]
    assert re.fullmatch(r'[0-9TZ-]+d542', run_id), 'invalid run id'
    os.umask(0o077)
    backup = Path('/var/backups/katuq-node22') / run_id
    backup.mkdir(parents=True, exist_ok=False)
    summary = {'runId': run_id, 'createdAt': datetime.now(timezone.utc).isoformat(),
               'groups': {}, 'native': [], 'source': {}}
    cli = '/usr/lib/node_modules/pm2/bin/pm2'
    for owner, home, uid in [('ubuntu', '/home/ubuntu/.pm2', 1000), ('root', '/root/.pm2', 0)]:
        target = backup / owner
        target.mkdir()
        daemon_pid = int(Path(home, 'pm2.pid').read_text().strip())
        assert Path(f'/proc/{daemon_pid}').stat().st_uid == uid
        assert 'PM2' in Path(f'/proc/{daemon_pid}/comm').read_text()
        env = dict(os.environ, PM2_HOME=home, PATH='/usr/bin:/bin:/usr/sbin:/sbin')
        prefix = ['sudo', '-H', '-u', owner] if uid else []
        call = prefix + ['env', f'PM2_HOME={home}', 'PATH=/usr/bin:/bin:/usr/sbin:/sbin', '/usr/bin/node', cli]
        for name in ['dump.pm2', 'dump.pm2.bak', 'module_conf.json']:
            original = Path(home, name)
            if original.exists():
                shutil.copy2(original, target / (name + '.before'))
                os.chmod(target / (name + '.before'), 0o600)
        raw = command(call + ['jlist'], env=env)
        entries = json.loads(raw)
        (target / 'jlist.private.json').write_bytes(raw)
        # Save uses the installed PM2's own serialization, after preserving older dumps.
        (target / 'save.private.log').write_bytes(command(call + ['save'], env=env))
        shutil.copy2(Path(home, 'dump.pm2'), target / 'runtime20.json')
        os.chmod(target / 'runtime20.json', 0o600)
        runtime = json.loads((target / 'runtime20.json').read_text())
        expected = {p['name'] for p in entries if not p['pm2_env'].get('pmx_module')}
        assert {p['name'] for p in runtime} == expected, 'incomplete application snapshot'
        group = {'daemonPid': daemon_pid, 'processes': []}
        daemon_exe = Path(f'/proc/{daemon_pid}/exe')
        shutil.copyfile(daemon_exe, target / 'daemon-executable.before')
        os.chmod(target / 'daemon-executable.before', 0o700)
        group['daemonExecutableSha256'] = digest(target / 'daemon-executable.before')
        group['daemonVersion'] = command([str(target / 'daemon-executable.before'), '--version']).decode().strip()
        for p in entries:
            e, pid = p['pm2_env'], p['pid']
            item = {k: e.get(k) for k in ['name', 'node_version', 'status', 'exec_mode', 'restart_time', 'pm_uptime', 'wait_ready', 'kill_timeout', 'listen_timeout']}
            item.update(pid=pid, executable=os.readlink(f'/proc/{pid}/exe'), executableSha256=digest(f'/proc/{pid}/exe'))
            group['processes'].append(item)
            script = Path(e['pm_exec_path'])
            dst = target / 'entrypoints' / script.name
            dst.parent.mkdir(exist_ok=True)
            shutil.copy2(script, dst)
            os.chmod(dst, 0o600)
        summary['groups'][owner] = group
        modules = Path(home, 'modules')
        if modules.exists():
            command(['tar', '-cf', str(target / 'modules.tar'), '-C', home, 'modules'])
        cron = subprocess.run(['crontab', '-u', owner, '-l'], capture_output=True)
        (target / 'crontab.private.txt').write_bytes(cron.stdout)
        (target / 'unit.private.txt').write_bytes(command(['systemctl', 'cat', f'pm2-{owner}.service']))
    runtime_dir = backup / 'runtime20' / 'bin'
    runtime_dir.mkdir(parents=True)
    shutil.copy2('/usr/bin/node', runtime_dir / 'node')
    os.chmod(runtime_dir / 'node', 0o700)
    summary['node20'] = {'version': command(['/usr/bin/node', '--version']).decode().strip(), 'sha256': digest('/usr/bin/node')}
    command(['tar', '-cf', str(backup / 'pm2-tree.tar'), '-C', '/usr/lib/node_modules', 'pm2'])
    unit_paths = []
    for owner in ['ubuntu', 'root']:
        for p in [Path(f'/etc/systemd/system/pm2-{owner}.service'), Path(f'/etc/systemd/system/pm2-{owner}.service.d')]:
            if p.exists():
                unit_paths.append(str(p).lstrip('/'))
    if Path('/usr/local/bin/pm2').exists():
        unit_paths.append('usr/local/bin/pm2')
    command(['tar', '-cf', str(backup / 'launch-original.tar'), '-C', '/'] + unit_paths)
    for label, source in [('api', '/home/ubuntu/katuq_admin_back_firebase'), ('genkit', '/home/ubuntu/kai')]:
        root = Path(source)
        summary['source'][label] = {'commit': command(['git', '-C', source, 'rev-parse', 'HEAD']).decode().strip(), 'files': {}}
        for p in ['functions/package.json', 'functions/package-lock.json', 'functions/index.js', 'functions/lib/index.js', 'ecosystem.config.js']:
            candidate = root / p
            if candidate.is_file():
                summary['source'][label]['files'][p] = digest(candidate)
        for candidate in sorted((root / 'functions' / 'node_modules').rglob('*.node')):
            if not candidate.is_file():
                continue
            dest = backup / 'native-original' / label / candidate.relative_to(root)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(candidate, dest)
            os.chmod(dest, 0o600)
            st = candidate.stat()
            summary['native'].append({'path': str(candidate), 'sha256': digest(candidate), 'uid': st.st_uid, 'gid': st.st_gid, 'mode': oct(st.st_mode & 0o777), 'backup': str(dest.relative_to(backup))})
    (backup / 'system-scheduled.private.txt').write_bytes(command(['sh', '-c', 'cat /etc/crontab; systemctl list-timers --all --no-pager']))
    (backup / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    hashes = {str(p.relative_to(backup)): digest(p) for p in sorted(backup.rglob('*')) if p.is_file()}
    (backup / 'checksums.json').write_text(json.dumps(hashes, indent=2) + '\n')
    assert all(digest(backup / p) == h for p, h in hashes.items())
    # Seal snapshots, while retaining executable modes on explicitly archived runtimes.
    for p in backup.rglob('*'):
        if p.is_dir():
            os.chmod(p, 0o700)
    print(json.dumps({'backup': str(backup), 'verifiedFiles': len(hashes), 'node20': summary['node20'], 'groups': summary['groups'], 'nativeCount': len(summary['native'])}, indent=2))


if __name__ == '__main__':
    main()
