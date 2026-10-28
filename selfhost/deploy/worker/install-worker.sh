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

# 1. Unprivileged system account without login shell and without extra groups.
id -u "$WORKER" >/dev/null 2>&1 || useradd --system --home-dir "$DATA" --no-create-home --shell /usr/sbin/nologin "$WORKER"
if id -nG "$WORKER" | tr ' ' '\n' | grep -vqx "$WORKER"; then echo "Worker account has extra groups; refusing." >&2; exit 1; fi

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

# 4. Service unit plus a one-shot probe unit with exactly the same sandbox lines.
install -m 644 "$RELEASE/selfhost/deploy/worker/schmaqq-studio-worker.service" "$UNITS/schmaqq-studio-worker.service"
sed -e "s|^ExecStart=.*|ExecStart=$LIB/node/bin/node $LIB/current/selfhost/deploy/worker/probe-sandbox.mjs|" \
    -e 's|^Restart=.*|Type=oneshot|' -e '/^RestartSec=/d' -e '/^\[Install\]/,$d' \
    -e 's|^Description=.*|Description=SCHMAQQ server worker sandbox probe|' \
    "$RELEASE/selfhost/deploy/worker/schmaqq-studio-worker.service" > "$UNITS/schmaqq-studio-worker-probe.service"
chmod 644 "$UNITS/schmaqq-studio-worker-probe.service"
systemctl daemon-reload
echo "Worker program $SHA installed. Configuration: /etc/schmaqq-worker/runner.json"
