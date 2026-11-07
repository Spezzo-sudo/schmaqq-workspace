# Persönlicher Pilot: Codex und Vorschau, 28.10.2026

Aktueller lokaler Studio-Arbeitsstand auf `fix/stale-review-guidance-20261027`,
mit unveröffentlichten Änderungen. Unterstützte Bedienung durch den Assistenten;
kein selbstständiger No-Coder-Test. Vorheriger Bericht:
`PERSONAL_PILOT_20261028.md`.

## Tatsächlich ausgeführt

- Studio-Vorschau zunächst ausgelöst: fehlgeschlagen, weil der Pilotrunner noch
  keinen Vorschau-Build enthielt. Studio bot die Aktion trotzdem an und empfahl
  danach ohne nachgewiesene Änderung einen erneuten Test.
- `codex login status` meldete ChatGPT-Anmeldung. Das private Runnerprofil wurde
  ausdrücklich für genau das Pilotprojekt um Codex und den vorhandenen Build
  `node scripts/build.mjs`, Ausgabe `dist`, ergänzt. Veröffentlichung blieb
  gesperrt; Runner mit eigener Prozessverwaltung neu gestartet. Das war ein
  manueller technischer Eingriff, keine automatische Ersteinrichtung.
- Studio zeigte „Codex bereit“. Ein tatsächlicher Studio-Codex-Auftrag mit der
  persönlichen Anmeldung änderte in der aufgabenbezogenen Pilot-Arbeitskopie
  ausschließlich die Überschrift in `site/index.html`. Ergebnis: erfolgreich.
  Codex führte selbst `node --test` aus: 2 bestanden, 0 fehlgeschlagen, 0
  übersprungen; Originalausgabe im Studio-Auftragsprotokoll. Dieser zusätzliche
  Lauf wurde vom beauftragten Codex eigenständig ausgeführt.
- Einmaliger erneuter Vorschaujob nach Konfigurationsänderung: erfolgreich. Über
  „Vorschau öffnen“ erschien im Browser die tatsächliche Überschrift „Willkommen
  beim gemeinsamen Studio-Test“. Screenshot lokal unter
  `.studio/personal-pilot/acceptance/20261028/codex-vorschau.png`.
- Studio behandelte seinen früheren Test nach der Codeänderung als veraltet.
  Der vom Codex-Prozess selbst ausgeführte Test ist kein separat als Studio-
  Testjob dokumentierter Prüflauf für den neuen Stand.

Kein Push, Merge, Deployment oder GitHub-Schreibtest. Die Pilotänderung liegt
uncommittet in der eigenen Aufgaben-Arbeitskopie; das private Profil enthält
Anmeldeinformationen und gehört nicht in Git oder diesen Bericht. Kein direkter
Nachweis für Chatübertragung, neue persönliche Studio-Registrierung, zweite
Person/zweites Gerät oder Claude-Integration.
