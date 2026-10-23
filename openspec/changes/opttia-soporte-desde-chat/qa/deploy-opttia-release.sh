#!/usr/bin/env bash
# D-545: solo Opttia; backend Katuq/PM2/Hosting y configuración quedan intactos.
set -euo pipefail
umask 077
backup=${1:?Indica el respaldo privado validado por prepare-opttia-release.sh}
case "$backup" in /home/ubuntu/opttia-deploy-backups/d545.*) ;; *) exit 64 ;; esac
repo=/home/ubuntu/kai
branch=codex/opttia-support-tickets
exec 9>/tmp/kai-adk-deploy.lock
flock -n 9
test -d "$backup/candidate"
previous=$(<"$backup/previous-commit")
target=$(<"$backup/target-commit")
cd "$repo"
test "$previous" = 944c5e2c490d49170001284a5a1cdfe8812c743c
test "$target" = "$(git rev-parse 4a61ae4)"
test "$(git rev-parse HEAD)" = "$previous"
test "$(git rev-parse "origin/$branch")" = "$target"
test "$(git -C "$backup/candidate" rev-parse HEAD)" = "$target"
git -C "$backup/candidate" diff --quiet HEAD
git diff --cached --quiet
git diff --name-only HEAD | while IFS= read -r changed; do test "$changed" = adk_agent/data/waitlist.json; done
cmp -s adk_agent/.env "$backup/private.env"
cmp -s adk_agent/data/waitlist.json "$backup/waitlist.json"
grep -q '25 passed' "$backup/tests.log"
rollback() {
  printf 'D545_ROLLBACK previo=%s\n' "$previous"
  git switch --detach "$previous"
  sudo systemctl restart kai-adk
}
if git show-ref --verify --quiet "refs/heads/$branch"; then
  test "$(git rev-parse "$branch")" = "$target"
  git switch "$branch"
else
  git switch --create "$branch" --track "origin/$branch"
fi
test "$(git rev-parse HEAD)" = "$target"
cmp -s adk_agent/.env "$backup/private.env"
cmp -s adk_agent/data/waitlist.json "$backup/waitlist.json"
PYTHONPYCACHEPREFIX="$backup/live-pycache" adk_agent/venv/bin/python -m compileall -q adk_agent/endpoints/katuq_basic_chat_endpoint.py adk_agent/tools/katuq_authenticated_mcp.py adk_agent/services/katuq_support_chat.py
if ! sudo systemctl restart kai-adk; then rollback; exit 1; fi
healthy=false
for attempt in {1..45}; do
  if test "$(sudo systemctl is-active kai-adk)" = active && curl --silent --fail --output /dev/null --max-time 2 http://127.0.0.1:8080/health && curl --silent --fail --output /dev/null --max-time 3 https://back.katuq.com/adk/health; then healthy=true; break; fi
  if (( attempt % 5 == 0 )); then printf 'D545_HEALTH_WAIT intento=%s maximo=45\n' "$attempt"; fi
  sleep 2
done
if test "$healthy" != true; then rollback; exit 1; fi
cmp -s adk_agent/.env "$backup/private.env"
cmp -s adk_agent/data/waitlist.json "$backup/waitlist.json"
git diff --name-only HEAD | while IFS= read -r changed; do test "$changed" = adk_agent/data/waitlist.json; done
git rev-parse HEAD
sudo systemctl show kai-adk -p ActiveState -p SubState -p MainPID -p NRestarts
sha256sum adk_agent/endpoints/katuq_basic_chat_endpoint.py adk_agent/tools/katuq_authenticated_mcp.py adk_agent/services/katuq_support_chat.py
printf 'D545_DEPLOYED backup=%s\n' "$backup"
