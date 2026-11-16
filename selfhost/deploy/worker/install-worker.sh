#!/bin/bash
# Install or update the isolated SCHMAQQ Studio server worker from a verified,
# unpacked Studio release. Root only; idempotent. Does not touch other services.
# Usage: install-worker.sh /opt/schmaqq-studio/releases/<commit>
set -euo pipefail
RELEASE=$(realpath "$1")
[ -f "$RELEASE/selfhost/runner.mjs" ] && [ -f "$RELEASE/release-source.json" ] || { echo "Not a Studio release: $RELEASE" >&2; exit 1; }
SHA=$(basename "$RELEASE")
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Release directory must be named by its commit" >&2; exit 1; }
WORKER=schmaqq-worker
DATA=/var/lib/schmaqq-worker
IMAGE=/var/lib/schmaqq-worker.img
LIB=/usr/local/lib/schmaqq-worker
NODE_SOURCE=/opt/schmaqq-studio/runtime/node
UNITS=/etc/systemd/system
MOUNT_UNIT='var-lib-schmaqq\x2dworker.mount'

# 1. Unprivileged accounts without login shell. Jobs run as schmaqq-job; the worker shares
#    only the group schmaqq-jobs with it, so both can read and write a copy - nothing else.
JOB_USER=schmaqq-job; JOB_GROUP=schmaqq-jobs
id -u "$WORKER" >/dev/null 2>&1 || useradd --system --home-dir "$DATA" --no-create-home --shell /usr/sbin/nologin "$WORKER"
getent group "$JOB_GROUP" >/dev/null || groupadd --system "$JOB_GROUP"
id -u "$JOB_USER" >/dev/null 2>&1 || useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin -g "$JOB_GROUP" "$JOB_USER"
usermod -aG "$JOB_GROUP" "$WORKER"
if id -nG "$WORKER" | tr ' ' '\n' | grep -vqxE "$WORKER|$JOB_GROUP"; then echo "Worker account has extra groups; refusing." >&2; exit 1; fi
if id -nG "$JOB_USER" | tr ' ' '\n' | grep -vqx "$JOB_GROUP"; then echo "Job account has extra groups; refusing." >&2; exit 1; fi

# 2. Disk limit: the worker's only writable place is a fixed-size volume.
if [ ! -f "$IMAGE" ]; then
  fallocate -l 3G "$IMAGE"; chmod 600 "$IMAGE"
  mkfs.ext4 -q -F -m 0 -L schmaqq-worker "$IMAGE"
fi
install -d -m 755 "$DATA"
cat > "$UNITS/$MOUNT_UNIT" <<EOF
[Unit]
Description=Disk-limited storage for the SCHMAQQ server worker

[Mount]
What=$IMAGE
Where=$DATA
Type=ext4
Options=loop,nodev,nosuid

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now "$MOUNT_UNIT" >/dev/null
chown "$WORKER:$WORKER" "$DATA"; chmod 700 "$DATA"
install -d -o "$WORKER" -g "$WORKER" -m 700 "$DATA/state" "$DATA/repos"
install -d -o "$WORKER" -g "$WORKER" -m 700 "$DATA/state/worktrees"

# 3. Read-only program files owned by root: Node runtime and runner from the release.
install -d -m 755 "$LIB" "$LIB/releases"
if [ ! -x "$LIB/node/bin/node" ]; then
  rm -rf "$LIB/node.tmp"; cp -a "$NODE_SOURCE" "$LIB/node.tmp"; chown -R root:root "$LIB/node.tmp"; mv "$LIB/node.tmp" "$LIB/node"
fi
if [ ! -d "$LIB/releases/$SHA" ]; then
  rm -rf "$LIB/releases/$SHA.tmp"; install -d -m 755 "$LIB/releases/$SHA.tmp"
  cp -a "$RELEASE/selfhost" "$RELEASE/node_modules" "$RELEASE/package.json" "$RELEASE/release-source.json" "$LIB/releases/$SHA.tmp/"
  chown -R root:root "$LIB/releases/$SHA.tmp"; chmod -R u=rwX,go=rX "$LIB/releases/$SHA.tmp"
  mv "$LIB/releases/$SHA.tmp" "$LIB/releases/$SHA"
fi
ln -sfn "$LIB/releases/$SHA" "$LIB/current.next" && mv -T "$LIB/current.next" "$LIB/current"

# 3b. Codex for each member's own ChatGPT sign-in: a pinned copy owned by root, verified against the
#     npm registry's sha512. Never the system's /usr/bin/codex. Sign-ins live per member under $DATA/codex
#     and are mounted by the launcher one at a time; jobs never see this folder.
CODEX_VERSION=0.169.0
CODEX_INTEGRITY='sha512-o05NyAOCDygSPRo1yinzxvkRSdmsZyBD9E7mbpmjRanSfM8lypqWtQgEo4XfNkwhuCR2aFu8mlGOsQGFXVbVww=='
if [ "$(uname -m)" = x86_64 ] && [ ! -x "$LIB/codex-$CODEX_VERSION/codex" ]; then
  T=$(mktemp -d)
  curl -fsSL --max-time 300 -o "$T/codex.tgz" "https://registry.npmjs.org/@openai/codex/-/codex-$CODEX_VERSION-linux-x64.tgz"
  GOT="sha512-$(openssl dgst -sha512 -binary "$T/codex.tgz" | base64 -w0)"
  [ "$GOT" = "$CODEX_INTEGRITY" ] || { rm -rf "$T"; echo "Codex download does not match the pinned checksum; refusing." >&2; exit 1; }
  mkdir "$T/x"; tar --no-same-owner -xzf "$T/codex.tgz" -C "$T/x"
  BIN=$(find "$T/x" -type f -name codex -path '*x86_64*' | head -1)
  [ -n "$BIN" ] || { rm -rf "$T"; echo "Codex binary not found in the package." >&2; exit 1; }
  install -d -m 755 "$LIB/codex-$CODEX_VERSION.tmp"; install -m 755 -o root -g root "$BIN" "$LIB/codex-$CODEX_VERSION.tmp/codex"
  rm -rf "$LIB/codex-$CODEX_VERSION"; mv "$LIB/codex-$CODEX_VERSION.tmp" "$LIB/codex-$CODEX_VERSION"; rm -rf "$T"
