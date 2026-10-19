#!/usr/bin/env bash
# Isolated end-to-end smoke for the pilot runtime exchange. Never touches live services.
set -euo pipefail
umask 077
if [[ $# != 3 || ! "$3" =~ ^[0-9a-f]{40}$ ]]; then
 echo "Usage: $0 <existing-runtime-dir> <new-runtime-archive.tar.gz> <40-hex-release-sha>" >&2
 exit 2
fi
old_runtime=$(realpath -e "$1")
archive=$(realpath -e "$2")
sha=$3
helper=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/studio-pilot-exchange.py
node=${STUDIO_NODE_BIN:-/opt/schmaqq-studio-pr17/node/bin/node}
test -f "$helper"
test -x "$node"
[[ -f "$old_runtime/selfhost/server.mjs" ]]
if ss -ltn '( sport = :45220 or sport = :45221 )' | grep -q 'LISTEN'; then
 echo 'ABORT: QA ports 45220/45221 are occupied' >&2
 exit 2
fi
work=$(mktemp -d "${TMPDIR:-/tmp}/schmaqq-pilot-e2e-XXXXXXXX")
chmod 700 "$work"
echo "ISOLATED_QA_WORKDIR=$work"
mkdir -p "$work/releases/$sha" "$work/data"
cp -aL "$old_runtime" "$work/runtime"
tar -xzf "$archive" -C "$work/releases/$sha"
ln -s "$work/releases/$sha" "$work/.previous-$sha"
cat > "$work/QA_START.mjs" <<'JS'
import path from 'node:path';
import {createStudioServer} from './runtime/selfhost/server.mjs';
const {server,previewServer}=createStudioServer({
 sessionCookie:'pilot_regression',
 filename:path.join(process.env.STUDIO_DATA_DIR,'studio.sqlite'),
 origin:process.env.STUDIO_ORIGIN,
 previewOrigin:process.env.STUDIO_PREVIEW_ORIGIN,
 staticDir:path.join(import.meta.dirname,'runtime','studio-dist')
});
server.listen(Number(process.env.PORT),'127.0.0.1');
previewServer.listen(Number(process.env.STUDIO_PREVIEW_PORT),'127.0.0.1');
JS
export STUDIO_DATA_DIR="$work/data"
export STUDIO_ORIGIN=http://127.0.0.1:45220
export STUDIO_PREVIEW_ORIGIN=http://127.0.0.1:45221
export STUDIO_BIND=127.0.0.1 PORT=45220 STUDIO_PREVIEW_PORT=45221
pid=''
stop() {
 if [[ -n "$pid" ]]; then
  kill -TERM "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  pid=''
 fi
}
trap stop EXIT
start() {
 "$node" "$work/QA_START.mjs" > "$work/server.log" 2>&1 &
 pid=$!
 for i in $(seq 1 70); do
  status=$(curl -sS --max-time 1 -o /dev/null -w '%{http_code}' http://127.0.0.1:45220/healthz 2>/dev/null || true)
  [[ "$status" == 200 ]] && return
  if ! kill -0 "$pid" 2>/dev/null; then cat "$work/server.log"; exit 1; fi
  sleep 0.1
 done
 echo 'FAIL: isolated Studio did not start' >&2
 cat "$work/server.log" >&2
 exit 1
}
check() {
 [[ $(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:45220/) == 200 ]]
 [[ $(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:45220/api/auth/session) == 401 ]]
 [[ $(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:45221/) == 404 ]]
}
start
check
old_asset=$(find "$work/runtime/studio-dist/assets" -maxdepth 1 -type f -name 'index-*.js' -printf '%f\n' | head -n 1)
stop
python3 "$helper" promote "$work/runtime" "$work/.previous-$sha" "$work/releases/$sha"
test -e "$work/runtime"
start
check
new_asset=$(find "$work/runtime/studio-dist/assets" -maxdepth 1 -type f -name 'index-*.js' -printf '%f\n' | head -n 1)
[[ "$old_asset" != "$new_asset" ]] || { echo 'FAIL: new frontend unchanged' >&2; exit 1; }
stop
python3 "$helper" recover "$work/runtime" "$work/.previous-$sha" "$work/releases/$sha"
test -e "$work/runtime"
start
check
restored_asset=$(find "$work/runtime/studio-dist/assets" -maxdepth 1 -type f -name 'index-*.js' -printf '%f\n' | head -n 1)
[[ "$old_asset" == "$restored_asset" ]]
echo ISOLATED_FULLSTACK_ATOMIC_PROMOTION=PASS
echo ISOLATED_FULLSTACK_ATOMIC_RECOVERY=PASS
echo 'NOTE: privileged systemd integration and true power-loss durability remain untested.'
