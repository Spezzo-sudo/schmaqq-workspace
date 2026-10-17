# R2 – Teststrategie bei begrenzten GitHub Actions

_Status: 17.10.2026, PR #2._

GitHub-Quoten und Actions-Ressourcen sind im bestehenden SCHMAQQ-Projekt ein bekannter Engpass. Daher bleibt GitHub die zentrale Code- und Reviewplattform; **Hermes** ist für die isolierte Linux-/Integrationstest-Ausführung vorgesehen. Der erste im R2-Entwurf angelegte automatische Workflow mit `push`- und `pull_request`-Triggern wurde **vor einem Merge aus diesem Branch entfernt**. Der aktuelle PR soll keine wiederkehrende GitHub-Actions-Last verursachen.

**Die Ausführung ist inzwischen erfolgt:** Der Owner hat den begrenzten temporären Test direkt auf dem bereits vorhandenen VPS freigegeben. Am 17.10.2026 wurden Node v24.22.0 in einem isolierten Benutzerordner, `npm ci --ignore-scripts`, `studio:verify` (13/13 Backendtests, TypeScript und Vite-Build) sowie ein Zwei-Rollen-Demo-Smoke erfolgreich ausgeführt. Headless-Chrome/Playwright prüfte Desktop und Mobil inkl. Login und mobilem Menü. Alle Testdaten wurden danach entfernt; Production/Preview/KlimaFinder blieben bei HTTP 200. Technische Details und Einschränkungen: [R2 Linux Evidence](evidence/R2_VPS_LINUX_TEST_20261017.md), [R3-A Browser Evidence](evidence/R3A_LOCAL_BROWSER_20261017.md) und [HERMES_TEST_RUNBOOK.md](HERMES_TEST_RUNBOOK.md). Die Tests waren **nicht** Docker-/cgroup-isoliert, sondern über Benutzer, getrennten Pfad, Prozess-/Zeitlimits und Cleanup begrenzt.

## Historischer Actions-Versuch

Der ursprüngliche PR-Stand löste [Run #39014844042](https://github.com/Spezzo-sudo/schmaqq-workspace/actions/runs/39014844042) aus. Ergebnis `failure`, Job `117344722493` meldete keine Steps, keinen Runner-Namen und der Log-Download lieferte `BlobNotFound`. Das **beweist keinen Testfehler des Workspace-Quellcodes**. Die bekannte Kontingentproblematik ist eine mögliche Erklärung; die einzelne Run-Evidence beweist die Ursache nicht.

## Qualitätsgates bleiben bestehen

Die ausgeführten Checks waren `npm ci --ignore-scripts --no-audit --no-fund`, `npm run studio:verify`, lokaler `demo-smoke` und automatisierter Desktop-/Mobil-Browser-Smoke. Vollständige manuelle Designabnahme, zwei reale Fernnutzer, OIDC-Provider und **dauerhafter** VPS-Betrieb bleiben **eigene** Gates. Keine Verschleierung fehlender Evidence, kein Produktionsdeployment und keine Rechteausweitung. Automatische Actions können bei genügend Kontingent **später separat** geprüft werden.
