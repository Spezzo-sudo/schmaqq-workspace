# Live-Bestandsaufnahme und Updateplan – 17.10.2026

## Ergebnis und Umfang

Read-only-Prüfung gegen 20:35 Uhr Europe/Berlin über den bereits verbundenen
Remote Desktop Commander, Nutzer `dc-remote`, Host `srv1365337`. Ergänzend ein
authentifizierter GET über die zuvor persönlich angemeldete, eigene
Browsersteuerung. Keine Installation, Rechteausweitung, Datenbanköffnung,
Dienständerung, Routeränderung, Nachricht an Hermes oder Bereitstellung.

Der bestehende Betrieb funktioniert. Der neue Kollaborationskandidat ist noch
nicht live. Für ein Update fehlen insbesondere ein aktueller Backup-/Restore-
Nachweis unter dem Dienstbenutzer und die separate Betriebsfreigabe.

## Gemessener Istzustand

| Prüfung | Ergebnis |
| --- | --- |
| Studio-Dienst | `schmaqq-studio.service`, active/running, enabled; seit 13:11:06 UTC, NRestarts=0 |
| Release-Ziel von `current` | `/opt/schmaqq-studio/releases/b22175035f6f3d5c9a5c6894028ad7a0149f8761` |
| Herkunft Backend | Alle acht geprüften Runtime-Module stimmen per SHA256 mit diesem Git-Commit überein |
| Release-Manifest | 697 Dateien, 4.200.261 Nutzdatenbytes, alle manifestierten Dateihashes und Größen korrekt |
| Manifest-SHA256 | `aa3f3dabdfeac42982b2233b4e692938a2b9ed73c40a2d14de94e19103cf242e` |
| Neue Module | `connections.mjs` und `collaboration.mjs` fehlen im alten Live-Release erwartungsgemäß |
| Node | Eigenes Studio-Node v24.22.0; System-Node unverändert v22.22.2 |
| Dienstkonto | `schmaqq-studio`, eigenes Arbeitsverzeichnis `/opt/schmaqq-studio/current` |
| Datenpfad | `/var/lib/schmaqq-studio`, 0700, Dienst-UID 995 / GID 984; für Prüfaccount nicht lesbar |
| ENV | `/etc/schmaqq-studio.env`, root-owned 0600; Inhalt nicht gelesen |
| Isolation | ProtectSystem=strict, ProtectHome=yes, NoNewPrivileges=yes, PrivateTmp=yes, UMask=0077 |
| Schreibfreigabe | `/var/lib/schmaqq-studio`; StateDirectoryMode=0700 |
| Ressourcenlimits | MemoryMax=256 MiB, CPUQuota=50 %, TasksMax=64 |
| Verbrauch | MemoryCurrent=112.869.376 Bytes, etwa 108 MiB; Momentaufnahme |
| Datenträger | 102.888.095.744 Bytes gesamt; 30.580.879.360 Bytes frei, etwa 28,5 GiB |
| Inodes | 11.710.579 frei von 12.976.128; kein Engpass |
| RAM | etwa 7,75 GiB gesamt, 4,97 GiB verfügbar; kein Swap |
| Ports | Studio 4310 und Vorschau 4311 ausschließlich auf 127.0.0.1 gebunden |
| Neustartregel | Restart=on-failure, 5 Sekunden; kein Neustart ausgelöst |

Die Manifestprüfung belegt die Integrität gegenüber dem vorhandenen Manifest,
keine unabhängige Signatur des gesamten Builds. Die acht Quellcodevergleiche
betreffen server, store, reviews, workspaces, admin, backup, ai-routes und oidc.
Aktuell liegt nur dieses eine Release im Release-Verzeichnis.

## Erreichbarkeit und Runner

- Studio `/healthz`: 200 mit `ok=true`; `/api/studio`: private.
- Entwicklungs-API ohne Anmeldung: 401. Mit vorhandener persönlicher Sitzung: 200.
- Ein registrierter Runner `Windows-PC R5-A`, letzter Heartbeat beim Abruf eine
  Sekunde alt; eine Arbeitskopie. Keine aktiven Auftragsgeräte; die letzten
  zwölf Aufträge: elf completed, einer failed. Keine neuen Aufträge ausgeführt.
- Studio und `studio-preview.schmaqq.com`: TLS-Hostnamenprüfung erfolgreich;
  beide Zertifikate gültig bis 15.01.2027. Verschiedene Origins erhalten.
- Vorschau-Root `/`: 404. Das ist kein Test einer konkreten Projektvorschau und
  ohne Vorschaupfad kein Ausfallnachweis. Kein Capability-Link ausgegeben.
- `schmaqq.com`, `preview.schmaqq.com`, `klimafinder.ch`: jeweils HTTP 200.

## Grenzen dieser Prüfung

Der Prüfaccount darf weder Live-Daten noch ENV lesen. Backup-Verzeichnis,
vorhandene Snapshot-Inhalte, SQLite-Integrität und Restore sind deshalb nicht
verifiziert. Kein passender Studio-systemd-Timer sichtbar; daraus folgt nicht,
dass es keine Sicherung über Cron, Hermes oder den Provider gibt. Offsite-
Sicherung bleibt unbestätigt. Kein Versuch, diese Rechte zu umgehen.

