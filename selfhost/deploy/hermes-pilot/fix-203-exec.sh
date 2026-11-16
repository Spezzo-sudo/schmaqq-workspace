#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly BUNDLE=/root/schmaqq-hermes-pilot-review
readonly SRC=/root/.local/share/uv/python/cpython-3.11.15-linux-x86_64-gnu
readonly RUNTIME_ROOT=/opt/schmaqq-hermes-pilot/runtime
readonly PYTHON_DEST="$RUNTIME_ROOT/python-3.11.15"
readonly INSTALLED_UNIT=/etc/systemd/system/schmaqq-hermes-pilot-preflight@.service
readonly PROPOSED_UNIT="$BUNDLE/schmaqq-hermes-pilot-preflight-v2@.service"
readonly OLD_UNIT_SHA=f024fd8b8ed8a6ee3ead70d6503f7900544e668a4ac5e3f9a55c866d735f09b8

if [[ "${1:-}" != "--apply" || $# != 1 ]]; then
  echo 'DRY RUN: no modifications made.'
  echo 'Would install a 117 MiB root-owned Python 3.11.15 runtime under /opt/schmaqq-hermes-pilot/runtime.'
  echo 'Would update ONLY the two new Hermes preflight instances via their shared unit template.'
  echo 'Would NOT relax ProtectHome, change production, start either unit or copy secrets.'
  exit 0
fi

if (( EUID != 0 )); then echo 'STOP: authorized root operator is required.' >&2; exit 1; fi
if [[ "$(readlink -f -- "$0")" != "$BUNDLE/fix-203-exec.sh" ]]; then
  echo 'STOP: execute only reviewed, root-owned copy in /root.' >&2; exit 1
fi
for f in "$BUNDLE" "$BUNDLE/fix-203-exec.sh" "$PROPOSED_UNIT" "$INSTALLED_UNIT"; do
  if [[ ! -e "$f" || -L "$f" || "$(stat -c %u "$f")" != 0 ]]; then
    echo "STOP: root-owned regular object and no symlink required: $f" >&2; exit 1
  fi
done

if [[ ! -f "$PROPOSED_UNIT" || ! -f "$INSTALLED_UNIT" ]]; then
  echo 'STOP: expected systemd unit is not a regular file.' >&2; exit 1
fi
if [[ "$(sha256sum "$INSTALLED_UNIT" | cut -d' ' -f1)" != "$OLD_UNIT_SHA" ]]; then
  echo 'STOP: installed systemd unit changed since successful preflight installation.' >&2; exit 1
fi
if [[ ! -x "$SRC/bin/python3.11" ]]; then
  echo 'STOP: expected Python 3.11.15 distribution is unavailable.' >&2; exit 1
fi
if [[ "$( "$SRC/bin/python3.11" --version )" != 'Python 3.11.15' ]]; then
  echo 'STOP: Python distribution version does not match.' >&2; exit 1
fi
if [[ -e "$PYTHON_DEST" || -L "$PYTHON_DEST" ]]; then
  echo 'STOP: destination runtime already exists; manual review required.' >&2; exit 1
fi
for dir in /opt/schmaqq-hermes-pilot "$RUNTIME_ROOT"; do
  if [[ -L "$dir" || ( -e "$dir" && "$(stat -c %u "$dir")" != 0 ) ]]; then
    echo "STOP: unexpected owner or symlink: $dir" >&2; exit 1
  fi
done
for n in schmaqq-hermes-a schmaqq-hermes-b; do
  if ! getent passwd "$n" >/dev/null; then echo "STOP: missing test user $n" >&2; exit 1; fi
done
for n in a b; do
  if [[ "$(systemctl is-active "schmaqq-hermes-pilot-preflight@$n.service" 2>/dev/null || true)" == active ]]; then
    echo 'STOP: a pilot unit is already active.' >&2; exit 1
  fi
done

install -d -o root -g root -m 0755 /opt/schmaqq-hermes-pilot "$RUNTIME_ROOT"
stage=$(mktemp -d "$RUNTIME_ROOT/.python-stage.XXXXXXXX")
trap 'if [[ -n "${stage:-}" && -d "$stage" ]]; then rm -rf -- "$stage"; fi' EXIT
cp -a --reflink=auto "$SRC/." "$stage/"
chown -R --no-dereference root:root "$stage"
chmod 0755 "$stage"
if [[ "$("$stage/bin/python3.11" --version)" != 'Python 3.11.15' ]]; then
  echo 'STOP: staged Python runtime failed version check.' >&2; exit 1
fi
mv -T -- "$stage" "$PYTHON_DEST"
stage=''
install -o root -g root -m 0644 "$PROPOSED_UNIT" "$INSTALLED_UNIT"
systemctl daemon-reload

echo 'FIX_INSTALLED=PASS'
echo 'PYTHON=Python 3.11.15 outside /root'
echo 'UNIT=v2, existing Hermes and Studio services unchanged'
echo 'NO_UNITS_STARTED=yes'
echo 'NEXT: operator explicitly starts a then b and reports results'
