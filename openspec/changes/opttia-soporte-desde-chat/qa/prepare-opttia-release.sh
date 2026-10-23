#!/usr/bin/env bash
# D-545: ejecutar solo en EC2 autorizada. No cambia código vivo ni reinicia.
set -euo pipefail
umask 077
repo=/home/ubuntu/kai
previous=944c5e2c490d49170001284a5a1cdfe8812c743c
expected=4a61ae4
branch=codex/opttia-support-tickets
cd "$repo"
test "$(git rev-parse HEAD)" = "$previous"
test "$(git branch --show-current)" = feat/claude-agent-sdk
test "$(sudo systemctl is-active kai-adk)" = active
git diff --name-only HEAD | while IFS= read -r changed; do
  test "$changed" = adk_agent/data/waitlist.json
done
git diff --cached --quiet
git fetch origin "$branch"
target=$(git rev-parse "origin/$branch")
test "$(git rev-parse "$expected")" = "$target"
git merge-base --is-ancestor "$previous" "$target"
actual=$(git diff --name-only "$previous" "$target" | sort)
allowed=$(printf '%s\n' adk_agent/docs/KATUQ_SUPPORT_RELEASE.md adk_agent/endpoints/katuq_basic_chat_endpoint.py adk_agent/tools/katuq_authenticated_mcp.py adk_agent/services/katuq_support_chat.py adk_agent/tests/test_katuq_support_chat.py adk_agent/scripts/test_katuq_support_offline.py | sort)
test "$actual" = "$allowed"
backup=$(mktemp -d /home/ubuntu/opttia-deploy-backups/d545.XXXXXX)
git rev-parse HEAD > "$backup/previous-commit"
git branch --show-current > "$backup/previous-branch"
git status --porcelain=v1 > "$backup/status-before"
git diff --binary -- adk_agent/data/waitlist.json > "$backup/waitlist.patch"
cp -p adk_agent/data/waitlist.json "$backup/waitlist.json"
cp -p adk_agent/.env "$backup/private.env"
sudo systemctl cat kai-adk > "$backup/kai-adk.unit"
sudo systemctl show kai-adk -p MainPID -p NRestarts -p ActiveState > "$backup/service-before"
git archive --format=tar.gz "$previous" -- adk_agent/endpoints/katuq_basic_chat_endpoint.py adk_agent/tools/katuq_authenticated_mcp.py > "$backup/previous-sources.tar.gz"
printf '%s\n' "$target" > "$backup/target-commit"
git worktree add --detach "$backup/candidate" "$target"
python="$repo/adk_agent/venv/bin/python"
cd "$backup/candidate/adk_agent"
PYTHONPYCACHEPREFIX="$backup/pycache" "$python" -m compileall -q endpoints/katuq_basic_chat_endpoint.py tools/katuq_authenticated_mcp.py services/katuq_support_chat.py
PYTHONPYCACHEPREFIX="$backup/pycache" "$python" scripts/test_katuq_support_offline.py -q tests/test_katuq_support_chat.py tests/test_katuq_basic_chat.py tests/test_katuq_access_policy.py > "$backup/tests.log" 2>&1
tail -n 16 "$backup/tests.log"
cd "$repo"
test "$(git rev-parse HEAD)" = "$previous"
cmp -s adk_agent/data/waitlist.json "$backup/waitlist.json"
cmp -s adk_agent/.env "$backup/private.env"
git diff --check
printf 'D545_PREPARED backup=%s target=%s\n' "$backup" "$target"
