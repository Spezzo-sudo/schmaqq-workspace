# SCHMAQQ Hermes R1 – Nächster Root-Operator-Schritt: Worker-Dateien bereitstellen

**Stand:** 16.11.2026. **Status:** Nur Paket erstellt und geprüft; privileged Install **NICHT** ausgeführt. [Issue #86](https://github.com/Spezzo-sudo/schmaqq-workspace/issues/86).

Die **beiden** alten Preflight-Tests waren gemeldet und am VPS verifiziert: `Result=success`, `ExecMainStatus=0`, `ProtectHome=yes`, je 512 MB.

Diesen Schritt nur über den autorisierten Root-Operator auf `srv1365337`, nur nach dessen Codeprüfung. Kein Zugriff auf `/root/.hermes`, keine Änderung an `hermes.service`, `schmaqq-studio.service`, `schmaqq-studio-worker.service`, `main` oder Produktionsdaten.

## Abnahmegrundlage / Hashes

| Datei | Erwarteter SHA-256 |
|---|---|
| `operator-install-worker.sh` | `32a1b8a6decddfc91da4acfc5626e0b94cb696869176f822efb9b099469f29c4` |
| `agent-worker@.service` | `10e89f2b74dfe11af6cf7d7bbdd39f413c6ea2dd8dc29dea9ce031b742a67b5b` |
| `hermes-agent-worker.mjs` | `8022e25d5f2ba1937e7a10fbdeea9e852b09ca6420b201e3867c8096ce8c7964` |
| `hermes-pilot-infer.py` | `2c5dcc098462e6b612394362a8d95c50758a475fd32c459ef64b36ac78314018` |

**R1-Werkzeug-Gateway (Upgrade):** Das Skript ersetzt bereits installierte Worker-Dateien nur, wenn sie exakt der vorher geprüften No-Tools-Fassung (`fdb0c1e0…`, `dc93e96c…`) entsprechen und beide Worker-Units inaktiv sind. Danach muss `--check` als Sandbox-Benutzer `HERMES_ZERO_TOOLSET=PASS` und `HERMES_STUDIO_TOOLSET=PASS` ausgeben, sonst STOP.

**Wichtig:** `/home/dc-remote/studio-hermes-queue-20261116` enthält ausschliesslich eine Entwicklungsarbeitskopie. Root darf dort **keinen Code unmittelbar ausführen**. Zuerst Dateien nach `/root` kopieren und **danach** dort die Hashes unabhängig prüfen. STOP bei jeder Abweichung.

Alle Pfade und Variablen in den folgenden Befehlen sind konkrete Werte für den bestehenden Pilot. `SRC` und `STAGE` sind hier definierte Shellvariablen, **keine vom Nutzer zu ersetzenden Platzhalter**.

```bash
SRC=/home/dc-remote/studio-hermes-queue-20261116
STAGE=/root/schmaqq-hermes-agent-stage

install -d -o root -g root -m 0700 "$STAGE"
install -o root -g root -m 0700 "$SRC/selfhost/deploy/hermes-pilot/operator-install-worker.sh" "$STAGE/operator-install-worker.sh"
install -o root -g root -m 0600 "$SRC/selfhost/deploy/hermes-pilot/agent-worker@.service" "$STAGE/agent-worker@.service"
install -o root -g root -m 0600 "$SRC/selfhost/hermes-agent-worker.mjs" "$STAGE/hermes-agent-worker.mjs"
install -o root -g root -m 0600 "$SRC/selfhost/hermes-pilot-infer.py" "$STAGE/hermes-pilot-infer.py"

sha256sum "$STAGE/operator-install-worker.sh" "$STAGE/agent-worker@.service" "$STAGE/hermes-agent-worker.mjs" "$STAGE/hermes-pilot-infer.py"
bash "$STAGE/operator-install-worker.sh"
```

Erst nach bestandenem Hash-Vergleich und erneutem Code-Review:

```bash
bash /root/schmaqq-hermes-agent-stage/operator-install-worker.sh --apply
systemctl show schmaqq-hermes-agent@a.service schmaqq-hermes-agent@b.service -p Id -p ActiveState -p User -p MemoryMax -p ProtectHome -p NoNewPrivileges
systemctl is-active hermes.service schmaqq-studio.service schmaqq-studio-worker.service
```

Erwartung: Nur root-owned, lesbare Worker-Dateien in `/opt/schmaqq-hermes-pilot/worker/`, neue **nicht gestartete / nicht aktivierte** Unit `/etc/systemd/system/schmaqq-hermes-agent@.service`. Keine persönlichen Auth-Daten, keine Worker-Token, keine Inferenz. `inactive` ist derzeit **korrekt**.

## Danach (separat, nicht Teil dieses Installationsskripts)

1. Betreiber + Personen ordnen die zwei Studio-Pilotkonten je einem Sandbox-Benutzer zu. Die betroffenen Studio-UUIDs werden **auf dem VPS aus der getrennten Test-SQLite** abgerufen. Niemals im Browser per frei editierbarem Namen.
2. Der Betreiber erzeugt zwei unabhängige, kryptographisch zufällige Service-Token. Ein Token darf nur im eigenen `worker-a.json` bzw. `worker-b.json` und in der Backend-Datei `hermes-workers.json` landen. Dateien mit passenden Owner-/Gruppenrechten und 0600/0640. Keine Tokens in Issues/PR/Chat.
3. **Jede Person autorisiert persönlich** einen eigenständigen Hermes-Codex-Gerätecode-Login im eigenen `HERMES_HOME`; keine Übernahme bestehender Betriebs- oder anderer Benutzer-Tokens. Vorher keinerlei Model-Run.
4. Mit persönlichem OAuth-Nachweis das **isolierte R4-Pilotbackend** neu laden, um `STUDIO_HERMES_WORKERS_FILE` einzulesen. Erst dann **eine** Sandbox-Unit `schmaqq-hermes-agent@a.service` starten und per realer Chatnachricht an Mara testen. Erst nach Erfolg und gemessener RAM-Nutzung den zweiten Benutzer starten.
5. Bot-zu-Bot, freischreibende MCP-Werkzeuge und Code-Veränderungen sind **ausdrücklich nicht enthalten**.

**Nicht als Produktion oder dauerhafte Staging-Einrichtung ausgeben.** Die aktuelle Test-URL hängt an einem temporären Cloudflare-Tunnel.
