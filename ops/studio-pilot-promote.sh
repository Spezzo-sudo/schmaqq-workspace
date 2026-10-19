#!/usr/bin/env bash
# Permanent SCHMAQQ Studio pilot lane - existing PR17 hostname, no new DNS/router.
set -euo pipefail
umask 077
if [[ $(id -u) != 0 ]]; then echo 'ABORT: root required' >&2; exit 2; fi
if [[ ${1:-} != --apply || $# != 4 || ! ${2:-} =~ ^[0-9a-f]{40}$ || ! ${4:-} =~ ^[0-9a-f]{64}$ ]]; then
 echo 'Usage: PILOT_PROMOTE.sh --apply <commit-sha40> <release-tar-gz-absolute-path> <archive-sha256>' >&2
 exit 2
fi
case "$3" in /home/dc-remote/schmaqq-pr*-runtime-candidate-*/studio-runtime.tar.gz) ;; *) echo 'ABORT: release path must match immutable candidate directory' >&2; exit 2;; esac
[[ ! -L "$3" ]] || { echo 'ABORT: symlink archive forbidden' >&2; exit 2; }
[[ $(stat -c %u "$3") == 1001 ]] || { echo 'ABORT: expected candidate file owner' >&2; exit 2; }
service=schmaqq-studio-pr17.service
host=studio-pr17.schmaqq.com
asset=studio-pr17-assets.schmaqq.com
install=/opt/schmaqq-studio-pr17
data=/var/lib/schmaqq-studio-pr17
source=$3
digest=$4
version=$2
releases=$install/releases
active=$install/runtime
new=$releases/$version
standby=$install/.previous-$version
helper=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/studio-pilot-exchange.py
lock=/run/lock/schmaqq-studio-pilot.lock
backupdir=/var/backups/schmaqq-studio-pilot
exec 9>"$lock"
flock -n 9 || { echo 'ABORT: promotion already running'; exit 2; }
test "$(systemctl is-active "$service")" = active
test "$(sha256sum "$source" | cut -d' ' -f1)" = "$digest"
test -d "$data"
test -f "$data/studio.sqlite"
test -f "$install/PR17_START.mjs"
test -f "$install/node/bin/node"
test ! -e "$new" && test ! -L "$new"
test ! -e "$standby" && test ! -L "$standby"
test -f "$helper"
test ! -L "$active" || test -d "$(readlink -f "$active")"
test -d "$active"
test "$(curl -sS --max-time 6 -o /dev/null -w '%{http_code}' "https://$host/")" = 401
test "$(curl -sS --max-time 6 -o /dev/null -w '%{http_code}' "https://$asset/")" = 401
mkdir -p "$releases" "$backupdir"
chmod 755 "$releases"
chmod 700 "$backupdir"
stage=$(mktemp -d "$releases/.incoming.XXXXXXXX")
cleanup(){ rm -rf -- "$stage"; }
trap cleanup EXIT
python3 - "$source" <<'PYARCHIVE'
import pathlib,sys,tarfile
archive=sys.argv[1]
with tarfile.open(archive,'r:gz') as tf:
 members=tf.getmembers()
 assert len(members)<=1200 and members
 for m in members:
  p=pathlib.PurePosixPath(m.name)
  assert not p.is_absolute() and '..' not in p.parts
  assert m.isfile() or m.isdir(),f'Unsafe archive entry: {m.name}'
  assert m.size<50_000_000
 print('PILOT_ARCHIVE_ENTRY_TYPES=PASS')
PYARCHIVE
tar -xzf "$source" -C "$stage" --no-same-owner --no-same-permissions
python3 - "$stage" <<'PY'
import hashlib,json,pathlib,sys
folder=pathlib.Path(sys.argv[1]); manifest=json.loads((folder/'release-manifest.json').read_text())
assert 50<=len(manifest['files'])<=1000
for entry in manifest['files']:
 p=pathlib.PurePosixPath(entry['path'])
 assert not p.is_absolute() and '..' not in p.parts
 actual=(folder/p).read_bytes()
 assert len(actual)==entry['bytes']
 assert hashlib.sha256(actual).hexdigest()==entry['sha256']
