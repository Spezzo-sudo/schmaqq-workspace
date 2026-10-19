#!/usr/bin/env bash
# Idempotent post-crash recovery for the fixed SCHMAQQ Studio pilot service.
set -euo pipefail
umask 077
if [[ $(id -u) != 0 ]]; then echo 'ABORT: root required' >&2; exit 2; fi
if [[ $# != 2 || $1 != --recover || ! $2 =~ ^[0-9a-f]{40}$ ]]; then
 echo 'Usage: studio-pilot-recover.sh --recover <40-hex-release-commit>' >&2
 exit 2
fi
service=schmaqq-studio-pr17.service
install=/opt/schmaqq-studio-pr17
active=$install/runtime
candidate=$install/releases/$2
standby=$install/.previous-$2
helper=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/studio-pilot-exchange.py
exec 9>/run/lock/schmaqq-studio-pilot.lock
flock -n 9 || { echo 'ABORT: pilot promotion/recovery in progress'; exit 2; }
test -d "$candidate"
test -f "$helper"
# The directory is guaranteed to contain either old or new runtime at all times.
python3 "$helper" inspect "$active" "$standby" "$candidate"
trap 'systemctl start "$service" || true' EXIT
systemctl stop "$service"
python3 "$helper" recover "$active" "$standby" "$candidate"
systemctl start "$service"
for attempt in $(seq 1 30); do
 status=$(curl -sS --max-time 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:46310/healthz || true)
 [[ "$status" == 200 ]] && break
 sleep 1
done
[[ "$status" == 200 ]]
[[ $(systemctl is-active "$service") == active ]]
trap - EXIT
echo 'PILOT_MANUAL_CRASH_RECOVERY=PASS'
