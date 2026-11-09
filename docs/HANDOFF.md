# Übergabe – Stand 08.11.2026 (nach Livegang 9f21c9c) (für Marco, ChatGPT/Codex, Claude)

Lies zuerst diese Datei, dann `docs/PLAN.md` (Etappen), `docs/OPERATIONS.md` (Livegang) und `docs/SECURITY.md`.
Arbeitsweise: Änderungen nur per Branch und Pull Request nach `main`; zusammenführen nur nach
Marcos ausdrücklichem „Ja“; live nur nach „JA LIVE <kurz>“ über Hermes.

## 1. Was live ist

- Live auf studio.schmaqq.com: `cf875d2` (09.11.2026, PR #68, `release` PASS, Worker neu installiert, NRestarts 0,
  Backup `predeploy-cf875d2-20261109T011646Z.sqlite`, Rückweg `releases/6367121…`).
- Livegang: Marco „JA LIVE <kurz>“ einmal, Hermes `studio-deploy.sh release <voller main-Commit>` (OPERATIONS.md).

## 2. Offen und als Nächstes (in dieser Reihenfolge)

1. **Sol, zweiter Prüflauf läuft (09.11.).** Testkonto `analyse` / Passwort im Chat (nur Test). Probeprojekt (ValueRacer):
   analyse = Admin, Prüfregel „Admin darf allein freigeben“, Konfiguration
   `{"version":1,"check":["test","-f","site/index.html"],"preview":{"build":["true"],"directory":"site"}}` bestätigt.
   Sol soll die Übung und eine Code-Aufgabe (site/index.html → Prüfung → Vorschau → freigeben → zusammenführen → live)
   ganz durchspielen, in 1280 px und 390 px. Danach: Ergebnis kritisch auswerten, ein Paket bauen, Konto entfernen.
   Schon notiert für das Paket: Einrichtung ist der unübersichtlichste Teil – Kästen in Kästen (zerquetschte Texte),
   zwei Wege („Projekt einrichten“ / „Hier einrichten“), „PC oder Server hinzufügen“ öffnet mitten im Weg, nach
   „Startklar“ fehlt ein sichtbares „Einrichtung ändern“ (heute nur Einstellungen → Für Entwickler → … einrichten),
   Einstellungen-Seite sehr lang.
   GitHub-App „Make public“ erst, wenn Markus eigene Repos verbinden will.
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