print(f"PILOT_RELEASE_MANIFEST={len(manifest['files'])}/{len(manifest['files'])} PASS")
PY
test -f "$stage/studio-dist/index.html"
test -f "$stage/selfhost/server.mjs"
find "$stage" -type d -exec chmod 755 {} +
find "$stage" -type f -exec chmod 644 {} +
python3 - "$data/studio.sqlite" "$backupdir/pre-$version.sqlite" <<'PY'
import sqlite3,sys
source=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True)
target=sqlite3.connect(sys.argv[2])
source.backup(target)
assert target.execute('pragma integrity_check').fetchone()[0]=='ok'
target.close();source.close()
print('PILOT_DB_BACKUP=PASS')
PY
chmod 600 "$backupdir/pre-$version.sqlite"
mv -- "$stage" "$new"
# The running systemd service uses its own Unix account, not root.
runuser -u schmaqq-studio-pr17 -- test -r "$new/selfhost/server.mjs"
runuser -u schmaqq-studio-pr17 -- test -r "$new/studio-dist/index.html"
trap - EXIT
# The prepared pointer and previous runtime always coexist: renameat2 swaps
# a directory or symlink with this symlink atomically, with no missing runtime.
ln -s "$new" "$standby"
python3 "$helper" inspect "$active" "$standby" "$new"
# Flush staged release and symlink metadata before stopping the service.
sync -f "$releases"
sync -f "$install"
stopped=false
rollback(){
 echo 'PILOT_PROMOTION_FAILED: attempting atomic code recovery' >&2
 systemctl stop "$service" || true
 if ! python3 "$helper" recover "$active" "$standby" "$new"; then
  echo 'PILOT_RECOVERY_FAILED: manual inspection required, do not restore SQLite blindly' >&2
  return 2
 fi
 if ! systemctl start "$service"; then
  echo 'PILOT_RECOVERY_SERVICE_START=FAIL; manual recovery required' >&2
  return 2
 fi
 recovery_status=''
 for retry in $(seq 1 30); do
  recovery_status=$(curl -sS --max-time 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:46310/healthz || true)
  [[ "$recovery_status" == 200 ]] && break
  sleep 1
 done
 if [[ "$recovery_status" != 200 ]]; then
  echo 'PILOT_RECOVERY_HEALTH=FAIL; inspect service before retry' >&2
  return 2
 fi
 echo 'PILOT_ROLLBACK_CODE_RESTORED=PASS; verified SQLite backup retained' >&2
}
trap 'rc=$?; trap - EXIT; if ((rc != 0)) && [[ "$stopped" == true ]]; then rollback; fi; exit $rc' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
stopped=true
systemctl stop "$service"
python3 "$helper" promote "$active" "$standby" "$new"
systemctl start "$service"
for attempt in $(seq 1 30); do
 status=$(curl -sS --max-time 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:46310/healthz || true)
 [[ "$status" == 200 ]] && break
 sleep 1
done
[[ "$status" == 200 ]]
[[ $(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:46310/) == 200 ]]
[[ $(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:46310/api/auth/session) == 401 ]]
[[ $(curl -sS --max-time 7 -o /dev/null -w '%{http_code}' "https://$host/") == 401 ]]
[[ $(curl -sS --max-time 7 -o /dev/null -w '%{http_code}' "https://$asset/") == 401 ]]
[[ $(systemctl is-active "$service") == active ]]
trap - EXIT INT TERM HUP
printf 'PILOT_PROMOTION=PASS\nSOURCE=%s\nPREVIOUS_RUNTIME=%s\nBACKUP=%s\n' "$version" "$standby" "$backupdir/pre-$version.sqlite"
