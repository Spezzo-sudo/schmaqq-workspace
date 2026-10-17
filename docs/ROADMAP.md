# SCHMAQQ Workspace — Roadmap und Prüfgates
_Status: R1-Planung, 17.10.2026. Reihenfolge statt künstlicher Termine. Jede Phase braucht beobachtbare Evidence._

## Zielprinzip

**Zuerst ein nützliches echtes Zwei-Personen-Produkt, dann universelle Arbeitsabläufe, dann ein sicheres offenes Ausführungsnetzwerk.** Repositorien, Domains und Infrastruktur sind Mittel, nicht der Nutzerwert. Keine Marketing- oder Monetarisierungsversprechen ohne Betriebsnachweis.

### R0 — Repository-Übertragung [nachgewiesen]
- Private Codebasis `Spezzo-sudo/schmaqq-workspace`, Historie übertragen, Startdokumentation vorhanden.
- Lokale Quelle: 13 Backendtests, TypeScript, Source-Guard, Frontend-Build PASS laut Übertragungs-Evidence 17.10.2026.
- Fehlende Nachweise: Cloud/Linux-Installation, Hermes-Linux-Testlauf, Browser, tatsächlicher Zwei-Personen-Betrieb, VPS. GitHub Actions ist bewusst kein verpflichtendes Gate.
- **Gate:** Migration von GitHub lesbar; kein Production-Change. Kein Anspruch, dass alle Plattformfunktionen produktiv sind.

