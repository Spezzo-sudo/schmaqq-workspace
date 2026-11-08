# Übergabe – Stand 08.11.2026 (für Marco, ChatGPT/Codex, Claude)

Lies zuerst diese Datei, dann `docs/PLAN.md` (Etappen) und `docs/OPERATIONS.md` (Livegang).
Arbeitsweise: Änderungen nur per Branch und Pull Request nach `main`; zusammenführen nur nach
Marcos ausdrücklichem „Ja“; live nur nach „JA LIVE <kurz>“ über Hermes.

## 1. Was live ist

- Live auf studio.schmaqq.com: `84b60bd` (PR #58). Darin: verständliche Seiten, feste Leiste unten,
  eine Sprache für den Aufgabenstand (`studio/task-next-step.ts`), Verlauf in Alltagssprache.
- Im Livegang (Hermes, alter 8-Schritte-Ablauf): `d2c2df0` (PR #59): Zeitstrahl mit Symbolen pro
  Aufgabe, Live als echter Schritt („Ist jetzt live“, Satz „Wie genau?“ in Einstellungen → Live gehen),
  Prüfliste beim Anschauen, Startseite und Menü in Markenfarben (Tinte #111225, Papier #f1efe8, Lime #d9ff6b).
  Nach dem Livegang: in Klimafinder → Einstellungen → Live gehen „Wir schalten selbst live“ wählen und
  „Marco startet den Hermes-Auftrag production-deploy-main“ eintragen.
- Klimafinder ist startklar (GitHub-App „SCHMAQQ Studio studio.schmaqq.com“ nur auf Klimafinder-CH,
  Server-Worker, Live-Weg manuell). Die Aufgabe „Leise-Priorität …“ ist fertig gebaut und kann mit
  „Zur Prüfung geben“ als Pull Request zu GitHub; danach braucht es Markus' „Passt“.

## 2. Offen und als Nächstes (in dieser Reihenfolge)

1. **Livegang `d2c2df0` abschliessen** (Hermes meldet nach Schritt 5, dann „JA LIVE d2c2df0“).
2. **PR #60 „Schneller Livegang“** (geprüft, grün, noch nicht zusammengeführt):
   `selfhost/deploy/studio-deploy.sh` (prepare/live, ~10 s statt ~5 min) und eine sparsame
   GitHub-Prüfung nur bei Pull Requests (~1,5 Min., keine Browser-Screenshots).
   **Achtung Actions-Minuten:** Früher liefen Browser-Prüfungen bei jeder Änderung und sprengten das
   Monatslimit; deshalb wurde auf Hermes/VPS umgestellt. Wenn das Limit wieder knapp wird: Workflow
   abschalten, die Prüfung macht dann der VPS (`node selfhost/verify.mjs` vor `prepare`).
   Erster Einsatz nach dem Zusammenführen (Skript liegt noch nicht im Live-Stand), Hermes:
   ```bash
   cd /root && git clone --quiet <bisherige-Repo-Adresse> studio-bootstrap && \
   git -C studio-bootstrap show <main-commit>:selfhost/deploy/studio-deploy.sh > /root/studio-deploy.sh
   STUDIO_REPO_URL=<bisherige-Repo-Adresse> bash /root/studio-deploy.sh prepare <main-commit>
   # nach „JA LIVE <kurz>“:
   bash /root/studio-deploy.sh live <main-commit>
   ```
   Danach immer: `bash /opt/schmaqq-studio/current/selfhost/deploy/studio-deploy.sh prepare|live <commit>`.
3. **Navigation / Gesamtstruktur neu (grösstes UX-Problem jetzt):** Das Menü zeigt nur Meine Arbeit,
   Projekte, Team. Der allgemeine Chat, Konto-Einstellungen, verbundene Assistenten (ChatGPT/Claude
   trennen), „Mit ChatGPT anmelden“ und „Frühere Gespräche/Dokumente“ sind nur über
   Team → ganz unten → Aufklappen erreichbar. Ziel: ein Menü, das das ganze Studio zeigt, z. B.
   Meine Arbeit · Projekte · Gespräche (allgemeiner Chat) · Team · Mein Konto (Profil, verbundene
   Assistenten, Anmeldung, Abmelden). Gleiche Regeln wie bisher (siehe 4). Erst Konzept + Screenshots, dann bauen.
4. **Markus einladen** (Team → Jemanden einladen), ohne Erklärung testen lassen: Aufgabe finden,
   Vorschau ansehen, „Passt“. Das schliesst Etappe 1 ab.
5. **Etappe 3 „KI im Raum“** (siehe PLAN.md): erst klären, ob der ChatGPT-Business-Workspace die
   Codex-Anmeldung auf dem Server erlaubt. „Selbst bearbeiten“ bleibt immer als Weg ohne KI.
6. Etappe 0 Rest: Zugänge zum VPS auflisten (Hermes hat Root über Telegram – Risiko), Fehler
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
