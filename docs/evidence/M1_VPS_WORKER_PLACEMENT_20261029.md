# M1: VPS als Hauptrechner, offen für jede KI – Nachweis

Datum 29.10.2026 (UTC-Nacht). Auftrag: Owner-Ziel „M1“ mit Freigabe für Production-
Updates nach festem Ablauf (sauberer Commit, Release-Prüfung, Backup, Probestart
auf Datenkopie, Umschalten mit automatischem Rollback, Nachweis).

## Live-Stand

- Studio-Production `schmaqq-studio`: Quelle `33a8dd24fbc4e6df1f99bfaf2da30f3adcb24138`,
  Archiv-SHA256 `3b1db220a07abb3b66f6cce99947cf25763e9345edee4483842567a08c2b637b`,
  `verify-release` PASS (embedded). Rückweg: `6de61c768ad6778f266f7b17f96e03524f115315`,
  davor `e7ee710596465cf49c4dbdc4c2472b087a59500b`.
- Server-Worker `schmaqq-studio-worker`: dasselbe Release unter `/usr/local/lib/schmaqq-worker`.
- Konfiguration: `STUDIO_PLUGIN_DYNAMIC_CLIENTS=1` ergänzt (Backup der vorherigen ENV im
  Staging-Ordner unter `/root/`). `STUDIO_PLUGIN_CLIENTS` unverändert (ChatGPT).
- Backups vor jeder Umschaltung: `predeploy-6de61c7-20261029T000932Z.sqlite`,
  `predeploy-33a8dd2-20261029T002056Z.sqlite` (integrity ok, 0 FK-Fehler, 0600).

## Tatsächlich geprüft

Lokal (Windows, Node 24.22.1, vollständiges Portable Git): `node selfhost/verify.mjs --local`
244 Tests, 223 PASS, 0 FAIL, 21 Plattform-Skips; Source Guard, TypeScript, Vite PASS.
Linux-Recovery bleibt NOT_VERIFIED. Neue Tests: `placement`, `studio-plugin-dynamic`
(offizieller MCP-SDK-Client über DCR **und** Client-Metadatendokument), `worker-deploy`
(Unit-Vertrag, Registrierung, Start über verlinktes Release, echter Server-Runner führt
automatisch vermittelte `prepare` und `check` aus), `schema-plugin-profile`.

Browser lokal (synthetisches Konto, zwei echte Runner PC/Server): Ausführer-Panel im
Projektraum, Regelwechsel ändert Empfehlung sofort, 375 px ohne Überlauf; Liste
„Verbundene KI-Assistenten“ zeigt eine DCR-Freigabe („Claude“) und widerruft sie;
Zustimmungsseite für selbst registrierte Clients zeigt Warnung und Rücksprungziel.

Production je Release: Probestart auf DB-Kopie (Startseite 200, Discovery 200,
Registrierung 201/400, `/mcp` ohne Token 401, Grants ohne Sitzung 401), Schema-Preflight
auf der Kopie **PASS** mit `pluginExtension: complete`; nach Umschaltung öffentlich 200,
`/mcp` 401, `registration_endpoint` veröffentlicht, Dienst aktiv.

Sandbox (`schmaqq-studio-worker-probe.service`, identische Sandbox-Zeilen): **22/22 PASS**,
u. a. uid 988 ohne Zusatzgruppen, Systemdateien/`/etc` EROFS, Studio-Datenbank unsichtbar,
Studio-Secrets EACCES, `/opt` und `/srv` leer, Docker-Socket EACCES, Loopback (Studio, SSH),
Docker-Bridge und 169.254.169.254 gesperrt, DNS und HTTPS zu Studio erreichbar, cgroup
2048 MB ohne Swap, 256 Prozesse, CPU 150 %, Volume 2951 MB. `systemd-analyze security`: 1.5 OK.

