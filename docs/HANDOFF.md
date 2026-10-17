# SCHMAQQ Studio — Fortsetzen ohne alten Chat

Wir bauen eine echte gemeinsame Entwicklungsumgebung für Marco in der Schweiz
und Markus in Thailand. Beide verwenden ihre eigenen ChatGPT-Konten. GitHub
bewahrt Code und Review; der vorhandene Hostinger-VPS soll später das Studio
dauerhaft betreiben. Der Heim-PC soll dafür nicht ständig laufen müssen.

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
  Backup, Preflight und Deployment-Vorlagen; noch kein VPS-Deployment.
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

Das Studio bleibt auf localhost, bis ein Server separat eingerichtet wird. Ein
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
