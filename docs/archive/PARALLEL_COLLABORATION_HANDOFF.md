# Parallele Zusammenarbeit: lokale Umsetzung und Abnahme

Stand: 17.10.2026. Repository `Spezzo-sudo/schmaqq-workspace`, Arbeitsbranch
`fix/studio-first-workspace-layout`. Die vorherigen lokalen UX-/OAuth-Arbeiten
wurden erhalten. Diese Prüfevidence entstand vor der Kandidatensicherung; aktueller Review-Stand in `PILOT_PLAN.md` und `STATUS.json`. Kein produktiver Merge und kein Deployment.

## Ergebnis

Die persönliche Studio-Startseite ist eine gemeinsame Projektübersicht. Sie zeigt
Aufgaben, Zuständigkeiten, offene Arbeitskopien und deklarierte Dateibereiche.
Projekt und Ansicht bleiben beim Neuladen über URL-Parameter erhalten.

Mitglieder können eine offene Aufgabe übernehmen. Eine transaktionale Prüfung
verhindert, dass zwei gleichzeitige Übernahmen beide erfolgreich sind. Eine
bestehende Arbeitsbereichsreservierung blockiert auch eine widersprechende
Zuweisung über die bisherige Aufgaben-API. Freigeben einer Aufgabe verlangt, dass
ihre offenen Arbeitsbereiche zuvor bewusst abgeschlossen werden.

Kommentare für Ideen, Anforderungen, Fragen und Entscheidungen liegen dauerhaft
bei der Aufgabe. Sie sind für die Mitglieder des bestehenden privaten Studios
sichtbar. Wiederholtes Senden derselben Kommentar-ID ist idempotent; eine andere
Person oder anderer Inhalt darf dieselbe ID nicht überschreiben. Entwürfe bleiben
im Arbeitsspeicher des Tabs beim Navigieren erhalten. Schließen/Neuladen und
Abmelden warnen vor ungesendeten Entwürfen. Entwürfe werden nicht als dauerhafte
Kommentare oder im Browser-Dauerspeicher gespeichert.

„Weiterarbeiten“ öffnet die passende eigene Arbeitskopie. Bei einer neuen Kopie
werden Aufgabe und Titel vorausgewählt; Dateibereich und nötiges Issue bleiben
bewusste Eingaben. Vorhandene Kopien werden wiederverwendet. Ein abgeschlossener
Prüfstand erscheint direkt an seiner Aufgabe. Die zweite Person öffnet darüber
den bestehenden Review-Dialog. Commitbindung und Verbot der Selbstfreigabe bleiben
erhalten. Der Aufgabenstatus wird manuell gepflegt; eine Codefreigabe bedeutet
noch keine Veröffentlichung oder Integration.

## Code und Daten

- `app/collaboration-board.tsx`: Projektübersicht, Aufgabenübernahme, Diskussion,
  persistierende In-Tab-Entwürfe über den Elternzustand, direkte Review-Verweise.
- `app/workspace.tsx`: persönliche Startansicht, Projekt-/Ansicht-URL, Navigation
  und Entwurfswarnungen.
- `app/development.tsx`: Einstieg aus Aufgabe bzw. Review und Auswahl vorhandener
  eigener Arbeitskopien.
- `selfhost/collaboration.mjs`: authentifizierte GET-/POST-Routen und Übernahmen.
- `selfhost/store.mjs`: additive Tabelle `task_comments` plus Index; bestehende
  Daten werden nicht gelöscht oder umgeschrieben.
- `selfhost/server.mjs`: Routenregistrierung, Schutz vorhandener Zuweisung gegen
  offene Arbeitsbereichsreservierungen, Aufgabenstart bei Arbeitskopie-Erstellung.
- Release-Paket enthält das neue Modul; Release-Smoke prüft Kommentare im Backup.

Neue Endpunkte: GET `/api/collaboration?project=...`, GET
`/api/collaboration/task?id=...`, POST `/api/collaboration/task` mit `claim`,
`release`, `comment` oder `status`. Die vorhandene private Einzel-Studio-
Mitgliedschaft gilt weiterhin. Diese Änderung ergänzt keine Kunden-/Mandanten-
Isolation und ist keine Freigabe für öffentliche Selbstregistrierung.

Frontend und Backend müssen als zusammengehöriger Stand gestartet werden. Ein
alter laufender Server kennt die neuen Routen nicht. Vor gesondert freigegebenem
Live-Rollout: konsistentes Backup, Release-Prüfung, kontrollierter Dienstwechsel.

## Automatisierte Prüfung

- `node --test selfhost/collaboration.test.mjs selfhost/workspaces.test.mjs`: PASS.
  Gleichzeitige Übernahme, fremde Origin, Kommentare/Retry/Ownership, dauerhafte
  Speicherung, Projektfilter, Reservierungs-/Zuweisungsschutz und Verknüpfung
  eines exakten freigegebenen Reviews geprüft.
- `node selfhost/verify.mjs` unter Node 24: PASS, 16 Tests, TypeScript,
  Source-Guard und gebautes Studio. Nach Erweiterung der Review-Vertragstests
  zusätzlich der gezielte Collaboration-Test bestanden.
- Lokales Runtime-Paket mit `selfhost/release.mjs` gebaut. Erweiterter
  `selfhost/release-smoke.mjs`: PASS für Manifest, Assets, Anmeldung,
  Collaboration-API und tatsächlich gesicherten Aufgabenkommentar.

## Sichtbarer End-to-End-Test mit zwei Rollen

