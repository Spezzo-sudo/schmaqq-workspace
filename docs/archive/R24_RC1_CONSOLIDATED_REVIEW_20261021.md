# SCHMAQQ Studio – R24-RC1 Consolidated Candidate

**Stand:** 21.10.2026 · **Review-only Draft** · **NO MERGE / NO PREVIEW OR PRODUCTION DEPLOYMENT**

## 1. Was konsolidiert wurde

Die R24-Entwicklungsarbeit liegt bereits in einer **linearen**
Reihenfolge über 15 Commits auf der verifizierten
Produktionsbasis R23:

- R23 **`aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`**.
- R24-A/B/C: portable Artefakte, Editor-Verhalten, Schema-Preflight.
- R24-D: nur für synthetische Testkopien erlaubter,
  versionierter v0→v1-Migrations-Ledger; **nicht produktiv ausgeführt**.
- R24-E/F: Extraktion der Auth-/Workspace-Routen,
  React-Bausteine, Manifest-/Source-/lokale Release-Gates.
- R24-G1: Account-Login-Ratelimit; Trusted-Proxy-Client-IPs
  weiterhin **nicht** aktivieren.
- R24-G2: älterer 16/16-Chromium-Solo-Funktionsnachweis,
  **nicht** der Browsernachweis dieses RC1-Commits.
- R24-H1/H2/H3: Privatbackup-/Wiederherstellung,
  R23-Auth-Schema mit exakter SQL-Referenz, getrennte
  historische Archiv-Betrachtung und Hermes-Scope-Attestation.
- R24-H3 Basis **`1c4c75ba81b1239734bc7f85336dd1a6eae2747d`**.
- R24-RC1: ein neuer Review-Branch mit gesamter R24-Historie,
  entfallender GitHub-Hosted-Actions-Workflowdatei,
  eigenständigem wiederholbarem isoliertem Chromium-UI-Test
  und einer mobilen Sidebar-Schliessen-Schaltfläche.

**Keiner** der bestehenden Draft-PRs wurde gemergt.
Das zentrale Draft-PR richtet sich bewusst **gegen
`work/studio-r23-local-20261019`**, nicht gegen `main`.
Die Verbindung von `main` zu R23 ist in der aktuell
shallow geklonten Historie nicht belegbar; ein unkontrollierter
Merge nach `main` ist daher ausgeschlossen.

## 2. Eigenständige Qualitätsgates – GitHub Actions nicht nötig

Der Owner hat ausdrücklich entschieden, dass GitHub Actions
**nicht eingesetzt werden**. Deshalb wird
`.github/workflows/studio-r24-ci.yml` aus **dem
konsolidierten Resultat** entfernt. Historische PRs und
Auditberichte bleiben unverändert.

Der Gate-Contract ist lokal reproduzierbar:

1. Immutable SOURCE_SHA = tatsächlicher HEAD,
   sauberes Git-Checkout, R23 / R24-E Ancestry.
2. Node v24, lockfile-gebundene Abhängigkeiten,
   Source-/Secret-Guard (keine vollständige Secret-Prüfung).
3. Gesamte Backend-Test-Suite und TypeScript / Vite Build.
4. Rebuild aus exakt diesem Commit, archiviertes
   Runtime-Paket mit eingehängtem SOURCE_SHA und SHA256
   auf allen Manifestdateien.
5. Frisch entpackter Runtime-Smoke inkl.
   Auth, Aufgaben, Kommentaren, SQLite und konsistentem
   isoliertem Backup.
6. Zusätzlich der **echte Chromium-Browser** gegen genau
   dieses Runtime-Paket, nur mit synthetischem Owner und
   **neuer** privater SQLite unter einem temporären Pfad.
   Desktop 1440×900 + Mobil 390×844;
   sichtbarer Login, Session, Suche, Aufgaben, Chat,
   Wissensdokument, Revision, Mobilnavigation,
   Logout sowie Datenbankintegrität.
7. Keine realen Provider-/Runner-/GitHub-Konto- oder
   AI/Codex-Operationen durch diesen UI-Test.
8. Nachlauf: VPS Production-Pointer/Health/Dienste
   erneut rein lesend prüfen.

