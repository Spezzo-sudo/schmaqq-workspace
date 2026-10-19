# SCHMAQQ Studio R23 – isolierte technische Abnahme

**Status:** Korrekturen nur lokal und getestet. Der bestehende Draft-PR #21 ist unveraendert; kein erneuter GitHub-Push, Merge oder Deployment.

**Basis:** Isolierter Linux-Worktree vom in Production betriebenen PR18-Code. Auditbelege: Draft-PR #20, Branch `codex/studio-production-audit-2026-10-19`.

## Bestätigte UI-Fehler B01–B05

- **B01** Interne Navigation: Historieneinträge bei Benutzerwechsel, Popstate-Rücknavigation und Vorwärtsnavigation. Modal und ungültige Query-Parameter separat behandeln.
- **B02** Projektstartdialog: Initialfokus, Tastatur-Tabbegrenzung, Hintergrund inert und Fokus-Rückgabe.
- **B03** Review: Vollständige Details vor Diff-/Test- und Freigabeanzeige abwarten; Fehlerzustand getrennt.
- **B04** Mobile Navigation: Escape, aria-expanded, aria-controls, Tastaturfokus und geschlossenen Drawer verbergen.
- **B05** Projektsuche: Kein-Treffer-Hinweis und Suchreset, keine dominierende Projektanlage bei leerem Filter.

Playwright in echter Chromium-Instanz, isolierte Testkonten und eigenes lokales Bare-Git-Remote: **6 PASS / 0 FAIL**. Belege bleiben lokal unter `.studio/r23-browser-evidence/`, ohne Cookies oder Passwörter im Repository.

## Begrenzter GitHub-/PR-Übergang

`selfhost/github-pr-status.mjs` prüft ausschließlich lesend und **nur bei gesonderter Betreiberkonfiguration** einen vorhandenen GitHub-PR anhand Repo-Allowlist, Branch und exakter Commit-SHA. Falsche SHA, falscher Zielbranch, nicht konfigurierte Zielbasis, Fork-PRs, geschlossen/gemergt, unvollständige Providerlisten und Providerprobleme erhalten niemals Merge-Freigabe. Die persönliche GitHub-`read:user`-Identitätsprüfung ist davon getrennt; sie berechtigt nicht zum Lesen privater PRs.

Konfiguration ist standardmässig **deaktiviert**. Nur autorisiert einzurichten: `STUDIO_GITHUB_PROJECT_REPOS` (explizite Projekt-Zuordnung) und `STUDIO_GITHUB_PR_READ_TOKEN` (minimaler privater Read-only-Zugang). Keine Tokens oder Secrets als Code oder Testbelege speichern.

Die PR-Existenz/Commitbindung ist damit technisch vorbereitbar, aber **CI, erforderliche GitHub-Reviews und Branchschutz werden nicht als bestanden behauptet.** Die bestehenden direkten Merge-Sperren des Pull-Request-Workflows bleiben unverändert.

## Test- und Übergabegates

- `node selfhost/verify.mjs` unter Node >=24.15: 31 Backendtests, TypeScript, Source-Guard und Frontend-Build PASS.
- Playwright: `python3 scripts/r23-browser-qa.py`, nur mit vorher gestarteter isolierter Demo auf Loopback 4320.
- Bezüglich GH: 6 GitHub-Unit-/API-Contracttests PASS (in den 31 enthalten).
- Release-Manifest **703 Dateien** und extrahierter Runtime-Smoke **PASS**: Serverstart, Authentifizierung, Frontend, Aufgabenkommentar und konsistentes Backup; neuer GitHub-Statusbaustein im Paket enthalten.
- Production-Healthcheck nach Tests: PASS, aktive PR18-Version unverändert.

## Freigaben

Kein Push, Merge, Deployment oder neue Anbieterregistrierung. Kein neues Studio-Konto, keine neue Einladung, kein produktiver Runner und kein KI-Job. GitHub-PR/CI und reale Zusammenarbeit benötigen weitere getrennte Abnahmen.

## Nachbesserungen aus unabhängigem Review zu PR #21

- Target: **P2 korrigiert** – Ein PR gegen den falschen Zielbranch liefert `target_mismatch`, niemals `matched`. Das Ziel wird ausdrücklich in der Projektallowlist festgelegt; alte Repository-only-Einträge liefern `base_unverified`.
- Forks: **P2 korrigiert** – Die begrenzte ungefilterte PR-Liste kann Fork-PRs als `unsupported_fork` erkennen. Ab 100 PR-Einträgen wird sicherheitshalber `listing_incomplete` statt einer positiven oder negativen Behauptung angezeigt. Keine Fork-Verwaltung implementiert.
- Aktualisierung: **P3 korrigiert** – Manuelle Neuprüfung und Zeitstempel, automatisches Nachladen alle 30 Sekunden bei sichtbarem Browserfenster und beim Zurückkehren zum Tab. Ein laufender Nachladeversuch verwirft vorherige positive Statusmeldungen.
- GitHub-Repository-Zugänge weiterhin nur nach separater Betreiberfreigabe. Kein Push, Merge oder Deployment in diesem Korrekturblock.