Isolierter Test auf `http://127.0.0.1:4340`, Vorschau-Origin Port 4341. Zwei
getrennte Browserkontexte mit Testkonten „Marco“ und „Markus“, zwei tatsächliche
Runnerprozesse, zwei Git-Klone und ein ausschließlich lokales Bare-Remote.
Keine persönlichen Provider-Zugänge und keine KI-Aufträge benutzt.

1. Beide übernehmen verschiedene Aufgaben desselben Projekts über die UI.
2. Markus kommentiert Marcos Startseitenaufgabe; Marco antwortet. Nach lokalem
   Server-Neustart bleiben beide Kommentare vorhanden.
3. Ein ungesendeter Entwurf bleibt beim Wechsel zum Teamchat und zurück erhalten.
4. Beide öffnen aus ihrer Aufgabe eigene Arbeitskopien für `site/index.html`
   bzw. `site/services.json`. Zwei verschiedene Branches und reservierte
   Dateibereiche sichtbar.
5. Beide bearbeiten und speichern ihre Datei durch den echten Runner-Editor.
6. Beide Prüfaufträge laufen nachweislich gleichzeitig auf unterschiedlichen
   Runnern und bestehen nach der unten dokumentierten Fixture-Korrektur.
7. Zwei echte gebaute Vorschauen zeigen die jeweilige Änderung. Vorherige
   Dateien bzw. Änderungen des anderen Nutzers werden nicht still überschrieben.
8. Beide erstellen lokale Git-Prüfstände. Die andere Person öffnet den Prüfstand
   direkt an der Aufgabe und erteilt ihre Freigabe für den exakten Commit.
9. Wiederöffnen der eigenen Arbeit verwendet die bestehende Kopie; es bleiben
   genau zwei Arbeitskopien. Beide Aufgaben werden manuell auf „Zur Prüfung“ gesetzt.
10. Sichtprüfung bei 1440, 1280 und 390 Pixeln: kein horizontaler Seitenüberlauf,
    Aufgaben-/Personen-/Diskussionsbereiche innerhalb des Inhalts.

Evidenz und Screenshots bleiben im ignorierten `.studio/parallel-pilot-20261017/`.
`verified.json` enthält Ergebniszusammenfassung ohne Zugangsdaten. Private
Testanmeldungen stehen ausschließlich in `accounts.private.json`.
Der Probelauf läuft manuell; kein Autostart wurde angelegt. Zum späteren Start
mit Node 24 das private `resume.mjs` im Testordner verwenden; `serve.mjs` darf
bestehende Testdaten bewusst nicht überschreiben.

## Gefundene Fehler

- Produktfehler: Beim schnellen Aufgabenwechsel war kurz das Kommentarfeld der
  alten Aufgabe bedienbar. Korrigiert: Detailansicht rendert erst bei passender
  Aufgabenkennung. Mit verzögerter tatsächlicher HTTP-Antwort erneut geprüft;
  altes Feld ist während des Wechsels nicht vorhanden.
- Fixture-Fehler: Der neu erzeugte Beispiel-Prüfbefehl enthielt einen falsch
  maskierten regulären Ausdruck. Beide Runner meldeten echte Fehler. Nur das
  isolierte Testskript im Seed und den Testkopien wurde korrigiert. Danach liefen
  beide Checks gleichzeitig erfolgreich. Kein Produktcheck wurde umgangen.

## Noch offen

- Echter Pilot mit Marco in der Schweiz und Markus in Thailand auf ihren Geräten.
- Nutzerabnahme: Können beide den Ablauf ohne Agentenerklärung selbst ausführen?
- Persönlicher kleiner KI-Auftrag erst mit Zustimmung; Anbieter-/Abo-Limits bleiben.
- GitHub-Veröffentlichung, Pull Request und Übernahme der beiden Ergebnisse:
  in diesem Pilot bewusst nicht durchgeführt. Beide Runner haben `publish:false`
  und `workflow:pull-request`. Freigabe im Studio ist kein Merge.
- Einfacher Runner-Erststart/Installation und Bereitschaft pro Projekt.
- Ausführung bei ausgeschaltetem Heim-PC verlangt einen anderen laufenden
  Ausführer; sie entsteht nicht durch diesen Browser-/Zwei-Rollen-Test.
- Prüfinhalte, Kommentare und Diskussionen sind im privaten Einzel-Studio für
  Teammitglieder bestimmt. Öffnung für unabhängige Kunden braucht weitere Isolation.


## Konsolidierungsprüfung vor GitHub-Sicherung

Die nachfolgende Konsolidierung ergänzt zwei Korrekturen: Kommentare sind während
laufender Mutationen nicht editierbar; vorhandene eigene Aufgabenkopien werden
auch auf einem anderen eigenen Gerät wiedergefunden. Regressionsprüfung mit
verzögertem tatsächlichem HTTP-Speichern und zusätzlichem eigenem Test-Runner:
Kommentar genau einmal gespeichert, Feld währenddessen gesperrt; ursprüngliche
Offline-Kopie statt neuer Kopie ausgewählt, Ausführungsaktionen deaktiviert.
Der zusätzliche Testzugang wurde anschließend widerrufen und dessen Runner
beendet; der ursprüngliche Test-Runner wieder verbunden.

Neueste vollständige Prüfung: 17 Tests, TypeScript und Frontend-Build PASS.
Ein zusätzliches Regressionstestmodul prüft Task-/Projekt-/Besitzer-Zuordnung,
archivierte oder widerrufene Kopien und abweichende Gerätewahl. Das aus diesem
Code gebaute Runtime-Paket besteht den Release-Smoke samt Kommentar-Backup.
Aktueller Sicherungs-/Review-Stand: `STATUS.json`, Ablauf: `PILOT_PLAN.md`.
