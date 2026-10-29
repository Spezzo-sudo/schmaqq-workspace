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
| P1: Aufgaben-Kontext | ERLEDIGT | siehe P1 |
| P2: große Dateien lesen | ERLEDIGT | siehe P2 |
| P3: Begriffe/Fokus/KI-Übergabe | ERLEDIGT (390 px siehe P5) | siehe P3 |
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

## P1 – Vollständiger Aufgaben-Kontext und auffindbare Aufgabe

- `selfhost/room-http.mjs`, `buildRoomContext`: Aufgabenblock enthält jetzt ID, Status, Aufgabenart und die
  vollständigen gespeicherten Abschlusskriterien mit Fassung; zusätzlich strukturiert als `taskContract`.
  Der Kopf (Projekt, Aufgabe, Kriterien) wird nie gekürzt (durch Feldgrenzen beschränkt); Wissen und Nachrichten
  füllen das bisherige 8000-Zeichen-Budget. Wird gekürzt, steht ein sichtbarer Hinweis im Text und `truncated: true`.
- Neu `GET /api/room/tasks?project=&q=&done=1` und MCP-Werkzeug `list_tasks`: Suche nach Titelteil, nur
  lesend, höchstens 50 Treffer, `complete` zeigt unvollständige Listen an. Im Plugin-Freigabefilter
  (`server.mjs`) nur als GET erlaubt. Unbekanntes Projekt 404, fremde Aufgabe 400 (bestehende Regeln).
- Doku: `docs/AI_CLIENT_SETUP.md` Werkzeugtabelle.
- Regression in `selfhost/studio-plugin-dynamic.test.mjs` über den echten MCP-SDK-Client: Aufgabe per Titel
  gefunden, Kriterien (4000 Zeichen) identisch mit gespeichertem Vertrag, Text ≤ 8000 und als gekürzt markiert,
  fehlendes Projekt/Aufgabe abgewiesen.
- Selbst ausgeführt: `node --test selfhost/studio-plugin-dynamic.test.mjs selfhost/studio-mcp.test.mjs` → 6/6 PASS;
  vorher `room*`/`router-boundaries` mitgelaufen (17 Tests, nach Korrektur der Testdaten grün).

## P2 – Große Quelldateien abschnittsweise lesen

- `selfhost/files.mjs`: neues `readSourceSection` nur für den Leseweg. Dateien bis 4 MiB, Abschnitte höchstens
  64 KiB, Ende immer auf UTF-8-Zeichengrenze (bevorzugt nach Zeilenumbruch). Antwort: `offset`, `end`, `size`,
  `startLine`, `nextOffset`, `complete`, `revision` (der ganzen Datei). Mit `revision` des ersten Abschnitts wird
  eine zwischenzeitlich geänderte Datei gemeldet statt Versionen zu mischen. Start mitten in einem Zeichen,
  ungültiger Offset, Binärdatei, ungültiges UTF-8, Hardlink, Symlink, gesperrte Pfade: abgewiesen.
- Bearbeiten unverändert: `readSource`/`saveSource`/`createSource` behalten 64 KiB. Ohne `offset` bleibt
  `read-file` wie bisher (Editor bekommt nie einen Teilinhalt) und meldet bei großen Dateien den Hinweis auf `offset`.
- `selfhost/runner.mjs`, `selfhost/server.mjs` (`offset` nur für read-file, sonst 400), `selfhost/studio-mcp.mjs`
  (Parameter und Beschreibung).
- Selbst ausgeführt: `node --test selfhost/files.test.mjs selfhost/editor-*.test.mjs` → 10/10 PASS;
  `node --test selfhost/studio-mcp.test.mjs selfhost/review.test.mjs` → 4/4 PASS (echter Runner, Git, MCP:
  ~200-KB-Datei über Abschnitte exakt rekonstruiert, Speichern abgewiesen, `offset` bei save-file abgewiesen).
