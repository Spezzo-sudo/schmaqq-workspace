# R24-H3 – Active-Studio-Recovery vs. historische Archive

Stand: 21.10.2026 · **Review-only Draft** · kein Merge/Deployment.

## 1. Beleglage

Der Owner hat den privilegierten H2-Hermes-Bericht übermittelt:

- R23-v0-Produktionsschema erkannt: 29 Objekte inklusive vier
  GitHub-/OIDC-Tabellen, SQLite-Integrität PASS und FK-Fehler 0.
- H2 hat einen **privaten WAL-konsistenten SQLite-Snapshot**
  unter der ID `r24-h1-L7onQ6` erstellt; 0700 Bundle,
  0600 Snapshot, Bootstrap-Datei geschützt enthalten.
- **Physischer Restore PASS** auf Wegwerfkopie,
  R24-`openStore()` darauf PASS, Testkopie entfernt.
- Historische Bestände: `backups` (0755),
  `restore-test` (0700), `restore-tests` (0755),
  in einem mit 0700 geschützten Studio-StateDirectory.
  Hermes hat Besitzer, kanonische Pfade, fehlende Symlinks
  und keine Gruppen-/Welt-Schreibrechte bestätigt.
- Bereits vorhandenes geschütztes Root-Recovery-Kit nicht
  verändert. Kein vollständiger VPS-Recovery-Nachweis.
- Production unverändert auf R23, Dienste aktiv, TLS 200.

**Wichtig:** Der im Chat übermittelte
`LOCAL_BACKUP_SHA256` hat **67 statt 64 Hex-Zeichen**.
Das belegt keinen beschädigten Snapshot, ist aber **kein
brauchbarer SHA-256-Digest**. Hermes muss den Wert direkt aus
dem privaten VPS-Snapshot neu berechnen und vergleichen.

**Quellenstatus:** Echte Produktionsbefunde stammen aus dem
vom Owner weitergereichten Hermes-Bericht. Der Engineering-
Zugang kann die geschützte Live-Datenbank nicht lesen.

## 2. Was für die aktive Studio-Nutzung benötigt wird

| Bereich | H3-Geltungsbereich | Vollständige Host-Recovery? |
| --- | --- | --- |
| SQLite inklusive konsistentem WAL-Snapshot | Aktiver Studio-Datenbestand | Nein |
| Private `setup-link.txt` | Bootstrap-Zustand | Nein |
| R24-`openStore()` auf Restore | Store-Kompatibilität | Nein |
| Unit/Environment/Release/ACME | Separates Root-Recovery-Kit laut Hermes | Nein |
| `backups`, `restore-test`, `restore-tests` | Historischer Aufbewahrungsbestand | Nein |
| Externe Runner, Provider, Laptop-Arbeitskopien | Nicht im H2-Snapshot | Nein |

Der reale R23-Studio-Server nutzt aus `STUDIO_DATA_DIR`
die SQLite-Datenbank und optional `setup-link.txt`.
Historische `restore-test(s)` sind nicht Teil
des normalen Runtime-Datenpfads. Ein vorhandenes
`backups/` ist Archiv, keine aktive Datenbank.

Wir beanspruchen **keine vollständige Wiederherstellbarkeit
aller historischen Archive**. Sie bleiben unverändert
aufbewahrt.

## 3. Neues read-only H3-Prüfwerkzeug

`selfhost/deploy/r24-h3-scoped-recovery.mjs`

**Kein neues Backup. Kein schreibender Restore. Kein
Live-DB-Zugriff. Keine Migration oder Deployment.**

Das Werkzeug prüft das **bereits vorhandene** H2-Bundle:

- Snapshot-Hash unabhängig neu berechnet und gegen den
  privaten H2-Bericht verglichen (nur 64-stellige SHA256).
- Bytezahl, Besitzer, Datei-/Bundle-Rechte 0600/0700,
  keine Symlinks/Hardlinks.
- Tatsächlicher SQLite-Snapshot read-only:
  Integrität, FK, exakter R23-29-Objekte-Fingerprint,
  read-only v0-Migrationsplan.
- H2-Bericht (physischer Restore und R24-Store-Test
  müssen PASS sein) wird zusätzlich komplett gehasht,
  sodass eine Operator-Attestation das **konkrete**
  Prüfprotokoll bindet.
