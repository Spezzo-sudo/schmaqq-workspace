# Übergabe – Stand 08.11.2026 (nach Livegang 9f21c9c) (für Marco, ChatGPT/Codex, Claude)

Lies zuerst diese Datei, dann `docs/PLAN.md` (Etappen), `docs/OPERATIONS.md` (Livegang) und `docs/SECURITY.md`.
Arbeitsweise: Änderungen nur per Branch und Pull Request nach `main`; zusammenführen nur nach
Marcos ausdrücklichem „Ja“; live nur nach „JA LIVE <kurz>“ über Hermes.

## 1. Was live ist

- Live auf studio.schmaqq.com: `1eb4456` (08.11.2026, PR #64–#66, Hermes RESULT=PASS, NRestarts 0, Worker unverändert,
  Backup `predeploy-1eb4456-20261108T233413Z.sqlite`, Rückweg `releases/90ffcf7…`).
  Enthält: Navigation, #Allgemein, Allgemeines Wissen, Zugang nur mit Einladung (`docs/SECURITY.md`), GitHub-Freigabe
  für alle Mitglieder, Logo mit Studio-Label, Rollen pro Projekt, Anleitung „So funktioniert Studio“ mit Übungsrunde,
  Aufklapper-Quadrat, Scroll-Hinweis, `studio-deploy.sh release`.
- Livegang ab jetzt ein Auftrag: Marco „JA LIVE <kurz>“ einmal, Hermes `studio-deploy.sh release <commit>` (OPERATIONS.md).

## 2. Offen und als Nächstes (in dieser Reihenfolge)

1. **Verbesserungspaket in Arbeit (Branch, noch kein PR – wartet auf Sols Analyse):** Live ist `6367121` (#67, `release`
   lief erstmals PASS). Testkonto `analyse` (Klimafinder: Zuschauer, Probeprojekt/ValueRacer: Entwickler+Prüfer) für
   ChatGPT-Agent „Sol“; danach Team → Entfernen. Schon gebaut: Cursor sprang alle 5 s in das erste Feld (RoomModal-Fokus
   hing an `onClose`), Einrichtungshinweise ein Wort pro Zeile (`.po-ready li li`), „Startklar“ zeigt fertig die drei
   Fakten statt zuzuklappen, ChatGPT-Anmeldung in Mein Konto nur wenn eingerichtet, Einrichtung in Alltagssprache.
   Marco: GitHub-App „Make public“ erledigt? Leise-Priorität „Zur Prüfung geben“.
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
