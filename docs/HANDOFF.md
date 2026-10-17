# SCHMAQQ Studio — Fortsetzen ohne alten Chat

Wir bauen eine echte gemeinsame Entwicklungsumgebung für Marco in der Schweiz
und Markus in Thailand. Beide verwenden ihre eigenen ChatGPT-Konten. GitHub
bewahrt Code und Review; der vorhandene Hostinger-VPS soll später das Studio
dauerhaft betreiben. Der Heim-PC soll dafür nicht ständig laufen müssen.

## Wo der Stand liegt

Der lokale Ursprung ist ein eigenes Git-Projekt ohne Remote. Die Online-Übergabe
erfolgt als getrennter Unterordner `tools/schmaqq-studio/` auf einem eigenen Branch
im privaten `Spezzo-sudo/NetzKontor`-Repository. Das ist ein Entwicklungsstand zur
Weiterarbeit, keine Integration in Marketing, Kundenportal oder Production.
Übergabe-Branch: `chatgpt/391-studio-cloud-handoff` (Issue #391).
Branch und Commit immer direkt aus GitHub/Git lesen. `STATUS.json` beschreibt
Fähigkeiten und offene Nachweise, nicht den aktuellen Betriebszustand des VPS.

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
Die lokale Git-Historie wird zusätzlich als Git-Bundle gesichert; der NetzKontor-
Branch erhält einen nachvollziehbaren Quellcode-Snapshot. Keine gemeinsame
Git-Vergangenheit der beiden Projekte vortäuschen.

Das Studio bleibt auf localhost, bis ein Server separat eingerichtet wird. Ein
Cloud-Entwickler kann Code bearbeiten/testen, auch wenn dieser PC aus ist; er
ersetzt weder automatisch das Studio-Hosting noch einen ausgeschalteten Runner.
Ein normaler Chat hat nur die tatsächlich verbundenen Tools und kann nicht
allein wegen dieser Dokumentation Befehle auf einem Rechner ausführen.

## Einstieg in Codex Cloud oder Work

1. Die vorhandene GitHub-Verbindung für `Spezzo-sudo/NetzKontor` verwenden.
2. Den Studio-Übergabe-Branch bzw. dessen genauen Commit wählen. Nicht blind main.
3. Im Checkout zu `tools/schmaqq-studio` wechseln. Node >=24.15, Python 3 und Git.
4. Setup: `node selfhost/cloud-setup.mjs`. Das installiert aus dem Lockfile und
   baut das Studio. Keine echten KI-/VPS-/Provider-Secrets für diese Arbeit nötig.
5. `npm run studio:verify` ausführen. Linux-Fehler tatsächlich beheben und berichten.
6. Eigener Branch, eng begrenzte Änderung, Tests, PR und Review. Ein Merge ist
   keine Deployment-Freigabe. Die übergeordneten NetzKontor-Regeln gelten ebenfalls.

Offizielle Referenz: https://learn.chatgpt.com/docs/environments/cloud-environment
Die tatsächliche Verfügbarkeit und Freigabe der Umgebung im Konto separat prüfen.

## Starttext für einen neuen Codex-/Work-Chat

> Wir entwickeln SCHMAQQ Studio weiter. Öffne den Studio-Übergabe-Branch im privaten
> Spezzo-sudo/NetzKontor-Repository und arbeite unter tools/schmaqq-studio. Lies die
> übergeordneten AGENTS.md-Regeln, dann unsere AGENTS.md, docs/STATUS.json und
> docs/HANDOFF.md. Prüfe den tatsächlichen Git-Stand. Starte mit studio:verify.
> Keine private Runtime aus dem alten PC voraussetzen. Nächste Aufgabe: Linux-
> Reproduzierbarkeit und sichtbare Abnahme des neuesten Layouts, danach den
> vollständigen Zwei-Personen-Ablauf prüfen. Änderungen nur im Studio-Bereich.
> Melde echte Testresultate und noch offene Voraussetzungen; kein Deployment.

## Starttext für einen normalen ChatGPT-Chat

> Lies im verbundenen privaten GitHub-Repository Spezzo-sudo/NetzKontor auf dem
> Studio-Übergabe-Branch die Dateien tools/schmaqq-studio/docs/STATUS.json und
> HANDOFF.md. Wenn dieser Branch nicht zugänglich ist, sage das ausdrücklich und
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


## Letzte Prüf-Evidence und offene GitHub-CI

Lokal am 17.10.2026: `npm run studio:verify` bestanden (13 Tests, TypeScript,
Frontend-Build und Source-Guard). Die GitHub-Übertragung wurde als vollständiger
Baum geprüft. Entwurfs-PR: https://github.com/Spezzo-sudo/NetzKontor/pull/392.

Der erste Studio-CI-Lauf https://github.com/Spezzo-sudo/NetzKontor/actions/runs/39011115243
wird von GitHub als fehlgeschlagen gemeldet; es wurden keine Jobschritte oder
abrufbaren Logs zurückgegeben. Auch die übergeordnete CI meldete einen Fehler.
Die Ursache ist nicht bewiesen. Dies ist kein grüner Linux-Nachweis. Zuerst die
GitHub-Laufausführung prüfen; alternativ in einer echten Cloud-Entwicklungsumgebung
installieren und prüfen. Kein Neustarten einer Schleife ohne neue Evidence.

Die Codex-Cloud-Umgebung selbst ist noch nicht angelegt/aktiviert. Dafür muss die
bereits bestehende GitHub-Verbindung Zugriff auf den Übergabe-Branch haben und
Node >=24.15 bereitstehen. Die Projektdateien und der obige Starttext sind dafür
vorbereitet. Ein Chat-/Cloud-Wechsel überträgt keine laufende lokale Sitzung.