- Bootstrap-Datei muss vorhanden und privat sein, wenn
  im H2-Bericht enthalten.
- Alte Archivbäume: rekursive **Metadaten-Only-Inventur**.
  Alle Einträge müssen reguläre Dateien/Verzeichnisse mit
  erwarteter UID/GID, ohne Links und ohne Gruppen-/Welt-
  Schreibrechte sein. Schutz durch 0700-Elternverzeichnis.
  Ein fester SHA256 über interne Namen, Modus, Besitzer,
  Dateigrössen und Änderungszeiten bindet die Historie
  an exakt diesen geprüften Bestand. **Keine Namen,
  Dateiinhalte oder Nutzerinformationen in der Ausgabe.**
  Maximal 10'000 Einträge, begrenzte Verzeichnistiefe.
- Historischer Baum wird vor/nach der Prüfung verglichen.
  Unbekannte Einträge oder gleichzeitige Veränderung: BLOCKED.

Der Archiv-Fingerprint ist eine **Metadaten-Bindung**,
kein Content-Integritätsnachweis alter Backup-Dateien.

## 4. Zwei explizit unterschiedliche Gates

**A. Aktiver SQLite-/Bootstrap-Wiederherstellungsnachweis**

`activeStudioDbAndBootstrapRecovery=PASS_SCOPED`,
wenn bestehender H2-Bericht, Hash und Snapshot **jetzt
erneut lesend verifiziert** wurden. Der physische Restore
bleibt ein Nachweis aus dem vorangehenden H2-Lauf
und wird nicht heimlich erneut ausgeführt.

**B. Operator-bestätigte Abgrenzung der historischen Daten**

Ohne Attestation: `activeStateScopeGate=BLOCKED_PENDING_OPERATOR_REVIEW`.

Eine neue root-kontrollierte, lesbare Attestationsdatei
muss auf die **exakte H3-Quell-SHA**, vorhandene
`r24-h1-L7onQ6`-Backup-ID sowie drei konkrete SHA256
(Snapshot, privater H2-Bericht, Altbestands-Metadaten)
gebunden sein und die historischen Archive explizit
als **aus aktiver Studio-Recovery ausgeschlossen,
aber unverändert aufbewahrt** kennzeichnen.

Eine Dateifreigabe erfordert einen regulären, nicht
verlinkten `root:root`-Beleg mit einem nicht für andere
schreibbaren root-besessenen Parent. Studio darf dieses
**sanitisierte** JSON lesen, aber nicht verändern.
Ein blosses `--approve=true` oder eine von Studio
selbst geschriebene Bestätigung genügt niemals.

Nur nach Prüfung dieser Root-Attestation meldet H3:
`activeStateScopeGate=PASS_SCOPED`.

**H2s historischer `releaseSchemaGate=BLOCKED`-Bericht
wird nicht überschrieben oder umetikettiert.**
Die neue Klassifikation ist ein gesonderter enger Scope.

**Immer**:
`finalR24DeploymentGate=NO_GO_SEPARATE_CI_AND_OWNER_APPROVAL`.

## 5. Grenzen und Vorbedingungen

- H3 erzeugt **keinen neuen Snapshot**. Vor einem späteren
  wirklichen Deployment ist ein **frischer finaler Backup-/
  Restore-Check** erforderlich, da sich Studio-Daten seit
  dem H2-Zeitpunkt geändert haben können.
- Root-Dateieigentum ist **keine digitale Signatur**.
  Die Kontrolle gilt nur auf einem nicht kompromittierten
  VPS mit intakten Unix-Berechtigungen.
- Das Root-Kit wird vom Operator bestätigt, nicht
  eigenständig vom H3-Tool neu gesichert.
- Alte Archive bleiben erhalten; weder chmod noch
  Verschieben/Löschen vorhandener Daten.
- Trusted Proxy weiterhin **unset**, GitHub Actions
  weiterhin **BLOCKED_BILLING**, keine Zweipersonen-
  Production-Abnahme, Offsite auf Owner-Wunsch vertagt.
- **Kein** Merge, Schema-Write, Neustart oder Deployment
  ohne getrennten Owner-GO.

**Ergebnisziel:** Ein belastbarer, eng begrenzter
`ACTIVE_SERVICE_RECOVERY_SCOPE=PASS`.
**Keine** automatische Produktionsfreigabe.
