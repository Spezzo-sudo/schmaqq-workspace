# P3 – Markus mit seinem Mac verbinden

Vorbereiteter Ablauf, noch keine durchgeführte Mac-Einrichtung. Der Owner hat
macOS bestätigt. Es besteht kein Fernzugriff auf Markus' Mac; Node/Git und
persönliche Anmeldungen dort sind noch nicht geprüft.

## Ziel

Markus sieht dasselbe Testprojekt wie Marco, hat einen eigenen Runner und eine
eigene Arbeitskopie. Keine Tokens oder ChatGPT-Konten teilen. Marcos bestehenden
Windows-Runner unverändert weiterverwenden. Der Owner hat den privaten gemeinsamen
Git-Testremote `https://github.com/Spezzo-sudo/schmaqq-studio-pilot` ausdrücklich
genehmigt; er ist angelegt und befüllt. Markus’ persönlicher Schreibzugriff
ist noch einzurichten. Keine Freigabe für andere Repositories ableiten.

## Reihenfolge bei der begleiteten Einrichtung

1. Persönlichen Studio-Einladungslink für Markus bereitstellen und privat
   übergeben. Seine bekannte Adresse stammt aus dem bisherigen Owner-Auftrag;
   vor Verwendung bestätigen, falls eine andere Adresse gewünscht ist. Keine
   Einladung automatisch versenden und keine Links in Git speichern.
2. Markus öffnet den Link auf seinem Mac und richtet sein eigenes Studio-Konto
   ein. Diese persönliche Aktion kann der Agent nicht mit Marcos Sitzung ersetzen.
3. Vorhandenes Git und Node prüfen; Studio nutzt Node >=24.15. Keine globale
   Aktualisierung oder Zusatzinstallation ohne tatsächlichen Bedarf. Persönliche
   KI-Anmeldung ist für den ersten Git-/Datei-/Testdurchlauf noch nicht nötig.
4. Gemeinsamen freigegebenen Testremote in eigenen Ordner klonen, lokale
   Git-Identität prüfen. Lesezugriff und später Schreiben des eigenen Testbranchs
   separat nachweisen. Keine globalen Git-Einstellungen überschreiben.
5. Unter Entwicklung → PC verbinden ein eigenes Mac-Gerät registrieren. Private
   Konfiguration mit tatsächlichem Projektpfad und Testbefehl erstellen. Für den
   ersten Lauf `allowCodex=false` und Veröffentlichung zunächst gesperrt.
6. Runner-Code aus dem bewusst gewählten Studio-Kandidatenstand bereitstellen;
   das Server-Runtime-Archiv ist kein Mac-Runner-Paket. Eigener Runner besteht aus
   `selfhost/runner.mjs`, `local-ai.mjs`, `process.mjs`, `files.mjs` und
   `codex-run.mjs`; er braucht laut Importprüfung keine npm-Pakete. Ein separates
   geprüftes Mac-Paket ist noch nicht erstellt oder auf macOS erprobt.
7. Private Konfiguration und Runnerzustand außerhalb des Git-Projekts ablegen,
   Konfiguration nur für Markus lesbar. Absolute Mac-Pfade verwenden. Manuell
   starten: `node /absoluter/pfad/selfhost/runner.mjs /absoluter/pfad/schmaqq-runner.private.json`.
   Kein ungefragter LaunchAgent/Autostart; keine fremden Auth-Caches übernehmen.
8. Verbindung im Studio und read-only Git-Prüfung sehen, eigene Kopie anlegen,
   kleine Testdatei ändern und den freigegebenen Test-/Vorschauablauf ausführen.
   Ein erster erfolgreicher Heartbeat allein ist keine fertige Abnahme.

Der Terminalbefehl beschreibt die heutige technische Bedienung. Ein einfacher
Installer oder ein vollständig durch OAuth ersetztes Runner-Setup existiert
noch nicht. Beobachtete Hürden im Pilot festhalten und anschließend gezielt
vereinfachen; keine Einrichtung als „ein Klick“ ausgeben.

## Abnahme

- Eigenes Studio-Konto, eigener sichtbarer Mac-Runner, eigener Projektordner.
- Kein unbeabsichtigter Code-/Tokenzugriff zwischen den beiden Geräten.
- Gleiches freigegebenes Git-Remote; getrennte Aufgaben und Arbeitskopien.
- Echter Test und neue Vorschau, anschließender gegenseitiger Review.
- Runner stoppen und erneut starten; gleiche Registrierung und Kopie bleiben.
- Ergebnis mit OS/Architektur, tatsächlich benötigten Installationen und
  Bedienhürden dokumentieren. Bis dahin `MAC_RUNNER_READY=NO`.
