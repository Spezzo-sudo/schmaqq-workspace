# SCHMAQQ Studio — Fortsetzen ohne alten Chat

Wir bauen eine echte gemeinsame Entwicklungsumgebung für Marco in der Schweiz
und Markus in Thailand. Beide verwenden ihre eigenen ChatGPT-Konten. GitHub
bewahrt Code und Review; der vorhandene Hostinger-VPS betreibt bereits
den geprüften Kollaborationskandidaten. Der Heim-PC soll dafür nicht ständig laufen müssen.


## Langfristiges Produktbild (separat vom heutigen Status)

Workspace ist die universelle Arbeitsplattform für Menschen und Agenten; Studio ist der erste Bereich. Freiwilliges Peer-Compute und Monetarisierung sind spätere, sicherheitskritische Entwicklungsphasen. Vor Architektur-/Produktarbeit [Produktvision](PRODUCT_VISION.md), [Zielarchitektur](ARCHITECTURE.md), [Roadmap](ROADMAP.md) und [Integrationsgrenzen](INTEGRATION_BOUNDARIES.md) lesen. **Nur** [STATUS.json](STATUS.json) enthält den aktuellen technischen Fähigkeitsnachweis. Plattform-Repo und dessen Runtime bleiben unabhängig.

## Nächster Meilenstein und Konsolidierung

Die operative Gesamtplanung steht in [ROADMAP.md](ROADMAP.md). Aktives Paket ist
**P3: Markus auf macOS und gemeinsamen Testremote verbinden**. P1 und P2 sind
abgeschlossen: `docs/evidence/P1_CANDIDATE_LINUX_20261017.md` und
`docs/evidence/P2_SWITCH_ACCEPTANCE_20261017.md`. Der Mac ist noch nicht
angebunden; vorbereiteter Ablauf in `docs/MARKUS_MAC_ONBOARDING.md`.
Der Owner hat inzwischen `Spezzo-sudo/schmaqq-studio-pilot` als privaten
Testremote genehmigt; Repository, Seed und zwei Aufgaben im Live-Projekt
„Studio-Pilottest“ sind angelegt. Markus hat laut Owner noch kein GitHub-Konto; persönliche Registrierung
steht vor der gezielten Einladung. Evidence: `docs/evidence/P3_PILOT_SETUP_20261017.md`.
Danach P4 echte gemeinsame Abnahme. Vorhandene Setup-/Live-Checks
nicht pauschal wiederholen. Langfristige Anbieter-/Compute-Arbeit bleibt Backlog.

Der verbindliche Ablauf für Sicherung, Review, kontrollierte Bereitstellung und
anschließende menschliche Abnahme steht in `PILOT_PLAN.md`. Neueste technische
Prüfung: `STATUS.json` unter `verification`; die frühere R4-Prüfung ist ausdrücklich
als `historical_verification_r4` erhalten. Quellcode-Backup und Draft-Review erteilen
keine Deployment-Freigabe. Zwei zusätzliche Review-Korrekturen schützen Kommentare
während des Speicherns und öffnen vorhandene Aufgabenkopien auf ihrem richtigen
PC. Runtimeprofile, SQLite-Daten und Browser-Screenshots bleiben lokal ignoriert.

## Aktuelle Priorität: gemeinsam parallel arbeiten

Die lokale Studio-Startseite ist jetzt die gemeinsame Projektübersicht. Aufgaben
können atomar übernommen, kommentiert und aus ihrem Kontext in eigene Arbeitskopien
geöffnet werden. Prüfstände sind direkt an Aufgaben verlinkt. Zwei getrennte
Testkonten, Browserkontexte und echte Runner haben diesen Ablauf inklusive
parallel laufender Tests, Vorschauen und gegenseitiger Freigabe durchlaufen.
Dies ersetzt keinen tatsächlichen Fernpilot mit Marco und Markus. Details,
Datenmigration und offene Grenzen: `docs/PARALLEL_COLLABORATION_HANDOFF.md`.
Die Änderungen gehören zum separaten Kandidatenbranch; Veröffentlichung/Review-Stand siehe `STATUS.json` und Git. Der freigegebene Betreiberwechsel ist abgeschlossen, main bleibt ungemerged.

