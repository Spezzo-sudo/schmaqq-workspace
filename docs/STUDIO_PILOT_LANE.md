# SCHMAQQ Studio: dauerhafter Pilotkanal (ohne neue DNS-Einträge)

## Zielbild
- Die **bereits existierenden** HTTPS-Domains `studio-pr17.schmaqq.com` und `studio-pr17-assets.schmaqq.com` werden langfristig als interne Pilot-Lane weiterbetrieben. Namen bleiben aus Gründen der Kompatibilität zunächst PR17; sie bedeuten nicht mehr "nur PR17".
- Traefik-Router, HTTPS-Zertifikate, geschützte BasicAuth, Studio-Sitzungscookie, eigene Service-Unit und SQLite-Datenbank bleiben identisch.
- Neue GitHub-PRs werden im separaten Checkout gebaut und getestet. Erst ein **explizit genehmigter** Release-Candidate wird über den Versionswechsel in diese eine Pilot-Lane eingespielt.
- Public Production (`studio.schmaqq.com`), PR16, GitHub `main`, andere Router und Datenspeicher bleiben unabhängig.
- Keine neuen PR-bezogenen DNS A-Records. Die PR18-Hosts werden **nicht** verwendet.

## Freigabeprozess
1. PR erstellen und vollständig reviewen. Aus dem genehmigten Commit `npm run studio:build`, `node --test selfhost/*.test.mjs`, `tsc --noEmit`, Source Guard und `node selfhost/release.mjs` ausführen.
2. `node selfhost/release-smoke.mjs <release-dir>` für Manifest, echte Runtime, Auth, SQLite, Test-Backup. Den exakten Commit und SHA256 des Archivs als unveränderliches Release-Protokoll festhalten.
3. Root-fähiger Operator führt vor dem Wechsel ein unabhängiges Preflight aus: Quelle/hash/Manifest, richtige bestehende systemd Unit, aktueller SQLite-Zustand, Service-/Routing-Health, freier Platz und keine konkurrierende Veröffentlichung. Nur den vertrauenswürdigen Archivpfad auf dem VPS verwenden.
4. Nach Freigabe einmalig starten: `sudo bash ops/studio-pilot-promote.sh --apply <40-hex-git-sha> <absolute-release-archive> <64-hex-archive-sha256>`. **Nicht über Base64-Interpreter-Pipes ausführen.**
5. Der Operator erhält eine geprüfte SQLite-Online-Sicherung in `/var/backups/schmaqq-studio-pilot`. Ein versionsspezifisches Runtime-Verzeichnis wird unter `/opt/schmaqq-studio-pr17/releases/<commit>` abgelegt. Die bestehende PR17-Service-Unit startet mit demselben Wrapper. Der aktive Runtime-Pfad `runtime` und ein vorbereiteter Standby-Symlink `.previous-<commit>` liegen im **selben Installationsverzeichnis** und werden per Linux `renameat2(RENAME_EXCHANGE)` **atomar** getauscht. Auch nach SIGKILL bleibt `/opt/schmaqq-studio-pr17/runtime` als Verzeichnis oder gueltiger Symlink vorhanden.
6. Health Gates für `/healthz`, Root, API-Session sowie anonymes HTTPS 401 auf beiden Hosts. Bei einem Fehler wird **der Runtime-Code mit derselben atomaren Operation** zurückgeschaltet. SQLite wird absichtlich **nicht blind restauriert**, um zwischenzeitliche Benutzeränderungen nicht zu überschreiben.
7. Anschliessend Browser-E2E mit echtem Login, Rollen, Aufgaben, Editor, Runnern und Teamprüfung. Erst nach Bestehen ist der Pilot freigegeben. Nur nach separat ausdrücklicher Zustimmung weitere Umgebungen aktualisieren.

