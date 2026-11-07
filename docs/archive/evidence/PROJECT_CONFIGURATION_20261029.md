# Sprachunabhängige Einrichtung – lokale Abnahme, 29.10.2026

## Ergebnis und Stand

Auf aktuellem lokalem Branch `local/studio-plugin-worker-prototype`, uncommitteter
Diff; tatsächlichen HEAD und Arbeitsstand mit Git ermitteln. Kein Push, PR,
Deployment, Live-Login, Servereingriff oder Klimafinder-Quelländerung.

Die bisher ausschließlich paketbasierte Erkennung wird im neuen Einrichtungsweg
durch einen allgemeinen, versionierten Projektvertrag ergänzt. Vorgehen und
Schema: [PROJECT_CONFIGURATION.md](../PROJECT_CONFIGURATION.md). Owner-Auftrag:
[PROJECT_SETUP_WORK_ORDER.md](../PROJECT_SETUP_WORK_ORDER.md).

- Planprüfung liest nur begrenzte Metadaten und prüft Programmpräsenz; sie führt
  keine Projektbefehle aus und erteilt keine Modell-/Veröffentlichungsfreigaben.
- Bestätigung bindet die Konfiguration an HEAD und gelesene Metadaten. Ein neuer
  Plan mit fehlenden Programmen verändert keine vorhandenen Freigaben.
- Vorbereitung läuft wiederholbar je Aufgaben-Arbeitskopie vor Tests/Vorschau;
  der Server nutzt dafür denselben isolierten Job-Starter wie für Tests.
- Generierte Umgebungen bleiben lokal ignoriert; Änderungen getrackter Quellen
  durch Vorbereitung stoppen den Ablauf einschließlich Submit vor dem Push.
- Alter Runner wird vor Zustellung eines Planauftrags abgewiesen. Das neue
  Runtime-Modul ist auch im persönlichen Runnerpaket enthalten.

## Selbst ausgeführte Prüfungen

Abschließender Gesamtbefehl (Git gemäß HANDOFF nur im Prozess-PATH vorangestellt):

```powershell
$env:PATH='C:/Users/hi/Documents/ChatGPT/SCHMAQQ/.local-tools/git/cmd;'+$env:PATH
node selfhost/verify.mjs --local
```

Exitcode **0**: **271 Tests, 250 PASS, 0 FAIL, 21 ausdrückliche Plattform-Skips**;
Source Guard, TypeScript und Vite PASS. Vite meldet weiter die Größenwarnung zum
JavaScript-Bundle. Windows ersetzt keinen Linux-Operator-/Recovery-Nachweis:
`fullVerification: INCOMPLETE`, `releaseApproved: false` ist die ehrliche Ausgabe
des bestehenden Verifiers, keine neu eingeführte CI-Abhängigkeit.

Fokussiert nach den letzten Testergänzungen:
`node --test selfhost/project-plan.test.mjs selfhost/job-launcher.test.mjs`:
**17 PASS, 0 FAIL, 0 SKIP**, Exitcode 0. Danach erneut Gesamtprüfung wie oben.
Echte lokale Node- und Python-Unterprozesse in zwei separaten Git-Arbeitskopien:
Vorbereitung, Tests und statische Vorschau. Python mit vorhandenem lokalen
Interpreter, ohne Downloads. Kein echter Make-/Klimafinder-Build auf diesem PC
(Make/WSL nicht vorhanden). Job-Startertests prüfen Delegation mit lokalem
systemd-Stand-in; sie sind keine neue echte Linux-Sandboxabnahme.

Zwischenbefunde: Erst fehlte das neue Modul im Runner-Paketinventar; korrigiert,
Paketimportprüfung danach PASS. Die mitgelieferte Codex-Git-Distribution konnte
den bestehenden Git-Daemon-Test nicht starten; mit dem im HANDOFF genannten
vollständigen Git bestand der unveränderte Test. Keine Skips dafür eingeführt.

## Sichtbare Browserprüfung

Lokaler In-App-Browser, 1280 px, synthetisches Konto `setup@fixture.invalid`,
synthetische Repositories/Runner, Loopback-Ports 45781/45782. Kein Ownerkonto,
keine GitHub-/Provideranmeldung. Start reproduzierbar mit:

```text
node scripts/project-setup-browser-fixture.mjs
```

Tatsächlich bedient und beobachtet:

1. Einrichtungsformular öffnet mit Fokus und Scroll; separater PC-Import bleibt
   als Alternative geschlossen.
2. Node-Vorschlag zeigt Test/Vorschau und Programmstatus. Bestätigung speichert
   ihn und erklärt, dass Vorbereitung/Tests noch nicht ausgeführt wurden.
3. Unbekanntes Projekt zeigt ergänzbare Konfiguration statt pauschalem Fehler.
4. Eingefügtes allgemeines JSON liefert einen Vorschlag; Änderung eines Feldes
   verwirft den alten Vorschlag und entfernt den Bestätigungsknopf.
5. Make-Beispiel zeigt ausdrücklich fehlendes `make`, Vorbereitung und Ausgabe
   `build/site`; keine Bestätigung trotz erkennbarem Projekt möglich.
6. Fehlerprotokoll leer; Dokumentbreite entspricht Viewportbreite (1280 px).

Screenshots und vollständiges Prüfprotokoll liegen lokal unter
`.studio/setup-qa-20261029/` (bewusst nicht versioniert): `node-confirmed.png`,
`unknown-project.png`, `manual-plan.png`, `make-missing-runtime.png`,
`verify-final.log`. Keine mobile oder echte Serverbedienung daraus ableiten.

## Lesender Agentenreview und Korrekturen

Ein Researcher prüfte die Anschlussstellen lesend. Ein separater Auditor prüfte
Auftrag, Originalquellen, exakten Diff und neue Dateien lesend. Keine technische
Nur-Lese-Sandbox behauptet. Beide P2-Befunde des Audits in einer Korrekturschleife
behoben: führendes `./` bei lokalen Programmen normalisieren; frühere
Vorbereitungsfelder bei Legacy-Neukonfiguration ausdrücklich zurücksetzen.
Regressionstests und Gesamtprüfung oben selbst durch Root ausgeführt. Kein
zusätzlicher Auditor-PASS nach Korrektur erfunden.

## Offene Punkte und nächster Schritt

Ein beliebiges Projekt erhält keinen garantierten ausführbaren Build allein
durch dieses Schema. Programmversionen, Module und Paketquellen bleiben echte
Umgebungsvoraussetzungen. Kein automatischer neuer KI-Aufruf; unbekannte Projekte
können eine mit der verbundenen KI erarbeitete Konfiguration übernehmen.

Klimafinders tatsächliche isolierte Laufzeit, Make/Python/venv/Paketdownloads und
Vorschaugrenzen sind weiter offen. Die Standard-Netzallowlist enthält kein PyPI
und bleibt unverändert. Für Live-Prüfung/Änderung ist ein gesonderter aktueller
Owner-Auftrag erforderlich. Danach mit passender Umgebung den Owner-Praxistest A
fortsetzen. Keine laufenden Klimafinder-Dienste anfassen.