## Aktuelle Fortsetzung: Windows-Runner und Bedienbarkeit

R5-A hat den persönlichen Windows-Runner mit dem Live-Studio verbunden und
Git, Arbeitskopie, Dateispeicherung, Tests, gebaute Vorschau und Runner-Neustart
mit einem isolierten lokalen Testrepository nachgewiesen. Details stehen in
`R5_A_TECH_HANDOFF.md`. Das ist kein Nachweis für Markus' Fernzugriff, persönliche
KI-Aufträge oder die Ausführung bei ausgeschaltetem Heim-PC.

Die anschließenden Korrekturen für die erste Arbeitskopie und den responsiven
Editor liegen auf `fix/studio-first-workspace-layout`. Sie sind lokal geprüft und inzwischen durch den befugten Betreiber deployed. Siehe `docs/USABILITY_FIRST_WORKSPACE.md`.
Der neue Bereich „Verbindungen“ ergänzt eine lokal getestete GitHub-Kontoverknüpfung
und tatsächliche Codex-Statusanzeigen. Echte GitHub-Clientregistrierung und Live-
Freigabe fehlen noch; Claude/Copilot sind nicht integriert. Aktuelle Details:
`docs/CONNECTIONS_HANDOFF.md`. Historische Aussagen
zu einem noch nicht eingerichteten VPS weiter unten sind keine aktuelle
Betriebsbestandsaufnahme. Der lesende Live-Audit vom 17.10.2026 ist nun in
`docs/LIVE_PREFLIGHT_20261017.md` dokumentiert (historischer Stand vor dem Update): alter main-Stand aktiv, eigener
Node-24-Dienst, gültiges HTTPS, persönlicher Runner online. Der neue Kandidat läuft inzwischen live; aktueller Nachweis in
`docs/evidence/P2_SWITCH_ACCEPTANCE_20261017.md`. Hermes hat die Live-Snapshot-/Restore-Probe inzwischen als bestanden gemeldet
(Owner-Weiterleitung: `docs/evidence/P2_HERMES_BACKUP_REPORT_20261017.md`).
Finaler Snapshot und Dienstwechsel sind laut anschließendem Hermes-Bericht
abgeschlossen; aktives Release, Oberfläche und erhaltener Runner direkt geprüft.
Das geprüfte Paket samt `HERMES_README.md` liegt geschützt unter
`/home/dc-remote/schmaqq-studio-handoff/p2-4a0092b-20261017`; Hermes benötigt
für die Übernahme keinen GitHub-Zugriff. Hash/Quelle in STATUS.json unter
`operator_delivery`. Dieses Paket wurde nach Owner-Freigabe deployed; weitere Änderungen sind damit nicht freigegeben.

## Wo der Stand liegt

Die zentrale Codebasis ist das private Repository
`https://github.com/Spezzo-sudo/schmaqq-workspace`, Remote-Hauptbranch `main`.
Der gesamte Code liegt direkt im Repository-Root. Die vorhandene lokale
Git-Historie wird unverändert als Vorgeschichte übernommen; Git zeigt den
aktuellen Commit und Branch. Ein vorhandener lokaler Branch namens `main`
kann noch den alten Starter zeigen: maßgeblich ist `origin/main`.

Der frühere NetzKontor-Branch `chatgpt/391-studio-cloud-handoff` und PR #392
sind historische Übergabe-Snapshots. Sie sind nicht die neue Studio-Codebasis.
Das NetzKontor-Repository wird durch diese Übertragung nicht verändert.
`STATUS.json` beschreibt Fähigkeiten und offene Nachweise, nicht den aktuellen
Betriebszustand des VPS.

## Codekarte und wichtige Entscheidungen

