# SCHMAQQ Studio – Hermes Agentenpilot R1 (isolierter Backend-Branch)

**Stand 16.11.2026.** Grundlage: [Issue #86](https://github.com/Spezzo-sudo/schmaqq-workspace/issues/86), Messenger-R4-Branch `44e83c1`, bestätigter systemd-Preflight A/B auf `srv1365337`.

**Wichtig: NOCH KEIN ECHTER INFERENZLAUF.** Dies ist eine abgegrenzte, testbare Verbindungsschicht. Keine produktive Installation, kein Merge und keine neuen Tokens im Git.

## Warum diese Form

Die vorhandene Studio-SQLite-Version wird streng gegen einen signierten Schemakatalog geprüft. Das kleine Agenten-Pilotledger liegt deshalb unter `hermes:v1:run:*` in **`workspace_meta`**, das Studio bereits dauerhaft und transaktional verwendet. Ohne neue Tabellen und ohne Produktionsmigration. Für grössere Teams später bewusst versionierte Migration mit Indexen.

Die Agenten (Mara, Eule, Leitwolf etc.) sind Profile im Studio-Projekt. **Ein Hermes-Prozess pro *menschlichem* Benutzer**, nicht pro Avatar, wenn ein konkreter Auftrag vorliegt. `schmaqq-hermes-a` und `schmaqq-hermes-b` sind bereits als nichtprivilegierte Pilotidentitäten angelegt. Die alten Betriebs-Hermes-/Worker-Dienste bleiben tabu.

## Was der Branch implementiert

- `POST /api/agent-runs` erstellt einen Auftrag **nur** für eine eigene, echte Studio-Nachricht an einen persönlich angelegten, aktiven Agenten; kein Agent-zu-Agent-Autostart.
- `GET /api/agent-runs?project=...` zeigt **nur eigene** Runs des angemeldeten Mitglieds. Ohne eigene Worker-Zuweisung: `configured:false`; `POST` antwortet `503` statt vorgetäuschter KI.
- `POST /api/agent-runs/cancel` stoppt Wartendes unmittelbar und Laufendes über `cancelling` plus Worker-Heartbeat.
- `POST /api/hermes-worker/claim`, `/heartbeat`, `/finish`: ausschliesslich localhost und mit **hoch-entropy dienstgebundenem Bearer-Token**. Token wird vom Betreiber dem exakt bestimmten Studio-Mitglied zugeordnet; jeder Claim schliesst andere Mitglieder aus.
- Pro Benutzer maximal **ein aktiver Auftrag**, deterministische Idempotenz je `owner + source_message + agent`, feste Lease/Heartbeat- und Queue-Timeouts.
- Ein vertrauenswürdiger Worker schreibt nur bei erfolgreichem Abschluss einen echten `origin='verified-run'`-Beitrag mit Agenten-ID und Antwortreferenz. Nutzer können `origin='verified-run'` nicht per Chat-API wählen. Replays, fremde Worker und verspätete Antworten nach Stopp werden verweigert.
- In der mobilen Messenger-Ansicht ist die bestehende, eigene Nachricht entweder **nur Chat** (Motor fehlt) oder sie bietet den ausdrücklichen Knopf **„Agent ausdrücklich beauftragen“**. Status, Abbrechen und Fehlermeldungen erscheinen ohne Fake-Antwort.
- Node-Worker (`selfhost/hermes-agent-worker.mjs`) und Python-Adapter (`selfhost/hermes-pilot-infer.py`) liegen als **Vorlagen**, noch nicht als Systemdienste installiert. Das Python-Skript nimmt den Prompt über **stdin** entgegen, nicht über öffentliche Prozessargumente, erzwingt `provider=openai-codex` und ein zur Laufzeit ausschliesslich in diesem Prozess registriertes, leeres SCHMAQQ-Toolset. `HERMES_SAFE_MODE=1`, `HERMES_IGNORE_USER_CONFIG=1` und `HERMES_IGNORE_RULES=1` verhindern Plugin-, Hook- und benutzerdefinierte Werkzeugübernahmen. Der Adapter verweigert jeden Start ohne diese Schutzumgebung. Anders als das Hermes-Toolset `context_engine` kann das SCHMAQQ-Toolset keine dynamischen Kontextwerkzeuge hinzufügen.

## Grenzen und Auth

Anfragen an den Modellanbieter können ohne persönliches OAuth fehlschlagen. Der bestehende erfolgreiche `hermes --version`-Preflight prüft nur Sandbox/Interpreter, **nicht** die Modellfreigabe, die Tokenablage, den Egress unter systemd, die Antwortzeit oder die tatsächliche Modellantwort.

`HERMES_HOME` des Benutzers enthält eigene Auth-Daten (0700). **Nie** `/root/.hermes`, ein fremdes `~/.codex/auth.json`, GitHub-Secrets oder globale ChatGPT-Tokens übernehmen. Erst **je Nutzer einzeln** den Hermes-Gerätecode-Flow starten und autorisieren; keine Zustimmung im Namen einer anderen Person.

Eine Workerzuordnung wird **ausschliesslich aus privater Datei** `STUDIO_HERMES_WORKERS_FILE` geladen, die den Studio-Mitglied-UUID `owner` und ein zufälliges 32-Byte-Bearer-Secret `token` enthält. Der Wert `token` ist base64url-kodiert (43 Zeichen) und darf nie per Chat, GitHub oder Log geteilt werden. Diese Datei benötigt ein gewöhnliches, nicht verlinktes Dateisystemobjekt mit Mode 0600. Ohne die Konfiguration wird kein Agentenlauf angenommen.

Die systemd-Vorlage `selfhost/deploy/hermes-pilot/agent-worker@.service` benötigt:
- unter `/opt/schmaqq-hermes-pilot/worker/` root-owned, lesbare `hermes-agent-worker.mjs` und `hermes-pilot-infer.py`
- pro Dienstbenutzer eine zu ihm gruppenlesbare, nicht weltlesbare private Konfigurationsdatei `/etc/schmaqq-hermes-pilot/worker-a.json` oder `worker-b.json` mit `backend` (lokales Studio-Backend), `origin` (exakter Studio-Origin) und `token` (nur sein eigenes)
- den bereits getesteten Python-Interpreter unter `/opt/schmaqq-hermes-pilot/runtime/python-3.11.15/bin/python3.11`
- einen ausdrücklich genehmigten lokalen HTTPS-Proxy für `auth.openai.com` und `chatgpt.com`. Der Adapter verweigert beliebige Hermes-Tools; die Unit blockiert direkte externe IP-Verbindungen.

**Kein Root-Befehl für diese Phase autorisiert.** Konfigurations-/Unit-Installation und persönliche OAuth-Anmeldung sind nach gesonderter Prüfung freizugeben. Zurzeit ist kein Agent-Worker aktiv und kein persönlicher Provider angemeldet.

## Testkriterien

- Unzugewiesene Person -> `503`, kein angeblicher KI-Lauf.
- Fehlende Sitzung / fremdes Projekt / fremder Agent / falsche Empfängernachricht -> abgewiesen.
- Identische Anfrage -> ein Run; zweite parallele andere Anfrage -> `409`.
- Falscher Worker-Token / fremde Laufkennung / falsche Lease / veraltete Lease -> abgewiesen.
- Echter Abschluss über authentifizierten Worker -> eine Nachricht mit `verified-run`, verknüpft mit Quellnachricht; keine menschlich gefälschten Modellnachrichten.
- Abbruch -> kein späteres Ergebnis veröffentlicht.
- **Vor echtem Benutzer-Test:** auf Android-390-px und Desktop prüfen und tatsächliche Hermes-Antwort (keine Teststubs), RAM-Peak, getrennte Tokens und Egress unter beiden systemd-Konten messen.

Der nächste Schritt nach grünem CI ist ein **separater, von `main` und Produktion unabhängiger Teststart auf dem VPS**. Erst danach erhält der Benutzer den Gerätecode für sein eigenes ChatGPT/Codex-Konto.