## Gefahren und Grenzen
- **Dies ist ein geprüftes, aber noch NICHT im echten Root-System durchgespieltes Operationsskript.** Vor dem ersten Einsatz ist ein gesonderter privilegierter Review / Probewechsel mit dem Operator erforderlich. `bash -n` prüft Syntax, nicht vollständige Runtime-Sicherheit.
- Kurzzeitige Unterbrechung beim systemd Neustart. Nicht als Zero-Downtime-Deployment ausgeben.
- Schemaänderungen benötigen vorher eine geprüfte vorwärts- und rückwärtskompatible Migration, ansonsten STOP.
- Nicht auf `main` mergen, nicht automatisch von GitHub Actions auf den VPS deployen.
- TLS-/Router-/DNS-Änderungen sind für reine Runtime-Wechsel unnötig; Benutzer, Passwörter, SQLite-Daten und Bootstrap-Dateien werden nicht neu angelegt.
- Die öffentliche Pilotsubdomain ist aus dem Internet erreichbar, **BasicAuth bleibt zwingend aktiviert**.
- Bei SIGKILL nach einem Dienst-Stopp kann der Service gestoppt bleiben, obwohl der Runtime-Pfad gueltig ist. Nach Prüfung des Kandidatenzustands lässt sich der alte Runtime-Stand **auch ohne Promotion-Prozess** über `sudo bash ops/studio-pilot-recover.sh --recover <40-hex-git-sha>` wieder aktivieren und der bisherige Service starten. Keine automatische Rollback-Behauptung bei SIGKILL, Powerloss oder unkontrolliertem Neustart.
- Die atomare Operation auf dem lokalen Linux-Dateisystem ist isoliert getestet; eine echte Stromausfall-Dauerhaftigkeitsprüfung oder Root-systemd-Probe ist **noch ausstehend**. Nach der Operation werden beide beteiligten Verzeichnisse per `fsync` synchronisiert.
- Für den späteren Marketingnamen `studio-pilot.schmaqq.com` wäre maximal einmalig eine Alias-Konfiguration nötig. Nicht Voraussetzung für den täglichen Ablauf.
- Archiv-SHA256 und Quellenfreigabe niemals durch einen bloßen untrusted GitHub-PR-Kommentar ersetzen.

## Verifizierte atomare Regressionen (isolierte Nicht-Root-Testpfade)

`python3 ops/test-studio-pilot-atomic.py`

`bash ops/test-studio-pilot-fullstack.sh /opt/schmaqq-studio-pr17/runtime /home/dc-remote/schmaqq-pr18-runtime-candidate-a4dfdfe/studio-runtime.tar.gz a4dfdfefbc16b29222337e2488245157bc2cd10d`

- Legacy-`runtime`-Verzeichnis ↔ neuer Release-Symlink atomar getauscht und wiederhergestellt.
- Zukünftige Symlink-zu-Symlink-Versionierung und Recovery.
- 24 beschleunigte SIGKILL-Versuche während des Promotion-Prozesses ohne beobachtete fehlende `runtime`-Datei.
- SIGKILL unmittelbar **nach** `renameat2()` und **vor** dem nachfolgenden `fsync()`; alter Runtime-Stand danach über den unabhängigen Recovery-Helfer wiederhergestellt.
- Falscher Candidate wird ohne Änderung am aktiven Pfad abgelehnt.

Ausserdem lief der isolierte Fullstack-Ablauf mit einer **Kopie** der aktuellen PR17-Runtime und dem echten PR18-Release-Archiv auf separaten Loopback-Ports erfolgreich: Alt-Frontend gestartet, atomar zum neuen Stand gewechselt, HTTP-Health/Auth geprüft und das alte Frontend erfolgreich zurückgeholt. Keine Datenbank des laufenden Studios verwendet.

Diese Tests ersetzen **keinen** privilegierten Root-/systemd-Test. Hermes muss in einer eigenen isolierten Installation die Services starten/stoppen, ein Backup erstellen, Crash-Recovery bestätigen und erst danach Preview-only freigeben. Bei unklarem Datenbank- oder Startzustand bleibt das Deployment gestoppt.

## Erster Candidate
- PR #18, HEAD `a4dfdfefbc16b29222337e2488245157bc2cd10d`
- Bereits gebautes Archiv: `/home/dc-remote/schmaqq-pr18-runtime-candidate-a4dfdfe/studio-runtime.tar.gz`
- SHA256: `b6db4b9f6bad3d1cb7df184b9b346a2f6140c0dcf9a87c819d8e204df3f1a98c`
- 702/702 Dateien, 25/25 Backendtests, TypeScript, Vite, Release-Smoke und separate Chrome-Regression bestanden.
- **Noch nicht in den bestehenden Pilotkanal eingespielt.** PR17 live ist derzeit weiterhin der alte Stand.