- `studio/main.tsx`: eigenständiger Einstieg und Anmeldung.
- `studio/brand.css`, `app/studio-brand.tsx`: Design aus der Live-Preview, originale
  Logo-Vektorpfade, vereinfachte lokale Welle; Logo-Klick verwirft keine Entwürfe.
- `app/workspace.tsx`: Projekte, Aufgaben, Chat, Wissen, Navigation und Team.
- `app/development.tsx`, `source-editor.tsx`, `team-workspaces.tsx`, `code-review.tsx`:
  echte Entwicklerabläufe; keine simulierten Erfolgsmeldungen als Testergebnis.
- `selfhost/server.mjs`, `store.mjs`: Node HTTP und SQLite WAL.
- `selfhost/runner.mjs`: ausgehende Verbindung zum Studio; Code läuft auf dem
  konfigurierten Gerät. Own-device-Grenze für Codejobs bleibt erhalten.
- `selfhost/oidc.mjs`: Identitätslogin mit PKCE/Nonce/JWKS; echter OpenAI-Client fehlt.
- `selfhost/local-ai.mjs`, `ai-routes.mjs`: ausdrücklich freigegebene lokale Modelle.
- `selfhost/release.mjs`, `backup.mjs`, `deploy/`: leichtes Runtime-Paket, konsistentes
  Backup, Preflight und Deployment-Vorlagen; aktueller Kandidat kontrolliert
  deployed und lesend nachgeprüft.
- `app/api/`, `db/`, `build/`: ursprünglicher Sites-Starter, anderer Hostingpfad.
  Für dieses Vorhaben `studio:*` verwenden. Root-`npm run dev` startet den Starter.

Sitzungen sind pro Person. Einladungen binden an die E-Mail. Eigene Git-Worktrees
verhindern gleichzeitiges Schreiben in dieselben Dateien. Aufgaben/Dateibereiche
können reserviert werden. Stale-Save-Prüfung schützt den Editor; inhaltliche
Git-Konflikte bleiben möglich und werden angehalten. Review gilt exakt einem
Commit und muss von der anderen Person stammen. Vorschau läuft auf anderer Origin.

## Was nicht durch einen Quellcode-Upload übertragen wird

Private Datenbanken, ChatGPT-/Codex-Sitzungen, Runnerprofile, persönliche Programme,
lokale Modelle und der gesamte Chatverlauf bleiben außerhalb des Git-Repositories.
Die vorhandene lokale Git-Historie wird vollständig in das eigenständige
Repository übertragen und zusätzlich als lokales Git-Bundle gesichert. Private
Runtime-Daten werden dabei nicht übertragen; eine neue Installation erzeugt
eigene Daten, Konten und Zugangsdaten.

Neue Standardinstallationen binden an localhost. Das in R5-A geprüfte Live-Studio
ist unter https://studio.schmaqq.com erreichbar; dessen Betrieb wurde hier nicht
vollständig auditiert. Ein
Cloud-Entwickler kann Code bearbeiten/testen, auch wenn dieser PC aus ist; er
ersetzt weder automatisch das Studio-Hosting noch einen ausgeschalteten Runner.
Ein normaler Chat hat nur die tatsächlich verbundenen Tools und kann nicht
allein wegen dieser Dokumentation Befehle auf einem Rechner ausführen.

## Einstieg in Codex Cloud oder Work

1. Der GitHub-Verbindung Zugriff auf `Spezzo-sudo/schmaqq-workspace` geben.
2. Den Remote-Branch `main` oder den gewünschten Entwicklungsbranch wählen.
3. Im Repository-Root arbeiten. Node >=24.15, Python 3 und Git bereitstellen.
4. Setup: `node selfhost/cloud-setup.mjs`. Das installiert aus dem Lockfile und
   baut das Studio. Keine echten KI-/VPS-/Provider-Secrets für diese Arbeit nötig.
5. `npm run studio:verify` ausführen. Linux-Fehler tatsächlich beheben und berichten.
6. Eigener Branch, eng begrenzte Änderung, Tests, PR und Review. Ein Merge ist
   keine Deployment-Freigabe. NetzKontor bleibt ein getrenntes Projekt.

