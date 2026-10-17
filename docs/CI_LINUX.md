# R2 – Teststrategie bei begrenzten GitHub Actions

_Status: 17.10.2026, PR #2._

GitHub-Quoten und Actions-Ressourcen sind im bestehenden SCHMAQQ-Projekt ein bekannter Engpass. Daher bleibt GitHub die zentrale Code- und Reviewplattform; **Hermes** ist für die isolierte Linux-/Integrationstest-Ausführung vorgesehen. Der erste im R2-Entwurf angelegte automatische Workflow mit `push`- und `pull_request`-Triggern wurde **vor einem Merge aus diesem Branch entfernt**. Der aktuelle PR soll keine wiederkehrende GitHub-Actions-Last verursachen.

Die Ausführung ist **nicht bereits erfolgt**. Anleitung und Sicherheitsgrenzen: [HERMES_TEST_RUNBOOK.md](HERMES_TEST_RUNBOOK.md). Der bestehende produktive VPS ist nicht automatisch ein zulässiger Build-Host; vor jeder Installation Read-only-Preflight und passende getrennte Runtime.

## Historischer Actions-Versuch

Der ursprüngliche PR-Stand löste [Run #39014844042](https://github.com/Spezzo-sudo/schmaqq-workspace/actions/runs/39014844042) aus. Ergebnis `failure`, Job `117344722493` meldete keine Steps, keinen Runner-Namen und der Log-Download lieferte `BlobNotFound`. Das **beweist keinen Testfehler des Workspace-Quellcodes**. Die bekannte Kontingentproblematik ist eine mögliche Erklärung; die einzelne Run-Evidence beweist die Ursache nicht.

## Qualitätsgates bleiben bestehen

Die vorgesehenen Checks sind `npm ci --no-audit --no-fund`, `npm run studio:verify` und optional ein lokaler `demo-smoke` in isolierter Linux-Umgebung. Echte Browser-/Mobile-Abnahme, zwei reale Fernnutzer, OIDC-Provider und VPS-Betrieb sind **eigene** Gates. Keine Verschleierung fehlender Evidence, kein Produktionsdeployment und keine Rechteausweitung. Automatische Actions können bei genügend Kontingent **später separat** geprüft werden.
