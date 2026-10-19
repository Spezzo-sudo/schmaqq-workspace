# SCHMAQQ Studio — verbindliche Release-Provenienz (R24-A)

Dieses Dokument ergänzt die bestehenden Owner-GO- und Hermes-Sicherheitsgates.
**Weder ein grüner GitHub-PR noch diese Policy autorisieren Production.**

## Bestätigter Ausgangspunkt am 19.10.2026

- Repo: `Spezzo-sudo/schmaqq-workspace`.
- Laufende Studio-Production: `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f` (R23).
- Ursprüngliches R23-Archiv: SHA256
  `1a927d7eba4d5becf749401baaf2ab5f02cd8e004577258c9a3cd069331e6768`.
- R23-Payload-Manifest: 703/703, im Production-Read-only-Audit geprüft.
- Der Release wurde ausdrücklich vom Owner freigegeben und durch Hermes
  kontrolliert mit Backup/Restore/Rollback-Vorgaben ausgeliefert.
- R23 und die gestapelten PRs liegen **nicht** auf dem aktuellen GitHub-`main`.
  Ein `git clone` des Default-Branches reproduziert nicht automatisch die
  laufende Production. Ein erzwungenes Zusammenführen ist nicht erlaubt.
- Production-Login mit zwei echten Konten und externes Offsite-Backup sind
  weiterhin gesondert nachzuweisen.

## Neuer Standard ab R24-A

1. Ein Release entsteht nur aus einem **sauberen, unveränderten, überprüften**
   Git-Arbeitsverzeichnis. Unversionierte nicht ignorierte Dateien blockieren
   `selfhost/release.mjs`.
2. Der Packager schreibt eine `release-source.json` mit `sourceCommit`,
   `sourceTree`, SHA256 des `package-lock.json` und der Node-Version. Die
   Metadaten werden selbst im Manifest gehasht und im Archiv mitgeliefert.
3. Das Release enthält einen vollständigen SHA256-/Längen-Manifestnachweis.
   Jedes zusätzliche, fehlende oder unerwartete File sowie Symlinks schlagen
   beim unabhängigen Verifier fehl.
4. Der unabhängige Verifier erwartet **immer** den expliziten Quellcommit.
   Bei neuem Format muss dieser mit den eingebetteten Metadaten übereinstimmen.
5. Das Archiv besitzt zusätzlich einen **eigenen** SHA256-Wert. Nur der
   Vergleich mit einem vorher vertrauenswürdig festgelegten Wert schützt vor
   unbemerktem Austausch des gesamten Pakets. Der Archivwert wird für jede
   Freigabe erneut kontrolliert.
6. Quellcommit, Archivhash, Testergebnisse, Backup-/Restore-Proof,
   Freigabeumfang und Rollback-Verweise werden als *sanitisierte* Evidence
   dokumentiert. Keine Sessions, Passwörter, privaten DB-Inhalte oder
   Zugangstokens auf GitHub ablegen.
7. Keine Production-Aktivierung ohne separat ausgesprochenes Owner-GO
   für exakt Commit, Archiv, Service, Scope und Rollback. Vor Promotion
   aktuelles Symlink-/Runtime-SHA **unter Lock** vergleichen.
8. Ein bereits freigegebener früherer Release oder ein Draft-PR ist keine
   Freigabe für den nächsten Release.

## Befehle für einen künftigen Kandidaten

Zuerst auf einem separaten Branch entwickeln, Code vollständig testen und
*vor dem Packaging* committen. Die Release-Herkunft wird am Git-HEAD
festgeschrieben, nicht aus einer frei gewählten Umgebungsvariable übernommen.
Der Packager führt den Vite-Build aus dem sauberen Commit nochmals selbst
aus; ein veralteter vorhandener studio-dist-Ordner wird nicht vertraut.

    npm run studio:verify
    npm run studio:release

Anschliessend über einen **unabhängigen** extrahierten Release-Pfad testen:

    node selfhost/deploy/verify-release.mjs \
      --release /path/to/verified-unpacked-candidate \
      --source FULL_40_CHARACTER_APPROVED_SOURCE_SHA \
      --archive /path/to/candidate.tar.gz \
      --archive-sha256 FULL_64_CHARACTER_APPROVED_ARCHIVE_SHA256

Für ältere **R23**-Archive fehlt die eingebettete Identität. Der
Ausnahmemodus `--allow-legacy` verlangt deshalb immer einen gepinnten
Archivhash und meldet `legacy-external-only` statt `embedded`. Der
Betreiber überprüft den externen SHA-Bezug gesondert (siehe
`docs/VPS_MIGRATION_RUNBOOK.md`).

## GitHub-Branch-Strategie bis zur Bereinigung

- R24-A wird auf der **laufenden R23-Quelle** entwickelt, nicht blind auf
  dem divergierten `main`.
- Nur Draft-PR und Tests; **kein** automatischer Merge, keine Force-Pushes
  auf fremde Branches, kein neues Production-Deployment.
- Die GitHub-Konvergenz sollte in eigenem Integrations-PR auf einer
  überprüften Basis erfolgen; keine unkontrollierte Änderung des laufenden
  Dienstes und kein Beweis durch einen grünen Test allein.
- Ein signierter Release-Tag und ein unveränderliches Artifact-Register sind
  sinnvolle weitere Massnahmen; diese Policy erstellt noch keine Tags oder
  GitHub-Release-Assets.

## Nicht von R24-A gelöst

Ein funktionierender Release-Verifier ersetzt **keine** versionierten
Datenbankmigrationen, keinen automatisierten Offsite-Backup-/Restore-Dienst,
keine authentifizierte End-to-End-Abnahme und keinen kontrollierten
VPS-Transfer. Diese Themen bleiben in separaten Etappen.
