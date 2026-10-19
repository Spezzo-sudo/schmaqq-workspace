# SCHMAQQ Studio — Quellcode-Landkarte für Maintainer (R24-A)

Status: dokumentierter IST-Stand von R23 plus gesonderte, **noch nicht
ausgerollte** R24-A-Verifikationsmodule. Kein Anspruch, dass historische
Starter-Komponenten Teil der aktuellen Studio-Production sind.

## Laufender Entwicklungsweg

- Browser: `studio/main.tsx` startet React/Vite und zeigt die Anmeldung.
- Teamansichten/Projekte/Chat: `app/workspace.tsx`, Aufgaben-Komponenten
  sowie `app/collaboration-board.tsx`.
- Entwicklung: `app/development.tsx` kombiniert Runner-Auswahl,
  Git-Arbeitskopien, Jobs, Tests, Review und Vorschau.
- Dateieditor: `app/source-editor.tsx` und `app/editor-drafts.ts`.
  **Bekannte Beschränkung:** `selfhost/files.mjs` limitiert Textdateien
  auf 24 KB; einige Studio-eigene Dateien überschreiten das.
- API: `selfhost/server.mjs` bündelt HTTP-Routing, Sessions, Aufträge
  und zwei Listener (Studio + getrennte Vorschau-Origin).
- Gemeinsame Arbeit: `selfhost/collaboration.mjs`,
  `selfhost/workspaces.mjs`, `selfhost/reviews.mjs`.
- Identität: `selfhost/store.mjs`, `selfhost/oidc.mjs`,
  `selfhost/connections.mjs`.
- SQLite: `selfhost/store.mjs` öffnet WAL und legt Tabellen an.
  **Keine** versionierte Migrationsserie vorhanden.
- Persönliche Rechner: `selfhost/runner.mjs`,
  `selfhost/process.mjs`, `selfhost/files.mjs`,
  `selfhost/codex-run.mjs`. Persönliche Git-/Codex-Konten bleiben dort.
- Externes GitHub-PR-Lesen: `selfhost/github-pr-status.mjs`, ohne Merge.
- Deployment: `selfhost/release.mjs`, `selfhost/deploy/` und
  gesonderte Hermes-Betriebsfreigaben.

## Verbindliche Daten-/Berechtigungsgrenzen

1. Studio verarbeitet Konto-/Teamdaten in der zentralen SQLite-Datenbank.
   Persönliche Repository-Worktrees und Codex-Sessions liegen **nicht**
   in dieser Datenbank, sondern auf dem Rechner des Runner-Besitzers.
2. Gerätetokens werden auf dem Studio-Server als Hash gespeichert und
   zum Runner-Poll authentifiziert. Datei- und Codex-Jobs benötigen
   eine eigene Arbeitskopie und eine vom Runner explizit erlaubte Aktion.
3. Git-Reviews binden Freigaben an Commit-SHAs und zweite Mitglieder.
   GitHub-PR-Anzeigen sind zusätzliche read-only Hinweise, **keine**
   Merge-/CI-Freigabe.
4. Vorschauen dürfen projektbezogenen JavaScript-Code darstellen und
   gehören daher auf einen vom Studio getrennten Origin.
5. `selfhost/deploy/studio.env.example` ist nur eine Vorlage.
   Effektive Secrets und Service-Konfiguration gehören ausschliesslich
   in geschützte Operator-Verwaltung.

## Welcher Code ist aktuell *nicht* Studio-Production?

Im Repository verbliebene `app/api/workspace/route.ts`, `db/`,
`drizzle/`, `build/`, grosse Teile von `components/ui/` sowie
`next.config.ts` sind überwiegend Teil des historischen
Next/Cloudflare-/Sites-Starters. `npm run dev` und `npm start`
verwenden nicht denselben Laufzeitpfad wie `studio:start`.

Diese Dateien dürfen **nicht** blind gelöscht werden; erst ihre
tatsächliche Nutzung und Abhängigkeiten unabhängig nachweisen.

## Bekannte Wartungsrisiken und sinnvolle Refactor-Grenzen

| Bereich | Befund | Nächste gesonderte PR |
| --- | --- | --- |
| Workspace UI | grosse komponentenübergreifende State-/JSX-Datei | Routing, Navigation, Projekte, Chat und Dialoge trennen |
| Entwicklung UI | Runner, Jobs, Editor, Tests und Reviews in einem State-Owner | eigene Domain-Hooks und Komponenten |
| CSS | extrem lange Zeilen und grosse globale Datei | formatieren, Themenbereiche modularisieren |
| API | viele Routen in `server.mjs` | Auth/Job/API-Schichten mit unverändertem Vertrag |
| Datenmodell | Tabellenerstellung im Open-Pfad | versionierte Migrationsgates mit DB-Upgrade-/Rollback-Test |
| Browserentwürfe | Speicher nur im JS-Prozess | privacybewusstes Draft-Recovery-Konzept |
| Passwort/Co-Admin | Self-Service-Abläufe fehlen | Zugriffsschutz + negative Tests vor UI-Aktivierung |
| GitHub | `main` nicht aktuelle Production | eigener kontrollierter Integrations-PR |

## Beitrag und Review-Prinzip

- Für jede Änderung den tatsächlich aktiven R23/R24-Quellstand bestimmen.
- Pro PR eine kohärente fachliche Grenze, isolierte Regressionstests
  und getrennte Live-Freigabe.
- Öffentliche API-Funktionen, Security-Prüfungen und nicht offensichtliche
  Daten-/Retry-Invarianten **warum**-orientiert kommentieren.
- Kein Kommentarzwang für triviale Zeilen. Kurze Funktionen, klare
  Modulgrenzen und Fehlertests sind wichtiger als eine hohe Kommentarquote.
- Produktionsdaten, persönliche Runner und Dienstkonfiguration dürfen
  durch Code-Review-Tests nicht verändert werden.