Offizielle Referenz: https://learn.chatgpt.com/docs/environments/cloud-environment
Die tatsächliche Verfügbarkeit und Freigabe der Umgebung im Konto separat prüfen.

## Starttext für einen neuen Codex-/Work-Chat

> Wir entwickeln SCHMAQQ Studio weiter. Öffne main im privaten Repository
> Spezzo-sudo/schmaqq-workspace und arbeite im Repository-Root. Lies
> AGENTS.md, docs/STATUS.json und
> docs/HANDOFF.md. Prüfe den tatsächlichen Git-Stand. Starte mit studio:verify.
> Keine private Runtime aus dem alten PC voraussetzen. Nächste Aufgabe: Linux-
> Reproduzierbarkeit und sichtbare Abnahme des neuesten Layouts, danach den
> vollständigen Zwei-Personen-Ablauf prüfen. Änderungen nur im Studio-Bereich.
> Melde echte Testresultate und noch offene Voraussetzungen; kein Deployment.

## Starttext für einen normalen ChatGPT-Chat

> Lies im verbundenen privaten GitHub-Repository Spezzo-sudo/schmaqq-workspace
> auf main die Dateien docs/STATUS.json und docs/HANDOFF.md. Wenn dieser Branch nicht zugänglich ist, sage das ausdrücklich und
> verlange die beiden Dateien. Arbeite am nächsten eng begrenzten Arbeitspaket.
> Behaupte keine Ausführung, wenn keine Ausführungsumgebung verbunden ist.

## Test mit zwei Rollen

Zugangsdaten werden lokal von `node selfhost/demo.mjs` erzeugt und nur in `.studio/`
gespeichert. Zwei Browserprofile verwenden, da zwei Tabs dieselbe Sitzung teilen.
Marco: Datei öffnen → ändern → speichern → Tests → Vorschau → Teamprüfung.
Markus: Diff ansehen → Rückmeldung/Freigabe. Marco: geprüften Stand veröffentlichen
und zusammenführen. Das lokale Demo-Remote ist ein echtes isoliertes Bare-Repository.
Die echte NetzKontor-Quelle verlangt weiterhin Issue/PR/CI und wird dadurch nicht
automatisch freigegeben oder deployed.


## Historische Prüf-Evidence und offene Cloud-Abnahme

Lokal am 17.10.2026: `npm run studio:verify` bestanden (13 Tests, TypeScript,
Frontend-Build und Source-Guard). Die GitHub-Übertragung wurde als vollständiger
Baum geprüft. Entwurfs-PR: https://github.com/Spezzo-sudo/NetzKontor/pull/392.

Im früheren NetzKontor-Snapshot wurde der erste Studio-CI-Lauf https://github.com/Spezzo-sudo/NetzKontor/actions/runs/39011115243
wird von GitHub als fehlgeschlagen gemeldet; es wurden keine Jobschritte oder
abrufbaren Logs zurückgegeben. Auch die übergeordnete CI meldete einen Fehler.
Die Ursache ist nicht bewiesen. Dies ist kein grüner Linux-Nachweis. Zuerst die
GitHub-Laufausführung prüfen; alternativ in einer echten Cloud-Entwicklungsumgebung
installieren und prüfen. Kein Neustarten einer Schleife ohne neue Evidence.

Die Codex-Cloud-Umgebung selbst ist noch nicht angelegt/aktiviert. Dafür muss die
bereits GitHub-Verbindung Zugriff auf das neue Repository haben und
Node >=24.15 bereitstehen. Die Projektdateien und der obige Starttext sind dafür
vorbereitet. Ein Chat-/Cloud-Wechsel überträgt keine laufende lokale Sitzung.


Im eigenständigen Studio-Repository ist noch kein GitHub-Actions-Workflow
konfiguriert. Der fehlgeschlagene historische NetzKontor-Lauf ist kein aktueller
Studio-CI-Lauf. Maßgeblicher lokaler Prüfeinstieg bleibt `npm run studio:verify`.
