# Übergabe – Stand 08.11.2026 (nach Livegang 9f21c9c) (für Marco, ChatGPT/Codex, Claude)

Lies zuerst diese Datei, dann `docs/PLAN.md` (Etappen), `docs/OPERATIONS.md` (Livegang) und `docs/SECURITY.md`.
Arbeitsweise: Änderungen nur per Branch und Pull Request nach `main`; zusammenführen nur nach
Marcos ausdrücklichem „Ja“; live nur nach „JA LIVE <kurz>“ über Hermes.

## 1. Was live ist

- Live auf studio.schmaqq.com: `9f21c9c` (PR #63, 08.11.2026, Hermes RESULT=PASS, keine Neustarts,
  Backup `predeploy-9f21c9c-20261108T220948Z.sqlite`, Rückweg `releases/2e7c0f7…`).
  Enthält: Navigation (Arbeit · Projekte · Gespräche · Team, Konto über Initialen), #Allgemein,
  Allgemeines Wissen, Daten herunterladen, Briefing kopieren, GitHub-Freigabe für alle Mitglieder
  (nur über Studio registrierte Installationen), Zugang nur mit Einladung (siehe `docs/SECURITY.md`).
- Livegang: `selfhost/deploy/studio-deploy.sh prepare|live <voller main-Commit>` (siehe OPERATIONS.md).
  GitHub-Prüfung läuft bei jedem Push auf einen PR-Branch: Commits sammeln, einmal pushen.
- Klimafinder: startklar (GitHub-App auf Klimafinder-CH, Server-Worker, Live-Weg manuell).

## 2. Offen und als Nächstes (in dieser Reihenfolge)

1. **Handy-Feinschliff – PR offen (Branch `ccr-02ac3638-3ksxjc`):** Logo oben am Handy (SCHMAQQ. + Lime-Label
   „Studio“, `app/studio-brand.tsx`), Welle startet an der Tippstelle und färbt die Buchstaben rot (vorher wurde
   die Farbe nie sichtbar, weil sie auf `<g>` statt `<path>` lag), Projekt-Tabs passen ohne Scrollen (5 Spalten),
   Aufklapper mit 44-px-Tippfläche, Kontrast der Gesprächsvorschläge, Chat-Liste korrekt.
   Prüfmassstab: Bedienbarkeit/Barrierefreiheit/Handy aus dem Skill „jury“ (juliobsz/skills, nur gelesen,
   Skripte nicht installiert); eigene Messung mit Playwright + axe auf allen Seiten: kein Überlauf,
   keine ernsten axe-Funde, Tastaturfokus sichtbar.
   Danach Marco: GitHub-App → Advanced → „Make public“ (Schutz ist live seit 9f21c9c).
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
