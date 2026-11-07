# HERMES — R24-H2: R23-Auth-Schema + historischer Restore-Bestand

**Dieser Runbook-Entwurf ist vor Ausführung reviewpflichtig.**

Auftrag: **read-only** Schema- und Dateibestandsprüfung, danach
ein **neuer, geschützter lokaler SQLite-Snapshot** und
**physischer Restore nur einer Wegwerfkopie**. Das lokale Backup
ist bereits grundsätzlich vom Owner genehmigt. Ausführung erst
nach Einzelauswahl des genauen H2-Commits und Überprüfung des Diffs.

**KEINE** Änderung an laufender Datenbank, Services, Docker,
Traefik, Env, Port, GitHub oder Deployments. Keine Migration.
Historische Sicherungen und Restore-Verzeichnisse **nicht**
verschieben, löschen, chmodden oder kopieren, um einen PASS
zu erzwingen. Offsite-Backup weiterhin nicht einrichten.

## 0. Source und Privilegien

Quelle: `Spezzo-sudo/schmaqq-workspace` Draft R24-H2;
angegebenen H2-HEAD **exakt** gegen GitHub-HEAD verifizieren,
auf R24-H1 `91d08b27afd33216ea3cce6e2a9d8dd99f9a83ee`
ancestry prüfen.

**Nicht** direkt als root oder `schmaqq-studio` aus
`/home/dc-remote/` Code ausführen. Stattdessen nur den
genau verifizierten Git-Commit in einen exklusiven,
root-kontrollierten, kanonischen Stagingbereich extrahieren.
Owner root, keine Symlinks; niemand anders darf ihn verändern.

Stage genau diese zusammengehörigen, frisch aus dem Commit
kopierten Quelldateien:

- `selfhost/deploy/schema-baseline.v0.json`
- `selfhost/deploy/schema-auth-extension.v0.json` **(neu)**
- `selfhost/deploy/schema-preflight.mjs`
- `selfhost/deploy/schema-migration.mjs`
- `selfhost/deploy/r24-local-backup.mjs`
- `selfhost/backup.mjs`
- `selfhost/store.mjs`

Benutze die existierende verifizierte Node-24-Laufzeit
`/opt/schmaqq-studio/runtime/node/bin/node`;
alle drei Programme als **schmaqq-studio**-Servicebenutzer
ausführen; bereinigte Umgebung, kein `NODE_OPTIONS`,
keine zusätzlichen Preload-Module, keine Provider-Secrets.

## 1. Live-Schema strikt nur lesen

Servicekonto, laufendes Release, SHA, HTTPS-Health, DB-Dateityp
und Zustand (inkl. WAL) nur anhand sanitizierter Resultate prüfen.

Read-only:

    node <ROOT_PINNED_STAGE>/selfhost/deploy/schema-preflight.mjs \
      --db /var/lib/schmaqq-studio/studio.sqlite

    node <ROOT_PINNED_STAGE>/selfhost/deploy/schema-migration.mjs \
      --db /var/lib/schmaqq-studio/studio.sqlite

**Nur wenn** alle ursprünglichen 25 Kernobjekte plus alle
vier aus dem gepinnten R23-Quellstand abgeleiteten Auth-Tabellen
(exakte SQL-Hashes, Spalten, FK, erwartete v0-Version)
stimmen, `SCHEMA_PROFILE=R23-v0-with-complete-auth` und
`SCHEMA_PREFLIGHT=PASS` melden. Zusätzliche Tabellen,
abweichende Strukturen, falsches FK oder die Hälfte der
Erweiterung führen zu **BLOCKED**.

Ein `MIGRATION_PLAN=READY` bedeutet **nur**, dass die
künftige v0→v1-Migration theoretisch geplant werden könnte.
**Nicht** auf echter Production ausführen.

## 2. Historische Restore-Verzeichnisse rein lesend prüfen

Unter dem bekannten geschützten
`/var/lib/schmaqq-studio` sind folgende ältere Einträge
gemeldet: `backups` (bisher 0755),
`restore-test` und `restore-tests`.

Die Namen sind **keine Freigabe zum Löschen**.

Mit vorhandenen Betreiberrechten für **jeden** der drei Einträge
ausschliesslich über `lstat`/`stat`/readonly-Verzeichnis-
enumeration prüfen:

- regulärer kanonischer Ordner, kein Symlink/Hardlink-Trick;
  exakte UID/GID im Vergleich zu `schmaqq-studio`
- keine Gruppen-/Welt-Schreibrechte
- Elternordner `/var/lib/schmaqq-studio` ist 0700;
  kein frei zugänglicher weiterer Alias
- der historische `restore-tests`-Pfad wurde bereits am
  17.10. im P2-Hermes-Report erwähnt; Inhalt/Anzahl/Typ der
  gespeicherten Dateien nun **ohne Namen oder Inhalte** prüfen
- `restore-test` zusätzlich klassifizieren, weil seine
  Herkunft noch nicht ausreichend dokumentiert ist
- alte `backups`-Dateimodi und Eigentümer **lesend**
  prüfen; nicht nur den Elternordner

Ein Child mit Modus **0755** ist durch den 0700-Elternordner
gegen gewöhnliche fremde Unix-Konten abgeschirmt, sofern
die Eigentümer- und Pfadchecks stimmen. Trotzdem sind die
alten Datei-/Ordnerrechte und nicht klassifizierten Artefakte
ein eigenes **BLOCKED_OPERATOR_REVIEW**-Gate.

