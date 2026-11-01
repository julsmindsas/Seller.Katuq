#!/usr/bin/env python3
"""One-shot, fail-closed Node runtime cutover and independent recovery.

No application code, package versions, credentials or business data are changed.
All subprocess output is private; the journal contains operation names only.
The same executor is exercised inside the existing isolated Linux laboratory.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error


def require(ok, code):
    if not ok:
        raise RuntimeError(code)


def sha(file):
    h = hashlib.sha256()
    with open(file, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def atomic(file, data, uid=0, gid=0, mode=0o600):
    file = Path(file)
    file.parent.mkdir(parents=True, exist_ok=True)
    tmp = file.with_name(file.name + '.node22-next-' + str(os.getpid()))
    try:
        with open(tmp, 'xb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(tmp, mode)
        os.chown(tmp, uid, gid)
        os.replace(tmp, file)
        fd = os.open(file.parent, os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    finally:
        tmp.unlink(missing_ok=True)


def put(file, value):
    atomic(file, (json.dumps(value, sort_keys=True, indent=2) + '\n').encode())


def load(file):
    return json.loads(Path(file).read_text())


def alive(pid):
    try:
        return Path('/proc', str(pid), 'stat').read_text().split(') ', 1)[1][0] != 'Z'
    except (OSError, IndexError):
        return False


def identity(pid):
    return Path('/proc', str(pid), 'stat').read_text().split(') ', 1)[1].split()[19]


def transform(entries, node):
    entries = json.loads(json.dumps(entries))
    names = set()
    for app in entries:
        name = app['name']
        require(re.fullmatch('[A-Za-z0-9_-]+', name) and name not in names, 'invalid_app_names')
        names.add(name)
        old = app.get('exec_interpreter')
        require(not old or old == 'node' or old.endswith('/node'), 'unexpected_interpreter')
        app['exec_interpreter'] = node
        def prepend(value):
            directory = str(Path(node).parent)
            return ':'.join([directory] + [p for p in (value or '/usr/bin:/bin').split(':') if p != directory])
        app['PATH'] = prepend(app.get('PATH') or app.get('env', {}).get('PATH'))
        if 'env' in app:
            app['env']['PATH'] = prepend(app['env'].get('PATH') or app['PATH'])
    return entries


class Runner:
    def __init__(self, config):
        self.config_file = Path(config).resolve()
        self.c = load(self.config_file)
        self.ops = Path(self.c['ops'])
        self.statefile = self.ops / 'state.json'
        self.sealfile = self.ops / 'seal.json'
        self.lab = self.c.get('laboratory', False)
        require(os.geteuid() == 0, 'root_required')
        require(not self.lab or Path('/ISOLATED-LAB').exists(), 'laboratory_marker_required')
        require(self.lab or str(self.ops).startswith('/opt/katuq-node/operations/'), 'private_ops_path_required')
        require(self.ops.stat().st_uid == 0 and not self.ops.stat().st_mode & 0o022, 'unsafe_operations_directory')
        self.groups = self.c['groups']
        self.s = load(self.statefile) if self.statefile.exists() else {'phase': 'prepared', 'touched': [], 'persistence': []}

    def command(self, args, timeout=15, **kwargs):
        # Do not include args or child output in exceptions: env/dumps can contain secrets.
        child = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs)
        tracked = self.s.get('runnerPid') == os.getpid()
        try:
            if tracked:
                self.state(commandPid=child.pid, commandIdentity=identity(child.pid))
            output, _ = child.communicate(timeout=timeout)
            require(child.returncode == 0, 'command_failed_' + Path(args[0]).name)
            return output
        except BaseException:
            if child.poll() is None:
                child.kill()
                child.communicate(timeout=3)
            raise
        finally:
            if tracked:
                self.state(commandPid=None, commandIdentity=None)

    def cleanup_command(self):
        pid = self.s.get('commandPid')
        if pid and pid != self.s.get('runnerPid') and alive(pid) and identity(pid) == self.s.get('commandIdentity'):
            os.kill(pid, signal.SIGKILL)
            end = time.monotonic() + 3
            while alive(pid) and time.monotonic() < end:
                time.sleep(0.1)
            require(not alive(pid), 'orphaned_executor_command')
        self.state(commandPid=None, commandIdentity=None)

    def event(self, operation, **fields):
        with open(self.ops / 'journal.jsonl', 'a') as stream:
            stream.write(json.dumps({'at': time.time(), 'operation': operation, **fields}) + '\n')

    def state(self, **values):
        self.s.update(values, heartbeat=time.time())
        put(self.statefile, self.s)

    def pause(self, seconds):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            self.state()
            time.sleep(min(2, max(0, end - time.monotonic())))

    def lock(self, blocking=False):
        self.lockfile = open(self.c['lock'], 'a')
        fcntl.flock(self.lockfile, fcntl.LOCK_EX | (0 if blocking else fcntl.LOCK_NB))

    def pid(self, group):
        file = Path(group['home'], 'pm2.pid')
        return int(file.read_text().strip()) if file.exists() else 0

    def process_hash(self, pid):
        owner = Path('/proc', str(pid)).stat().st_uid
        if owner == 0:
            return sha(f'/proc/{pid}/exe')
        code = "import hashlib,sys;print(hashlib.sha256(open('/proc/'+sys.argv[1]+'/exe','rb').read()).hexdigest())"
        return self.command(['/usr/bin/python3', '-c', code, str(pid)], timeout=5, user=owner, group=owner, extra_groups=[]).decode().strip()

    def verify_credentials(self, pid, group):
        fields = dict(line.split(':', 1) for line in Path('/proc', str(pid), 'status').read_text().splitlines() if ':' in line)
        require(all(int(v) == group['uid'] for v in fields['Uid'].split()), 'process_uid_changed')
        require(all(int(v) == group['gid'] for v in fields['Gid'].split()), 'process_gid_changed')
        require(sorted(map(int, fields['Groups'].split())) == sorted(group['supplementaryGids']), 'process_supplementary_groups_changed')

    def pm2(self, group, node, args, starting=False, timeout=15):
        if not starting:
            require(alive(self.pid(group)), 'daemon_missing_' + group['name'])
        env = dict(os.environ, PM2_HOME=group['home'], HOME=group['userHome'],
                   USER=group['name'], LOGNAME=group['name'], PWD=group['userHome'],
                   PATH=str(Path(node).parent) + ':/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                   PM2_NO_INTERACTION='true')
        result = self.command([node, self.c['cli'], *args], timeout=timeout,
                              env=env, user=group['uid'], group=group['gid'], extra_groups=group['supplementaryGids'], cwd=group['userHome'])
        self.event('pm2_' + args[0], group=group['name'])
        return result

    def rows(self, group, node):
        return json.loads(self.pm2(group, node, ['jlist']))

    def inventory(self):
        out = {}
        for group in self.groups:
            rows = self.rows(group, self.c['node20'])
            require({r['name'] for r in rows} == {*group['apps'], 'pm2-logrotate'}, 'unexpected_process_list')
            daemon = self.pid(group)
            self.verify_credentials(daemon, group)
            require(Path('/proc', str(daemon)).stat().st_uid == group['uid'], 'daemon_owner_mismatch')
            data = {'daemonPid': daemon, 'daemonHash': self.process_hash(daemon), 'processes': []}
            for row in sorted(rows, key=lambda r: r['name']):
                e, pid = row['pm2_env'], row['pid']
                require(pid > 0 and alive(pid) and e['status'] == 'online', 'baseline_process_not_healthy')
                self.verify_credentials(pid, group)
                config = {k: e.get(k) for k in ['name', 'pm_exec_path', 'pm_cwd', 'exec_interpreter', 'exec_mode',
                          'node_args', 'args', 'env', 'PATH', 'instances', 'wait_ready', 'kill_timeout',
                          'listen_timeout', 'max_memory_restart', 'autorestart', 'watch']}
                data['processes'].append({'name': row['name'], 'pid': pid, 'hash': self.process_hash(pid),
                                          'restarts': e.get('restart_time'),
                                          'configHash': hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()})
            out[group['name']] = data
        return out

    def trees(self):
        h = hashlib.sha256()
        count = 0
        tested = load(self.c['testedManifest'])['manifest'] if self.c.get('testedManifest') else {}
        seen = set()
        for dirname in self.c['treeRoots']:
            root = Path(dirname)
            for parent, dirs, files in os.walk(root):
                relative = Path(parent).relative_to(root)
                dirs[:] = sorted(d for d in dirs if d != '.git' and not (relative == Path('.') and d == 'logs'))
                for name in sorted(files):
                    p = Path(parent, name)
                    if name.endswith(('.log', '.pyc')) or name.startswith('._'):
                        continue
                    if p.is_symlink():
                        item = [str(p), 'symlink', os.readlink(p)]
                        if str(p) in tested:
                            require(tested[str(p)].get('link') == os.readlink(p), 'tested_symlink_changed')
                            seen.add(str(p))
                    elif p.is_file():
                        st = p.stat()
                        digest = sha(p)
                        # The only approved content change within application trees is re2.
                        if str(p) == self.c['native']['path'] and digest == self.c['native']['candidateHash']:
                            digest = self.c['native']['originalHash']
                        item = [str(p), st.st_uid, st.st_gid, st.st_mode & 0o777, digest]
                        if str(p) in tested:
                            require(tested[str(p)].get('sha256') == digest, 'tested_file_changed')
                            seen.add(str(p))
                    else:
                        continue
                    h.update(json.dumps(item).encode())
                    count += 1
                    if count % 1000 == 0 and self.statefile.exists() and self.s.get('runnerPid') == os.getpid():
                        self.state()
        require(seen == set(tested), 'tested_files_missing_from_current_tree')
        return {'sha256': h.hexdigest(), 'files': count}

    def fixed(self):
        out = {}
        for name in self.c['fixedFiles']:
            p = Path(name)
            out[name] = {'sha256': sha(p), 'uid': p.stat().st_uid, 'mode': p.stat().st_mode & 0o777} if p.exists() else None
        return out

    def node_processes(self):
        out = set()
        for p in Path('/proc').iterdir():
            if not p.name.isdigit():
                continue
            try:
                exe = Path(os.readlink(p / 'exe')).name.removesuffix(' (deleted)')
                if exe in ['node', 'nodejs'] and alive(int(p.name)):
                    out.add(int(p.name))
            except OSError:
                pass
        for uid in {g['uid'] for g in self.groups} - {0}:
            code = """import pathlib,os,json
