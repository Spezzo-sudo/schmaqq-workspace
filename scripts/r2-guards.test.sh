#!/usr/bin/env bash
# Offline contract tests for the off-VPS R2 wrapper.
# git/docker/id/hostname are intentionally stubbed; NO Docker containers or npm installs.
set -euo pipefail
script=${1:?Usage: bash r2-guards.test.sh /path/to/r2-hermes-ephemeral.sh}
[[ -r "$script" ]] || { echo 'Cannot read wrapper' >&2; exit 2; }
bash -n "$script"
case "$script" in /*) ;; *) script="$(cd "$(dirname "$script")" && pwd -P)/$(basename "$script")" ;; esac
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
mkdir -p "$scratch/bin" "$scratch/repo/.git"
cat > "$scratch/bin/id" <<'EOF'
#!/usr/bin/env bash
if [[ ${MOCK_UID:-1001} == 0 ]]; then printf '0\n'; else printf '1001\n'; fi
EOF
cat > "$scratch/bin/hostname" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "${MOCK_HOST:-r2-throwaway-linux}"
EOF
cat > "$scratch/bin/git" <<'EOF'
#!/usr/bin/env bash
case " $* " in
  *' rev-parse HEAD '*) echo "${MOCK_SHA:-51786459aa9aef83600581f9977309e7bdd77e2e}" ;;
  *' remote get-url origin '*) echo "${MOCK_ORIGIN:-https://github.com/Spezzo-sudo/schmaqq-workspace.git}" ;;
  *' status --porcelain --untracked-files=normal '*) [[ ${MOCK_DIRTY:-0} == 0 ]] || echo '?? stray.txt' ;;
  *) echo "unexpected mocked Git arguments" >&2; exit 9 ;;
esac
EOF
cat > "$scratch/bin/docker" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$MOCK_DOCKER_CALLS"
if [[ ${1:-} == run ]]; then exit 37; fi
exit 0
EOF
chmod +x "$scratch/bin/"*
mock_calls="$scratch/docker-calls"
export MOCK_DOCKER_CALLS="$mock_calls"
passed=0
assert_denied() {
  local label="$1" expected="$2"; shift 2
  : > "$mock_calls"
  local output='' rc=0
  output=$(env PATH="$scratch/bin:$PATH" MOCK_DOCKER_CALLS="$mock_calls" "$@" bash "$script" "$scratch/repo" 2>&1) || rc=$?
  if [[ "$rc" != 2 || "$output" != *"R2_BLOCKED=$expected"* ]]; then
    printf 'FAIL %s rc=%s output=%q\n' "$label" "$rc" "$output" >&2; exit 1
  fi
  if [[ -s "$mock_calls" ]]; then printf 'FAIL %s unexpectedly called Docker\n' "$label" >&2; exit 1; fi
  printf 'PASS %s\n' "$label"; passed=$((passed+1))
}
assert_denied no_opt_in external_runner_not_confirmed env -u SCHMAQQ_R2_EXTERNAL_RUNNER
assert_denied deny_root unprivileged_external_user_required env SCHMAQQ_R2_EXTERNAL_RUNNER=YES MOCK_UID=0
assert_denied production_host production_hostname env SCHMAQQ_R2_EXTERNAL_RUNNER=YES MOCK_HOST=srv1365337
assert_denied wrong_sha source_sha_mismatch env SCHMAQQ_R2_EXTERNAL_RUNNER=YES MOCK_SHA=0123456789012345678901234567890123456789
assert_denied wrong_origin unexpected_origin_or_embedded_credentials env SCHMAQQ_R2_EXTERNAL_RUNNER=YES MOCK_ORIGIN=https://github.com/other/project.git
assert_denied embedded_token unexpected_origin_or_embedded_credentials env SCHMAQQ_R2_EXTERNAL_RUNNER=YES MOCK_ORIGIN=https://name:secret@github.com/Spezzo-sudo/schmaqq-workspace.git
assert_denied dirty_checkout checkout_dirty env SCHMAQQ_R2_EXTERNAL_RUNNER=YES MOCK_DIRTY=1
mkdir -p "$scratch/repo/node_modules"
assert_denied generated_node_modules checkout_contains_existing_generated_data env SCHMAQQ_R2_EXTERNAL_RUNNER=YES
rmdir "$scratch/repo/node_modules"

# With all guard inputs mocked valid, Docker itself is still mocked to fail.
# This proves failure is not accidentally presented as a passing live test.
: > "$mock_calls"
rc=0
output=$(env PATH="$scratch/bin:$PATH" MOCK_DOCKER_CALLS="$mock_calls" SCHMAQQ_R2_EXTERNAL_RUNNER=YES bash "$script" "$scratch/repo" 2>&1) || rc=$?
[[ "$rc" == 37 && "$output" == *'R2_TEST_RESULT=FAIL'* && "$output" != *'R2_TEST_RESULT=PASS'* ]] || { echo 'FAIL mocked_docker_failure' >&2; exit 1; }
grep -q -- '--read-only' "$mock_calls"
grep -q -- '--memory=4g' "$mock_calls"
grep -q -- '--cpus=2' "$mock_calls"
grep -q -- '--cap-drop=ALL' "$mock_calls"
grep -q -- '--rm' "$mock_calls"
printf 'PASS mocked_docker_failure_preserves_fail_status_and_limits\n'; passed=$((passed+1))
printf 'R2_OFFLINE_GUARD_TESTS=PASS count=%s real_docker=NO npm_installs=NO\n' "$passed"
