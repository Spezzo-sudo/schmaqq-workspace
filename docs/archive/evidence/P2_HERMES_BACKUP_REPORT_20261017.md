# P2 – weitergeleiteter Hermes-Bericht

Quelle: vom Owner in diesem Chat am 17.10.2026 weitergeleiteter Ergebnisbericht
„SCHMAQQ Studio – P2 Backup/Wiederherstellung“. Externer Betriebsnachweis,
keine durch diesen Engineering-Agenten unmittelbar beobachtete Prüfung der
geschützten Live-Daten. Keine Zugangsdaten oder Datenbankinhalte übernommen.

## Von Hermes gemeldet

- Host `srv1365337`, Dienst active/enabled, Dienstkonto `schmaqq-studio`.
- Live-Daten `/var/lib/schmaqq-studio`; eigener Node v24.22.0.
- Neuer konsistenter Snapshot mit `selfhost/backup.mjs` unter dem Dienstkonto:
  `/var/lib/schmaqq-studio/backups/p2-20261017T185530Z/studio.sqlite`.
- Getrennte Restore-Datei:
  `/var/lib/schmaqq-studio/restore-tests/p2-20261017T185530Z/studio.sqlite`.
- Verzeichnisse 0700, Snapshot 0600, Eigentümer Dienstkonto.
- integrity_check PASS, foreign_key_check ohne Fehler, 19 Tabellen und
  aggregierte Bestandszählungen zwischen Snapshot und Restore identisch.
- Frühere Sicherung `studio-r4b-initial.sqlite` erhalten.
- Keine öffentliche Restore-Instanz, kein Dienstneustart, keine Änderung an
  Listenern, Router/DNS oder NetzKontor. Live weiterhin altes Release.

Damit ist die Backup-/Restore-Probe für diesen Snapshot **laut Hermes PASS**.
Kein Beleg für eine externe Sicherung, einen gestarteten restaurierten Dienst
oder den erfolgreichen Wechsel auf den neuen Kandidaten. Vor dem tatsächlichen
Update ist nach Ruhe aller Jobs/Schreibzugriffe ein frischer finaler Snapshot
notwendig, damit zwischenzeitliche Änderungen nicht verloren gehen.

## Zugriffshürde und Lösung

Hermes meldet fehlenden Zugriff auf den privaten Kandidatenbranch und dessen
Dokumentation. Das installierte Runtime-Paket enthält absichtlich kein vollständiges
Git-Repository und keine Projektdokumentation.

Der bestehende autorisierte Entwicklungszugang konnte denselben Branch bei
gezielter Prüfung weiterhin lesen. Es handelt sich um unterschiedliche
Zugriffskontexte. Keine Credentials kopiert und keine Rechte erweitert.

Für den Betrieb wird deshalb ein gesondertes kleines Runtime-Archiv mit
Quell-SHA, Archivhash, entpacktem Smoke-Test und den notwendigen Dokumenten
geschützt auf dem Server bereitgestellt. Der befugte Betreiber kann dieses
Paket übernehmen, ohne persönliche GitHub-Anmeldedaten zu erhalten.
Dies ist Vorbereitung, keine Deployment-Freigabe.


## Durch Engineering direkt beobachtete Paketübergabe

Nach Eingang des Berichts separat ausgeführt, nicht Teil der ursprünglichen
Hermes-Aussage:

- Quellstand `4a0092be2d04a4b66aa1d200cf7c9f9c53c4c47d` in frischem privaten
  Checkout. Keine Runtime-/Abhängigkeitsänderung gegenüber dem unter P1
  geprüften `57c274c52fb4fd67ca9f9dc857a4456962806a18`.
- `npm ci --ignore-scripts`, neuer Vite-Build, Runtime-Archiv und Smoke nach
  sicherem separatem Entpacken PASS. Vollsuite nicht unnötig wiederholt.
- Bereitgestellt unter
  `/home/dc-remote/schmaqq-studio-handoff/p2-4a0092b-20261017`.
- `schmaqq-studio-runtime.tar.gz`, 793.555 Bytes, SHA256
  `316d9f5fcd7903b5ab43b9e74947d3f81b09f69e15a464c3c6073fe0d43433bf`.
- 699 Manifestdateien, 4.241.345 Nutzdatenbytes. Der neue Archivhash unterscheidet
  sich wegen des erneuten Paketbaus vom früheren entfernten P1-Testarchiv.
- Mitgeliefert: `HERMES_README.md`, `delivery.json`, Live-Preflight,
  P1-Prüfbericht und Smoke-Skript. Kein GitHub-Zugriff für die Paketübernahme nötig.
- Stagingbereich 0700, Dateien 0600, Eigentümer `dc-remote`; Übernahme ausschließlich
  durch vorhandenen befugten Administrator. Keine neuen Zugänge eingerichtet.
- Dauerhaftes kleines Übergabepaket insgesamt 815.390 Bytes. Temporärer
  Buildbereich entfernt; beobachteter Zusatzbedarf beim Build ca. 1,2 GiB.
- Dienst weiterhin active, MainPID 815, NRestarts 0. Keine Installation,
  Änderung von current, Freigabe zum Deployment oder Nachricht an Hermes.

Der nächste Telegram-Auftrag kann ausschließlich auf die lokale
`HERMES_README.md` verweisen. Ausführung erst nach persönlicher Freigabe des
Studio-Dienstwechsels. Keine erneute GitHub-Authentifizierung anfordern.
