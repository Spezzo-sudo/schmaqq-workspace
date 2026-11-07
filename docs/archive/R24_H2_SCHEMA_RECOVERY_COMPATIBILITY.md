# SCHMAQQ Studio R24-H2 — R23-Auth-Schema und historischer Restore-Bestand

Datum: 20. Oktober 2026. **Review-only. Kein Merge, kein Deployment.**

## 1. Anlass: Hermes R24-H1 Production-Preflight

Hermes hat das echte R23-Schema lesend geprüft und gemeldet:

- `PRAGMA user_version=0`, `integrity_check=ok`, keine gemeldeten
  Fremdschlüsselverletzungen.
- Vier zusätzliche Tabellen:
  `github_attempts`, `github_connections`, `oidc_attempts`,
  `oidc_identities`. H1s reine Kern-Baseline hat sie nicht erkannt.
- Historische Verzeichnisse `restore-test` und `restore-tests`
  liegen im geschützten `/var/lib/schmaqq-studio`.
- Das bereits bestehende `backups/` ist Modus 0755, Besitzer
  `schmaqq-studio:schmaqq-studio`. Der übergeordnete
  StateDirectory-Ordner ist jedoch 0700.
- Vor einem echten neuen Snapshot brach H1 absichtlich ab.
- Hermes sicherte separat die Root-EnvironmentFile, systemd-Unit,
  das aktive R23-Release und lokale Recovery-Metadaten in einem
  geschützten Root-Recovery-Kit. Kein Deployment und keine Migration.

**Herkunft:** Diese Produktionsbefunde stammen aus dem vom Owner
weitergeleiteten privilegierten Hermes-Bericht. Wir haben die
geschützte Produktionsdatenbank aus `dc-remote` nicht gelesen.

## 2. Echte Ursache des Schema-Drifts und genaue Korrektur

Das laufende R23-Release
`aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`
enthält seit jeher die beiden Module:

- `selfhost/connections.mjs` erzeugt GitHub-Verbindungen und
  Login-/Verbindungsversuche als zwei Tabellen.
- `selfhost/oidc.mjs` erzeugt OIDC-Identitäten und Anmeldeversuche
  als zwei Tabellen.

Der alte Baseline-Fingerprint wurde nur aus
`selfhost/store.mjs` abgeleitet; daher fehlen darin genau diese
vier beim HTTP-Server-Start angelegten Tabellen.

**Korrektur ist strikt und additiv:**
`schema-auth-extension.v0.json` fixiert **alle vier**
CREATE-TABLE-SQL-Hashes, Spalten, Primärschlüssel und Fremdschlüssel
aus einer synthetischen SQLite-Initialisierung der **bytegleich
aus R23 stammenden** Module.

`schema-preflight.mjs` akzeptiert **entweder**
das alte vollständige Kernschema mit 25 Objekten
**oder** exakt das Kernschema plus alle vier unveränderten
Auth-Tabellen (29 Objekte). Es akzeptiert **keinen** Namen allein:
andere SQL-Definitionen, abweichende FKs, halbe Erweiterungen,
fremde Tabellen, veränderte Basisobjekte und ungültige
`user_version` führen weiter zu **BLOCKED**.

`schema-migration.mjs` benutzt dieselbe Auflösung für seinen
**lesenden** v0->v1-Plan und die Prüfung bestehender v1-Schemata.
Die echte v1-Migration bleibt gesperrt und ist weiterhin nur auf
gekennzeichneten synthetischen Kopien schreibbar.

**Noch nicht bewiesen:** Hermes muss den neuen H2-Fingerprint
gegen das **wirklich vorhandene** Schema laufen lassen.
Vier passende Namen allein sind kein Schema-PASS.

## 3. Backup: vorhandene Restore-Evidence erhalten, kein chmod

`restore-tests` ist aus dem Hermes-P2-Bericht vom 17. Oktober
als altes, bewusst aufbewahrtes Restore-Verzeichnis bekannt.
`restore-test` ist vom aktuellen Hermes-Befund bestätigt,
seine Inhalte aber noch nicht vollständig klassifiziert.

H2s `r24-local-backup.mjs` ändert daher nichts an diesen Daten.
Es behandelt exakt die zwei **namentlich bekannten**
Alt-Verzeichnisse als **nicht im aktiven SQLite-Snapshot enthaltene,
ungeprüfte historische Artefakte**.

