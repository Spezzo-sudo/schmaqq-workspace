#!/usr/bin/env bash
# One command per Studio update on the VPS (run as root, by a person or Hermes).
#
#   studio-deploy.sh prepare <commit-sha>   build, check, back up, probe-start a copy. Changes nothing live.
#   studio-deploy.sh live    <commit-sha>   switch to the prepared release (only after the owner's "JA LIVE").
#   studio-deploy.sh release <commit-sha>   both in one run after the owner's single "JA LIVE": prepare, and only
#                                            if everything passed switch live, then the after-check. One block at the end.
#
# Tests run on GitHub for every change (.github/workflows/studio-ci.yml). Here only the safety nets run:
# exact commit from main, package integrity, file permissions, backup, schema check and probe start on a
# copy, atomic switch with automatic rollback. The worker is updated only when its own files changed.
# Every run ends with one block of KEY=VALUE lines; RESULT=PASS or RESULT=STOP says everything.
set -euo pipefail
umask 022

MODE=${1:-}; SHA=${2:-}
BASE=${STUDIO_BASE:-/opt/schmaqq-studio}
DATA=${STUDIO_DATA:-/var/lib/schmaqq-studio}
ENV_FILE=${STUDIO_ENV_FILE:-/etc/schmaqq-studio.env}
CACHE=${STUDIO_BUILD_CACHE:-/var/cache/schmaqq-studio-build}
STATE=${STUDIO_DEPLOY_STATE:-/root/.schmaqq-deploy}
REPO=${STUDIO_REPO_URL:-}
PUBLIC=${STUDIO_PUBLIC_URL:-https://studio.schmaqq.com}
LOCAL=${STUDIO_LOCAL_URL:-http://127.0.0.1:4310}
SERVICE_USER=${STUDIO_USER:-schmaqq-studio}
WORKER_LIB=${STUDIO_WORKER_LIB:-/usr/local/lib/schmaqq-worker}
SYSTEMCTL=${STUDIO_SYSTEMCTL:-systemctl}
NODE=$BASE/runtime/node/bin/node
CUR=$BASE/current

SUMMARY=()
note(){ SUMMARY+=("$1"); echo "· $1"; }
finish(){ echo; echo "===== ZUSAMMENFASSUNG ====="; printf '%s\n' "${SUMMARY[@]}"; echo "RESULT=$1"; }
stop(){ note "STOP_REASON=$1"; FINISHED=1; finish STOP; exit 1; }
trap 'code=$?; if [ $code -ne 0 ] && [ "${FINISHED:-}" != 1 ]; then echo; echo "===== ZUSAMMENFASSUNG ====="; printf "%s\n" "${SUMMARY[@]}"; echo "STOP_REASON=Befehl fehlgeschlagen (Zeile $LINENO)"; echo "RESULT=STOP"; fi' EXIT

[[ $MODE == prepare || $MODE == live || $MODE == release ]] || { echo "Usage: $0 prepare|live|release <40-stelliger Commit>"; exit 2; }
[[ $SHA =~ ^[0-9a-f]{40}$ ]] || { echo "Commit muss 40 Zeichen lang sein (git rev-parse)."; exit 2; }
KURZ=${SHA:0:7}; NEW=$BASE/releases/$SHA; mkdir -p "$STATE"; STATEFILE=$STATE/prepared-$SHA.env
as_user(){ runuser -u "$SERVICE_USER" -- "$@"; }
healthy(){ for _ in $(seq 1 30); do [ "$(curl -fsS --max-time 2 "$LOCAL/healthz" 2>/dev/null || true)" = '{"ok":true}' ] && return 0; sleep 1; done; return 1; }

prepare(){
 exec 8>/run/schmaqq-studio-deploy.lock; flock -x -w 30 8 || stop "anderes Update läuft gerade"
 [ -x "$NODE" ] || stop "Node fehlt unter $NODE"
 ALT=$(readlink -f "$CUR"); note "ALT=$ALT"; note "NEW=$NEW"
 [ "$ALT" != "$NEW" ] || stop "dieser Stand ist bereits aktiv"

 # 1. Source: exactly this commit, and only one that is on main and newer than the live one.
 if [ ! -d "$CACHE/src/.git" ]; then
  [ -n "$REPO" ] || stop "Erster Lauf: STUDIO_REPO_URL setzen (dieselbe Adresse wie beim bisherigen git clone)"
  mkdir -p "$CACHE"; git clone --quiet --no-checkout "$REPO" "$CACHE/src"
 fi
 git -C "$CACHE/src" fetch --quiet origin main
 git -C "$CACHE/src" cat-file -e "$SHA^{commit}" 2>/dev/null || stop "Commit $KURZ nicht auf GitHub gefunden"
 git -C "$CACHE/src" merge-base --is-ancestor "$SHA" origin/main || stop "Commit $KURZ ist nicht auf main"
 ALT_SHA=$(basename "$ALT")
 if [[ $ALT_SHA =~ ^[0-9a-f]{40}$ ]] && [ "${STUDIO_ALLOW_OLDER:-}" != 1 ]; then
  git -C "$CACHE/src" merge-base --is-ancestor "$ALT_SHA" "$SHA" || stop "$KURZ ist älter als der Live-Stand (Rückfall nur mit STUDIO_ALLOW_OLDER=1)"
 fi
 git -C "$CACHE/src" -c advice.detachedHead=false checkout --quiet --force --detach "$SHA"
 git -C "$CACHE/src" clean --quiet -ffdx -e node_modules
 [ "$(git -C "$CACHE/src" rev-parse HEAD)" = "$SHA" ] || stop "Quellstand stimmt nicht"
 note "SOURCE=PASS ($KURZ, auf main)"

 # 2. Dependencies: reinstall only when the lock file changed (saves most of the time).
 LOCK=$(sha256sum "$CACHE/src/package-lock.json" | cut -d' ' -f1)
 if [ ! -d "$CACHE/src/node_modules" ] || [ "$(cat "$CACHE/lock.sha256" 2>/dev/null || true)" != "$LOCK" ]; then
  (cd "$CACHE/src" && PATH="$(dirname "$NODE"):$PATH" npm ci --no-audit --no-fund --loglevel=error --cache "$CACHE/npm")
  echo "$LOCK" > "$CACHE/lock.sha256"; note "DEPENDENCIES=neu installiert"
 else note "DEPENDENCIES=unverändert, aus Zwischenspeicher"; fi

 # 3. Package and verify it.
 OUT=$(cd "$CACHE/src" && PATH="$(dirname "$NODE"):$PATH" "$NODE" selfhost/release.mjs)
 ARCHIVE=$(printf '%s' "$OUT" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=s.lastIndexOf("\n{");console.log(JSON.parse(s.slice(i+1)).archive)})')
 ARCHIVE_SHA=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
 rm -rf "$NEW.tmp"; mkdir -p "$NEW.tmp"; tar --no-same-owner --no-same-permissions -xzf "$ARCHIVE" -C "$NEW.tmp"
 [ -z "$(find "$NEW.tmp" -perm /022 -print -quit)" ] || stop "beschreibbare Dateien im Paket"
 [ -z "$(find "$NEW.tmp" ! -user root -print -quit)" ] || stop "Dateien gehören nicht root"
 rm -rf "$NEW"; mv "$NEW.tmp" "$NEW"
 "$NODE" "$NEW/selfhost/deploy/verify-release.mjs" --release "$NEW" --source "$SHA" --archive "$ARCHIVE" --archive-sha256 "$ARCHIVE_SHA" >/dev/null
 note "PACKAGE=PASS (sha256 ${ARCHIVE_SHA:0:12}…)"; note "PERMISSIONS=PASS"

 # 4. Backup with the NEW release's script.
 mkdir -p "$DATA/backups"; BACKUP=$DATA/backups/predeploy-$KURZ-$(date -u +%Y%m%dT%H%M%SZ).sqlite
 as_user env STUDIO_DATA_DIR="$DATA" "$NODE" "$NEW/selfhost/backup.mjs" "$BACKUP" >/dev/null
 [ -s "$BACKUP" ] || stop "Backup fehlt"; note "BACKUP=$BACKUP"

 # 5. Schema check and probe start on a COPY of the backup (same settings as live, other ports).
 PROBE=$(mktemp -d "$DATA/probe-$KURZ-XXXX"); cp "$BACKUP" "$PROBE/studio.sqlite"; chown -R "$SERVICE_USER:" "$PROBE"
 as_user "$NODE" "$NEW/selfhost/deploy/schema-preflight.mjs" --db "$PROBE/studio.sqlite" >/dev/null || { rm -rf "$PROBE"; stop "Schema-Prüfung fehlgeschlagen"; }
 note "SCHEMA=PASS"
 ( set -a; [ -f "$ENV_FILE" ] && . "$ENV_FILE"; set +a
   cd "$NEW" && exec runuser -u "$SERVICE_USER" -- env STUDIO_DATA_DIR="$PROBE" PORT=4390 STUDIO_PREVIEW_PORT=4391 STUDIO_BIND=127.0.0.1 "$NODE" selfhost/server.mjs ) >"$PROBE.log" 2>&1 &
 PID=$!; OK=0
 for _ in $(seq 1 30); do [ "$(curl -fsS --max-time 2 http://127.0.0.1:4390/healthz 2>/dev/null || true)" = '{"ok":true}' ] && { OK=1; break; }; sleep 1; done
 if [ $OK = 1 ]; then curl -fsS --max-time 5 http://127.0.0.1:4390/ | grep -q '<script' || OK=0; fi
 if [ $OK = 1 ]; then [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4390/api/development)" = 401 ] || OK=0; fi
 pkill -TERM -P "$PID" 2>/dev/null || true; kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true
 if [ $OK != 1 ]; then tail -20 "$PROBE.log"; rm -rf "$PROBE" "$PROBE.log"; stop "Probestart fehlgeschlagen"; fi
 rm -rf "$PROBE" "$PROBE.log"; note "PROBE=PASS (Start, Startseite, Anmeldung geschützt)"

 # 6. Does the worker need an update? Only if its own program files or dependencies differ.
 WORKER=$("$NODE" --input-type=module -e '
  // Files the worker really runs: the import closure of runner.mjs and the worker deploy folder, plus the dependency lock.
  import {createHash} from "node:crypto";import {existsSync,readFileSync,readdirSync} from "node:fs";import path from "node:path";
  const [neu,old]=process.argv.slice(1),seen=new Set();
  const walk=f=>{if(seen.has(f))return;seen.add(f);const p=path.join(neu,f);if(!existsSync(p)||!f.endsWith(".mjs"))return;
   for(const m of readFileSync(p,"utf8").matchAll(/(?:import|export)[^"\x27]*?from\s*["\x27](\.{1,2}\/[^"\x27]+)["\x27]|import\(\s*["\x27](\.{1,2}\/[^"\x27]+)["\x27]\s*\)/g))
    walk(path.posix.normalize(path.posix.join(path.posix.dirname(f),m[1]??m[2])));};
  walk("selfhost/runner.mjs");for(const f of readdirSync(path.join(neu,"selfhost/deploy/worker")))walk("selfhost/deploy/worker/"+f);
  const hash=d=>{if(!existsSync(path.join(d,"selfhost")))return "none";const h=createHash("sha256");
   h.update("lock:"+JSON.parse(readFileSync(path.join(d,"release-source.json"),"utf8")).lockSha256);
   for(const f of [...seen].sort()){const p=path.join(d,f);h.update(f+":"+(existsSync(p)?createHash("sha256").update(readFileSync(p)).digest("hex"):"missing"));}
   return h.digest("hex");};
  console.log(hash(neu)===hash(old)?"no":"yes");' "$NEW" "$(readlink -f "$WORKER_LIB/current" 2>/dev/null || echo /nonexistent)")
 note "WORKER_UPDATE=$WORKER"

 printf 'ALT=%q\nBACKUP=%q\nWORKER=%q\nARCHIVE_SHA=%q\n' "$ALT" "$BACKUP" "$WORKER" "$ARCHIVE_SHA" > "$STATEFILE"
 [ "${RELEASE:-}" = 1 ] && return 0
 note "NEXT=Auf „JA LIVE $KURZ“ warten, dann: $0 live $SHA"
 FINISHED=1; finish PASS
}

live(){
 [ -f "$STATEFILE" ] || stop "nicht vorbereitet: zuerst $0 prepare $SHA"
 # shellcheck disable=SC1090
 . "$STATEFILE"
 switch_to(){ ln -sfn "$1" "$CUR.next"; mv -T "$CUR.next" "$CUR"; $SYSTEMCTL restart schmaqq-studio; }
 exec 9>/run/schmaqq-studio-switch.lock; flock -x -w 30 9 || stop "Umschalten gesperrt"
 [ "$(readlink -f "$CUR")" = "$ALT" ] || stop "Live-Stand hat sich seit der Vorbereitung geändert: $(readlink -f "$CUR")"
 [ -d "$NEW" ] || stop "vorbereiteter Stand fehlt"
 switch_to "$NEW"
 PID=$($SYSTEMCTL show -p MainPID --value schmaqq-studio)
 if healthy && [ "$(readlink -f /proc/"$PID"/cwd)" = "$NEW" ] \
   && [ "$(curl -fsS --max-time 20 "$PUBLIC/healthz" 2>/dev/null || true)" = '{"ok":true}' ] \
   && [ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC/mcp" || true)" != 000 ]; then
  note "SWITCH=PASS CURRENT=$NEW"
 else
  switch_to "$ALT"
  if healthy; then note "ROLLBACK=PASS (wieder auf $(basename "$ALT" | cut -c1-7))"; else note "ROLLBACK=FAIL – sofort melden"; fi
  stop "neuer Stand antwortete nicht richtig"
 fi
 if [ "$WORKER" = yes ]; then
  START=$(date +%s%3N)
  bash "$NEW/selfhost/deploy/worker/install-worker.sh" "$NEW" >/tmp/schmaqq-worker-install.log 2>&1 || { tail -20 /tmp/schmaqq-worker-install.log; stop "Worker-Installation fehlgeschlagen (Studio ist schon live; Worker mit dem vorherigen Stand neu installieren)"; }
  $SYSTEMCTL start schmaqq-studio-worker-probe
  [ "$($SYSTEMCTL show -p Result --value schmaqq-studio-worker-probe)" = success ] || stop "Worker-Sandbox-Probe fehlgeschlagen"
  $SYSTEMCTL restart schmaqq-studio-worker
  SEEN=0
  for _ in $(seq 1 20); do
   SEEN=$("$NODE" -e 'const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(process.argv[1],{readOnly:true});
    const r=db.prepare("SELECT MAX(d.seen) AS seen FROM devices d JOIN workspace_meta h ON h.key=\x27executor:v1:host:\x27||d.id WHERE d.revoked=0 AND json_extract(h.value,\x27$.kind\x27)=\x27server\x27").get();console.log(r?.seen??0)' "$DATA/studio.sqlite")
   [ "$SEEN" -gt "$START" ] && break; sleep 1
  done
  [ "$SEEN" -gt "$START" ] || stop "Worker meldet sich nicht bei Studio"
  note "WORKER=PASS (neu installiert, Probe ok, meldet sich)"
 else note "WORKER=unverändert"; fi
 rm -f "$STATEFILE"
 note "BACKUP=$BACKUP"; note "ROLLBACK_RELEASE=$ALT"
 aftercheck
 FINISHED=1; finish PASS
}

# After-check as KEY=VALUE lines (what Hermes used to run by hand).
aftercheck(){
 note "CURRENT=$(readlink -f "$CUR")"
 note "STUDIO_SERVICE=$($SYSTEMCTL is-active schmaqq-studio 2>/dev/null || true) WORKER_SERVICE=$($SYSTEMCTL is-active schmaqq-studio-worker 2>/dev/null || true)"
 note "LOCAL_HEALTH=$(curl -fsS --max-time 10 "$LOCAL/healthz" 2>/dev/null || echo FAIL) PUBLIC_HEALTH=$(curl -fsS --max-time 20 "$PUBLIC/healthz" 2>/dev/null || echo FAIL)"
 note "NRESTARTS_STUDIO=$($SYSTEMCTL show -p NRestarts --value schmaqq-studio 2>/dev/null || echo ?) NRESTARTS_WORKER=$($SYSTEMCTL show -p NRestarts --value schmaqq-studio-worker 2>/dev/null || echo ?)"
}

release(){ RELEASE=1; prepare; live; }

"$MODE"
