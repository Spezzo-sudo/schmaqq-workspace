# Allgemeine Projektkonfiguration – Live-Nachweis, 29.10.2026

Aktuelle Freigabe des Owners im laufenden Chat: **„ja, live“**, bezogen auf den
vorher lokal geprüften Stand. Keine Push-/Mergefreigabe daraus abgeleitet.

## Release und Rückweg

- Studio und Worker auf Quelle `f1394194b50c9f2153668d9d853cfac03be36bcc`.
- Git-Tree `6ddae785e02fc1a336c6b7e530980daba0719852`.
- Archiv-SHA256 `208b8e109ae2d740daf984d289a81996188b8a72e71830f61580d02a553e0a7c`.
- Vorheriger Stand / Rückweg für beide:
  `d6762de8d53748cb9994f78c325c3208c876ed92`.
- Backup: `/var/lib/schmaqq-studio/backups/predeploy-f139419-20261029T211356Z.sqlite`.
- Betriebsbelege: `/root/studio-staging-f139419/`, lokal kopierte nicht geheime
  Release-/Schema-/Laufzeitberichte unter `.studio/setup-qa-20261029/`.
- Kein Push, Merge, neues Konto oder Systempaket installiert. Commit-Autor nur
  für den lokalen Commit per Git-Aufruf gesetzt, keine globale Konfiguration.

Rückweg: unter `/run/schmaqq-studio-switch.lock` Studio-Symlink atomar auf das
vorherige Release setzen und Dienst neu starten; dessen `install-worker.sh`
mit demselben alten Release ausführen, Worker neu starten und die gleichen
Gesundheits-/Isolations-/Capabilities-Prüfungen wiederholen. Keine Datenbank
zurückkopieren, solange keine belegte Datenbeschädigung das erfordert.
Der ausgeführte Switch hatte einen automatischen Rückweg bei fehlgeschlagenen
Nachprüfungen; er wurde nicht ausgelöst. Ein tatsächlicher Rollback wurde bei
diesem Auftrag nicht eigens durchgeführt.

## Selbst ausgeführt

1. Sauberer Commit und danach `node selfhost/verify.mjs --local`, Exitcode 0:
   **271 Tests, 250 PASS, 0 FAIL, 21 erwartete Plattform-Skips**, Guard/TS/Build PASS.
   Prozess-PATH und `GIT_EXEC_PATH` gemäß OPERATIONS, keine globalen Änderungen.
2. `node selfhost/release.mjs`: Browserbundle aus sauberem Commit neu gebaut;
   Paket mit 3891 Dateien. Upload per scp, SHA256-Abgleich und Linux-
   `verify-release.mjs` bestanden. Keine npm-/Providerinstallation.
3. Backup als `schmaqq-studio`: Integrität OK, 0 Foreign-Key-Fehler, Modus 0600.
4. Probestart als Service-Nutzer mit gleicher EnvironmentFile auf **Datenkopie**,
   Loopback-Ports 4390/4391. Override der Datenpfade erst im gestarteten Prozess,
   damit die EnvironmentFile keinen Zugriff auf die Live-Daten erzwingen kann.
   Health 200, private API 401, MCP zulässiger Methodenzustand; Schema-Preflight
   vor und nach dem Start PASS. Probestart-Dienst danach beendet; Kopie behalten.
5. Unter flock erwarteten Altstand beider Komponenten geprüft. Studio-Symlink
   atomar umgeschaltet; Worker mit vorgeschriebenem Installer aktualisiert.
6. Tatsächliche Job-Isolationsprüfung: **10/10 PASS**. Worker-Sandboxprobe:
   **29/29 PASS**, keine Fehler. Kein Ersatz durch reine lokale Fixtures.
7. Alle vier eigenen Dienste aktiv: Studio, Worker, Egress-Proxy, Job-Starter.
   Worker meldet `setupPlanVersion: 1` frisch innerhalb des Wartefensters.
8. Lokale und öffentliche Health-Prüfung PASS, öffentliche private API 401,
   `/mcp` HTTP 405; Live-Schema-Preflight PASS.
9. Vorher/nachher gleiche Datensatzanzahlen für Mitglieder, Projekte, Geräte,
   Aufgaben und Dokumente. Keine aktiven Jobs vor Umschaltung. Kein Login als
   Owner und keine Projekt-/Task-/Freigabemutation im Namen des Owners.

Die kurzen Connection-Refused-Meldungen direkt nach den Service-Starts traten
innerhalb der begrenzten Bereitschaftswiederholungen auf; die nachfolgenden
Gesundheitsprüfungen bestanden. Daraus keinen dauerhaften Fehler ableiten.

## Klimafinder-Voraussetzungen: jetzt enger belegt

Nur vorhandene Repository-Metadaten gelesen: `requirements-build.txt` verlangt
`Jinja2>=3.1,<4`; Makefile-Aufbau war bereits lokal betrachtet. Keine Projekt-
Build-/Testbefehle ausgeführt, keine fremden Klimafinder-Dienste berührt.

Zusätzliche echte Prüfung **als isolierter Job** über den neuen Job-Starter:

- `make` und `python3` als ausführbare Programme gefunden.
- Python: `venv` vorhanden, `ensurepip` fehlt, `jinja2` vorhanden.
- Der Job lief unter der separaten Job-UID. Nur Standardbibliothek und bereits
  installierte Module geprüft, kein Paketdownload und keine Systeminstallation.
- Das belegt noch nicht die benötigte Jinja-Version oder den vollständigen Build.
  Der vorgeschlagene Schritt `make build-bootstrap` ist wegen fehlendem
  `ensurepip` noch nicht als ausführbar nachgewiesen und wird voraussichtlich
  beim Erzeugen der venv mit pip scheitern. Nicht als Produktiv-PASS darstellen.

Programmpräsenz ist bewusst von Moduleignung/Abhängigkeiten unterschieden. Die
Standard-Netzallowlist wurde nicht erweitert. Die neue Einrichtung ist live;
Klimafinders tatsächlicher Build bleibt ein eigener noch offener Praxisschritt.

## Nächster Schritt

Owner lädt Studio neu, öffnet Projekteinstellungen → **Projekt auf PC oder Server
einrichten** → Server-Worker → **Projekt prüfen**. Vorschlag und verbleibende
Python-Umgebungshürde gemeinsam bewerten. Kein blindes Wiederholen des alten
Formulars oder einer fehlgeschlagenen Installation. Für eine Änderung an den
Systemvoraussetzungen erst einen konkreten, separat freigegebenen Umfang festlegen.
