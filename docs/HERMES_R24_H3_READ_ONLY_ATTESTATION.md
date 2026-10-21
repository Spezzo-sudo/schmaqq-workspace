# Hermes – R24-H3 read-only Scope-Attestation und Hash-Korrektur

**Aktion:** Bestehendes H2-Backup **erneut lesen und verifizieren**,
historische Archive genau zuordnen, Operatorentscheid zu
eng begrenzter aktiver Studio-Wiederherstellung dokumentieren.

**NICHT:** Backup neu erstellen, Production-Datenbank schreiben,
Migration, Shell-Provider-Verbindungen ändern, chmod an
bestehenden Studio-/Archivdateien, Neustart, Merge oder Deployment.
Offsite-Backups ausdrücklich überspringen.

## Phase 0: Quelle und Rechte

1. H3 Draft PR öffnen, **exakte H3-Commit-SHA prüfen**.
   Der Commit muss auf H2
   `31948a636ea0d3220b24bf53fea59afda543626f`
   aufbauen. Nicht einfach "latest" aus einem mutablen
   Branch ausführen.
2. H3-Dateien aus dem **gepinnten Git-Commit** unter einem
   **neuen root-owned kanonischen Stagingverzeichnis**
   materialisieren (root:root, 0755, keine Symlinks, keine
   fremden Schreibrechte). Nicht direkt aus dem
   `dc-remote`-Worktree mit privilegierter Identität
   ausführen.
3. Hierfür werden **nur** folgende Code-/Daten-Dateien
   aus dem gepinnten Commit gebraucht:

   - `selfhost/deploy/r24-h3-scoped-recovery.mjs`
   - `selfhost/deploy/schema-preflight.mjs`
   - `selfhost/deploy/schema-migration.mjs`
   - `selfhost/deploy/schema-baseline.v0.json`
   - `selfhost/deploy/schema-auth-extension.v0.json`

4. Node: `/opt/schmaqq-studio/runtime/node/bin/node`.
   Die H3-JS-Datei läuft als **schmaqq-studio**,
   nicht als root. Minimal bereinigte Umgebung;
   kein `NODE_OPTIONS`, keine Provider-Secrets.

## Phase 1: Rein lesendes Verifizieren des H2-Snapshots

Das H2-Bundle hat laut vorherigem Hermes-Bericht die ID:

`r24-h1-L7onQ6`

Vor dem Lauf die Existenz, Besitzer und 0700/0600
Schutzrechte des exakten Bundles **lesend** kontrollieren.

H3 starten:

`/opt/schmaqq-studio/runtime/node/bin/node \
  <ROOT_CONTROLLED_STAGE>/selfhost/deploy/r24-h3-scoped-recovery.mjs \
  --data-dir /var/lib/schmaqq-studio \
  --backup-id r24-h1-L7onQ6 \
  --source-sha <PINNED_H3_SHA>`

**Erwartet:** Ausgabe von drei **gültigen 64-stelligen**
SHA256-Digests:

- `recalculatedSnapshotSha256`
- `h2PrivateReportSha256`
- `historicalInventorySha256`

Und:
`activeStudioDbAndBootstrapRecovery=PASS_SCOPED`,
`historicalRetentionReview=PENDING_ROOT_OPERATOR`,
`activeStateScopeGate=BLOCKED_PENDING_OPERATOR_REVIEW`,
`finalR24DeploymentGate=NO_GO...`.

Exitcode **2** ist hier erwartet: Der bereits vorhandene
Backup-Nachweis wurde nachgeprüft, die Root-Attestation
ist aber noch nicht vorhanden.

Falls Hash/Source/Schema/Dateirechte nicht stimmen,
oder Archivbestände verändert/unklar sind: **STOP**.
Keine Daten löschen, verschieben oder Rechte ändern.

### Fehlerhaften Chat-Hash korrigieren

Der an Chat weitergereichte `LOCAL_BACKUP_SHA256` ist
**67 Zeichen** lang und damit ungültig. Berechne
den SHA256 aus **der tatsächlichen unveränderten
Backup-SQLite-Datei im geschützten H2-Bundle neu**.
Vergleiche intern:

- neu errechneter Digest direkt über die Datei
- `recalculatedSnapshotSha256` aus dem H3-Tool
- `localSnapshot.sqliteSha256` aus dem bestehenden
  privaten H2-Report

Nur wenn **alle identisch** und genau 64 hexadezimale
Zeichen lang sind, `BACKUP_HASH_CONFIRMED=PASS`.
Der Chat-String ist **nicht** das Vergleichsoriginal.
Bei Divergenz BLOCKED und keine neue Freigabe.

## Phase 2: Root-Kontrolle der Altbestände

Die historischen Archive bleiben unter
`/var/lib/schmaqq-studio/backups`,
`restore-test` und `restore-tests`.

- Der 0700-Elternordner bleibt wie er ist. Die
  historischen 0755-Container werden nicht geändert.
- Kontrolliere lesend Typ, Besitzer, Schutzrechte,
  Symlinks, Hardlinks, Dateizahl und Unterordnerstruktur.
- Die H3-SHA bindet **Metadaten**, nicht den
  gesamten Inhalt der historischen Backup-Dateien.
- Lies den eigenen H2/H1-Hermes-Abschlussbericht
  nur lokal und vergleiche die aktuelle Lage.
- Verifiziere das **vorhandene** root-only Recovery-Kit
  lesend und unverändert. Keine Duplikate anlegen,
  keine Secrets ausgeben.
