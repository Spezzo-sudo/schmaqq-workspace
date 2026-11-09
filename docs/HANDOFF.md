# Übergabe – Stand 08.11.2026 (nach Livegang 9f21c9c) (für Marco, ChatGPT/Codex, Claude)

Lies zuerst diese Datei, dann `docs/PLAN.md` (Etappen), `docs/OPERATIONS.md` (Livegang) und `docs/SECURITY.md`.
Arbeitsweise: Änderungen nur per Branch und Pull Request nach `main`; zusammenführen nur nach
Marcos ausdrücklichem „Ja“; live nur nach „JA LIVE <kurz>“ über Hermes.

## 1. Was live ist

- Live auf studio.schmaqq.com: `cc9c241` (09.11.2026, PR #69, `release` PASS, Worker neu installiert, NRestarts 0,
  Backup `predeploy-cc9c241-20261109T220653Z.sqlite`, Rückweg `releases/cf875d2…`).
  Enthält u. a.: Team-Werkstatt (`selfhost/team-workshop.mjs`), Rollen pro Projekt, Zugang nur mit Einladung,
  Benutzername-Anmeldung, Anleitung + Übung, aufgeräumte Einstellungen, `selfhost/layout-check.mjs`.
  Live geprüft (Testkonto Analyse): Team-Werkstatt im Probeprojekt sichtbar, in Klimafinder (Zuschauer) nicht.
- Livegang: Marco „JA LIVE <kurz>“ einmal, Hermes `studio-deploy.sh release <voller main-Commit>` (OPERATIONS.md).
- GitHub-Prüfung startete bei #69 erst mit Verspätung; ein roter Lauf auf altem Code (release-smoke Zeile 24) gehörte
  nicht zu #69. Lokal zusätzlich: `node selfhost/release.mjs` + `node selfhost/release-smoke.mjs <dir>` (nicht in verify).

## 2. Offen und als Nächstes (in dieser Reihenfolge)

1. **Sol, dritter Prüflauf** (ChatGPT-Agent, Testkonto `Analyse` / `Analyse12345`, nur Test): Probeprojekt (ValueRacer),
   Analyse = Admin, Prüfregel „Admin darf allein freigeben“, Konfiguration
   `{"version":1,"check":["test","-f","site/index.html"],"preview":{"build":["true"],"directory":"site"}}`.
   Ziel: Übung bis „Fertig“ und Code-Kette (site/index.html → Prüfung → Vorschau → freigeben → zusammenführen →
   „Ist jetzt live“) in 1280 px und 390 px. Ergebnis kritisch prüfen (nicht blind übernehmen), ein Paket bauen.
   Danach Testkonto entfernen (Team → Entfernen).
   Offen aus Lauf 2: selbst prüfbare Aufgabe unter „Bei dir“, Ladeanzeige „Aktueller Stand“ vs. „wird geladen“,
   allgemeines Gespräch erklärt fehlende Aufgaben-Umwandlung, „Zeig mir wo“ beim Live-Schritt.
   Danach Reihenfolge (mit Marco abgestimmt): Markus einladen → schmaqq.com (`Spezzo-sudo/NetzKontor`,
   `marketing/site`) als Studio-Projekt, erste Aufgabe „Weg ins Studio“, Website angleichen → Etappe 3 „KI im Raum“
   → SCHMAQQ-Projekte (u. a. Bewertungsdienst in NetzKontor `app/`). NetzKontor hat eigene Regeln (AGENTS.md).
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
