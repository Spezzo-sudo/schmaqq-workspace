# SCHMAQQ Studio — Betrieb des eigenständigen Node/SQLite-Release

Dieses Verzeichnis enthält die bestehende systemd-Vorlage, eine
Beispielumgebung, den read-only Host-Preflight und ab R24-A einen
unabhängigen Release-Verifier. **Keine Datei hier bewirkt selbst ein
Production-Deployment.**

## Bestehende Production und Versionen

Am 19.10.2026 lief Studio auf R23
`aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`. Das bestehende R23-Archiv
hat einen separat verifizierten SHA256 und ein 703-Dateien-Manifest, aber
**noch keine eingebettete Git-Herkunftsdatei**. R24-A führt diese zusätzliche
Provenienz für **künftige** Releases ein.

- Verbindliche Herkunftsregeln: `docs/RELEASE_PROVENANCE_POLICY.md`
- Kontrollierter VPS-Umzug/Disaster Recovery:
  `docs/VPS_MIGRATION_RUNBOOK.md`
- Historische Abnahmeberichte: `docs/evidence/` sowie gesonderte
  geschützte Hermes-Operator-Evidence.

## Vorprüfung (read-only)

1. Die tatsächlichen bereits laufenden Dienste, Ports, DNS/Traefik,
   TLS, Systemressourcen und Servicekonten inventarisieren. **Nichts
   unter fremder Domain verändern.**
2. Die benötigte dedizierte Node-Laufzeit >=24.15 verifizieren;
   systemweite Node-Installation nicht ungeprüft überschreiben.
3. Den Host-Preflight ausführen (Zielordner muss schon bestehen):

       node selfhost/deploy/preflight.mjs /existing/target

4. Exaktes freigegebenes Release-Archiv, Quelle und Manifest prüfen
   (Beispiel für einen **neuen** R24-A-artigen Kandidaten):

       node selfhost/deploy/verify-release.mjs \
         --release /path/to/unpacked \
         --source FULL_APPROVED_GIT_SHA \
         --archive /path/to/candidate.tar.gz \
         --archive-sha256 FULL_APPROVED_ARCHIVE_SHA256

   R23 benötigt zusätzlich explizite `--allow-legacy`-Prüfung mit dem
   vertrauenswürdig gepinnten Archivhash. Ein solches Ergebnis ist **kein**
   unabhängiger Git-Provenienznachweis.

## Geplantes Releasepaket (separates Owner-GO erforderlich)

- Nur die fertig gebaute Oberfläche und die zur Ausführung erforderlichen
  Module, Node-Abhängigkeiten und Deploy-Vorlagen installieren; kein
  `npm install` oder Docker-Build auf dem Produktionshost erforderlich.
- Neue Releases unter `/opt/schmaqq-studio/releases/<SHA>` erhalten,
  vorhandene Releases niemals überschreiben.
- Dienstbenutzer `schmaqq-studio`, Daten in `/var/lib/schmaqq-studio`,
  Konfiguration unter `/etc/schmaqq-studio.env` getrennt halten.
- Studio an Loopback 4310, Preview an Loopback 4311; über getrennte
  HTTPS-Origins mit gültigen Zertifikaten und geeignetem Proxy führen.
  JSON-Limit derzeit bis 9 MB, so weit die genehmigten Routen es erfordern.
- Den atomaren Release-Symlink-Wechsel und einen Neustart **nur des
  freigegebenen Dienstes** mit Backup, Datenintegritäts-/Restore-Tests,
  Authentifizierungsprüfung und Rollback nach aktuellem Hermes-Runbook
  ausführen. Die Vorlagen sind kein universeller Deployment-Automat.
- GitHub-Merge und Production-Deployment sind verschiedene Aktionen.

## Sicheres Backup

Das Script `selfhost/backup.mjs` führt einen konsistenten SQLite-Snapshot
mittels `VACUUM INTO` aus, verweigert vorhandene Zielpfade, setzt `0600`
und prüft Datenbankintegrität/Fremdschlüssel:

    STUDIO_DATA_DIR=/var/lib/schmaqq-studio \
      /opt/schmaqq-studio/runtime/node/bin/node \
      selfhost/backup.mjs /protected/new/backup.sqlite

**Achtung:** Das ist nur die SQLite-Datei. Ein vollständiger Recovery-Plan
sichert zusätzlich alle übrigen persistenten Dateien, geschützte
Umgebungs-/Unit-Metadaten und eine verschlüsselte Kopie **ausserhalb** des VPS.
Ein bereits laufendes Release darf ohne Owner-GO weder gestoppt noch
zurückgerollt werden.

Die aktuellen Template-Grenzen `MemoryMax=256M` und `CPUQuota=50%`
sind keine Kapazitätsgarantie. Git, Codex und Build-/Test-Aufträge bleiben
vorerst auf den jeweiligen privaten Runner-PCs.

## Staging-Instanz (vorbereitet, nicht installiert)

`studio-deploy.sh` kennt zwei Instanzen. Ohne `STUDIO_INSTANCE` gilt **unverändert
Production** (Dienst `schmaqq-studio`, nur Commits von `main`, Worker-Aktualisierung).
`STUDIO_INSTANCE=staging` arbeitet ausschliesslich mit eigenem Dienst
`schmaqq-studio-staging`, eigenem Benutzer, eigenen Ordnern unter
`/opt|/var/lib|/var/cache/schmaqq-studio-staging*`, eigener ENV-Datei, eigenen
Sperrdateien und Probe-Ports 4392/4393. Der Server-Worker wird nie angefasst;
auf Staging gibt es deshalb keine Code-Aufträge.

```bash
# Zuerst nur anzeigen, was verwendet würde (ändert nichts):
STUDIO_INSTANCE=staging STUDIO_PUBLIC_URL=https://<staging-adresse> \
STUDIO_SOURCE_BRANCH=<branch> selfhost/deploy/studio-deploy.sh config
```

Das Skript bricht ab, wenn Staging eine Production-Adresse, einen
Production-Pfad (auch Unterordner), den Production-Benutzer oder Port 4310/4311
verwenden würde. Vorlagen: `schmaqq-studio-staging.service`,
`studio-staging.env.example`. Benutzer, Ordner, Node-Laufzeit, DNS, Proxy mit
zusätzlicher Zugangsschranke und erste Einladung sind ein **gesondert
freizugebender Betriebsschritt**.