- Bestätige explizit, dass die historischen Archive
  ausserhalb der aktiven DB-/Bootstrap-Recovery
  verbleiben und **nicht** als Teil einer vollständigen
  Host-Wiederherstellung bezeugt werden.

Nur wenn alle Bedingungen stimmen:
Operator-Attestation vorbereiten.

## Phase 3: Geschützter Root-Operatorbeleg

Eine **neue**, rein sanitizierte JSON-Datei erstellen:
root:root, Modus **0644**, reguläre Datei, nlink=1,
unter einem **neuen**, root-besessenen,
kanonischen 0755-Stagingverzeichnis, das für andere
Unix-Benutzer **nicht schreibbar** ist.
Der Beleg enthält **keine** Datenbank-/Secret-Inhalte,
keine privaten Dateinamen ausser den bereits
bekannten Archiv-Ordnernamen.

Das JSON muss exakt folgende Form enthalten;
die SHA256-Werte werden aus **Phase 1** übernommen:

`{
  "format": 1,
  "decision": "RETAIN_HISTORIC_ARCHIVES_EXCLUDED_FROM_ACTIVE_STUDIO_RESTORE",
  "reviewedBy": "Hermes",
  "sourceSha": "<PINNED_H3_SHA>",
  "runningReleaseSha": "aef64f85efeeb40f6c0f3a7dc43986a52a20f09f",
  "backupId": "r24-h1-L7onQ6",
  "snapshotSha256": "<VALID_64_HEX_SNAPSHOT_SHA>",
  "h2PrivateReportSha256": "<VALID_64_HEX_H2_PRIVATE_REPORT_SHA>",
  "historicalInventorySha256": "<VALID_64_HEX_HISTORICAL_METADATA_SHA>",
  "legacyRoots": ["backups", "restore-test", "restore-tests"],
  "reviewedUtc": "<CURRENT_ISO_8601_UTC>",
  "retainedUnmodified": true,
  "activeStateOnly": true,
  "historicArchivesNotFullRecovery": true,
  "privateRootKitOperatorChecked": true
}`

Setze `privateRootKitOperatorChecked` **nur dann auf
true**, wenn das bestehende Root-Kit gerade
lesend überprüft wurde.

**Wichtig:** Root-Eigentum ist eine lokale
Vertrauensgrenze, keine digitale Signatur;
das Recht zu erstellen ist ausschliesslich
auf den autorisierten Operator beschränkt.
Datei und Parent dürfen vom Servicekonto
nicht überschrieben werden können.

## Phase 4: Nur die zweite read-only Prüfung

Mit identischer Quelle/Backup-ID wie in Phase 1,
plus:

`--root-attestation <ABSOLUTE_ROOT_OWNED_ATTESTATION_FILE>`

**Erwartete Felder:**

- `activeStudioDbAndBootstrapRecovery=PASS_SCOPED`
- `historicalRetentionReview=PASS_ROOT_OPERATOR_ATTESTED`
- `activeStateScopeGate=PASS_SCOPED`
- `completeHostRecovery=NOT_ATTESTED`
- `finalR24DeploymentGate=NO_GO_SEPARATE_CI_AND_OWNER_APPROVAL`
- `createsNewSnapshot=false`
- `mutatesProduction=false`

Kein H2-Bericht wird überschrieben. Ein neuer
H3-Scope-PASS hebt den ursprünglichen H2-Gate
nicht automatisch auf, sondern dokumentiert
eine **zusätzliche eng begrenzte Operatorentscheidung**.

Zum Schluss Production live kontrollieren:
R23-Pointer unverändert, Studio/PR16/PR17 aktiv,
HTTPS 200 TLS verified, keine Neustarts,
keine neuen Listener.

## Sanitisiertes Ergebnis

`SOURCE_SHA=<exact-H3>
LIVE_RELEASE_SHA=<still-R23>
BACKUP_ID=r24-h1-L7onQ6
BACKUP_HASH_CONFIRMED=PASS|BLOCKED
CORRECTED_BACKUP_SHA256=<64hex or UNVERIFIED>
PRIVATE_H2_REPORT_SHA256=<64hex or UNVERIFIED>
HISTORICAL_METADATA_SHA256=<64hex or UNVERIFIED>
ROOT_ATTESTATION=PASS|BLOCKED|NOT_CREATED
SCOPED_ACTIVE_RECOVERY=PASS|BLOCKED
HISTORICAL_REVIEW=PASS|BLOCKED
HISTORICAL_FILES_MODIFIED=NO
ROOT_KIT_UNCHANGED=YES|UNVERIFIED
COMPLETE_HOST_RECOVERY=NOT_ATTESTED
GITHUB_ACTIONS=BLOCKED_BILLING
TRUSTED_PROXY_SETTING=UNSET
R24_PRODUCTION_DEPLOYMENT=NO_GO
PRODUCTION_DB_WRITES=NO
PRODUCTION_RUNTIME_CHANGED=NO
RESTARTS=NO
DEPLOYMENT=NOT_PERFORMED
SECRETS_EXPORTED=NO`

**Nicht** komplette JSON-Reports, DB-Bytes,
Bootstrap-URLs, Env-Dateien oder TLS-Schlüssel in
GitHub/Chat übertragen. Die in Phase 3 erstellte
Root-Attestation verbleibt lokal.

**R24-Deployment bleibt in jedem Fall nicht
autorisiert.** Späterer Release erfordert erneut
gesonderten Owner-GO, weitere CI-Gates und
frischen finalen DB-Snapshot.
