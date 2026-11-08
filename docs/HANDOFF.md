# Übergabe – Stand 08.11.2026 (nach Livegang 2e7c0f7) (für Marco, ChatGPT/Codex, Claude)

Lies zuerst diese Datei, dann `docs/PLAN.md` (Etappen) und `docs/OPERATIONS.md` (Livegang).
Arbeitsweise: Änderungen nur per Branch und Pull Request nach `main`; zusammenführen nur nach
Marcos ausdrücklichem „Ja“; live nur nach „JA LIVE <kurz>“ über Hermes.

## 1. Was live ist

- Live auf studio.schmaqq.com: `2e7c0f7` (PR #62, 08.11.2026, Hermes RESULT=PASS, Backup
  `predeploy-2e7c0f7-20261108T124725Z.sqlite`, Rückweg `releases/d2c2df0…`). Enthält PR #59, #60, #62.
- PR #60: Livegang jetzt mit `selfhost/deploy/studio-deploy.sh prepare|live <voller main-Commit>`
  (siehe OPERATIONS.md). GitHub-Prüfung läuft nur bei Pull Requests (~1,5 Min.), keine Screenshots.
  **Actions-Minuten knapp:** Wenn das Limit droht, Workflow abschalten, Prüfung auf dem VPS.
- PR #62: globale Navigation (Handy unten: Arbeit · Projekte · Gespräche · Mehr → Team, Mein Konto).
- Klimafinder: startklar (GitHub-App nur auf Klimafinder-CH, Server-Worker, Live-Weg manuell).
  Offen prüfen: Einstellungen → Live gehen „Wir schalten selbst live“ gesetzt?

## 2. Offen und als Nächstes (in dieser Reihenfolge)

1. **Navigation nachschärfen – gebaut, PR offen (Branch `ccr-02ac3638-3ksxjc`).** Handy unten:
   Arbeit · Projekte · Gespräche · Team; Mein Konto über die Initialen oben rechts („Mehr“ entfällt).
   Aus der früheren Ansicht übernommen: #Allgemein (Gespräche oben, `studio/studio-general.tsx`),
   Allgemeines Wissen (Projekte unten; Server liefert jetzt `project` je Dokument), Daten herunterladen
   (Mein Konto), Briefing kopieren (Projekt → Wissen, ohne KI-Verbindung). Mein Konto: Abmelden, ChatGPT
   verbinden, verbundene Assistenten, ChatGPT-Anmeldung, Daten; Rest unter „Für Entwickler“ inkl. Link
   zur früheren Ansicht. Noch nicht übernommen: Hilfe/Anleitung (beschreibt die alte Ansicht).
   Ablauf: Marco „Ja“ → zusammenführen → Hermes prepare/live mit main-Commit nach „JA LIVE <kurz>“.
2. **Markus einladen** (Team → Jemanden einladen), ohne Erklärung testen lassen: Aufgabe finden,
   Vorschau ansehen, „Passt“. Das schliesst Etappe 1 ab.
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
