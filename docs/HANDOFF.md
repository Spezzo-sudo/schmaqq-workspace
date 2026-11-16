# Übergabe – Stand 08.11.2026 (nach Livegang 9f21c9c) (für Marco, ChatGPT/Codex, Claude)

Aktueller Ablauf und Rollen (ab 16.11.2026): `docs/WORKFLOW.md`; Reihenfolge: `docs/WORKLIST.md`. Diese Übergabe ist der Stand vom 08.11.
Lies danach diese Datei, dann `docs/PLAN.md` (Etappen), `docs/OPERATIONS.md` (Livegang) und `docs/SECURITY.md`.
Arbeitsweise: Änderungen nur per Branch und Pull Request nach `main`; zusammenführen nur nach
Marcos ausdrücklichem „Ja“; live nur nach „JA LIVE <kurz>“ über Hermes.

## 1. Was live ist

- Live auf studio.schmaqq.com: `cf875d2` (09.11.2026, PR #68, `release` PASS, Worker neu installiert, NRestarts 0,
  Backup `predeploy-cf875d2-20261109T011646Z.sqlite`, Rückweg `releases/6367121…`).
- Livegang: Marco „JA LIVE <kurz>“ einmal, Hermes `studio-deploy.sh release <voller main-Commit>` (OPERATIONS.md).

## 2. Offen und als Nächstes (in dieser Reihenfolge)

1. **Team-Werkstatt + Einstellungen – PR offen.** Sols 2. Lauf (09.11.): Übung bis „Fertig“ ok; Code-Kette blockiert,
   weil nur der Besitzer einer Werkstatt darauf arbeiten durfte (betraf jedes Mitglied ausser Marco). Marco: „Ja“ zur
   Team-Werkstatt. Gebaut: `selfhost/team-workshop.mjs` – Server-Worker eines Projekt-Admins ist für Entwickler des
   Projekts nutzbar, nur für dort eingerichtete Projekte, PCs bleiben privat, Admin kann es pro Projekt abschalten
   („Werkstatt fürs Team“ unter „Wer darf was“); `resolveDevice` nutzt `usableExecutors`; `/api/ai` und
   `/api/development` liefern die Team-Werkstatt; Test `team-workshop.test.mjs`. Einstellungen: Name/Ziel nur Admin,
   „Gemeinsames Repository“ (veraltet), „Repository anlegen“ (live nicht funktionsfähig), „Import auf eigenem PC“ und
   „Projekt einrichten“-Doppelweg entfernt; Startklar mit „Anderes Repository wählen“ / „Einrichtung ändern“;
   „Eigener PC (optional)“ unter Für Entwickler; „Direkt durch die Werkstatt“ nur ohne GitHub. Begriffe
   „Diese Fassung freigeben“ statt „Passt“. `selfhost/layout-check.mjs` (lokal mit Playwright) prüft gequetschte
   und überlaufende Texte, seitliches Scrollen, doppelte Navigation – vor jedem Paket laufen lassen.
   Danach: Sol 3. Lauf (komplette Code-Kette), dann Testkonto entfernen.
   Offen aus Sols Lauf: selbst prüfbare Aufgabe unter „Bei dir“, Ladeanzeige „Aktueller Stand“ vs. „wird geladen“,
   allgemeines Gespräch erklärt, warum es keine Aufgaben-Umwandlung gibt.
2. **Markus einladen** (Team → Jemanden einladen), ohne Erklärung testen lassen: Aufgabe finden,
   Vorschau ansehen, „Passt“, ein eigenes privates Repo verbinden. Das schliesst Etappe 1 ab.
3. **Etappe 3 „KI im Raum“** (siehe PLAN.md): erst klären, ob der ChatGPT-Business-Workspace die
   Codex-Anmeldung auf dem Server erlaubt. „Selbst bearbeiten“ bleibt immer als Weg ohne KI.
4. Etappe 0 Rest: Zugänge zum VPS auflisten (Hermes hat Root über Telegram – Risiko), Fehler
   „hunderte gleiche Aufgaben“ über den ChatGPT-Connector untersuchen.

## 3. Wichtige Dateien

- Seitenrahmen, Menü, Meine Arbeit, Team, Einstellungen, Aufgabenliste: `studio/team-workspace.tsx`
- Aufgabe: `studio/team-task.tsx`, Zeitstrahl `studio/task-timeline.tsx`, Anschauen `studio/task-review-diff.tsx`
- Ein Wortlaut für Stand/Schritte/Etappen: `studio/task-next-step.ts` (Tests `selfhost/task-next-step.test.mjs`)
- Verlauf in Alltagssprache: `humanEvent` in `studio/project-overview-model.ts`
- Startklar und Live-Weg: `studio/project-ready.tsx`; Live-Schritt Server: `went-live` in `selfhost/team-http.mjs`
- Selbst bearbeiten (Editor, Auto-Vorbereitung): `app/development.tsx` (`autoStart`), `app/source-editor.tsx`, `app/work-actions.tsx`
- Stil: `studio/team-workflow.css` (Markenfarben als Variablen unten)
- Prüfen lokal: `PATH=/opt/node24/bin:$PATH node selfhost/verify.mjs --local` (alle Tests, Typen, Build);
  Demo zum Durchklicken: `node selfhost/demo.mjs` (Port 4320, Zugangsdaten in `.studio/local-demo/LOKAL-TESTEN.md`).

## 4. Regeln für jede Seite (vereinbart)

Ein nächster Schritt oben · nichts doppelt · Alltagssprache (Fachwörter nur unter „Für Entwickler“) ·
nur zeigen, was funktioniert · leere Abschnitte weglassen · Werkzeuge eingeklappt · Verlauf in
Menschensprache · Handy zuerst · jedes Warten sagt was und wie lange · jeder Fehler hat einen nächsten
Knopf · Einrichter vs. Mitmacher · es gibt immer einen Weg ohne KI · Markenfarben Tinte/Papier/Lime,
keine Emojis als Symbole.
