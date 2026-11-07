# P3 – eingeschränkter Pilotstarter und Windows-Anbindung

## Umfang und Sicherheitsgrenze

Owner-Auftrag: Mac-Paket vorbereiten und bestehenden Windows-Runner am
genehmigten isolierten Pilotprojekt anbinden, mit besonderer Beachtung der
Sicherheit. Keine Website-/Serverbereitstellung, kein Autostart, keine
Providerregistrierung, KI-Ausführung oder Veröffentlichung.

Runner führen Projektcode mit den Rechten ihres lokalen Benutzers aus.
Die folgenden Sperren sind keine allgemeine Betriebssystem-Sandbox für
unvertrauenswürdigen Code. Nur das bekannte private Pilotrepository verwenden.

## Mac-Paket

- Gebaut aus Commit `8e6ee0c3b3b085699ed9e3600ebcfa5e448e699c`.
- Acht Nutzdateien plus Manifest, keine npm-Abhängigkeiten, keine Runtime-
  Tokens, Konfigurationen, Datenbanken, Git-Credentials oder KI-Auth-Caches.
- Archivgröße 12.431 Bytes, SHA256:
  `96f877b5155a708762135b94773d59f3f976561bf678693daa9741d879683b85`.
- Generiert lokal unter `.studio/runner-packages/2026-10-17T19-17-57-571Z.tar.gz`.
  Zusätzlich als benanntes Artefakt im ignorierten `.studio/p3-pilot/` abgelegt.
  Keine Veröffentlichung oder Nachricht an Markus.

`pilot-runner.mjs` und `runner-package.mjs` ergänzen ausschließlich die
Paketvorbereitung und den lokalen Einstieg, nicht den Live-Server.

Der Starter akzeptiert nur HTTPS zur tatsächlichen Studio-Origin und genau den
Studio-Projektschlüssel des genehmigten Piloten. Der Git-Checkout muss auf
`Spezzo-sudo/schmaqq-studio-pilot` als origin zeigen. Downloadbefehle werden nicht
ausgeführt: Tests und Vorschau-Build werden auf feste Argumentlisten gesetzt.
KI und Veröffentlichung sind aus; Pull-Request-Workflow sperrt direkte Integration.

Beim Konfigurationsimport werden nur eigener Gerätezugang und Projektzuordnung
übernommen. Private Daten gehen in `~/.schmaqq-studio/pilot`, getrennt vom
Git-Projekt. Auf POSIX: Eigentümerprüfung, Ordner 0700, Konfiguration 0600,
ursprünglicher eigener Download ebenfalls auf 0600 beschränkt. Symlink-/Hardlink-
Konfigurationen, zu große Dateien und bestehende Registrierungen werden
abgewiesen. Tokeninhalte werden nicht protokolliert.

Paketdateien werden vor Import/Start gegen ihr Manifest geprüft; den Archivhash
vor Entpacken zusätzlich über einen vertrauenswürdigen getrennten Bezug prüfen.
Das Manifest allein schützt nicht gegen einen Angreifer, der Paket und Manifest
zusammen ersetzen kann. Kein signierter/notarisierter Mac-Installer.

## Durchgeführte Prüfungen

- Windows `node selfhost/verify.mjs`: PASS, Source Guard, 19 bestandene Tests,
  ein explizit übersprungener POSIX-Rechtetest, TypeScript und Frontend-Build.
- Neue fokussierte Linux-Prüfung der drei Pilotstarter-Tests: **3/3 PASS**,
  einschließlich Dateirechten und Symlink-Abweisung. Keine vollständige neue
  Linux-Buildsuite; der unveränderte Anwendungsstand ist unter P1 belegt.
- Gebautes Archiv auf Linux getrennt entpackt und Hash/Pfade geprüft.
  Vollständiger Konfigurationsimport mit künstlichem Token und lokalem
  Git-Fixture, `--check`, unveränderte bestehende Konfiguration bei zweitem
  Import, Abweisung manipulierter Paketdatei und Shell-Syntax PASS.
- Linux-Prüfung ohne Studio-Netzwerkverbindung und ohne echte Zugangsdaten.
  Ausschließlich temporären Testbereich anschließend entfernt.
- **macOS-Hardware, Finder-/Gatekeeper-Start und echte Markus-Anmeldung nicht
  getestet. `MAC_RUNNER_READY=NO`.**

## Persönlicher Windows-Runner

- Keine aktiven Jobs vor Neustart festgestellt. Bestehenden eigenen Runner über
  seine Terminal-Sitzung mit Ctrl+C beendet; keine fremden Prozesse gestoppt.
- Private Originalkonfiguration lokal gesichert; vorhandenes Projektprofil und
  Gerätetoken beibehalten. Pilotprojekt ergänzend konfiguriert, ohne KI oder
  Veröffentlichung, mit Pull-Request-Workflow und absolutem Node-Pfad.
- Konfigurations-ACL vor Änderung auf breite Everyone-/Authenticated-Users-
  Lesefreigaben geprüft: keine entsprechenden Regeln beobachtet. Keine pauschale
  Behauptung einer vollständigen Windows-Rechteprüfung.
- Gleichen manuellen Launcher neu gestartet; kein zweites Gerät und kein Autostart.
- Über echte Studio-Aufträge: Git-Inspektion ready, eigener Task-Arbeitsbereich
  „Marco – Pilotstartseite“, Tests und neue gebaute Vorschau PASS.
- Konkrete neue Vorschau auf separater HTTPS-Origin: HTTP 200, Pilotinhalt
  vorhanden. Capability-Link nicht gespeichert oder ausgegeben.
- Eigene fertige Arbeitskopie im Live-UI erreichbar, kein horizontaler Overflow
  im geprüften Desktop. Keine Designdefinition oder neue Live-Codebereitstellung.
- Direkte lokale Negativprobe: `submit` und `integrate` werden durch die
  Projektfreigaben abgewiesen, ohne Git-Push oder Merge.
- Keine KI-Aufträge, Git-Publikation, personenbezogene Einladung oder Änderung
  an NetzKontor. Pilot-Hauptzweig bleibt beim initialen Seed.

## Fortsetzung

Marcos Pilotkopie ist einsatzbereit. Seine Aufgabe bleibt zur eigenen Bearbeitung
offen/in Arbeit; die Automationsprüfung ist keine menschliche Abnahme.
Markus benötigt weiterhin eigenes GitHub-/Studio-Konto und die Einrichtung auf
seinem Mac. Paket enthält keinen vorregistrierten Gerätezugang. Erst danach
den tatsächlichen Zwei-Personen-Pilot mit Kommentaren und gegenseitigem Review
durchführen. Sperren für KI und Veröffentlichung nur durch eigenen separaten
freigegebenen Arbeitsschritt verändern.
