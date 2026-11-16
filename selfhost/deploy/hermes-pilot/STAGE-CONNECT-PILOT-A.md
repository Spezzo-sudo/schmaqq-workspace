# SCHMAQQ Hermes R1 – Pilotkonto A sicher an Messenger binden

**Stand 16.11.2026 – Vorbereitet, nicht angewandt.** Nur Pilot `/home/dc-remote/studio-r4-pilot` auf VPS `srv1365337`. Keine Änderungen an `main`, Produktion oder an Benutzer B. Keine Modellaufrufe.

## Bereits belegt

- Persönlicher ChatGPT/Codex-Zugang A ist laut Root-Operator angemeldet; dort wurde `personal Codex permission` bestätigt und es wurden verfügbare Modelle genannt.
- `Pilot Owner` besitzt **Mara** im isolierten R4-Pilotprojekt; die bestehende Modellkennung `gpt-5-codex` wurde am 16.11.2026 in der isolierten Test-SQLite auf **`gpt-5.6-sol`** umgestellt. Geschützte Backup-Kopie `data/studio-before-mara-model-20261116.sqlite` (0600), Kontozuordnung/Rechte unverändert.
- `/etc/systemd/system/schmaqq-hermes-agent@.service` und beide Worker-Programme sind installiert und hash-verifiziert. Beide Worker weiterhin inactive/disabled.
- Backend des isolierten Pilots läuft auf Loopback 127.0.0.1:14439; `STUDIO_ORIGIN=https://trace-containing-engineer-periodically.trycloudflare.com`, privater Gate-Proxy weiterhin vor dem Backend. Dieser Cloudflare Quick Tunnel ist **temporär**.
- Es fehlt die **private Zuordnung**: Studio-Pilot-Member-UUID A ↔ privates Worker-Token A ↔ Linux-User `schmaqq-hermes-a`. Genau dies richtet dieser Schritt ein.

## Root-Operator: Stage- und Hash-Prüfung (kein Secret, kein Model)

**Nur nach Owner-Freigabe** und Code-Review der folgenden Quelldatei aus dem Feature-Branch. Nicht als Root direkt aus dem Arbeitsbaum ausführen. Stattdessen zuerst in root-eigene Stage kopieren.

Datei: `selfhost/deploy/hermes-pilot/operator-bind-pilot-a.py`

Erwarteter SHA-256:
`9dfc4eabec0aad40a0a0e5e01b76c16f61c32c19bc7447eccd6cfe999e2dd7ac`

```bash
SOURCE=/home/dc-remote/studio-hermes-queue-20261116/selfhost/deploy/hermes-pilot/operator-bind-pilot-a.py
STAGED=/root/schmaqq-hermes-agent-stage/operator-bind-pilot-a.py

install -o root -g root -m 0600 "$SOURCE" "$STAGED"
sha256sum "$STAGED"
python3 "$STAGED" --check
```

**STOP**, falls SHA abweicht oder `PILOT_A_PREFLIGHT=PASS` fehlt. Bei jedem Widerspruch keine Änderungen.

## Root-Operator: Einmalige Zuordnung ohne Dienststart

Erst nach bestandenem Review und expliziter Freigabe:

```bash
python3 /root/schmaqq-hermes-agent-stage/operator-bind-pilot-a.py --apply
```

Der Script-Output darf nur Status enthalten. Das Script:

- liest die UUID **ausschliesslich aus der isolierten Pilot-SQLite**, prüft eindeutig `Pilot Owner`, `Mara`, Besitzer, Modell und Rechte;
- generiert **ein** frisches kryptographisches 32-Byte-Zufallstoken, druckt es nie aus;
- erzeugt ohne Überschreiben `/home/dc-remote/studio-r4-pilot/hermes-workers.json` (0600, `dc-remote:dc-remote`) und `/etc/schmaqq-hermes-pilot/worker-a.json` (0640, `root:schmaqq-hermes-a`);
- ändert **keine** Datenbank, Auth-Datei, Unit, Produktionsdienste, `main`, oder Benutzer B; startet **keinen** Worker und führt **keine** Inferenz aus.

Statusprüfung **ohne Dateiinhalte**:

```bash
stat -c '%a %U:%G %n' /home/dc-remote/studio-r4-pilot/hermes-workers.json /etc/schmaqq-hermes-pilot/worker-a.json
systemctl show schmaqq-hermes-agent@a.service schmaqq-hermes-agent@b.service -p Id -p ActiveState -p UnitFileState
systemctl is-active hermes.service schmaqq-studio.service schmaqq-studio-worker.service
```

## Danach durch Engineering-Assistenz, separat

1. Verifizieren, dass **nur zwei private Pilot-Konfigurationsdateien** vorliegen, und dass die isolierte DB unverändert ist.
2. **Nur den isolierten Pilot-Node-Prozess** unter `dc-remote` mit zusätzlicher Umgebungsvariable
   `STUDIO_HERMES_WORKERS_FILE=/home/dc-remote/studio-r4-pilot/hermes-workers.json` neu starten; sonstige ENV einschliesslich `STUDIO_ORIGIN`, `STUDIO_DATA_DIR`, Ports und privatem Gateway beibehalten. **Nie Produktions-`schmaqq-studio.service` neu starten.**
3. Authentifiziert prüfen, dass `GET /api/agent-runs?project=...` für den Pilot Owner `configured:true` und für die Kollegin `configured:false` liefert. Beide können noch keine gefälschten Antworten erzeugen.

## Erst danach: gezielter einzelner Worker-Pilot

Nur mit separater Owner-Freigabe für den echten Modellversuch:

```bash
systemctl start schmaqq-hermes-agent@a.service
systemctl show schmaqq-hermes-agent@a.service -p ActiveState -p SubState -p Result -p User -p MemoryMax
```

**Kein `enable`, kein Start B**. Worker A pollt nur localhost und ruft das Modell erst auf, wenn Pilot Owner in der echten Studio-Mara-Konversation seine eigene Nachricht mit **„Agent ausdrücklich beauftragen“** bestätigt.

Vor dem Test nie in der Projektvorschau mit realen Kunden-/Firmengeheimnissen experimentieren. Für den ersten Durchlauf eine kurze, unkritische Testfrage benutzen; die Projektkontext-Vorschau kann ausser der Frage auch berechtigte Projekttexte als Kontext an das Modell senden.

Danach durch technischen Auditor ohne Tokeninhalte abnehmen: erfolgreicher `verified-run`, Antwort zur originalen Nachricht, Kosten/Antwortzeit soweit zugänglich, Egress, Speicherpeak, Abbruch- und Kontotrennung. Bei unerwartetem Verhalten `systemctl stop schmaqq-hermes-agent@a.service`; andere Services nicht anfassen.

**Hinweis:** B bleibt in allen Phasen ohne OAuth und ohne Worker-Zuordnung. Kein Modellzugang mit der Kollegin teilen.