**Wichtig:** Historische G2-Browserbelege und
H3-Hermes-Attestationen dürfen nicht als Browser- oder
Production-Test **des neuen RC1-Commits** umgedeutet werden.

## 3. Festgestellte UX-Korrektur in RC1

Der echte Chromium-Test auf dem vorherigen H3-Bundle
hat auf dem Mobilviewport gezeigt: Bei geöffneter
Sidebar ist die Hauptfläche absichtlich `inert`.
Damit war der visuell umgeschaltete Topbar-Button
`Menü schliessen` nicht antippbar. Die Sidebar
liess sich nur per Navigation oder Escape schliessen.

RC1 ergänzt deshalb **einen 44×44 px grossen,
per Tastatur fokussierbaren Schliessen-Button in der
Sidebar selbst**. Topbar-/Overlay-Inertness bleibt
erhalten; auf Desktop bleibt der neue Button verborgen.
Dieser Fall wird im RC1-Browserlauf explizit geprüft.

## 4. Was Hermes tatsächlich bestätigt hat

Der Owner brachte folgende H2-/H3-Ergebnisse:

- Exaktes produktives **R23-v0**-Schema mit 29
  Tabellen-/Indexobjekten, 0 Drift/FK-Fehlern: PASS.
- Neues privates WAL-konsistentes H2-Bundle
  `r24-h1-L7onQ6`, physischer Restore auf Wegwerfkopie
  und R24 `openStore()` darauf: PASS.
- Root-kontrollierte H3-Scope-Attestation für
  **aktive** Datenbank / Bootstrap-Bestand sowie
  gesonderte historische Archiv-Metadaten: PASS_SCOPED.
- Der zuerst fehlerhaft weitergereichte 67-stellige
  Snapshot-Hash wurde vom Operator nochmals bestätigt
  als korrekt formatierter 64-stelliger Digest:
  `516f5b8eef8c051f83929b496d5bcf492fa5aa1c57d6c0c556ce31a7e923c9be`.
- Kein kompletter Host-/Provider-/Runner-Recovery-Beweis.
- Root-eigene Secrets/Backups wurden diesem
  Engineering-Worktree **nicht** zugänglich gemacht.
- Kein Production-Merge, Schema-Write, Neustart,
  Deployment oder Provider-Eingriff.

Diese **operatorseitigen** Belege gelten für das
H2/H3-Verfahren und den zu der Zeit vorhandenen
Datenstand. Sie sind **kein** nachträglicher Live-
Smoke-Test des RC1-Codes auf Productivdaten.

## 5. Noch zu entscheiden vor einem wirklichen Release

- Gesondertes **Owner-GO** für jede spätere
  Production-Mutation (Merge/Release/DB/Proxy/DNS).
- Frischer finaler Production-Snapshot inklusive
  isoliertem Restore, unmittelbar vor einer Freigabe;
  der alte H2-Stand könnte inzwischen verändert sein.
- Exaktes RC1-Release-Paket durch Hermes verifizieren,
  Plan für atomaren Wechsel und Rollback gegen R23.
- Nach jedem tatsächlich genehmigten Wechsel
  erst danach realen Browser-/Funktionspilottest
  mit persönlichem Konto abnehmen.
- Kein produktives v1-Upgrade ohne eigenständiges GO;
  R24-Store startet auf der getesteten R23-v0-
  Datenbank ohne automatische Ledger-Migration.
- `STUDIO_TRUSTED_PROXY_IPS` bleibt **unset**.
- Zweipersonen-Betrieb (Markus) ist noch nicht
  tatsächlich als Human Pilot belegt. Keine
  automatische Konto-/Runner-Registrierung.
- Offsite-Backups auf expliziten Owner-Wunsch
  zurückgestellt; Host-Verlustrisiko bleibt transparent.
- `main`-Abgleich bleibt **getrennte** Release-
  Governance-Aufgabe; RC1-PR gegen die **laufende R23
  Basis** ist die geprüfte Änderungsübersicht.

**Ergebnis:** Engineering-Kandidat ist nach erfolgreichen
Gates reviewbar, **niemals dadurch automatisch deploybar**.
