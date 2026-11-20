#!/usr/bin/env bash
# Creates the places ("Plätze") for the chat sign-in of more people. Run as root, once, after the Studio version that
# knows places is live. Safe to run again: existing places stay as they are, only missing ones are added.
#
#   bash hermes-slots.sh [number of places, default 10]   (DRY=1 only says what it would do)
#
# Per place sNN: its own user schmaqq-hermes-sNN, its own service schmaqq-hermes-agent@sNN (the same hardened template
# as every chat service), its own secret in /etc/schmaqq-hermes-pilot/worker-sNN.json (readable only by that user), and an
# entry {slot, token} in the file Studio reads. A person takes a free place in the app; nothing here is done by the app.
set -euo pipefail

COUNT="${1:-10}"
WORKERS_FILE="${WORKERS_FILE:-/etc/schmaqq-studio-agent-workers.json}"
CONF_DIR="${CONF_DIR:-/etc/schmaqq-hermes-pilot}"
TEMPLATE="${TEMPLATE:-$CONF_DIR/worker-a.json}"   # backend and origin are taken from the first, working service
DRY="${DRY:-0}"
STUDIO_USER="${STUDIO_USER:-schmaqq-studio}"

[[ "$COUNT" =~ ^[0-9]{1,2}$ ]] && [ "$COUNT" -ge 1 ] && [ "$COUNT" -le 40 ] || { echo "Anzahl 1 bis 40 erwartet." >&2; exit 2; }
[ "$DRY" = 1 ] || [ "$(id -u)" = 0 ] || { echo "Nur als root." >&2; exit 2; }
[ -f "$TEMPLATE" ] || { echo "Vorlage $TEMPLATE fehlt." >&2; exit 2; }

run() { if [ "$DRY" = 1 ]; then echo "[Probe] $*"; else "$@"; fi; }
changed=0
for i in $(seq 1 "$COUNT"); do
  slot=$(printf 's%02d' "$i"); user="schmaqq-hermes-$slot"; cfg="$CONF_DIR/worker-$slot.json"
  if ! id "$user" >/dev/null 2>&1; then
    run useradd --system --user-group --no-create-home --home-dir "/var/lib/$user" --shell /usr/sbin/nologin "$user"
    echo "Benutzer $user angelegt."
  fi
  if [ ! -f "$cfg" ]; then
    token=$(head -c 32 /dev/urandom | base64 -w0 | tr '+/' '-_' | tr -d '=')
    if [ "$DRY" = 1 ]; then echo "[Probe] schreibe $cfg"; else
      python3 - "$TEMPLATE" "$cfg" "$token" <<'PY'
import json, sys
src, dst, token = sys.argv[1:4]
base = json.load(open(src))
json.dump({"backend": base["backend"], "origin": base["origin"], "token": token}, open(dst, "w"))
PY
      chown "root:$user" "$cfg"; chmod 0640 "$cfg"
    fi
    echo "Schlüssel für $slot angelegt."
  fi
done

# Studio's list: every place with its secret; existing entries stay untouched.
if [ "$DRY" = 1 ]; then echo "[Probe] trage Plätze in $WORKERS_FILE ein"; else
  added=$(python3 - "$WORKERS_FILE" "$CONF_DIR" "$COUNT" <<'PY'
import json, sys, os
path, conf, count = sys.argv[1], sys.argv[2], int(sys.argv[3])
entries = json.load(open(path))
have = {e.get("slot") for e in entries if e.get("slot")}
added = 0
for i in range(1, count + 1):
    slot = "s%02d" % i
    if slot in have:
        continue
    entries.append({"slot": slot, "token": json.load(open(os.path.join(conf, "worker-%s.json" % slot)))["token"]})
    added += 1
if added:
    tmp = path + ".new"
    json.dump(entries, open(tmp, "w"))
    os.replace(tmp, path)
print(added)
PY
)
  if [ "${added:-0}" -gt 0 ]; then
    chown "$STUDIO_USER:$STUDIO_USER" "$WORKERS_FILE"; chmod 0600 "$WORKERS_FILE"; changed=1
    echo "$added Plätze in die Liste von Studio eingetragen."
  fi
fi

for i in $(seq 1 "$COUNT"); do
  slot=$(printf 's%02d' "$i")
  run systemctl enable --now "schmaqq-hermes-agent@$slot"
done
# Studio reads the list when it starts.
if [ "$changed" = 1 ]; then run systemctl restart schmaqq-studio; echo "Studio neu gestartet."; fi
echo "Fertig: $COUNT Plätze."
