# SCHMAQQ Studio — SQLite-Schema-Preflight (R24-C)

Status: **nur prüfender Kandidat**, gestapelt auf dem live verifizierten
R23-Quellcommit. **Keine Migration, kein Merge, kein Production-Deployment.**

## Wozu dieser Baustein dient

Der bisherige Studio-Server legt Tabellen direkt in `openStore()` via
`CREATE TABLE IF NOT EXISTS` an. Eine nachvollziehbare, nummerierte
Migrationsserie gibt es **noch nicht**. Dadurch lassen sich beschädigte,
unbekannte oder nur teilweise aktualisierte Datenbanken beim Releasewechsel
nicht ausreichend unterscheiden.

R24-C liefert eine **fest eingefrorene, nicht manipulierende Referenz**
des R23-Datenbankschemas und einen unabhängigen Prüfprozess.

- Referenz: `selfhost/deploy/schema-baseline.v0.json`.
- Herkunft: isolierte leere SQLite-Datenbank aus dem **exakten R23-Code**
  `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`.
- Referenzumfang: 21 Anwendungstabellen und 25 explizite SQLite-Schemaobjekte
  (Tabellen/Indizes/Trigger), mit SQL-Hashes, Spalten, PKs und Fremdschlüsseln.
- `PRAGMA user_version` ist in R23 **0**, also bewusst als
  `legacy-unversioned-v0` markiert, **nicht** als schon migriert.
- Das Werkzeug prüft Read-only SQLite, integritäts- und FK-Checks,
  Schemaobjekte, Spalten und Versionsnummer. Es meldet `PASS` oder
  `BLOCKED`, ohne private Zeileninhalte oder Tokens auszugeben.

## Verwendung — nur mit autorisiertem Lesezugang

    /opt/schmaqq-studio/runtime/node/bin/node \
      selfhost/deploy/schema-preflight.mjs \
      --db /geschuetzter/bestehender/pfad/studio.sqlite

Bei Production niemals Kopien mit `openStore()` prüfen: Diese Funktion
führt schreibende DDL/Seed-Operationen aus. Das R24-C-Werkzeug öffnet dagegen
direkt mit `DatabaseSync(..., {readOnly:true})` und `PRAGMA query_only=ON`.

Die tatsächliche Production-Datenbank kann nur der autorisierte
Dienstbenutzer/Hermes-Operator einsehen. Der Befehl ist in diesem PR
**nicht** auf Production angewandt worden.

Ein unklarer Status ist nicht automatisch reparierbar: `BLOCKED`
bedeutet **STOP**, Schema-/Datenbestand anhand geschützter Backups prüfen.

## Tests (synthetische, temporäre Datenbanken)

- Bekannter R23-v0-Stand: PASS, keine Änderungen.
- Unbekannte Versionsnummer: BLOCKED.
- Fehlende Tabelle: BLOCKED, keine Neuanlage.
- Fehlender Index: BLOCKED.
- Verwaister Fremdschlüssel: BLOCKED, keine privaten Zeilen ausgegeben.
- Fehlende Datenbankdatei: verweigert, keine Datei angelegt.

Die Tests sind in `selfhost/schema-preflight.test.mjs` und werden von
`selfhost/verify.mjs` als reguläre Backendtests ausgeführt.

## Nächste gesonderte Etappe: echte nummerierte Migrationen

1. Jede neue Migration erhält eine eindeutige, unveränderliche Nummer,
   dokumentierte Vor-/Nachbedingungen, ID des Quell-Schemas und negative Tests.
2. Vor einer Migration müssen die Read-only-Prüfung, frisches konsistentes
   Full-Data-Backup und isolierter Restore erfolgreich sein.
3. Zuerst auf einer wiederhergestellten Kopie PR18/R23 -> nächste
   Version testen. **Kein** opportunistisches `ALTER TABLE` beim
   HTTP-Serverstart ohne freigegebenen Migrationsplan.
4. Jede Migration wird innerhalb einer kontrollierten Transaktion
   ausgeführt; bei unbekanntem Zustand fail-closed, nicht blind upgraden.
5. Bei Fehlern Code **und Daten** kompatibel auf den vorherigen Stand
   zurückführen; nach neueren Benutzerschreibungen kein altes Backup
   darüber kopieren.
6. Separate Owner-Freigabe für schemaändernde Production-Aktionen einholen.

**R24-C nimmt selbst keine dieser schreibenden Aktionen vor.** Der
Testbericht ist ein Sicherheitsgate für den späteren Migrationsmechanismus,
keine Behauptung, dass eine Migration schon vorhanden oder durchgeführt sei.
