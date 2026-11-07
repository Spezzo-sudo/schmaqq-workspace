# Erste Arbeitskopie und Editor: lokale Korrekturen

Stand: 17.10.2026. Branch: `fix/studio-first-workspace-layout`.
Keine Änderungen am Live-Studio, kein Merge oder Deployment. Diese lokale Prüfevidence entstand vor der Kandidatensicherung; deren aktueller Stand steht in `PILOT_PLAN.md` und `STATUS.json`.

## Fehler und Änderungen

- Die UI sendete `worktree: ""` für Git-Prüfung und Erstellung. Der Server
  verweigerte deshalb bereits die Eingabe. Repository-Aktionen lassen dieses
  optionale Feld jetzt weg. Der Server und seine Zugriffsprüfungen bleiben
  unverändert. Der gemeinsame Request-Builder wird im echten HTTP-Vertragstest
  verwendet; Tests ohne erforderliche eigene Arbeitskopie bleiben verboten.
- Dateisuche und Editor konnten sich überlagern. Die Suchspalte und alle
  Grid-Kinder sind jetzt in ihrer Breite begrenzt. Der Editor reagiert auf seine
  tatsächlich verfügbare Panelbreite; bei wenig Platz stehen die Bereiche
  untereinander. Code darf innerhalb seines Textfeldes horizontal scrollen.
- Engere Desktopfenster zeigen die Arbeitsbereichsauswahl oberhalb des Editors.
  Die Oberfläche benennt den ausführenden PC und erklärt, dass ein ausgeschalteter
  PC keine Aufträge ausführen kann. Aktionen auf getrennten PCs sind deaktiviert.
  Die Anleitung fordert dann zum Start des vorhandenen Runners auf, nicht zur
  erneuten Registrierung. Veröffentlichung ist ein ausdrücklich aufklappbarer
  Folgeschritt. Codex benötigt separat persönliche Anmeldung und lokale Freigabe.

## Nachweise

- `node --test selfhost/workspaces.test.mjs`: PASS.
- `node selfhost/verify.mjs` mit Node 24: PASS. Source-Guard, 13 Tests,
  TypeScript und Produktionsbuild der lokalen Oberfläche bestanden.
- Sichtbarer Brave-Browser mit Playwright, lokale Instanz auf 4330 und Vorschau
  auf separater Origin 4331. Eigenes Testkonto, eigener Runner, neue Datenbank
  und lokaler Git-Klon unter dem ignorierten `.studio/r5-ui-20261017/`.
- Erstes Git-Inspect und erste Arbeitskopie ohne vorhandene Kopie ausschließlich
  durch UI-Klicks erfolgreich. Request enthielt keine leere Arbeitskopiekennung.
- `site/index.html` geöffnet, geändert und gespeichert; konfigurierte Tests
  erfolgreich. Echte gebaute Vorschau zeigte „Studio UI erfolgreich geprüft“.
- Sichtprüfung bei 390, 1024, 1280 und 1600 Pixeln: Dateisuche/Editor ohne
  Überlappung, Suchfeld innerhalb seiner Spalte, kein horizontaler Seitenüberlauf.
- Echter Test-Runner gestoppt: UI zeigte nach Ablauf der Online-Frist die
  Wiederverbindungsanleitung und sperrte Git-/Testaktionen. Nach Start desselben
  Runners waren Arbeitskopie und gespeicherte Datei unverändert vorhanden.
- Screenshots und private Testkonfiguration liegen ausschließlich im ignorierten
  Testordner. Vorschau-Berechtigungslinks und Zugangsdaten werden nicht publiziert.

## Bewusste Grenzen und nächste Arbeit

Dies ist eine Korrektur des bestehenden Ablaufs, kein fertiger Einrichtungsassistent.
Ein Ein-Klick-Installer/Starter für neue Rechner fehlt. Beim Neuladen wählt die
Entwicklungsansicht derzeit wieder das erste Projekt; das bisherige Projekt muss
erneut ausgewählt werden. Vorhandene Kopien und gespeicherte Dateien bleiben erhalten. Der Herzschlag allein
beweist weder die Freigabe eines ausgewählten Projekts noch KI-Bereitschaft.
Es wurden keine KI-Aufträge ausgeführt. Kein neuer Test mit Markus aus Thailand,
kein echter Windows-Neustart und kein Betrieb bei ausgeschaltetem Heim-PC.

Vor Live-Übernahme: Änderungen reviewen und separat freigegeben deployen.
Danach den einfachen Runner-Start und verständliche projektbezogene Bereitschaft
vervollständigen; anschließend mit beiden tatsächlichen Personen testen.
