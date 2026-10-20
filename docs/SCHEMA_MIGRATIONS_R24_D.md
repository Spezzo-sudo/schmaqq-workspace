# SCHMAQQ Studio – R24-D: Versionierte SQLite-Migrationen

Status: **Draft, nur isolierte Testdatenbanken**. Basierend auf R24-Integration
(Commit `853aca47460d19b8713ec628023b4578a61d57e8`). Keine Änderung an
Production, keine produktive Datenbankmigration und keine Serverneustarts.

## Warum dieser Schritt?

Das bestehende R23-Schema hat 21 Tabellen, 25 explizite Schemaobjekte und
`PRAGMA user_version=0`. Der bisherige `openStore()`-Startpfad führt
`CREATE TABLE IF NOT EXISTS` aus, besitzt aber keine nummerierte
Migrationshistorie. R24-C ergänzt hierfür einen rein lesenden
Schema-Fingerprint und einen strikten Vorabcheck.

R24-D baut darauf einen **ersten tatsächlichen, atomar getesteten
Migrationsschritt** auf, ohne den bestehenden Serverstart umzubauen.

## Version 0 -> 1: 0001_establish_migration_ledger

- Vorher: vollständiger R23-Schema-Fingerprint, Integrität und
  Fremdschlüssel müssen bestehen. Unbekannte/teilweise geänderte Schemas
  sind nicht automatisch reparierbar.
- In einer SQLite-Transaktion `BEGIN IMMEDIATE` wird ausschliesslich
  `schema_migrations` mit Spalten `version`, `name`, `checksum` und
  `applied_at` neu angelegt.
- Ein historischer Eintrag mit fester SQL-/Versions-Prüfsumme wird
  protokolliert; `PRAGMA user_version` wechselt zu `1`.
- Die vorhandenen Anwendungsdaten, Mitglieder, Sessions, Jobs,
  Projekte, Dokumente und Runneridentitäten werden nicht umgeschrieben.
- Wenn der Schritt vor dem Commit scheitert, macht `ROLLBACK` die DDL,
  den History-Eintrag und den Versionswechsel rückgängig.
- Nach erfolgreichem Commit prüft der Lesemodus erneut alle bisherigen
  Objekte und die Migrationstabelle samt Prüfsumme.
- Ein zweiter Durchlauf ist ein **No-op**; unbekannte Versionsstände,
  zusätzliche Tabellen und veränderte History führen zum STOP.

## Sichere Benutzung

### Read-only-Migrationsplan

    /opt/schmaqq-studio/runtime/node/bin/node \
      selfhost/deploy/schema-migration.mjs \
      --db /geschuetzte/bestehende/studio.sqlite

Das CLI meldet `READY` bei einer bekannten R23-v0-Datenbank, `CURRENT`
bei einer gültig migrierten v1 und `BLOCKED` bei unbekanntem Zustand.
**Es gibt absichtlich keinen `--apply`-Parameter.** Bereits das reine
Lesen echter Production-Daten erfordert passende Betreiberrechte.

### Testmigrationen (nur synthetische Testkopien)

Der Code exportiert für Regressionstests die Funktion
`applyToSyntheticTestCopy(filename)`. Sie verweigert Ausführung ausserhalb
eines eindeutig markierten privaten `schmaqq-migration-fixture-*`-Ordners
unter dem System-Temp-Verzeichnis. Die Datei darf kein Symlink/Hardlink
sein; Marker und Verzeichnis müssen private POSIX-Rechte besitzen.

Dieser Executor ist **nicht** der spätere Hermes-/Production-Migrator.
Die integrierten Tests sind in `selfhost/schema-migration.test.mjs`
enthalten; `selfhost/verify.mjs` führt sie als Backendtest aus.

## Grenze des derzeitigen Umfangs

- `selfhost/store.mjs` startet weiterhin im **R23-kompatiblen Modus**:
  dessen alter `CREATE TABLE IF NOT EXISTS`-Pfad ist bewusst nicht
  umgestellt worden. Die Versionierung wird noch nicht automatisch beim
  Serverstart ausgeführt.
- Die v1-Änderung richtet zunächst nur die prüfbare Migrationshistorie ein.
  Neue fachliche Spalten/Tabellen erhalten künftig **eigene** versionierte
  Schritte, samt Restore-, Daten- und Rollbacktests.
- Vor jeder **späteren** produktiven Migration: aktueller Read-only-Check,
  exklusiver Deployment-Lock, konsistentes vollständiges Backup **inklusive
  weiterer persistenter Dateien**, isolierter Restore, schriftlich
  abgegrenztes Owner-GO, kontrollierte Schreibpause und Nachprüfung.
- Der Owner hat die **Einrichtung automatischer Offsite-Backups vorerst
  zurückgestellt**. Dadurch bleibt der Schutz vor Verlust des gesamten VPS
  unvollständig; das ist kein Freibrief, lokale Backups oder Restoretests
  bei schemaändernden Production-Aktionen wegzulassen.
- Es wurden weder Production-DB, Production-Accounts, Sessions, Runner
  noch PR16, PR17, DNS, Stripe oder andere Provider verändert.

## Regressionsprüfungen

Automatisch getestet werden deterministischer v0-Plan,
Transaktionsmigration, Erhalt von Datensätzen, idempotentes Wiederholen,
absichtlich unterbrochene Transaktion und Rollback, unbekannte Version,
fehlender Index, manipulierte Prüfsumme, zusätzliche v1-Tabelle,
fehlende/falsche Fixture-Markierung, Symlink-Verweigerung, read-only CLI,
fehlende DB-Datei und FK-Fehler.

**Nächster Schritt:** Unabhängige technische Review des Draft-PRs und
ein gesonderter, späterer Hermes-Operator-Entwurf für die Anwendung auf
einer *aus echtem Production-Backup wiederhergestellten, isolierten Kopie*.
Diese echten Production-Daten wurden für R24-D bisher nicht verwendet.