out=[]
for p in pathlib.Path('/proc').iterdir():
 if p.name.isdigit():
  try:
   if pathlib.Path(os.readlink(p/'exe')).name.removesuffix(' (deleted)') in ['node','nodejs']:out.append(int(p.name))
  except OSError:pass
print(json.dumps(out))
"""
            out.update(json.loads(self.command(['/usr/bin/python3', '-c', code], user=uid, group=uid, extra_groups=[])))
        return out

    def host(self):
        if self.lab:
            return
        require(socket.gethostbyname(self.c['dns']) == self.c['ip'], 'dns_host_changed')
        require(Path('/etc/machine-id').read_text().strip() == self.c['machineId'], 'machine_changed')
        require(self.command(['timedatectl', 'show', '-p', 'NTPSynchronized', '--value']).strip() == b'yes', 'clock_unsynchronized')
        for unit in ['nginx', 'kai-adk']:
            require(self.command(['systemctl', 'is-active', unit]).strip() == b'active', 'dependent_service_inactive')
        available = int(next(s.split()[1] for s in Path('/proc/meminfo').read_text().splitlines() if s.startswith('MemAvailable:')))
        require(available >= 220000, 'insufficient_memory')
        require(shutil.disk_usage(self.ops).free >= 500 * 1024 * 1024, 'insufficient_disk')
        # Known deployment tools on this host. The maintenance lock also excludes cooperating operators.
        for proc in Path('/proc').iterdir():
            if not proc.name.isdigit():
                continue
            try:
                comm = (proc / 'comm').read_text().strip()
                require(comm not in ['git', 'npm', 'apt', 'apt-get', 'dpkg', 'tsc', 'firebase'], 'concurrent_deployment')
            except OSError:
                pass

    def http(self):
        for item in self.c['http']:
            try:
                with urllib.request.urlopen(item['url'], timeout=3) as response:
                    status = response.status
                    if item.get('jsonKeys'):
                        value = json.loads(response.read(3 * 1024 * 1024))
                        require(all(k in value for k in item['jsonKeys']), 'functional_http_shape')
            except urllib.error.HTTPError as error:
                status = error.code
            require(status == item['status'], 'http_health_' + item['name'])

    def schedulers(self):
        if not self.c.get('schedulerProbe'):
            return {'success': True, 'checkedAt': time.time() * 1000, 'items': []}
        raw = self.command([self.c['node22'], self.c['schedulerProbe'], self.c['apiFunctions']], timeout=13)
        data = json.loads(raw)
        require(data.get('success') is True, 'scheduler_probe_failed')
        return data

    def seal(self):
        self.host()
        inventory = self.inventory()
        expected = {p['pid'] for g in inventory.values() for p in g['processes']} | {g['daemonPid'] for g in inventory.values()}
        require(self.node_processes() == expected, 'unowned_node_process')
        require(sha(self.c['node22']) == self.c['node22Hash'], 'candidate_runtime_hash')
        require(sha(self.c['node20']) == self.c['node20Hash'], 'rollback_runtime_hash')
        require(sha(self.c['native']['candidate']) == self.c['native']['candidateHash'], 'candidate_native_hash')
        require(sha(self.c['native']['path']) == self.c['native']['originalHash'], 'original_native_hash')
        self.http()
        data = {'inventory': inventory, 'trees': self.trees(), 'fixed': self.fixed(),
                'schedulers': self.schedulers(), 'at': time.time(),
                'scripts': {str(p): sha(p) for p in self.ops.iterdir() if p.suffix in ['.py', '.cjs']},
                'configHash': sha(self.config_file)}
        put(self.sealfile, data)
        self.event('sealed', files=data['trees']['files'])
        return data

    def preflight(self):
        seal = load(self.sealfile)
        require(sha(self.config_file) == seal['configHash'], 'configuration_changed_after_seal')
        require(all(sha(p) == h for p, h in seal['scripts'].items()), 'executor_changed_after_seal')
        self.host()
        require(self.inventory() == seal['inventory'], 'process_or_configuration_drift')
        require(self.trees() == seal['trees'], 'code_dependency_or_module_drift')
        require(self.fixed() == seal['fixed'], 'startup_or_global_runtime_drift')
        expected = {p['pid'] for g in seal['inventory'].values() for p in g['processes']} | {g['daemonPid'] for g in seal['inventory'].values()}
        require(self.node_processes() == expected, 'unowned_node_process')
        self.http()
        current = self.schedulers()
        require([i['idHash'] for i in current['items']] == [i['idHash'] for i in seal['schedulers']['items']], 'scheduler_configuration_drift')
        self.event('preflight_pass')

    def snapshot(self):
        backup = self.ops / 'backup'
        backup.mkdir(mode=0o700, exist_ok=False)
        for group in self.groups:
            target = backup / group['name']
            target.mkdir(mode=0o700)
            for name in ['dump.pm2', 'dump.pm2.bak', 'module_conf.json']:
                p = Path(group['home'], name)
                if p.exists():
                    shutil.copy2(p, target / (name + '.before'))
                    os.chmod(target / (name + '.before'), 0o600)
            self.pm2(group, self.c['node20'], ['save'])
            raw = Path(group['home'], 'dump.pm2').read_bytes()
            put(target / 'jlist.private.json', self.rows(group, self.c['node20']))
            entries = json.loads(raw)
            require({p['name'] for p in entries} == set(group['apps']), 'incomplete_live_snapshot')
            atomic(target / 'runtime20.json', raw)
            self.command(['tar', '-cf', str(target / 'modules.tar'), '-C', group['home'], 'modules'], timeout=30)
        require(sha(self.c['native']['path']) == self.c['native']['originalHash'], 'native_drift_before_backup')
        shutil.copy2(self.c['native']['path'], backup / 'native.original')
        require(sha(backup / 'native.original') == self.c['native']['originalHash'], 'native_backup_integrity')
        os.chmod(backup / 'native.original', 0o600)
        persistence = {}
        for p in self.c['persistence']:
            file = Path(p['path'])
            st = file.stat() if file.exists() else None
            persistence[str(file)] = {'exists': st is not None, 'uid': st.st_uid if st else 0,
                                     'gid': st.st_gid if st else 0, 'mode': st.st_mode & 0o777 if st else 0o644,
                                     'bytes': file.read_bytes().hex() if st else None}
        put(backup / 'persistence.private.json', persistence)
        put(backup / 'checksums.json', {str(p.relative_to(backup)): sha(p) for p in backup.rglob('*') if p.is_file()})
        self.verify_backup()
        self.event('fresh_backup_verified')

    def verify_backup(self):
        root = self.ops / 'backup'
        require(all(sha(root / p) == h for p, h in load(root / 'checksums.json').items()), 'backup_integrity_failure')

    def dump(self, group, entries):
        data = (json.dumps(entries, indent=2) + '\n').encode()
        for name in ['dump.pm2', 'dump.pm2.bak']:
            atomic(Path(group['home'], name), data, group['uid'], group['gid'])

    def stop(self, group):
        daemon = self.pid(group)
        if not alive(daemon):
            # Recovery must never create a daemon merely to inspect it.
            require(not any(Path('/proc', str(p)).stat().st_uid == group['uid'] for p in self.node_processes()),
                    'orphan_consumer_with_daemon_absent')
            return
        rows = self.rows(group, self.c['node20'])
        require({r['name'] for r in rows} <= {*group['apps'], 'pm2-logrotate'}, 'unexpected_process_during_stop')
        old_pids = [r['pid'] for r in rows if r['pid']]
        log = Path(group['home'], 'pm2.log')
        offset = log.stat().st_size if log.exists() else 0
        for name in [*reversed(group['apps']), 'pm2-logrotate']:
            row = next((r for r in rows if r['name'] == name), None)
            if row and row['pid'] and alive(row['pid']):
                self.pm2(group, self.c['node20'], ['stop', name], timeout=20)
                require(not alive(row['pid']), 'consumer_not_drained')
        self.pm2(group, self.c['node20'], ['kill'], timeout=15)
        end = time.monotonic() + 3
        while alive(daemon) and time.monotonic() < end:
            time.sleep(0.1)
        require(not alive(daemon) and all(not alive(p) for p in old_pids), 'orphaned_consumer')
        require(not any(Path('/proc', str(p)).stat().st_uid == group['uid'] for p in self.node_processes()),
                'unowned_consumer_after_daemon_stop')
        if log.exists():
            with open(log, 'rb') as stream:
                stream.seek(offset)
                require(b'SIGKILL' not in stream.read(), 'forced_shutdown_detected')

    def native(self, source, wanted):
        target = Path(self.c['native']['path'])
        require(not target.is_symlink(), 'native_symlink_not_approved')
        require(sha(source) == wanted, 'native_source_integrity')
        n = self.c['native']
        if wanted == n['candidateHash']:
            require(sha(target) == n['originalHash'], 'native_drift_before_install')
        atomic(target, Path(source).read_bytes(), n['uid'], n['gid'], n['mode'])
        require(sha(target) == wanted, 'native_install_integrity')
        self.event('native_installed', sha256=wanted)

    def log_offsets(self, group):
        out = {}
        for row in load(self.ops / 'backup' / group['name'] / 'jlist.private.json'):
            for key in ['pm_out_log_path', 'pm_err_log_path']:
                file = row['pm2_env'].get(key)
                if file:
                    p = Path(file)
                    st = p.stat() if p.exists() else None
                    out[file] = {'size': st.st_size if st else 0, 'inode': st.st_ino if st else None}
        return out

    def fresh_logs(self, file):
        p = Path(file)
        if not p.exists():
            return ''
        old = self.s.get('logOffsets', {}).get(file, {'size': 0, 'inode': None})
        start = old['size'] if old['inode'] == p.stat().st_ino and p.stat().st_size >= old['size'] else 0
        with open(p, 'rb') as stream:
            stream.seek(start)
            return stream.read(8 * 1024 * 1024).decode(errors='replace')

    def process_health(self, group, node, names=None):
        wanted = sha(node)
        daemon = self.pid(group)
        require(alive(daemon) and self.process_hash(daemon) == wanted, 'daemon_effective_runtime')
        self.verify_credentials(daemon, group)
        rows = self.rows(group, node)
        expected = {*names, 'pm2-logrotate'} if names is not None else {*group['apps'], 'pm2-logrotate'}
        require({r['name'] for r in rows} == expected, 'process_list_incomplete_or_duplicate')
        for row in rows:
            pid, e = row['pid'], row['pm2_env']
            require(pid and alive(pid) and e['status'] == 'online', 'process_not_live')
            self.verify_credentials(pid, group)
            require(self.process_hash(pid) == wanted, 'child_effective_runtime')
            require(Path('/proc', str(pid)).stat().st_uid == group['uid'], 'child_owner_changed')
            require(e.get('node_version') == ('20.20.0' if node == self.c['node20'] else '22.23.4'), 'reported_runtime_mismatch')
            for key in ['pm_out_log_path', 'pm_err_log_path']:
                file = e.get(key)
                if file and file in self.s.get('logOffsets', {}):
                    text = self.fresh_logs(file)
                    require(not re.search(self.c['criticalLogPattern'], text, re.I), 'new_critical_application_error')
            if row['name'] in group.get('bootstrap', {}):
                text = self.fresh_logs(e['pm_out_log_path'])
                for pattern in group['bootstrap'][row['name']]:
                    require(len(re.findall(pattern, text)) == 1, 'bootstrap_not_ready_or_duplicated')
            for item in group.get('appHttp', {}).get(row['name'], []):
                try:
                    response = urllib.request.urlopen(item['url'], timeout=2)
                    status = response.status
                    response.close()
                except urllib.error.HTTPError as error:
                    status = error.code
                require(status == item['status'], 'application_listener_not_ready')
            if row['name'] in group.get('requireRemoteTcp', []):
                inodes = set()
                for fd in Path('/proc', str(pid), 'fd').iterdir():
                    try:
                        match = re.fullmatch(r'socket:\[(\d+)\]', os.readlink(fd))
                        if match:
                            inodes.add(match[1])
                    except OSError:
                        pass
                connected = False
                for protocol in ['tcp', 'tcp6']:
                    for line in Path('/proc', str(pid), 'net', protocol).read_text().splitlines()[1:]:
                        values = line.split()
                        if values[3] == '01' and values[9] in inodes and values[2].endswith(':01BB'):
                            connected = True
                require(connected, 'watcher_remote_connection_not_ready')
        return {r['name']: {'pid': r['pid'], 'restarts': r['pm2_env'].get('restart_time')} for r in rows}

    def start(self, group, node):
        entries = load(self.ops / 'backup' / group['name'] / 'runtime20.json')
        entries = transform(entries, node)
        offsets = self.s.get('logOffsets', {}) | self.log_offsets(group)
        self.state(logOffsets=offsets)
        started = []
        anchors = {}
        for name in group['apps']:
            self.dump(group, [next(e for e in entries if e['name'] == name)])
            self.pm2(group, node, ['resurrect'], starting=True, timeout=25)
            started.append(name)
            while True:
                require(time.time() <= self.s['deadline'], 'group_recovery_deadline')
                try:
                    current = self.process_health(group, node, started)
                    require(all(current.get(name) == value for name, value in anchors.items()), 'unexpected_restart_or_pid_change')
                    anchors = current
                    break
                except (RuntimeError, OSError) as failure:
                    if isinstance(failure, RuntimeError) and str(failure) in ['new_critical_application_error', 'unexpected_restart_or_pid_change']:
                        raise
                    self.pause(1)
        self.pm2(group, node, ['save'])
        final = load(Path(group['home'], 'dump.pm2'))
        require({r['name'] for r in final} == set(group['apps']), 'saved_list_incomplete')
        self.dump(group, final)
        return anchors

    def healthy(self):
        observed = {}
        expected_pids = {self.pid(g) for g in self.groups}
        for group in self.groups:
            node = self.c['node22'] if group['name'] in self.s.get('migrated', []) else self.c['node20']
            if group['name'] not in self.s.get('touched', []):
                # Root daemon originally runs an older deleted inode: verify its original inventory.
                before = load(self.sealfile)['inventory'][group['name']]
                require(self.inventory()[group['name']] == before, 'untouched_group_changed')
                expected_pids.update(p['pid'] for p in before['processes'])
            else:
                observed[group['name']] = self.process_health(group, node)
                anchor = self.s.get('processAnchors', {}).get(group['name'])
                if anchor is not None:
                    require(observed[group['name']] == anchor, 'unexpected_restart_or_pid_change')
                expected_pids.update(p['pid'] for p in observed[group['name']].values())
        require(self.node_processes() == expected_pids, 'unowned_or_duplicate_node_process')
        self.http()
        return observed

    def observe(self, duration):
        end = time.monotonic() + duration
        previous, failures = None, 0
        while True:
            self.state(deadline=None)
            try:
                current = self.healthy()
                if previous is not None:
                    require(current == previous, 'unexpected_restart_or_pid_change')
                previous = current
                failures = 0
            except Exception as error:
                if isinstance(error, RuntimeError) and str(error) in ['new_critical_application_error', 'unexpected_restart_or_pid_change']:
                    raise
                failures += 1
                require(failures < 3, 'three_consecutive_health_failures')
            if time.monotonic() >= end:
                require(failures == 0, 'final_health_failed')
                return
            self.pause(min(self.c.get('pollSeconds', 5), max(0, end - time.monotonic())))

    def persist(self):
        original = load(self.ops / 'backup' / 'persistence.private.json')
        for item in self.c['persistence']:
            target = item['path']
            saved, path = original[target], Path(target)
            require(path.exists() == saved['exists'], 'concurrent_startup_change')
            if saved['exists']:
                require(path.read_bytes().hex() == saved['bytes'], 'concurrent_startup_change')
            self.state(persistence=[*self.s['persistence'], target])
            atomic(target, item['content'].encode(), mode=item['mode'])
        if not self.lab:
            self.command(['systemd-analyze', 'verify', 'pm2-root.service', 'pm2-ubuntu.service'], timeout=15)
            self.command(['systemctl', 'daemon-reload'], timeout=15)
            for prefix in [[], ['sudo', '-H', '-u', 'ubuntu']]:
                resolved = self.command([*prefix, 'sh', '-c', 'command -v pm2']).decode().strip()
                require(resolved == '/usr/local/bin/pm2', 'pm2_launcher_resolution')
        self.event('persistence_installed_without_service_restart')

    def rollback(self, reason):
        if not self.s.get('touched'):
            if self.s.get('phase') == 'preflight':
                self.state(phase='not_started', reason=reason, deadline=None)
            return
        if self.s.get('phase') in ['completed', 'reverted', 'rollback_failed']:
            return
        require(not self.s.get('rollbackAttempted'), 'recovery_already_attempted')
        self.state(phase='rolling_back', rollbackAttempted=True, reason=reason,
                   runnerPid=os.getpid(), runnerIdentity=identity(os.getpid()))
        self.verify_backup()
        failures = []
        for group in reversed(self.groups):
            if group['name'] not in self.s['touched']:
                continue
            try:
                self.state(deadline=time.time() + 180)
                self.stop(group)
                if group.get('nativeConsumer'):
                    self.native(self.ops / 'backup' / 'native.original', self.c['native']['originalHash'])
                conf = self.ops / 'backup' / group['name'] / 'module_conf.json.before'
                if conf.exists():
                    atomic(Path(group['home'], 'module_conf.json'), conf.read_bytes(), group['uid'], group['gid'])
                self.start(group, self.c['node20'])
                require(time.time() <= self.s['deadline'], 'rollback_budget_exceeded')
                self.event('group_reverted', group=group['name'])
            except Exception:
                failures.append(group['name'])
        original = load(self.ops / 'backup' / 'persistence.private.json')
        for name in reversed(self.s.get('persistence', [])):
            try:
                item = original[name]
                if item['exists']:
                    atomic(name, bytes.fromhex(item['bytes']), item['uid'], item['gid'], item['mode'])
                else:
                    Path(name).unlink(missing_ok=True)
            except Exception:
                failures.append('persistence')
        if self.s.get('persistence') and not self.lab:
            try:
                self.command(['systemctl', 'daemon-reload'])
            except Exception:
                failures.append('daemon_reload')
        try:
            self.http()
        except Exception:
            failures.append('http')
        self.state(phase='rollback_failed' if failures else 'reverted', deadline=None, rollbackFailures=failures)
        self.event(self.s['phase'], failures=failures)

    def execute(self):
        self.lock()
        require(self.s['phase'] == 'prepared', 'one_shot_already_attempted')
        now = time.time()
        require(self.lab or self.c['windowStart'] <= now <= self.c['windowStart'] + 300, 'outside_authorized_window')
        self.state(phase='preflight', runnerPid=os.getpid(), runnerIdentity=identity(os.getpid()), deadline=None)
        try:
            self.preflight()
            self.observe(self.c['baselineSeconds'])
            self.snapshot()
            # Snapshot save must not have restarted any process.
            require(self.inventory() == load(self.sealfile)['inventory'], 'drift_while_backing_up')
            self.state(schedulerBaseline=self.schedulers())
            for group in self.groups:
                self.host()
                require(self.trees() == load(self.sealfile)['trees'], 'code_drift_between_groups')
                budget = self.c.get('laboratoryMigrationSeconds', 90) if self.lab else 90
                self.state(phase='migrating', currentGroup=group['name'], deadline=time.time() + budget,
                           touched=[*self.s['touched'], group['name']])
                self.event('group_cutover_started', group=group['name'], deadline=self.s['deadline'])
                self.stop(group)
                if group.get('nativeConsumer'):
                    self.native(self.c['native']['candidate'], self.c['native']['candidateHash'])
                anchors = self.start(group, self.c['node22'])
                self.state(migrated=[*self.s.get('migrated', []), group['name']],
                           processAnchors=self.s.get('processAnchors', {}) | {group['name']: anchors})
                require(time.time() <= self.s['deadline'], 'migration_budget_exceeded')
                self.event('group_migrated', group=group['name'])
                self.observe(self.c['betweenGroupsSeconds'] if group != self.groups[-1] else 0)
            self.persist()
            self.state(phase='observing', observationStart=time.time())
            self.observe(self.c['observationSeconds'])
            require(self.trees() == load(self.sealfile)['trees'], 'code_drift_during_observation')
            current = self.schedulers()
            before = self.s['schedulerBaseline']
            require([i['idHash'] for i in current['items']] == [i['idHash'] for i in before['items']], 'scheduler_configuration_changed')
            healthy_before = [i for i in before['items'] if i['frequentIntervalMs'] and i['lastMs'] and
                              before['checkedAt'] - i['lastMs'] <= 1.5 * i['frequentIntervalMs']]
            after = {i['idHash']: i for i in current['items']}
            if self.c['observationSeconds'] >= 900:
                require(all((after[i['idHash']]['lastMs'] or 0) > i['lastMs'] for i in healthy_before), 'scheduler_tick_not_observed')
            self.state(phase='completed', deadline=None, completedAt=time.time(), schedulerTicksVerified=len(healthy_before))
            self.event('completed')
        except BaseException as error:
            code = str(error) if isinstance(error, RuntimeError) else type(error).__name__
            self.event('failure', code=code)
            if self.s.get('touched'):
                self.rollback(code)
            else:
                self.state(phase='not_started', reason=code, deadline=None)
            raise

    def watchdog(self):
        # Independent process/unit: no dependency on the SSH connection or the runner.
        end = time.time() + self.c.get('watchdogMaxSeconds', 2400)
        while time.time() < end:
            if self.statefile.exists():
                state = load(self.statefile)
                if not self.lab and state['phase'] == 'prepared' and time.time() > self.c['windowStart'] + 120:
                    self.s = state
                    self.state(phase='not_started', reason='executor_did_not_start', deadline=None)
                    self.event('executor_did_not_start')
                    return
                if state['phase'] in ['completed', 'reverted', 'not_started', 'rollback_failed']:
                    return
                deadline = state.get('deadline')
                stalled = time.time() - state.get('heartbeat', time.time()) > 60
                overdue = deadline and time.time() > deadline + 2
                if state['phase'] != 'rolling_back' and (overdue or stalled):
                    pid = state.get('runnerPid')
                    if pid and alive(pid) and identity(pid) == state.get('runnerIdentity'):
                        os.kill(pid, signal.SIGTERM)
                        time.sleep(5)
                        latest = load(self.statefile)
                        if latest['phase'] in ['completed', 'reverted', 'not_started', 'rollback_failed']:
                            return
                        if latest['phase'] == 'rolling_back':
                            continue
                        if alive(pid) and identity(pid) == state.get('runnerIdentity'):
                            os.kill(pid, signal.SIGKILL)
                    recovery = Runner(self.config_file)
                    recovery.lock(blocking=True)
                    recovery.s = load(recovery.statefile)
                    recovery.cleanup_command()
                    recovery.rollback('independent_watchdog')
                    return
            time.sleep(2)
        raise RuntimeError('watchdog_window_exhausted')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    parser.add_argument('mode', choices=['seal', 'preflight', 'execute', 'recover', 'watchdog'])
    args = parser.parse_args()
    os.umask(0o077)
    runner = Runner(args.config)
    if args.mode in ['seal', 'preflight']:
        runner.lock()
        getattr(runner, args.mode)()
    elif args.mode == 'recover':
        runner.lock(blocking=True)
        runner.s = load(runner.statefile) if runner.statefile.exists() else runner.s
        if runner.s.get('phase') not in ['completed', 'reverted', 'not_started', 'rollback_failed', 'prepared']:
            runner.cleanup_command()
        runner.rollback('systemd_stop_post')
    elif args.mode == 'watchdog':
        runner.watchdog()
    else:
        def interrupted(signum, frame):
            raise RuntimeError('executor_interrupted')
        signal.signal(signal.SIGTERM, interrupted)
        signal.signal(signal.SIGINT, interrupted)
        runner.execute()


if __name__ == '__main__':
    try:
        main()
        print(json.dumps({'status': 'OK'}))
    except BaseException as failure:
        # Never render an arbitrary child exception/traceback with private args.
        print(json.dumps({'status': 'FAIL', 'code': str(failure) if isinstance(failure, RuntimeError) else type(failure).__name__}))
        sys.exit(1)