**Keine** bestehenden Berechtigungen anpassen. Bei gefährlichem
Symlink, unpassender UID oder Gruppen-/Welt-Schreibrecht:
vor Snapshot **BLOCKED** und Befund nur sanitisiert melden.

## 3. Neu gesicherter Snapshot & echter Offline-Restore

Nach erfolgreicher Source-, Rechte- und Disk-Space-Prüfung
mit mindestens ca. doppelt ausreichendem Platz:

    node <ROOT_PINNED_STAGE>/selfhost/deploy/r24-local-backup.mjs \
      --data-dir /var/lib/schmaqq-studio

Das neue H2-Tool schützt alle neuen Daten mit 0700/0600,
legt ausschliesslich ein **neues, nicht bestehendes**
`/var/lib/schmaqq-studio/backups/r24-h1-<random>`-Bundle an
(die historische Namenskonvention im H1-Skript bleibt).
Der Original-DB-Zugriff ist read-only, `VACUUM INTO`
schreibt den konsistenten SQLite-Snapshot.

Die neuen Dateien werden in eine getrennte **private** Test-
kopie zurückkopiert. Einmalige R24-`openStore()`-Probe
läuft **nur auf dieser Kopie**, niemals auf der Live-DB.
Der Test vergleicht Integrität, FK, Schema und Tabellenzählungen;
der Testordner wird entfernt, das neue private Backup bleibt.

Wenn die vier Auth-Tabellen exakt stimmen, aber historische
Restore-Artefakte oder `backups=0755` noch nicht klassifiziert
sind, ist folgendes **korrekt und erwartet**:

    SCHEMA_PREFLIGHT=PASS
    LOCAL_SNAPSHOT=PASS
    PHYSICAL_RESTORE=PASS
    R24_OPENSTORE_RESTORE=PASS
    STUDIO_STATE_INVENTORY=BLOCKED_OPERATOR_REVIEW
    R24_RELEASE_GATE=BLOCKED

In diesem Fall liefert das Werkzeug **Exitcode 2** mit
JSON-Ergebnissen für Snapshot und Restore. **Exitcode 2
nicht blind als Snapshot-Failure interpretieren.**
Bei Exitcode 1 ist der Lauf dagegen technisch blockiert;
den Fehler **nicht** mit manuell weniger strengen Checks umgehen.

Genaues Backup-Material und private Berichte nur auf dem
VPS aufbewahren. **Keine** DB-Bytes, Accounts, Benutzernamen,
IDs, E-Mails, SQL-Inhalte oder Bootstrap-Links publizieren.

## 4. Root-Recovery-Kit nicht duplizieren

Hermes berichtete bei H1 bereits ein geschütztes Root-Kit
mit EnvironmentFile, systemd-Unit, aktuellem R23-Release,
Traefik-/Router-Metadaten und ACME-Recovery-Material.
Dieses **nur read-only verifizieren**; nicht erneut erstellen,
kopieren, verschieben oder veröffentlichen, sofern nicht
explizit vom Owner genehmigt.

Externe Runner-/Provider- und vollständige Host-Recovery
sind damit nicht automatisch vollständig gesichert.

## 5. Abschlussbericht nur sanitisiert

    SOURCE_SHA=<exakter H2-HEAD>
    LIVE_RELEASE_SHA=<immer noch R23>
    R23_AUTH_SOURCE_MATCH=YES|BLOCKED
    SCHEMA_PREFLIGHT=PASS|BLOCKED
    SCHEMA_PROFILE=<voller Name|unverified>
    SQLITE_INTEGRITY=PASS|BLOCKED
    FOREIGN_KEYS=PASS|BLOCKED
    MIGRATION_PLAN=READY|BLOCKED|CURRENT
    EXISTING_BACKUPS_PARENT_MODE=0755|OTHER
    LEGACY_RESTORE_DIRS=KNOWN_NAMES_PRESERVED|BLOCKED
    LEGACY_RESTORE_CONTENTS=REVIEWED|UNVERIFIED
    LEGACY_BACKUP_FILES_PRIVATE=PASS|BLOCKED
    STUDIO_STATE_INVENTORY=COMPLETE|BLOCKED_OPERATOR_REVIEW
    LOCAL_WAL_SNAPSHOT=PASS|BLOCKED|NOT_RUN
    PHYSICAL_RESTORE=PASS|BLOCKED|NOT_RUN
    R24_OPENSTORE_RESTORE=PASS|BLOCKED|NOT_RUN
    NEW_BACKUP_PRIVATE_PERMISSIONS=PASS|BLOCKED|NOT_RUN
    LOCAL_BACKUP_SHA256=<nur bei Erfolg>
    ROOT_KIT_UNCHANGED=YES|BLOCKED
    R24_RELEASE_GATE=PASS|BLOCKED
    PRODUCTION_DB_SCHEMA_WRITES=NO
    PROD_SERVICE_RESTARTED=NO
    PRODUCTION_RUNTIME_CHANGED=NO
    OFFSITE_BACKUP=SKIPPED_BY_OWNER
    DEPLOYMENT=NOT_PERFORMED
    SECRETS_EXPORTED=NO

Wenn einzelne Daten nicht prüfbar sind, ausdrücklich
**BLOCKED** oder **UNVERIFIED**, niemals erraten.

Ein Snapshot- oder Schema-PASS allein autorisiert weiterhin
**keine** R24-Produktion, keinen Merge und keine Migration.
GitHub Actions bleibt unabhängig hiervon wegen Billing
gesperrt; die Proxy-Trusted-IP-Einstellung bleibt unset.
