#!/usr/bin/env bash
# SCHMAQQ R2 Linux smoke: execute ONLY on an external disposable Linux runner.
# The production VPS is explicitly disallowed; this script never installs on its host.
set -euo pipefail

fail() { printf 'R2_BLOCKED=%s\n' "$1" >&2; exit 2; }

EXPECTED_SHA='51786459aa9aef83600581f9977309e7bdd77e2e'
IMAGE='node:24-bookworm'
PRODUCTION_HOST='srv1365337'

[[ "${SCHMAQQ_R2_EXTERNAL_RUNNER:-}" == 'YES' ]] || fail 'external_runner_not_confirmed'
[[ "$(id -u)" != 0 ]] || fail 'unprivileged_external_user_required'
[[ $# == 1 && -d "$1" ]] || fail 'expected_one_standalone_git_checkout_path'
SOURCE="$(cd -- "$1" && pwd -P)" || fail 'unreadable_checkout'

[[ "$(hostname -s)" != "$PRODUCTION_HOST" ]] || fail 'production_hostname'
[[ ! -d /opt/hermes-agent && ! -d /opt/svcops-prod && ! -d /opt/klimafinder ]] || fail 'production_service_paths_detected'
[[ -d "$SOURCE/.git" && ! -L "$SOURCE/.git" ]] || fail 'standalone_clone_required_not_worktree'
[[ ! -e "$SOURCE/.studio" && ! -e "$SOURCE/node_modules" && ! -e "$SOURCE/dist" ]] || fail 'checkout_contains_existing_generated_data'

command -v git >/dev/null || fail 'git_missing'
command -v docker >/dev/null || fail 'docker_missing'
command -v timeout >/dev/null || fail 'timeout_missing'
command -v od >/dev/null || fail 'od_missing'

git_sha="$(git -C "$SOURCE" rev-parse HEAD 2>/dev/null)" || fail 'git_checkout_invalid'
[[ "$git_sha" == "$EXPECTED_SHA" ]] || fail 'source_sha_mismatch'
origin="$(git -C "$SOURCE" remote get-url origin 2>/dev/null)" || fail 'git_origin_missing'
case "$origin" in
    https://github.com/Spezzo-sudo/schmaqq-workspace|https://github.com/Spezzo-sudo/schmaqq-workspace.git|git@github.com:Spezzo-sudo/schmaqq-workspace.git|ssh://git@github.com/Spezzo-sudo/schmaqq-workspace.git) ;;
    *) fail 'unexpected_origin_or_embedded_credentials' ;;
esac
[[ -z "$(git -C "$SOURCE" status --porcelain --untracked-files=normal)" ]] || fail 'checkout_dirty'

# A disposable external VM is required: Docker images/layers may outlive --rm.
# Writable container paths alone are capped by tmpfs; the image and its caches
# must live on the disposable external runner, NEVER the production VPS.
external_container="schmaqq-r2-$(od -An -N8 -tx1 /dev/urandom | tr -d '[:space:]')"
cleanup() {
    # This unique name is owned by this run only. The container has --rm too.
    docker rm -f "$external_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf 'SCHMAQQ_R2_EXTERNAL_ISOLATED_TEST\n'
printf 'EXPECTED_SHA=%s\n' "$EXPECTED_SHA"
printf 'HOST_KIND=external_ephemeral_runner\n'
printf 'PRODUCTION_HOST_MUTATED=NO\n'
printf 'SCRATCH_MAX_BYTES=%s\n' "$((6144*1024*1024+512*1024*1024))"
printf 'RAM_LIMIT_BYTES=%s\n' "$((4*1024*1024*1024))"
printf 'CPU_LIMIT=2\n'
printf 'TEST_STATUS=STARTED\n'

# Important: Docker's writable root layer is disabled; all generated files
# (npm cache, cloned checkout, build, test data, temporary files) go to tmpfs.
# The container has no host Docker socket, no environment secrets and no ports.
# The host's image storage is eliminated by disposing of the external runner.
inside='set -euo pipefail
umask 077
mkdir -p /workspace/home /workspace/repo /workspace/.npm-cache /workspace/.cache
cp -R /source/. /workspace/repo/
cd /workspace/repo
[[ "$(git rev-parse HEAD)" == "$SCHMAQQ_R2_SHA" ]] || { echo "CHECKOUT_SHA=FAIL"; exit 3; }
node -e '\''const v=process.versions.node.split(".").map(Number); if(v[0]<24||(v[0]===24&&v[1]<15)){console.error("NODE_VERSION=BLOCKED "+process.version);process.exit(2)}'\''
command -v npm >/dev/null
command -v git >/dev/null
command -v python3 >/dev/null
printf "NODE_VERSION=%s\\n" "$(node --version)"
printf "CHECKOUT_SHA=PASS\\n"
npm ci --no-audit --no-fund
printf "NPM_INSTALL=PASS\\n"
npm run studio:verify
printf "STUDIO_VERIFY=PASS\\n"
node selfhost/demo.mjs >/workspace/demo.log 2>&1 &
demo_pid=$!
stop_demo() { kill "$demo_pid" >/dev/null 2>&1 || true; wait "$demo_pid" 2>/dev/null || true; }
trap stop_demo EXIT
ready=0
for n in $(seq 1 60); do
  if node -e '\''fetch("http://127.0.0.1:4320/healthz").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'\''; then ready=1; break; fi
  if ! kill -0 "$demo_pid" 2>/dev/null; then echo "DEMO_START=FAIL"; tail -n 15 /workspace/demo.log; exit 1; fi
  sleep 1
done
[[ "$ready" == 1 ]] || { echo "DEMO_READINESS=FAIL"; exit 1; }
node selfhost/demo-smoke.mjs
printf "DEMO_SMOKE=PASS\\n"
'

# A real limit, not a mere warning. /workspace=6GiB, /tmp=512MiB.
# tmpfs pages count toward the hard 4GiB container memory ceiling.
# --read-only prevents installation anywhere else in the container.
# --log-driver=none prevents accumulating daemon-side test logs.
# Network is needed for npm; never attach this runner to private networks.
if timeout --signal=TERM --kill-after=15s 1800 \
  docker run --rm --name "$external_container" --init \
    --read-only --log-driver=none --network bridge \
    --security-opt no-new-privileges --cap-drop=ALL \
    --memory=4g --memory-swap=4g --cpus=2 --pids-limit=256 \
    --tmpfs /workspace:rw,exec,nosuid,nodev,size=6144m,mode=1777 \
    --tmpfs /tmp:rw,exec,nosuid,nodev,size=512m,mode=1777 \
    --mount "type=bind,src=$SOURCE,dst=/source,readonly" \
    --env SCHMAQQ_R2_SHA="$EXPECTED_SHA" \
    --env HOME=/workspace/home \
    --env npm_config_cache=/workspace/.npm-cache \
    --env XDG_CACHE_HOME=/workspace/.cache \
    --env TMPDIR=/tmp \
    --env CI=1 \
    --env NODE_OPTIONS='--max-old-space-size=1536' \
    --user "$(id -u):$(id -g)" \
    "$IMAGE" /bin/bash -c "$inside"; then
    printf 'R2_TEST_RESULT=PASS\n'
else
    status=$?
    printf 'R2_TEST_RESULT=FAIL\nEXIT_CODE=%s\n' "$status" >&2
    exit "$status"
fi
printf 'CONTAINER_REMOVAL=AUTOMATIC\nBROWSER_QA=PENDING\n'
