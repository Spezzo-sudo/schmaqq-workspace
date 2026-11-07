# Veraltete Codefreigabe: nächsten Schritt direkt anbieten

Lokaler Produktauftrag vom 27.10.2026, aufgebaut auf dem über GitHub gelesenen
Draft-Kandidaten PR #51. Aktuellen Branch und Basis mit Git ermitteln. Keine
Veröffentlichung, Zusammenführung oder Betriebsänderung durch diesen Bericht.

## Problem und Verhalten

Nach einer Dateiänderung zeigte die Aufgabe bereits eine Warnung vor dem alten
Prüfstand, bot aber weiterhin die Zusammenführung an. Erst der Server wies den
Versuch ab. Der frühere Nachweis ist der lokale QA-Lauf
`20261027T221811Z-a049ab`, Screenshot `code-Alte-Freigabe-Abgewiesen.png`.

Die Aufgabenoberfläche verwendet jetzt die vorhandenen Abschlussinformationen
`changedAfter` und `contractRevision`. Bei einer veralteten Fassung sperrt sie
die Zusammenführung und erklärt, dass erneut geteilt und unabhängig geprüft
werden muss. Die verantwortliche Person erhält „Neue Fassung zur Prüfung
teilen“; der Kollege sieht, wer zuerst handeln muss. Ungespeicherte Entwürfe,
laufende Arbeit, fehlende eigene Arbeitskopie oder fehlender erreichbarer PC
sperren die neue Aktion. Geänderte Abschlussbedingungen werden ebenfalls
berücksichtigt, auch wenn seit dem Prüfstand keine Datei geändert wurde.

Die neue Aktion verwendet den bisherigen Submit-Ablauf mit Tests und gebauter
Vorschau. Nach erfolgreichem Teilen wird der neue Prüfstand ausgewählt; eine
vorher manuell ausgewählte alte Fassung bleibt nicht versehentlich im Vordergrund.
Historische Diffs und Freigaben bleiben erhalten. Bereits bestätigte Integrationen
bleiben als solche sichtbar. Bei veraltetem aktuellem Prüfstand werden auch die
GitHub-Abschlussaktionen nicht angeboten. Die serverseitigen Schutzregeln und
Providerrechte werden nicht geändert.

## Nachweise und Wiederholung

Quellprüfung: `node selfhost/verify.mjs --local`. Browserabnahme nach dem Build:

```powershell
python -B scripts/stale-review-browser-acceptance.py --qa-root PFAD_ZUM_SCHMAQQ-QA-LOCAL-01
```

Der Browsertest nutzt ausdrücklich den separat eingerichteten lokalen QA-Prüfer
mit dessen Python/Playwright, Node, Git und Edge. Er kopiert die synthetische
Fixture und richtet allein deren Quellwurzel auf diesen Checkout aus. Der
unveränderte, festgeschriebene QA-Kandidat bleibt erhalten. Es werden zwei
synthetische Sitzungen und tatsächliche Runner gegen eigene lokale Git-
Repositories verwendet. Der Test startet keine KI. Originalausgaben, weitere
JSON-Belege und Screenshots bleiben unter `.studio/stale-review/`; der letzte
Abnahmeordner steht in `latest.json`.

Tatsächlich ausgeführt und bestanden:

- `node selfhost/verify.mjs --local`: 208 Tests insgesamt, 187 PASS,
  0 FAIL, 21 ausdrückliche Plattform-Skips; Source Guard, TypeScript und Vite PASS.
  Originalausgabe: `.studio/stale-review/verification.log`.
- Browserlauf `.studio/stale-review/20261027T224057Z/`: 21/21 bisherige
  Prüfgruppen und alle 7 zusätzlichen UI-Regressionsfälle PASS, 170,63 Sekunden,
  67 Screenshots. Keine unerwarteten HTTP-/JavaScript-Fehler.
- Die Zusatzfälle prüfen getrennt geänderte Abschlussbedingungen ohne weitere
  Dateiarbeit und eine gespeicherte Dateiänderung. Für Autor und Prüfer ist die
  veraltete Integration gesperrt; nur der Verantwortliche bekommt die neue Aktion.
  Ungespeicherter Entwurf verhindert erneutes Teilen ohne neuen Submit-/Mergejob.
  Nach Verwerfen dieses Testentwurfs funktioniert die Aktion. Bei 390px und
  1440px ist sie ohne Seitenüberlauf verfügbar. Neuer Prüfstand ausgewählt,
  neue unabhängige Freigabe und tatsächliche lokale Integration bestätigt.
- Die mobilen Autorenansichten und die Prüferansicht mit gesperrtem Mergebutton
  wurden zusätzlich anhand der gespeicherten Screenshots angesehen.

Originale im erfolgreichen Browserordner: `summary.json`, `regressions.json`,
`source.json` mit den Quellhashes, `codeflow.json` mit Jobs/Commit-Nachweisen,
`fixture-proof.json`, Ausführungsjournal, Screenshots und `report.html`.
Der lokale Zielcommit wurde mit dem vom Runner bestätigten Ergebnis und der
Abstammung des freigegebenen Commits verglichen; Aufgabe danach `done`.
Die eigenen Testprozesse wurden beendet.

Zwei vorherige Prüferentwicklungsversuche bleiben erhalten:
`20261027T223704Z` scheiterte vor dem Browserstart an einem doppelt angelegten
Screenshotordner; `20261027T223726Z` zählte beim Kontrollvergleich auch normale
Dateilesejobs mit. Diese beiden Prüferprobleme wurden korrigiert. Sie belegen
keine Produktfehler; kein fehlerfreier Entwicklungsdurchlauf behauptet.

Vorbereiteter Reviewtitel: **Studio: veraltete Freigaben vor dem Zusammenführen
abfangen und erneutes Teilen direkt anbieten**. Der lokale Diff enthält nur
diese Bedienführung, den Browserregressionseinstieg und die Nachweisdokumentation.

## Grenzen

Der Prüflauf ist ein lokaler Windows-Nachweis mit synthetischen Konten, zwei
Runnerprozessen und Datei-Repositories auf einem Rechner. Die natürliche
Offline-Frist wird nicht gemessen; die Fixture setzt Präsenz erst nach einem
tatsächlichen Prozessstopp sofort auf abgelaufen. Echte GitHub-Aktionen,
persönliche Konten, zwei physische Geräte, Linux-/Operator-Recovery und eine
vollständige Barrierefreiheitsprüfung bleiben außerhalb dieser Abnahme.
Der vorhandene Hinweis zur Bundlegröße ist nicht blockierend.