### R1 — Vision/Architektur (dieser PR) [in Review]
**Lieferobjekte:** `PRODUCT_VISION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, ADR-Vorschläge, Plattform-Integrationsgrenzen und Referenzen in Einstiegstexten.

**Gate:** Owner prüft, dass Universal-Workspace, Studio als Modul, optionale Agenten, langfristiges Compute-Netzwerk, Sicherheit und Monetarisierungsoptionen korrekt beschrieben sind. Keine Laufzeitänderung. Erst Merge macht den Stand zur im Repo akzeptierten Richtung.

### R2 — Frischer Cloud-/Linux-Start mit Hermes-Test-Evidence [nächster Engineering-Block]
**Auftrag:** Auf einem frischen Linux-Checkout mit Node >=24.15.0 / Git / Python 3 reproduzierbar installieren, `node selfhost/cloud-setup.mjs`, `npm run studio:verify`. Die reale Suite läuft über Hermes auf einem gesonderten, autorisierten Linux-Test-Runner. Keine neuen automatischen GitHub-Actions-Workflows; kein Umgehen von Fehlern. Browserabnahme der Demo am Desktop und Mobil-Viewport. Nachweis: Logs, Commit, ggf. Screenshots und reproduzierbare Befehle.

**Gate:** Wiederholbarer Linux-Green-Run; install/build/test getrennt dokumentiert; fehlerfreier Demo-Start; keine produktiven Credentials/Deployments; Hinweis auf weiterhin fehlende echten Mehrbenutzerbetrieb. Alte fehlgeschlagene NetzKontor-CI gilt nicht als aktueller Studio-Test.

### R3 — Tatsächlicher Zwei-Personen-Pilot + klare Admin-UX
**Auftrag:** Zwei echte Benutzerkonten, zwei unabhängige Browserprofile und Geräte, Anmeldung/Einladung, Projekt, Task, Kommentar/Datei, Codex- oder rein menschlicher Bearbeitungsablauf, echte Tests, Vorschau, unabhängiges Review und Freigabe. Die UI braucht einen **auffindbaren** Admin-/Einstellungszugang für berechtigte Personen; Serverrechte prüfen. Kein pauschaler Zugriff für beliebige Nutzer.

**Gate:** Abläufe und Negativfälle dokumentiert (falscher Benutzer, fremder Runner, verlorene Verbindung, Konflikt, abgelehnte Review, abgebrochener Job). PC aus = Studio-Webzugang später noch erreichbar; dessen lokaler Runner entsprechend offline. Kein Fake-Erfolg.

### R4 — Isolierter Dauerbetrieb [erst nach explizitem Owner-Go]
**Auftrag:** Hostinger-VPS **read-only** preflight: RAM, Speicher, Ports, Reverse Proxy, Backups, isolierte Pfade. Danach eigener, unprivilegierter Studio-Dienst mit separaten Origins für Studio und Vorschau, HTTPS, persistenter DB, Backup und Restore. Keine Mitbenutzung von NetzKontor-DB, Docker-Socket oder persönlichen Auth-Caches.

**Gate:** Zwei reale externe Logins, getrennte Datenpfade, Dienstneustart mit Datenpersistenz, Backup/Restore getestet, Rollback, Sicherheit und Browserprüfung. Kein Production-Deployment ohne gesonderte Freigabe.

### R5 — Universeller Workspace und Anbieter-Adapter
**Auftrag:** Aufgaben/Artefakte/Entscheidungen auch ohne Git, generische Agenten-/Provider-Schnittstelle, explizite Rechte, Prozesskosten-/Budgetgrenzen, breitere Teamrollen, exportierbarer Kontext. Optional frühes SSO mit Hauptwebsite über geprüften Vertrag, nicht DB-Zugriff.

**Gate:** Gleicher Auftragstyp über menschlichen Ablauf und zwei voneinander unabhängige Ausführungsadapter möglich; jedes Ergebnis hat sichtbare Herkunft, Budget und Freigabe. Benutzer können Agenten ohne Datenverlust deaktivieren.

### R6 — Multi-Tenant- und Integrationsreife
**Auftrag:** Organisationen/Workspaces voneinander isolieren, vollständige API-Objektprüfungen, Einladungs-/Kontenlebenszyklus, Admin, Aufbewahrung, Monitoring, Restore und klare Website-/Studio-Navigation. Datenmigration vom persönlichen Einzel-Studio kontrolliert planen.

**Gate:** Negativtests für Cross-Tenant-Lesen/Schreiben, Rechtemissbrauch und Datenexport; wiederholbare Deployments und Wiederherstellung. **Vorher keine offene Kundenregistrierung.**

### R7 — Vertrauenswürdiges Compute-Pilotnetz
**Auftrag:** Freiwillige Gerätefreigabe mit Capability-Discovery, Anbieterzustimmung, Quotas, fein abgestuften Jobtypen und einem isolierten Worker-Pilot **nur mit bekannten, autorisierten Parteien**. Unvertrauenswürdigen Code aus fremden Projekten grundsätzlich nicht auf normale private Runner lassen. Metering und Kostenbelege zunächst ohne Zahlungen.

**Gate:** Isolation, Abbruch, Revocation, Offline-Verhalten, Datenklassifikation, begrenzter Egress, reproduzierbare Messwerte und Audit sicher demonstriert. Keine Auszahlung oder Öffnung für die Öffentlichkeit.

### R8 — Marketplace- und Geschäftsmodellprüfung
**Auftrag:** Preiseinheiten, Vermittlungsgebühr, verifizierbare Nutzung, Zahlungsfluss, Refunds/Disputes, steuerlich/rechtliche und providervertragliche Voraussetzungen, Support und Abuse-Management prüfen. Erst danach begrenzte Monetarisierung testen.

**Gate:** Sichere und faire technische Abrechnung plus geklärte Anbieterbedingungen. Keine Weitervermarktung fremder Abos oder Tokens ohne Berechtigung.

## Die drei unmittelbar wichtigsten Arbeitspakete

| Rang | Paket | Konkreter Output | Nicht Teil davon |
| --- | --- | --- | --- |
| 1 | **R2-A: Linux + CI** | Cloud-Setup und `studio:verify` unter isoliertem Linux/Hermes nachweisbar, Fehler dokumentiert/behandelt | VPS, Auth-Provider oder grosser Refactor |
| 2 | **R2-B/R3-A: Sichtbares Produkt** | Browser-Demo und zwei Rollen mit echten Aufgaben/Dateien/Review, dokumentierte UX-Lücken | Allgemeiner AI-Marktplatz |
| 3 | **R3-B/R4-A: Zugang & Betriebsvorbereitung** | Admin auffindbar, Rechtegate geprüft, VPS-Preflight nur lesend | Eigenmächtige Production-Änderung |

## Testausführung ohne GitHub-Actions-Quota

- Hermes ist für R2 die vorgesehenen Ausführungsinstanz, nicht GitHub Actions. `docs/HERMES_TEST_RUNBOOK.md` auf dem R2-Branch enthält das genaue Testverfahren; bei Merge von PR #2 wird es Teil von main.
- Tests nur auf einem isolierten, autorisierten Linux-Testhost mit Node >=24.15.0. System-Node auf dem produktiven VPS v22.22.2 nicht verändern; keine Tests ohne sichere Sandbox und passende Rechtegrenzen.
- Saubere SHA-/Node-/npm-/Install-/Test-Evidence dokumentieren. Browser-/Mobilabnahme und echter Mehrbenutzerbetrieb bleiben separate Gates.

## Abhängigkeitsregeln

- Eine frühe UX-Preview darf lokal/isoliert stattfinden; das begründet **keine** öffentliche Freigabe.
- Vor internetweitem Pilot: TLS, authentifizierte Sessions, berechtigte Runner, Backups und nachvollziehbare Sicherheitsgates.
- Vor externen Teams: Mandantentrennung.
- Vor fremden Compute-Nodes: starke Sandbox, Missbrauchsschutz und Einwilligung.
- Vor Gebühren: verlässliches Metering, Limits und Zahlungs-/Vertragsklärung.
- NetzKontor-Umbenennung und `studio.schmaqq.com` sind **separate**, überprüfte Plattform-/Domain-Arbeiten, keine Blocker für R2.

## Fortschrittsführung

`docs/STATUS.json` bleibt alleiniger technischer Ist-Snapshot im Studio-Repository. Nach einem bestandenen Arbeitsblock dort **nur tatsächlich nachgewiesene** Änderungen vermerken. PR-Beschreibungen enthalten genaue Tests/Evidence und unveränderte Risiken. Produktvision/Architektur enthalten bewusst keine schnell veraltenden Commit-SHAs.

Referenzen: [PRODUCT_VISION.md](PRODUCT_VISION.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [INTEGRATION_BOUNDARIES.md](INTEGRATION_BOUNDARIES.md) · [HANDOFF.md](HANDOFF.md).
