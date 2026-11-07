# SCHMAQQ Studio — R24-H1 Release-Gates und Datenwiederherstellung

Stand: 20. Oktober 2026. **Releasevorbereitung, kein Deployment.**

## 1. Ausgangsstand

- Production: R23 `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`.
- Neuester getesteter Quellstand vor R24-H1: R24-G2
  `a414e69e53f17c25ebb69911c24d9d992481d154` (Draft PR #33).
- R24-F GitHub-CI ist eingerichtet, aber GitHub Actions hat wegen
  gesperrter Abrechnung **keinen einzigen Job gestartet**.
- Hermes hat die echte HTTPS-Route verifiziert:
  Traefik -> Hostloopback -> Node:4310. Studio sieht `127.0.0.1`
  als Peer, aber der Backend-Port kann von anderen lokalen Prozessen
  direkt angesprochen werden. Daher **NO-GO** für
  `STUDIO_TRUSTED_PROXY_IPS=127.0.0.1`. Einstellung unset lassen.
- Offsite-Backups wurden auf Wunsch des Owners vertagt; das Risiko
  eines kompletten VPS-Ausfalls besteht weiter.

## 2. Ergebnis / tatsächlicher Geltungsbereich

R24-H1 fügt ein eng begrenztes Betreiberwerkzeug hinzu:
`selfhost/deploy/r24-local-backup.mjs`.

Dieses Werkzeug, nur nach ausdrücklichem Ownerauftrag durch einen
privilegierten Operator als `schmaqq-studio`-Servicebenutzer genutzt:

1. Öffnet die bekannte, bereits existierende Production-Datenbank
   ausschliesslich **read-only** für einen Schema-Preflight.
2. Inventarisiert das private Studio-StateDirectory. Unterstützte
   State-Einträge sind `studio.sqlite` mit SQLite-WAL-/SHM-Dateien,
   das optionale private `setup-link.txt` und `backups/`. Unbekannte
   Dateien/Verzeichnisse, Symlinks, Hardlinks und unsichere Dateirechte
   verhindern das Behaupten einer vollständigen Studio-State-Sicherung.
3. Schreibt **ausschliesslich neue lokale Backup-Dateien** unter einem
   automatisch zufällig benannten, privat geschützten `backups/r24-h1-*`-
   Verzeichnis. Die vorhandene DB bleibt geöffnet und unverändert.
   Der Live-Snapshot verwendet die bestehende SQLite-Operation
   `VACUUM INTO` und umfasst konsistent die committed WAL-Frames.
4. Kopiert gegebenenfalls die Bootstrap-Datei mit Modus 0600, ohne
   ihren Inhalt in Logs oder GitHub auszugeben.
5. Kopiert das Snapshot-SQLite **physisch** in ein separates privates
   Restore-Testverzeichnis, kontrolliert SHA256, Bytes,
   `PRAGMA integrity_check`, `PRAGMA foreign_key_check` und
   Schema-/Tabellenzählungen.
6. Startet **keinen** HTTP-Server und verbindet **keinen** Provider.
   Auf der kurzlebigen SQLite-Restorekopie wird die echte R24-
   `openStore()`-Funktion aufgerufen; sie muss die ursprüngliche
   Schema-/Tabellenzählung bewahren und darf nicht automatisch
   `PRAGMA user_version` von v0 auf v1 ändern.
7. Entfernt die private Restore-Testkopie. Der geschützte Backup-
   Snapshot und sein privater Prüfbericht bleiben auf dem VPS.
8. Meldet ausdrücklich `releaseSchemaGate=BLOCKED`, wenn das
   echte R23-Schema nicht der versionierten Referenz entspricht,
   oder der R24-Readonly-Migrationsplan unzulässig ist.

**Nicht eingeschlossen:** Betriebssystem/Host, TLS-/Traefik-Volumes,
Runtime-Binaries, verschlüsselte Provider-Credentials,
`/etc/schmaqq-studio.env`, Service-Unit, fremde Runner-Worktrees,
Client-Laptops oder GitHub-Daten. Ein **vollständiger
Studio-Service-Recovery-Nachweis** erfordert auch einen separaten
**root-exklusiven Konfigurations-/Release-Backup-Block** durch Hermes.
Eine SQLite-Sicherung alleine ist kein vollständiges VPS-Backup.

## 3. Testnachweis der Vorbereitung

Im isolierten, unprivilegierten Worktree (ohne echte DB):

- 7/7 neue gezielte Backup-/Restore-Regressionsprüfungen bestanden:
  aktive WAL-Schreibverbindung, Wiederherstellung samt
  Datenbestand, optionale private Bootstrap-Datei, fehlende
  Bootstrap-Datei, Schema-Drift mit dennoch erhaltenem Snapshot,
  unbekannte Persistenz, Symlink-/Rechte-Schutz, Pfadvalidierung.
- Der neue Restore-Durchlauf startet R24s echten
  Datenbankzugriff **nur auf der privaten Wegwerfkopie**.
- Die im PR zu dokumentierenden Gesamttests, Source Guard und
  Release-Manifest-Checks beziehen sich ausschliesslich auf
  synthetische Daten. **Sie ersetzen keine echte Production-Abnahme.**

## 4. Release-Gate-Matrix

| Gate | Aktueller Status | Was noch fehlt |
| --- | --- | --- |
| R24-G1/G2 Funktionalität | PASS (synthetisch) | Keine Änderung |
| Git-Release/Archivherkunft | PASS für G2; H1 in Arbeit | Finalen H1-HEAD pinnen und Paket prüfen |
| Tatsächliches R23-Schema v0 | **BLOCKED – PRIVILEGED** | Hermes read-only gegen echte DB |
| Reale DB-Snapshot-/WAL-Konsistenz | **BLOCKED – PRIVILEGED** | Hermes lokales Backup |
| Physischer Restore echter Daten | **BLOCKED – PRIVILEGED** | Hermes Kopie in privates Restore-Verzeichnis |
| R24-Store auf echtem Restore | **BLOCKED – PRIVILEGED** | Hermes offline auf Restorekopie |
| Gesamtes Studio-Service-Recovery-Kit | **BLOCKED – PRIVILEGED** | Geschützte Config/Unit/Runtime/Router-Inventur |
| Proxy-Routing | PASS | Hermes hat Route bestätigt |
| Trusted Client-IP-Header | NO-GO | Variable unset lassen, keine Änderung |
| GitHub Actions | **BLOCKED – BILLING** | Kontoinhaber behebt GitHub-Abrechnung, danach echter CI-Run |
| Productive Zwei-Personen-Nutzung | Zurückgestellt | Markus ist noch nicht aktiv |
| Production-Merge/Deployment | **NO-GO** | Gesonderter Owner-GO, Preflight, Rollbackplan |

### Besonders wichtig: R24-D-Migration

`selfhost/store.mjs` ist zwischen R23 und R24-G2 **bytegleich**.
Die v0->v1-Migration aus R24-D ist bisher nur für
synthetische Testkopien freigegeben; sie läuft in der normalen
R24-App **nicht automatisch**. Wenn wir das Release mit v0 betreiben,
bleibt die Ledger-Migration zunächst verschoben. Ein späteres
echtes v1-Upgrade benötigt einen eigenen freigegebenen
Migrationspfad und erneute Restoreprüfung. Keine spontane
Datenbankmanipulation im Zuge von H1.

## 5. Abschlussbedingungen

Das abschliessende Hermes-Evidence muss keine privaten Inhalte zeigen.
Erforderlich sind: exakte getestete Release-Quell-SHA,
`DB_SCHEMA=PASS|BLOCKED`, `USER_VERSION=0|OTHER`,
`WAL_SNAPSHOT=PASS|BLOCKED`,
`RESTORE_PHYSICAL=PASS|BLOCKED`,
`R24_STORE_RESTORE=PASS|BLOCKED`,
`STUDIO_STATE_SCOPE=COMPLETE|BLOCKED`,
`ROOT_CONFIG_KIT=PASS|BLOCKED`,
`LIVE_HEALTH=PASS|FAIL`,
`PRODUCTION_CHANGED=NO` für bestehende DB/Runtime und
`DEPLOYMENT=NOT_PERFORMED`.

**Backup-Dateien auf dem VPS sind ausdrücklich erlaubt**, aber weder
Stop/Restart noch Schema-Write, Token-/Environment-Ausgabe,
Netzwerk-/Provideränderung, Merge oder Deployment.

Ein erfolgreicher H1-Hermes-Block führt **nicht automatisch**
zum Production-GO. Die lokale Offsite-Schutzlücke und der
GitHub-CI-Billing-Block bleiben transparent.
