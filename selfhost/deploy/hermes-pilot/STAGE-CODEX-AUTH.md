# SCHMAQQ Hermes – persönliche Codex-Geräteanmeldung (nur Pilot A)

**Stand 16.11.2026. Status: Anleitung und Unit vorbereitet, NICHT installiert, NICHT ausgeführt.**

Diese Anleitung setzt den erfolgreich getesteten Hermes-Worker-Preflight und die separate Worker-Staging-Installation voraus. Die beiden Worker-Services `schmaqq-hermes-agent@a.service` und `schmaqq-hermes-agent@b.service` bleiben **inactive/disabled**. Produktion, `main`, `hermes.service` und Studio-Worker werden nicht verändert.

## Fakten aus der tatsächlich installierten Version

- Hermes Agent v0.20.5 bietet `hermes auth add openai-codex --no-browser`, das einen persönlichen *Device-Code* für `https://auth.openai.com/codex/device` ausgibt.
- `hermes login` ist nicht der richtige Weg für OpenAI-Codex-OAuth; `hermes auth login` gibt es nicht.
- Der Codex-Flow wartet bis zu 15 Minuten auf die persönliche Bestätigung. Der Code ist einmalig; niemals Access-/Refresh-Tokens in Telegram, Chat, Logs oder GitHub kopieren.
- Die lokale Proxy-Route `http://127.0.0.60:3128` beantwortet HTTPS-Anfragen zu `auth.openai.com` und `chatgpt.com`; dies belegt **nicht**, dass OAuth oder ein Modelllauf bereits erfolgreich waren.
- Die neue Unit `codex-auth@.service` ist gesondert von den Workern. Ihre einzige Aktion ist ein interaktiver, aber browserloser Codex-Gerätecode-Flow. Sie nutzt 512 MB, `ProtectHome=yes`, `NoNewPrivileges=yes`, `HERMES_SAFE_MODE=1`, `HERMES_IGNORE_USER_CONFIG=1`, `HERMES_IGNORE_RULES=1`, isoliertes `HERMES_HOME`, lokalen HTTPS-Proxy und keine Autostart-Sektion.
- **Wichtig**: Das neue Python-Login wurde bislang nur anhand der CLI, des installierten Quellcodes und der systemd-Unit geprüft. Es gab **noch keinen echten OAuth-Versuch**.

## Schritt 1: Root-Operator installiert nur die manuelle Auth-Unit

**Erst wenn der Owner den Auth-Pilot ausdrücklich zulässt.** Die folgenden Variablen sind fest definiert und müssen NICHT ersetzt werden. Root-Operator führt sie nur auf dem bereits bekannten VPS `srv1365337` aus. Keine Werte aus Chattext als Shell-Code übernehmen; die Source-Datei vor Installation prüfen.

Erwarteter SHA-256 von `codex-auth@.service`:
`872ff7eb58086b30f8149de6f2de6f93a4b0c60be2ac9b23e16888236895a37a`

```bash
SOURCE=/home/dc-remote/studio-hermes-queue-20261116/selfhost/deploy/hermes-pilot/codex-auth@.service
REVIEW=/root/schmaqq-hermes-agent-stage/codex-auth@.service
DEST=/etc/systemd/system/schmaqq-hermes-codex-auth@.service

install -o root -g root -m 0600 "$SOURCE" "$REVIEW"
sha256sum "$REVIEW"
```

**STOP**, falls der Hash nicht genau übereinstimmt oder die Unit bei der Codeprüfung unerwartete Befehle enthält. Erst danach:

```bash
install -o root -g root -m 0644 "$REVIEW" "$DEST"
systemctl daemon-reload
systemctl show schmaqq-hermes-codex-auth@a.service -p Id -p LoadState -p ActiveState -p User -p ProtectHome -p NoNewPrivileges -p MemoryMax -p IPAddressDeny -p IPAddressAllow
```

`ActiveState=inactive` und fehlende Autostartfähigkeit sind **erwünscht**. Das Installieren startet nichts, authentifiziert nichts und verändert keine der bisherigen Units.

## Schritt 2: Nur nach persönlicher Bereitschaft des Owners

**Erst wenn der Owner mit seinem eigenen ChatGPT-Konto am Browser bereitsteht**, darf der Root-Operator ausschliesslich diesen einen Login starten:

```bash
systemctl start --no-block schmaqq-hermes-codex-auth@a.service
journalctl -u schmaqq-hermes-codex-auth@a.service -n 35 --no-pager -o cat
```

Der Operator übermittelt dem Owner **nur** `https://auth.openai.com/codex/device` und den gerade angezeigten **einmaligen Benutzer-Code**, **keinen Access-/Refresh-Token**, keine Auth-Datei und keinen Administratorzugang. Der Owner meldet sich auf der **offiziellen OpenAI-Seite selbst** an und gibt den Code dort ein, **nicht im Telegram-Chat**.

Erfolgreiche Anmeldung kontrollieren (nach persönlicher Browserbestätigung):

```bash
systemctl show schmaqq-hermes-codex-auth@a.service -p Result -p ExecMainStatus -p ActiveState -p User -p MemoryMax -p ProtectHome
```

Ein erfolgreich abgeschlossener `oneshot`-Dienst zeigt `Result=success`, `ExecMainStatus=0`, `ActiveState=inactive` (normal). **Keine Tokeninhalte auslesen, sichern oder versenden.** Bei 429, Timeout, anderen Fehlern: STOP und nur Status/Fehlerklasse melden. Nicht blind erneut versuchen. Die Anmeldung von B benötigt ein eigenes ChatGPT-Konto und eine neue ausdrückliche Freigabe.

## Schritt 3: Erst nach verifiziertem Login

Die pro Person definierten, **noch nicht erstellten** Dienst-Tokens in privaten Dateien mit passenden Dateirechten zuordnen. Danach das Pilotbackend gezielt mit `STUDIO_HERMES_WORKERS_FILE` neu starten und **nur** `schmaqq-hermes-agent@a.service` einschalten. Erst dann einen echten, ausdrücklich ausgelösten Mara-Chatlauf prüfen.

**Modellwarnung:** In den vier Pilotprofilen steht noch `gpt-5-codex`; diese Kennung fehlt in der kuratierten Modellliste der installierten Hermes-Version. Zuerst die nach OAuth wirklich verfügbaren Codex-Modelle prüfen; ein unterstütztes Modell für Mara freigeben. `gpt-5.5` und `gpt-5.3-codex` erscheinen zwar im lokalen Offlinekatalog, ihre tatsächliche Berechtigung für das persönliche Konto ist **noch nicht bewiesen**.

Ohne diesen Nachweis keinen `verified-run`-Erfolg behaupten. Verbleibende Sicherheitsprüfungen: Token-Eigentümerbindung, echte Modellantwort, Egress, Speicherpeak, 2-Personen-Isolation, Abbruch. **Kein Merge/main/Produktionsstart ohne ausdrückliche Freigabe.**
