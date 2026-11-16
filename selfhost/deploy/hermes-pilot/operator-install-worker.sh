#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly STAGE=/root/schmaqq-hermes-agent-stage
readonly APP=/opt/schmaqq-hermes-pilot/worker
readonly UNIT_DEST=/etc/systemd/system/schmaqq-hermes-agent@.service
readonly CODE_SHA=f937c8b29212332c8a25fea58ec2f84cff4d37361b5060052dc59285aedc3e63
readonly PY_SHA=e583c86c7494607a21ea199a90ec37e02c0cc097741b2100e41e9c19b98f148b
# R1 tool gateway upgrade: only the previously reviewed no-tools release may be replaced, and only while both workers are inactive.
readonly PREV_CODE_SHA=fdb0c1e0ae86005af2ef3459c6f700c0845675b241de823ac778ad032e6d6aa9
readonly PREV_PY_SHA=dc93e96c154f2d8f47cea93c3d6dec58a9343e25acc852afceb075db307bafcb
# R1 first adapter build: installed on the pilot but failed --check (Hermes Tool Search bridge tools). Replaceable only.
# R1 first worker build (installed on the pilot, prompt said "no actions" despite tools). Replaceable only.
readonly PREV_R1_CODE_SHA=8022e25d5f2ba1937e7a10fbdeea9e852b09ca6420b201e3867c8096ce8c7964
readonly PREV_R1_PY_SHA=2c5dcc098462e6b612394362a8d95c50758a475fd32c459ef64b36ac78314018
readonly UNIT_SHA=10e89f2b74dfe11af6cf7d7bbdd39f413c6ea2dd8dc29dea9ce031b742a67b5b

if [[ "${1:-}" != "--apply" || $# != 1 ]]; then
 echo 'DRY RUN ONLY: install reviewed, read-only Hermes worker source and a disabled service template.'
 echo 'No service will be enabled or started. No OAuth, no model invocation, no existing services touched.'
 exit 0
fi
if (( EUID != 0 )); then echo 'STOP: root operator required.' >&2; exit 1; fi
if [[ "$(readlink -f -- "$0")" != "$STAGE/operator-install-worker.sh" ]]; then
 echo 'STOP: only execute reviewed root-owned stage copy.' >&2; exit 1
fi
for file in "$STAGE" "$STAGE/operator-install-worker.sh" "$STAGE/hermes-agent-worker.mjs" "$STAGE/hermes-pilot-infer.py" "$STAGE/agent-worker@.service"; do
 if [[ ! -e "$file" || -L "$file" || "$(stat -c %u "$file")" != 0 ]]; then
   echo "STOP: root-owned and non-symlink file required: $file" >&2; exit 1
 fi
done
for name in schmaqq-hermes-a schmaqq-hermes-b; do
 if ! getent passwd "$name" >/dev/null; then echo "STOP: missing isolated pilot account $name" >&2; exit 1; fi
done
if [[ ! -x /opt/schmaqq-hermes-pilot/runtime/python-3.11.15/bin/python3.11 || ! -x /opt/schmaqq-studio/runtime/node/bin/node ]]; then
 echo 'STOP: Python/Node runtime missing.' >&2; exit 1
fi
hash_matches(){
 local expected="$1" file="$2"
 [[ "$(sha256sum "$file" | cut -d' ' -f1)" == "$expected" ]]
}
hash_matches "$CODE_SHA" "$STAGE/hermes-agent-worker.mjs" || { echo 'STOP: Node worker hash mismatch.' >&2; exit 1; }
hash_matches "$PY_SHA" "$STAGE/hermes-pilot-infer.py" || { echo 'STOP: Python adapter hash mismatch.' >&2; exit 1; }
hash_matches "$UNIT_SHA" "$STAGE/agent-worker@.service" || { echo 'STOP: systemd unit hash mismatch.' >&2; exit 1; }
for file in "$APP" "$APP/hermes-agent-worker.mjs" "$APP/hermes-pilot-infer.py" "$UNIT_DEST"; do
 if [[ -L "$file" ]]; then echo "STOP: existing symlink: $file" >&2; exit 1; fi
done
for unit in schmaqq-hermes-agent@a.service schmaqq-hermes-agent@b.service; do
 if systemctl is-active --quiet "$unit"; then echo "STOP: stop $unit before replacing worker files." >&2; exit 1; fi
done
for spec in "$APP/hermes-agent-worker.mjs:$CODE_SHA:$PREV_CODE_SHA:$PREV_R1_CODE_SHA" "$APP/hermes-pilot-infer.py:$PY_SHA:$PREV_PY_SHA:$PREV_R1_PY_SHA" "$UNIT_DEST:$UNIT_SHA:$UNIT_SHA:$UNIT_SHA"; do
 IFS=: read -r local_file expected previous previous_r1 <<<"$spec"
 if [[ -e "$local_file" ]] && ! hash_matches "$expected" "$local_file" && ! hash_matches "$previous" "$local_file" && ! hash_matches "$previous_r1" "$local_file"; then
  echo "STOP: conflicting installed pilot file: $local_file" >&2; exit 1
 fi
done
install -d -o root -g root -m 0755 "$APP"
install -o root -g root -m 0644 "$STAGE/hermes-agent-worker.mjs" "$APP/hermes-agent-worker.mjs"
install -o root -g root -m 0644 "$STAGE/hermes-pilot-infer.py" "$APP/hermes-pilot-infer.py"
install -o root -g root -m 0644 "$STAGE/agent-worker@.service" "$UNIT_DEST"
systemctl daemon-reload
echo 'AGENT_WORKER_FILES_INSTALLED=PASS'
echo 'SERVICE_A_ACTIVE=NO_CHANGES'
echo 'SERVICE_B_ACTIVE=NO_CHANGES'
echo 'NO_AUTH_AND_NO_INFERENCE=PASS'
echo 'NEXT=explicit_personal_oauth_and_staging_credential_binding'
