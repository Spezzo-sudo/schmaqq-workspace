# Nachtstatus SCHMAQQ Studio

Lauf: Claude Code (Desktop-App, Code-Tab), Modell Opus 5.5 über die Abo-Anmeldung des Owners.
Start 29.10.2026 23:42 (lokale Zeit). Auftrag: [NIGHT_HANDOFF_20261029.md](NIGHT_HANDOFF_20261029.md).

## Vorab: Goal/Stop-Hooks

- Geprüft: `~/.claude/settings.json`, `settings.local.json` sowie `.claude/settings*.json` in
  `SCHMAQQ`, `schmaqq-plugin-worker-prototype` und `schmaqq-studio-use-candidate`: keine Datei vorhanden,
  also keine eigenen Stop-/Goal-Hooks. Das Goal vom Vortag hatte der Owner mit `/goal clear` gelöscht.
- Entscheidung: **kein `/goal`**, normale Sitzung, kein automatischer Wiederanlauf, keine Hooks installiert.

| Paket | Status | Beleg / Blocker |
| --- | --- | --- |
| Vorab: Konto/Modell/Stop-Hook | ERLEDIGT | siehe oben |
| P0: Analyse mit Lesekopie | ERLEDIGT | siehe P0 |
| P1: Aufgaben-Kontext | OFFEN | |
| P2: große Dateien lesen | OFFEN | |
| P3: Begriffe/Fokus/KI-Übergabe | OFFEN | |
| P4: Designangleichung | OFFEN | |
| P5: Abnahme/Sicherung | OFFEN | |

## P0 – Allgemeine Analyse mit Lesekopie bleibt allgemein

- Ursache: `taskContract` setzte `kind: code`, sobald irgendeine Arbeitskopie existierte.
- Fix (`selfhost/team-model.mjs`): neue Domänenregel `hasCodeChanges`. Codeaufgabe wird eine Aufgabe nur
  durch Aufträge, die die Kopie ändern können: `save-file`, `create-file`, `codex`, `review`, `submit`,
  in jedem Zustand außer `cancelled` (auch `queued`, damit ein allgemeines Ergebnis nicht an einer
  laufenden Änderung vorbei eingereicht wird); fehlgeschlagene Datei-Speicherungen zählen nicht.
  Lesen (`files`, `read-file`) und Kopie anlegen (`prepare`) ändern die Aufgabenart nicht.
- `selfhost/team-http.mjs`: Rückwechsel zu „allgemein“ nur noch gesperrt, wenn tatsächlich Dateien geändert
  wurden. Gilt auch für Altbestände, in denen ältere Server den abgeleiteten Wert `code` gespeichert haben.
- Oberfläche (`studio/team-task.tsx`) liest dieselbe Vertragsart vom Server; Artanzeige, Ergebnisformular und
  Abschlussregeln folgen damit derselben Regel. Keine Production-Daten verändert.
- Regression in `selfhost/team-workflow.test.mjs`: Lesekopie + fehlgeschlagenes Speichern + abgebrochene KI →
  allgemeines Ergebnis 200, Abschluss 200; fremde Person 403; wartendes Speichern → Ergebnis 409,
  Wechsel zu allgemein 409, Prüfstand verlangt; Altbestand mit gespeichertem `code` → Wechsel 200.
- Selbst ausgeführt: `node --test selfhost/team-workflow.test.mjs selfhost/github-workflow.test.mjs`
  → 15 Tests, 15 PASS, 0 FAIL.
