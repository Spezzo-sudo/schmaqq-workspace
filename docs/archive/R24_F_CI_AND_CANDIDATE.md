# SCHMAQQ Studio — R24-F: Candidate-Konsolidierung und GitHub-CI

Stand: 20. Oktober 2026. **Nur Review-Kandidat, kein Merge, kein
Deployment und keine Änderung von Runtime, bestehenden Konten oder Runnern.**

## 1. Faktischer Stand

| Stand | Git-Bezug | Bedeutung |
| --- | --- | --- |
| Production | `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f` | R23 läuft weiterhin auf studio.schmaqq.com |
| R24 Engineering-Basis | `79df5812686664c425f7dc94e8f2dbdd8eec75fb` | Kandidat nach A, B, C, D und E |
| R24-F | `codex/r24f-ci-release-gates-20261020` | Arbeitsbranch mit CI und Quellherkunftsprüfung |
| GitHub `main` | **abweichende Historie** | Nicht der laufende Production-Release |

Der geprüfte R24-E-Commit stammt in einer linearen Kette aus R23
(acht nachfolgende Commits). Beim GitHub-Vergleich am 20.10.2026 lagen
41 R24-E-Commits vor dem Merge-Base mit `main`, während `main` einen
separaten Commit enthielt. Diese Zahlen sind Momentaufnahmen:
vor jedem späteren Merge/Release neu vergleichen.

**Wichtig:** R24-F erfindet keinen parallelen Live-Release und
schreibt nicht auf `main`. Branching, Code-/Datenmigration und
Production-Freigabe bleiben getrennte Vorgänge.

## 2. Historie der R24-Funktionen

Die bisherigen getrennten Draft-PRs bilden eine gestapelte Historie.
Der integrierte R24-E-Commit ist bereits der gemeinsame Prüfstand:

- R24-A PR #23 – Releaseprovenienz, Backup-Schutz, VPS-Umzugskonzept.
- R24-B PR #24 – Editor 64 KiB, verbesserter mobiler Login.
- R24-C PR #25 – read-only SQLite-Schema-Preflight.
- R24 gesamt PR #26 – gemeinsame A/B/C-Integration.
- R24-D PR #27 – isoliert getestete v0→v1-Migrationshistorie.
- R24-E1 PR #28 – Auth- und Workspace-API modularisiert.
- R24-E2 PR #29 – React-Ansichten modularisiert.
- R24-E gesamt PR #30 – beide Refactorings gemeinsam geprüft.
- R24-F neuer Branch auf #30 mit CI/Release-Sicherung.

**Alle bleiben Drafts und ungemergt.** Bei gestapelten PRs zeigt
GitHub standardmässig nur den Diff zum unmittelbaren Basisbranch.
Für die vollständige Review das Kandidat-SHA gegen das genehmigte
R23-SHA vergleichen.

## 3. Automatische GitHub-CI

Datei: `.github/workflows/studio-r24-ci.yml`.

Trigger: Pull-Requests mit R24-Basisbranch sowie Pushes auf R24-F-Branches.
Kein `pull_request_target`, keine Repo-Secrets, keine selbstgehosteten
Runner, kein SSH/VPS-Zugriff und keine Deployment-Kommandos.
GitHub-Token besitzt ausschliesslich `contents: read`; Checkout
speichert keinen Git-Zugang. Aktionen sind auf ihre verifizierten
Upstream-SHAs fixiert.

Schritte auf einem frischen GitHub-hosted Linux Runner:

1. Node 24 und vollständige Git-Historie auschecken.
2. `scripts/r24-candidate-gate.mjs`: R23 und R24-E sind Vorfahren,
   historische Release-Fakten unverändert, Checkout sauber.
3. `npm ci --ignore-scripts --include=dev --include=optional` anhand
   des festgeschriebenen Lockfiles. Keine Paket-Upgrades oder
   Install-Skripte.
4. `node selfhost/verify.mjs`: Secret-/Source-Guard, Backendtests
   auf synthetischen DBs, TypeScript, frischer Vite-Build.
5. `scripts/r24-ci-release-smoke.mjs`: Release direkt aus sauberem
   Git bauen, Archiv gegen entpackte Dateien prüfen, Commit und
   Lockfile attestieren, erforderliche Runtime-Module kontrollieren
   sowie Smoke-Tests für API, Session, Task, Kommentar und
   konsistentes SQLite-Backup in privatem Testverzeichnis.
6. Review-Archiv wird maximal sieben Tage in GitHub Actions
   abgelegt, jedoch **nicht** in Production übertragen.

Ein grüner CI-Lauf bedeutet weder unabhängige menschliche Review
noch Owner-GO oder Production-Deployment. Er autorisiert keine
Provider-, Datenbank-, DNS- oder Kontoänderung.

## 4. Grenzen und zukünftige Freigabegates

- Ob GitHub Actions im privaten Repo tatsächlich laufen darf,
  muss nach PR-Push anhand eines Workflow-Runs bestätigt werden.
  Ein erfolgreicher lokaler Test beweist keine GitHub-CI-Ausführung.
- Statuschecks werden erst mit einer gesonderten
  Branch-Protection-/Ruleset-Konfiguration merge-blockierend.
- R24-D-Datenbankmigrationen wurden noch nicht auf echtem
  Production-Backup ausgeführt und sind nicht produktiv freigegeben.
- **Offsite-Backups auf ausdrücklichen Wunsch zurückgestellt**,
  lokale Sicherungs-/Restore-Gates bleiben vor Produktivänderungen Pflicht.
- Markus ist **noch nicht aktiv**: keine Einladung und keine neue
  Zwei-Personen-Production-Abnahme. Bestehende synthetische
  Regressions-Tests dürfen unabhängig von seiner Teilnahme laufen.
- GitHub `main` muss vor einem späteren Merge gesondert mit
  Production versöhnt werden; kein Force-Push, kein ungeprüfter
  Merge einer PR-Kette.
- Keine Kandidaten-SHA als `deployed` oder `approved` ausweisen,
  solange die echten Freigabegates offen sind.

## 5. Prüfen des Kandidaten lokal

    node scripts/r24-candidate-gate.mjs
    node selfhost/verify.mjs
    node scripts/r24-ci-release-smoke.mjs

Nur in sauberer, isolierter Arbeitskopie. Tests erzeugen Build-
und synthetische Testdaten, keine Änderungen auf dem VPS-Production-
Service. Ergebnisstand bis zu gesonderter Freigabe:

**R24-F = DRAFT / NO_MERGE / NO_DEPLOY.**