fi
if [ -x "$LIB/codex-$CODEX_VERSION/codex" ]; then
  ln -sfn "$LIB/codex-$CODEX_VERSION" "$LIB/codex.next" && mv -T "$LIB/codex.next" "$LIB/codex"
else echo "Codex not installed (architecture $(uname -m)); ChatGPT sign-in stays unavailable."; fi
install -d -o root -g root -m 700 "$DATA/codex"

# 4. Service unit plus a one-shot probe unit with exactly the same sandbox lines.
install -m 644 "$RELEASE/selfhost/deploy/worker/schmaqq-studio-worker.service" "$UNITS/schmaqq-studio-worker.service"
sed -e "s|^ExecStart=.*|ExecStart=$LIB/node/bin/node $LIB/current/selfhost/deploy/worker/probe-sandbox.mjs|" \
    -e 's|^Restart=.*|Type=oneshot|' -e '/^RestartSec=/d' -e '/^\[Install\]/,$d' \
    -e 's|^Description=.*|Description=SCHMAQQ server worker sandbox probe|' \
    "$RELEASE/selfhost/deploy/worker/schmaqq-studio-worker.service" > "$UNITS/schmaqq-studio-worker-probe.service"
chmod 644 "$UNITS/schmaqq-studio-worker-probe.service"
# 5. Egress proxy: the worker's only way out (allowlisted HTTPS hosts).
install -m 644 "$RELEASE/selfhost/deploy/worker/schmaqq-worker-egress.service" "$UNITS/schmaqq-worker-egress.service"
systemctl daemon-reload
systemctl enable schmaqq-worker-egress.service >/dev/null
systemctl restart schmaqq-worker-egress.service
# The proxy needs a moment to listen; the worker and the probe must not start before.
for i in $(seq 1 40); do ss -ltn | grep -q '127.0.0.60:3128' && break; sleep 0.25; done
ss -ltn | grep -q '127.0.0.60:3128' || { echo "Egress proxy did not start." >&2; exit 1; }

# 6. Job launcher (stage 1): key readable by the worker only, never by jobs.
CONF=/etc/schmaqq-worker
install -d -m 750 -o root -g "$WORKER" "$CONF"
if [ ! -s "$CONF/launcher.key" ]; then
  (umask 027; head -c 48 /dev/urandom | base64 | tr -d '\n/+=' > "$CONF/launcher.key")
fi
chown root:"$WORKER" "$CONF/launcher.key"; chmod 640 "$CONF/launcher.key"
if [ -f "$CONF/runner.json" ]; then
  "$LIB/node/bin/node" -e '
   const fs=require("node:fs"),f="/etc/schmaqq-worker/runner.json",c=JSON.parse(fs.readFileSync(f,"utf8"));
   if(!c.launcher){c.launcher={url:"http://127.0.0.62:3129",keyFile:"/etc/schmaqq-worker/launcher.key"};fs.writeFileSync(f,JSON.stringify(c,null,1),{mode:0o640});}'
  chown root:"$WORKER" "$CONF/runner.json"; chmod 640 "$CONF/runner.json"
fi
install -m 644 "$RELEASE/selfhost/deploy/worker/schmaqq-worker-launcher.service" "$UNITS/schmaqq-worker-launcher.service"
systemctl daemon-reload
systemctl enable schmaqq-worker-launcher.service >/dev/null
systemctl restart schmaqq-worker-launcher.service
for i in $(seq 1 40); do ss -ltn | grep -q '127.0.0.62:3129' && break; sleep 0.25; done
ss -ltn | grep -q '127.0.0.62:3129' || { echo "Job launcher did not start." >&2; exit 1; }

# 7. Mandatory job sandbox check: one real job through the launcher in a throw-away copy.
PROBE_DIR="$DATA/state/worktrees/zz-install-probe-$$"
install -d -o "$WORKER" -g "$WORKER" -m 700 "$PROBE_DIR"
set +e
sudo -u "$WORKER" env NO_PROXY=127.0.0.62 "$LIB/node/bin/node" --input-type=module -e "
 import {launcherCommand} from '$LIB/current/selfhost/job-client.mjs';
 try{console.log(await launcherCommand({url:'http://127.0.0.62:3129',keyFile:'$CONF/launcher.key'},['node','$LIB/current/selfhost/deploy/worker/probe-job.mjs'],'$PROBE_DIR',{timeout:60000}));}
 catch(e){console.log(e.message);process.exit(1);}"
PROBE_RESULT=$?
set -e
rm -rf "$PROBE_DIR"
[ "$PROBE_RESULT" -eq 0 ] || { echo "Job sandbox check failed." >&2; exit 1; }
echo "Worker program $SHA installed. Configuration: $CONF/runner.json"