- Kein Livezugriff auf die echten Klimafinder-Dateien; der Server-Worker hat diesen Code noch nicht.
## P3 – Begriffe, KI-Übergabe, Fokus und Ergebnisrückweg

- Beschriftungen: „PC oder Server hinzufügen“ und „<Projektname> einrichten“ (`studio/team-workspace.tsx`,
  `studio/project-connect.tsx`, Hinweistext in `app/project-start.tsx`).
- Ehrliche Einrichtungsstände: `selfhost/placement.mjs` meldet je Rechner zusätzlich `testable` (Testbefehl
  konfiguriert). `app/executors.tsx` zeigt „Projekt nicht eingerichtet“, „Repository-Kopie vorhanden · Tests nicht
  konfiguriert“ oder „Konfiguriert · Testbefehl hinterlegt“ statt pauschal „Projekt eingerichtet“, mit Knopf
  „Hier einrichten“, der die Einrichtung mit diesem Rechner vorausgewählt öffnet. Projektkarte entsprechend.
- Einrichtungsvorschlag: Überschrift „Einrichtungsvorschlag für <Projekt>“, verständliche Bedeutung oben,
  Projektart/Befehle/Ausgabeordner/JSON unter „Technische Details“. Hinweis, dass vorhandene Programme keine
  installierten Module (z. B. Python/ensurepip) belegen.
- Aufgabe: zwei ehrlich getrennte Wege statt „KI hinzunehmen“: „Mit ChatGPT oder Claude bearbeiten“ (neu
  `studio/external-assistant.tsx`: kopierbarer Auftrag mit Projekt-/Aufgaben-ID und Vorgehen über die Studio-
  Werkzeuge, kein Modellstart, keine Zugangsdaten, kein Anbieter-Deeplink, „Antwort als Ergebnis festhalten“)
  und „Lokale KI auf meinem Rechner fragen“ (bisheriger Assistent).
- Früher nächster Schritt: ohne Ergebnis „Nächster Schritt: Aufgabe bearbeiten und das Ergebnis festhalten“
  mit Knopf „Ergebnis festhalten“ (öffnet „Bearbeitung“ und fokussiert das Ergebnisfeld) bzw. bei Codeaufgaben
  „Zur Bearbeitung“. Fehlende Bedingungen erscheinen erst danach.
- Fokus: geöffnete Bereiche werden sichtbar gescrollt (`block: nearest`) und fokussiert; Schließen gibt den Fokus
  an den auslösenden Knopf zurück (Assistent, „PC oder Server hinzufügen“, Einrichtung).
- Regression: `selfhost/placement.test.mjs` (`testable`).
- Selbst ausgeführt: TypeScript `tsc --noEmit` Exit 0; `placement.test.mjs` 2/2; Studio-Build PASS.
- Browser (synthetische Fixture `night-ui-fixture.mjs` im Scratchpad, 127.0.0.1:45791, Testkonto aus der Fixture,
  kein Owner-Login), Desktop 1024×768: Aufgabe mit Lesekopie zeigt „Allgemeine Aufgabe“ und den neuen nächsten
  Schritt; „Ergebnis festhalten“ öffnet Bearbeitung, Fokus im Ergebnisfeld (sichtbar 533–653 px von 768);
  Entwurf getippt, nach 11 s Polling Wert, Fokus und Scrollposition unverändert; KI-Übergabe sichtbar
  aufgeklappt, Text mit IDs geprüft; Schließen → Fokus zurück auf den Knopf; Einstellungen: beide Rechner mit
  ehrlichem Stand, „Hier einrichten“ wählt den Server vor, Formular sichtbar und fokussiert.
- Nachgebessert nach Browserbefund: Fokus beim Öffnen des KI-Bereichs lag noch auf dem Knopf (Überschrift nicht
  fokussierbar) → jetzt Bereich bzw. erstes Eingabefeld. Nach dem Neubau in P5 erneut geprüft.
