#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly DEST=/root/schmaqq-hermes-pilot-review
readonly UNIT=schmaqq-hermes-pilot-preflight@.service
readonly ENV_DIR=/etc/schmaqq-hermes-pilot/managed-empty
readonly USERS=(schmaqq-hermes-a schmaqq-hermes-b)

if [[ "${1:-}" != "--apply" || $# != 1 ]]; then
  printf '%s\n' 'DRY RUN ONLY. No changes performed.' 'Would create two unprivileged test accounts and isolated state directories.' 'Would install a version-only systemd sandbox check. Never starts an AI model or touches existing services.' 'For a reviewed, root-owned copy: provision.sh --apply'
  exit 0
fi
if [[ $EUID -ne 0 ]]; then
  echo 'ERROR: Privileged provisioning requires an authorized root operator.' >&2
  exit 1
fi
if [[ "$(readlink -f -- "$0")" != "$DEST/provision.sh" ]]; then
  echo 'ERROR: Execute only the reviewed copy under /root/schmaqq-hermes-pilot-review.' >&2
  exit 1
fi
for f in "$DEST" "$DEST/provision.sh" "$DEST/$UNIT"; do
  if [[ ! -e "$f" || -L "$f" || "$(stat -c %u "$f")" != 0 ]]; then
    echo "ERROR: Root-owned non-symlink bundle required: $f" >&2
    exit 1
  fi
done
for n in "${USERS[@]}"; do
  dir="/var/lib/$n"
  if [[ -L "$dir" ]]; then echo "ERROR: Symlink forbidden: $dir" >&2; exit 1; fi
  if getent passwd "$n" >/dev/null; then
    home=$(getent passwd "$n" | cut -d: -f6)
    shell=$(getent passwd "$n" | cut -d: -f7)
    if [[ "$home" != "$dir" || "$shell" != "/usr/sbin/nologin" ]]; then
      echo "ERROR: Conflicting preexisting account: $n" >&2
      exit 1
    fi
  elif [[ -e "$dir" ]]; then
    echo "ERROR: Existing account directory without user: $dir" >&2
    exit 1
  fi
done
if [[ -L /etc/schmaqq-hermes-pilot || -L "$ENV_DIR" ]]; then
  echo 'ERROR: Configuration symlink forbidden.' >&2
  exit 1
fi
if [[ -d "$ENV_DIR" && -n "$(find "$ENV_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo 'ERROR: Pilot managed configuration override must remain empty.' >&2
  exit 1
fi
if [[ ! -x /opt/hermes-agent/venv/bin/hermes ]]; then
  echo 'ERROR: Hermes executable missing.' >&2
  exit 1
fi
if [[ -e "/etc/systemd/system/$UNIT" || -L "/etc/systemd/system/$UNIT" ]]; then
  if [[ -L "/etc/systemd/system/$UNIT" || ! -f "/etc/systemd/system/$UNIT" ]] || ! cmp -s "$DEST/$UNIT" "/etc/systemd/system/$UNIT"; then
    echo 'ERROR: Existing unit differs; refusing to overwrite.' >&2
    exit 1
  fi
fi
install -d -o root -g root -m 0755 /etc/schmaqq-hermes-pilot "$ENV_DIR"
for n in "${USERS[@]}"; do
  if ! getent passwd "$n" >/dev/null; then
    /usr/sbin/useradd --system --user-group --home-dir "/var/lib/$n" --shell /usr/sbin/nologin --no-create-home "$n"
  fi
  install -d -o "$n" -g "$n" -m 0700 "/var/lib/$n"
done
install -o root -g root -m 0644 "$DEST/$UNIT" "/etc/systemd/system/$UNIT"
systemctl daemon-reload
echo 'PREPARED: isolated identities and version-only preflight unit installed; no model login, no new runtime, no service started.'
echo 'Operator next checks: systemctl start schmaqq-hermes-pilot-preflight@a.service; systemctl start schmaqq-hermes-pilot-preflight@b.service'
echo 'Existing Hermes, Studio, Studio worker and main were not modified by this script.'
