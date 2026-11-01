#!/usr/bin/env python3
"""Read-only fingerprint of cron and timer definitions before the dated cutover."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


def call(*args):
    return subprocess.check_output(args, timeout=5)


def fingerprint():
    files = [Path('/etc/crontab'), Path('/etc/anacrontab')]
    for root in ['/etc/cron.d', '/etc/cron.hourly', '/etc/cron.daily', '/etc/cron.weekly',
                 '/etc/cron.monthly', '/var/spool/cron/crontabs']:
        files.extend(p for p in Path(root).rglob('*') if p.is_file())
    result = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    raw = call('systemctl', 'list-timers', '--all', '--no-legend', '--no-pager').decode()
    timers = sorted(set(re.findall(r'[A-Za-z0-9@_.:-]+\.timer', raw)))
    for name in timers:
        if name.startswith('katuq-node22-20261023'):
            continue
        content = call('systemctl', 'cat', name)
        targets = call('systemctl', 'show', name, '-p', 'Triggers', '--value').decode().split()
        for target in targets:
            content += call('systemctl', 'cat', target)
        result['timer:' + name] = hashlib.sha256(content).hexdigest()
    return result


def verify(expected, current):
    if expected != current:
        raise RuntimeError('scheduled_consumer_configuration_drift')


def main():
    mode, path = sys.argv[1:]
    current = fingerprint()
    if mode == 'seal':
        Path(path).write_text(json.dumps(current, sort_keys=True, indent=2) + '\n')
    elif mode == 'check':
        verify(json.loads(Path(path).read_text()), current)
    elif mode == 'test':
        verify(current, dict(current))
        try:
            verify(current, current | {'intentional-test-change': 'changed'})
        except RuntimeError:
            print(json.dumps({'status': 'PASS', 'fingerprintedDefinitions': len(current), 'driftRejected': True}))
            return
        raise RuntimeError('drift_detection_test_failed')
    else:
        raise RuntimeError('unsupported_guard_mode')
    print(json.dumps({'status': 'OK', 'fingerprintedDefinitions': len(current)}))


if __name__ == '__main__':
    try:
        main()
    except BaseException as error:
        print(json.dumps({'status': 'FAIL', 'code': str(error) if isinstance(error, RuntimeError) else type(error).__name__}))
        sys.exit(1)
