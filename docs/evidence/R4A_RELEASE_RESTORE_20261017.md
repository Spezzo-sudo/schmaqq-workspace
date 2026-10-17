# R4-A Release- und Restore-Evidence – 17.10.2026

## Prüfidentität
- VPS: `srv1365337`; unprivilegierter Account `dc-remote`; **kein permanenter Studio-Dienst und kein Deployment**.
- Source of Truth: `Spezzo-sudo/schmaqq-workspace`, exakter Quell-SHA `51786459aa9aef83600581f9977309e7bdd77e2e`.
- Node: dedizierter temporärer `v24.22.0`; Node-Archiv-SHA256 gegen offizielle Release-Liste geprüft. System-Node bleibt `v22.22.2`.
- Einmaliger Build in `/home/dc-remote/schmaqq-r4-release-20261017` mit privatem npm-Cache, eigenen temporären Pfaden, niedrigerer CPU-/I/O-Priorität und Timeout. Keine GitHub-Actions-Läufe.
- `npm ci --ignore-scripts --no-audit --no-fund`: PASS, 692 Pakete. Das Unterdrücken von npm-Lifecycle-Skripten ist eine bewusste Einschränkung.
- `npm run studio:build`: PASS; Vite 8.0.13, 1806 Module.

## Gebautes und extrahiertes Paket
- `node selfhost/release.mjs`: PASS.
- Release-Archiv: **783465 Bytes**; Manifest: **697 Dateien**, **4199302 Nutzdatenbytes**.
- Archiv in frischen, separaten Ordner entpackt (698 Dateien einschliesslich Manifest).
- `node selfhost/release-smoke.mjs <entpacktes Release>`: **PASS**.
- Nachweise des Smoke: Manifest-SHA256 je Datei, Server-Start auf Loopback, HTTP-Assets, unauthentifizierte Entwicklungs-API -> 401, einmalige Eigentümer-Einrichtung, angemeldete Entwicklungs-API, konsistenter SQLite-Backup-Snapshot.

## Separater, konkreter Backup-/Restore-Test
- Ausschliesslich temporäre Fixture-Daten angelegt: Eigentümer, Projekt, zugewiesene Aufgabe und Dokument.
- `STUDIO_DATA_DIR=<fixture>` plus `node selfhost/backup.mjs <neuer Snapshot>`: PASS.
- Snapshotgrösse: **176128 Bytes**.
- Snapshot in **neuen** Datenordner kopiert, über `openStore` geöffnet:
  - `PRAGMA integrity_check` => `ok`
  - `PRAGMA foreign_key_check` => keine Fehler
  - Eigentümer, Projekt, Aufgabe und vollständiger Dokumentinhalt in restaurierter Datenbank vorhanden.
- **RESTORE_TEST=PASS (Fixture)**. Dies beweist keinen Wiederherstellungsvorgang aus der künftigen Produktion und keinen externen Backup-Speicher.

## Produktionsgrenzen
- Auf dem verbundenen Host vor Test rund 28,6 GiB frei; zwei CPU-Kerne, ca. 7,8 GiB RAM.
- Der systemd-Prototyp verwies ursprünglich auf `/usr/bin/node` (Node 22). PR #3 ändert **nur** die Vorlage zu `/opt/schmaqq-studio/runtime/node/bin/node`. Dieser produktive Pfad existiert **noch nicht** und darf nicht als bereits installiert gelten.
- Keine Ports ausserhalb Loopback veröffentlicht, kein öffentliches Studio, keine DNS-/Traefik-/Systemd-Änderungen.
- Zwei HTTPS-Origins, echter Account-Zugang, externe Backup-Aufbewahrung, dauerhaftes systemd-Startverhalten und Remote-Pilot sind nicht getestet.
- Alle Fixture-Daten waren Testdaten. **Cleanup ausgeführt: PASS**; gesamter exklusiver temporärer Ordner entfernt, keine Testports offen. Frei vor Cleanup **29,014,794,240 Bytes**, nach Cleanup **30,734,704,640 Bytes**. System-Node weiterhin **v22.22.2**. SCHMAQQ Production, SCHMAQQ Preview und KlimaFinder antworteten nach Cleanup mit **HTTP 200**. Kein Deployment oder produktiver Dienst erstellt.
