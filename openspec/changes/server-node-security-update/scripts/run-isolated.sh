#!/usr/bin/env bash
# Enter an already prepared disposable rootfs. Never mount production PM2_HOME.
set -euo pipefail
test "$(id -u)" -eq 0
rootfs=$1
shift
case "$rootfs" in /var/tmp/katuq-node22/*-d542/rootfs) ;; *) exit 64 ;; esac
test -d "$rootfs/workspace/api/node_modules"
test -f "$rootfs/ISOLATED-LAB"
if test "${KATUQ_INSIDE_NAMESPACE:-}" != yes; then
  exec timeout --signal=TERM --kill-after=10s 600s \
    unshare --mount --net --pid --fork --kill-child \
    env KATUQ_INSIDE_NAMESPACE=yes bash "$0" "$rootfs" "$@"
fi
mount --make-rprivate /
if test "${KATUQ_LAB_TOOLS:-}" = yes; then
  test -d "$rootfs/tools/usr/lib/gcc"
  mount -t overlay overlay -o "ro,lowerdir=$rootfs/tools/usr:/usr" "$rootfs/usr"
else
  mount --bind /usr "$rootfs/usr"
  mount -o remount,bind,ro "$rootfs/usr"
fi
mount --bind /opt/katuq-node/node-v22.23.4-linux-x64 "$rootfs/runtimes/node22"
mount -o remount,bind,ro "$rootfs/runtimes/node22"
mount --bind /usr/bin/node "$rootfs/runtimes/node20/bin/node"
mount -o remount,bind,ro "$rootfs/runtimes/node20/bin/node"
mount -t proc proc "$rootfs/proc"
for device in null zero urandom random; do
  mount --bind "/dev/$device" "$rootfs/dev/$device"
done
ip link set lo up
cd "$rootfs"
exec chroot "$rootfs" /usr/bin/env -i \
  PATH=/runtimes/node20/bin:/usr/bin:/bin \
  HOME=/root TMPDIR=/tmp LANG=C.UTF-8 \
  NODE_OPTIONS=--max-old-space-size=384 \
  GCLOUD_PROJECT=demo-katuq-node22 GOOGLE_CLOUD_PROJECT=demo-katuq-node22 \
  FIRESTORE_EMULATOR_HOST=127.0.0.1:9099 \
  /usr/bin/setpriv --bounding-set=-sys_admin,-sys_ptrace,-sys_rawio,-sys_module,-sys_chroot \
  /bin/bash "$@"