Echter Codejob (Operator-Pilot `pilot-job.mjs`, Projekt „Studio-Pilottest“, Gerät des
Studio-Besitzers „SCHMAQQ-VPS Server-Worker“), alle über Vermittlung `auto`:
`inspect` ready · `prepare` Branch `studio/fbffb0c4-…` · `check` 1/1 Test bestanden ·
`preview` gebaut und über die Vorschau-Origin ausgeliefert. Begründung am Auftrag:
„Automatisch: zuerst ein erreichbarer Server … → SCHMAQQ-VPS Server-Worker (Server)“ bzw.
„Arbeitskopie liegt auf diesem Ausführer“. Diese Aufträge erscheinen im Verlauf des
Besitzers; die Arbeitskopie heißt „VPS-Worker Pilot (vom Betrieb gestartet)“.

Live gegen Production mit dem offiziellen MCP-SDK-Client (`.studio/live-mcp-client-check.mjs`):
401 → Discovery → dynamische Registrierung → PKCE-Autorisierungsanfrage (S256, Scopes
`studio:read studio:code`, Resource `https://studio.schmaqq.com/mcp`). Die Seite im
Browser zeigt „KI-Assistent mit Studio verbinden – Melde dich zuerst mit deinem eigenen
Studio-Konto an“. Weiter geht es nur mit der Anmeldung des Owners; bewusst nicht ausgeführt.
Die dabei registrierte unbenutzte Test-Registrierung verfällt automatisch nach 7 Tagen.

## Was nur der Owner abschließen kann

1. Mit eigenem Login die neue Oberfläche live ansehen („Wo wird gearbeitet?“, „Verbundene KI-Assistenten“).
2. Einen Auftrag selbst aus Studio oder per KI-Assistent starten, der automatisch auf dem
   Server-Worker landet (bisher operator-gestartete Aufträge über dieselbe Vermittlung).
3. ChatGPT, Claude und Gemini mit den eigenen Konten verbinden (Anleitung AI_CLIENT_SETUP.md).

## Unterwegs gefundene und behobene Fehler

1. Plugin-Tabellen (seit Aktivierung am 28.10.) ließen den Schema-Preflight von
   Production auf BLOCKED fallen. Jetzt als exakte Alles-oder-nichts-Erweiterung
   eingetragen; Production-Kopie wieder PASS.
2. Erste Vermittlungsversion legte zwei Tabellen an (Verstoß gegen „Schemaänderung nur
   per versionierter Migration“); umgebaut auf `workspace_meta`, nie live gewesen.
3. Runner beendete sich beim Start über den Symlink `current` still mit Code 0.
   Realpath-Vergleich plus Regressionstest.
4. `state` war Pflicht; der offizielle MCP-Client sendet ihn nicht. Jetzt optional (OAuth 2.1/PKCE).
5. Sandbox-Probe las cgroup-Limits am falschen Pfad und prüfte den Docker-Socket per `stat`.
   Korrigiert; Limits zusätzlich per `systemctl show` bestätigt.

## Nicht geprüft / Grenzen

- **Keine Verbindung aus echten ChatGPT-, Claude- oder Gemini-Konten** (braucht den Owner).
- Kein Login mit echtem Konto in Production, daher keine Live-Sichtprüfung der neuen
  Oberflächen; Runner auf Marcos PCs nicht aktualisiert (melden weiterhin „PC“).
- Alle Aufträge auf dem Worker laufen unter einem Nutzer: Ein Auftrag kann die
  Worker-Konfiguration samt Gerätetoken lesen. Deshalb nur eigene Aufträge des Besitzers
  (heutige Regel); Teilen erst nach Isolation pro Auftrag (NETWORK_ROADMAP Stufe 1).
- Worker hat keinen Zugang zu privaten GitHub-Repositories (bewusst keine Zugangsdaten);
  der Pilot nutzt ein lokales Test-Repository.
- Kein Push, kein PR, kein Merge. Plattenbelegung VPS 85 % (15 GB frei), Worker-Volume 3 GB.

## Rückweg

Studio: Symlink `/opt/schmaqq-studio/current` auf `releases/6de61c7…` (oder `e7ee710…`)
setzen, `systemctl restart schmaqq-studio`; dynamische Clients durch Entfernen der Zeile
`STUDIO_PLUGIN_DYNAMIC_CLIENTS=1` abschalten. Worker: `systemctl disable --now
schmaqq-studio-worker`, Gerät in Studio widerrufen. Datenbank nur nach Prüfung aus den
obigen Backups wiederherstellen.