Für solche Namen wird zwingend geprüft:
reguläres Verzeichnis, keine Symlinks, kanonischer Pfad,
identische Unix-UID/GID wie das private Studio-StateDirectory,
**kein Gruppen-/Welt-Schreibzugriff**. Jede andere unbekannte Datei,
falscher Eigentümer, Symlink oder unsicheres Schreibrecht blockiert
das Werkzeug vor dem neuen Snapshot.

Das bereits existierende `backups/` mit Modus 0755 kann als
**Container ausschliesslich für neu angelegte 0700-Bundles**
verwendet werden, **wenn** der direkte Elternordner bereits 0700,
Eigentümer/Gruppe identisch und `backups/` nicht für andere
beschreibbar ist. Der übergeordnete 0700-Ordner verhindert
fremdes Traversieren auch bei einem 0755-Kind.

H2 macht **kein chmod, Verschieben, Löschen oder automatisches
Bereinigen** von `backups`, `restore-test` oder
`restore-tests`. Alte Snapshotdateien werden nicht ausgegeben.

Der exakte Zustand ist weiterhin zweigeteilt:

- **Neuer geschützter SQLite-Snapshot + echte physische Restore-
  Prüfung:** bei ansonsten geeigneter Ausgangslage **möglich**,
  auch wenn historische Artefakte existieren.
- **Vollständigkeitsprüfung des Studio-StateDirectory:**
  `BLOCKED_OPERATOR_REVIEW` solange Alt-Verzeichnisse oder der
  alte 0755-Backup-Container nicht gesondert inventarisiert und
  bewertet wurden. Daher bleibt in H2
  `releaseSchemaGate=BLOCKED`, selbst wenn Schema,
  Snapshot und R24-Restore einzeln PASS melden.

Das Tool gibt bei erfolgreichem Backup und Restore **Exitcode 2**
zurück, wenn die Gesamtfreigabe noch durch die Altbestandsprüfung
blockiert ist. Dies ist **nicht** gleichbedeutend mit einem
fehlgeschlagenen Backup. Entscheidend sind der sanitisierte
JSON-Ausgabeblock und der private Operatorbericht im neuen
Backup-Bundle.

## 4. Isolierte Prüffälle

Tests unter `selfhost/schema-auth-profile.test.mjs` und
`selfhost/r24-local-backup.test.mjs` decken ab:

- komplette R23-Auth-Tabelle und exakte
  `sqlite_master`-SQL-Fingerprints.
- Korektes v0 ohne Auth, v0 mit kompletter Auth-Erweiterung,
  sowie striktes v1-Prüfschema mit Migration-Ledger.
- halbe Auth-Erweiterung, verändertes SQL, falsche FK-Strukturen
  und unbekannte zusätzliche Tabellen → BLOCKED.
- Backup/Restore einer synthetischen R23-DB einschliesslich
  vollständiger Auth-Erweiterung ohne automatische Migration.
- bestehende 0755-Backups und beide historischen Restore-Pfade:
  **Snapshot/Restore möglich, Release-BLOCKED, alles erhalten**.
- gruppen-/weltbeschreibbare Alt-Backup-Ordner oder
  symbolische Links → **kein Snapshot**.
- laufende WAL-Schreibverbindung, SHA, SQLite-Integrität,
  echte R24-`openStore()`-Prüfung nur auf wiederhergestellter
  Wegwerfkopie und 0600/0700-Schutz.

Sämtliche Funktionstests sind **synthetisch**. Der neue
Production-Lauf durch Hermes ist noch offen.

## 5. Noch offene Freigaben

- Hermes muss den echten strukturellen R23-v0-Fingerprint,
  den Snapshot sowie R24s echten Restore auf einer Kopie prüfen.
- Die beiden historischen Restore-Ordner und alte
  Backup-Dateiberechtigungen müssen **lesend inventarisiert**,
  nicht gelöscht werden.
- Das bestehende Root-Recovery-Kit wurde nach Hermes-Angaben
  erstellt; es ist **kein vollständiger VPS-/Runner-Recovery-Nachweis**.
- `STUDIO_TRUSTED_PROXY_IPS` bleibt **unset**.
- GitHub Actions ist noch wegen Billing gesperrt. Grüne lokale
  Checks sind kein GitHub-CI-PASS.
- Offsite-Backup weiter auf ausdrücklichen Wunsch zurückgestellt.
- **Kein Mergen, keine Änderung an Production, keine Migration,
  kein Neustart und kein Deployment ohne separates Owner-GO.**