TLS und Loopback-Erreichbarkeit sind belegt; die administrative Traefik-
Konfiguration, Uploadgrenze und deren Konfigurationssicherung wurden nicht
eingesehen. Der aktuelle Kandidat ist noch nicht auf Linux geprüft. Reboot-
Verhalten, längerfristige Stabilität und tatsächlicher Zwei-Personen-Fernpilot
werden durch diese Momentaufnahme nicht bewiesen.

## Konkreter Bereitstellungsablauf – vorbereitet, nicht ausgeführt

1. Draft-PR #6 prüfen und den einzusetzenden Quell-SHA ausdrücklich festlegen.
   Ausgangspunkt dieses Plans ist `c4e3fa2d6dcda6871a4619225c81c3bbb652c231`;
   ein späterer Merge-SHA muss neu bestimmt werden. Getrennte Freigabe für
   Merge und/oder Deployment einholen; beides ist hier nicht erfolgt.
2. Genau diesen freigegebenen Stand in isoliertem Checkout bauen und prüfen:
   `studio:verify`, Runtime-Paket und `release-smoke.mjs`. Auf Linux zusätzlich
   Auth-/HTTP-/Migrations-Smoke mit synthetischen Daten, ohne Live-Anmeldungen
   oder Runner-Tokens. Archivhash, Manifest und Quell-SHA zusammen protokollieren.
   Kein npm-Build im laufenden Service und kein globales Node-Update.
3. Befugter Administrator prüft Datenbankgröße, aktuelle Sicherung und
   Routerkonfig-Sicherung. Konsistenten neuen SQLite-Snapshot mit dem bestehenden
   `selfhost/backup.mjs` unter dem Dienstbenutzer und UMask 0077 erstellen.
   Eindeutiger Zielname, vorhandene Backups nicht überschreiben. Snapshot in
   separatem geschütztem Ordner restaurieren, integrity_check und
   foreign_key_check sowie Bestandszählungen prüfen; keinerlei Geheimnisse oder
   Team-Inhalte ins Protokoll. Sicherung enthält sensible Sitzungs-/Gerätedaten.
4. Altes Release erhalten. Neues Paket als neues root-owned Release unter
   `/opt/schmaqq-studio/releases/<freigegebener-sha>` ablegen, Hash/Manifest/
   Berechtigungen prüfen. Daten und ENV bleiben außerhalb der Releases.
   Bestehende Domains, Node-Runtime und Router müssen dafür nicht geändert werden.
5. Kurzes Wartungsfenster abstimmen: keine neuen Schreibzugriffe/Jobs, aktive
   Jobs vollständig abschließen. Studio kontrolliert stoppen, finalen konsistenten
   Snapshot des nun ruhenden Datenstands erstellen und validieren. Alten
   Symlink-Zielpfad und diesen Rückkehrpunkt festhalten. Beide Releasebestandteile
   gemeinsam umschalten; nur `schmaqq-studio.service` starten.
6. Vor Ende des Wartungsfensters prüfen: Dienststatus, private Health/API,
   Anmeldung, erhaltene Konten/Projekte/Kopien, additive Tabellen für Kommentare
   und GitHub-Verknüpfung, Runner-Reconnect ohne Neuregistrierung. Keine persönlichen
   KI-Aufträge. Fehlende GitHub-Clientregistrierung bleibt sichtbar deaktiviert;
   OAuth-Einrichtung ist ein anderer Arbeitsschritt.
7. Anschließend im freigegebenen Testprojekt Kommentare, eigene Kopien,
   echte Tests, Vorschauen und gegenseitigen Review mit zwei Personen abnehmen.
   Bestehende Websites und beide HTTPS-Origins erneut kontrollieren.

### Rückweg

Bei Fehler vor Wiederfreigabe aller Schreibzugriffe Studio stoppen, fehlerhaften
Datenstand geschützt erhalten, `current` auf das alte Release zurückstellen.
Nur falls dessen Datenkompatibilität nicht nachgewiesen ist: den finalen
Snapshot in einen neuen geschützten Datenordner wiederherstellen und den
Dienst gezielt darauf zurückstellen. SQLite-WAL/SHM nicht mit einem anderen
Snapshot mischen. Alten Dienst starten und Health/Login/Runner prüfen.

Sobald neue Benutzeränderungen zugelassen wurden, darf ein alter Snapshot nicht
blind eingespielt werden: erst Datenabgleich bzw. verlustfreier Rückweg planen.
Keine Live-DB löschen, keine gemeinsam genutzten Router/Container ändern.

## Nächste Entscheidung

Die Infrastruktur reicht für den nächsten Pilotstand. Vor Ausführung braucht
es die Freigabe des konkreten Releases und einen befugten Betreiber für
Backup/Restore und Dienstwechsel. Keine neue Infrastrukturbestellung nötig.
Ein erreichbares Studio führt weiterhin keine Jobs auf ausgeschalteten PCs aus.
