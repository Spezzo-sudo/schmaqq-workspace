# Funktionsmatrix – 19.10.2026

PASS = im angegebenen Umfang tatsächlich nachgewiesen. FAIL = reproduzierbares unerwartetes Verhalten. BLOCKED = Voraussetzung, Freigabe oder Werkzeugzugriff fehlt. NOT TESTED = im Audit nicht ausgeführt. Ein PASS einer Teilfunktion ist keine End-to-End-Abnahme des gesamten Bereichs.

| ID | Funktion / Szenario | Status | Nachweis oder konkrete Grenze |
|---|---|---|---|
| A01 | Persönliche Anmeldung bestehendes Konto | PASS | Nutzer meldete sich persönlich an; angemeldete Übersicht und Reloads geprüft. |
| A02 | Neue Konten/Einladungen anlegen | BLOCKED | Im Auftrag ausdrücklich ausgeschlossen; keine erstellt. |
| A03 | Sechs Projekte anzeigen / auswählen | PASS | Übersicht und Projektkarten; 01, 08, 18. |
| A04 | Projektfilter / Suchbegriff filtern und zurücksetzen | PASS | Sechs Karten → keine Treffer → sechs Karten. |
| A05 | Verständlicher Projektsuche-Leerzustand | FAIL | B05; 35-project-search-empty. |
| A06 | Projekt anlegen: Dialog/Optionen anzeigen | PASS | Geführter Start, bestehendes Repo/lokales Startprojekt sichtbar. |
| A07 | Neues Projekt tatsächlich anlegen | BLOCKED | Schreibtests nur im bestehenden Pilotprojekt erlaubt. |
| A08 | Tastaturfokus Projektstartdialog | FAIL | B02; zweimal Hintergrundfokus. |
| A09 | Browser-Zurück zwischen internen Ansichten | FAIL | B01; zweimal about:blank statt vorheriger Ansicht. |
| A10 | Sitzung und ausgewähltes Pilotprojekt nach Reload | PASS | Wiederholte Reloads; gleiche Person, gleiche Projektauswahl. |
| B01 | Ursprüngliche Aufgaben/Zuständigkeiten anzeigen | PASS | 02, 18; Marco Review, Markusaufgabe unzugewiesen. |
| B02 | Neue markierte Pilotaufgabe anlegen | PASS | QA-AUDIT-Aufgabe über UI erstellt. |
| B03 | Eigene QA-Aufgabe übernehmen | PASS | Zuständig Marco, Status In Arbeit. |
| B04 | QA-Aufgabe abschließen / erledigte einblenden | PASS | Erledigt, Filter, nach Reload erhalten; 19, 21. |
| B05 | Aufgabenkommentar senden und nach Reload lesen | PASS | Ein QA-Kommentar; 21-task-reload-mobile. |
| B06 | Gleichzeitige Übernahme durch zwei Personen | BLOCKED | Kein zweites Konto/keine echte zweite Sitzung. |
| B07 | Projektchat senden / Persistenz | PASS | Markierte Nachricht nur im Pilotraum; 15, 16. |
| B08 | Zeitgleiche Synchronisation zweier Personen | BLOCKED | Nur eine echte Person angemeldet. |
| B09 | Aktivitätenexport enthält Verlaufstruktur | PASS | JSON-Download mit activities-Struktur; kein Beweis für vollständige Audittrailabdeckung. |
| C01 | Vorhandene Arbeitskopie laden | PASS | Marcos Pilotkopie mit Branch/Gerät/Scope. |
| C02 | Neue isolierte QA-Arbeitskopie erstellen | PASS | 26; neue lokale Kopie, bestehende Kopie unverändert. |
| C03 | Nur QA-Arbeitsbereich abschließen | PASS | 37; ursprüngliche Kopie weiter aktiv. |
| C04 | Dateiliste vom realen PC laden / Datei öffnen | PASS | Tatsächliche Runnerjobs, lokale Dateiverifikation. |
| C05 | Neue Datei direkt in Studio anlegen | NOT TESTED | Keine Dateianlage in geprüfter UI gefunden; neue QA-Dateien lokal vorbereitet. |
| C06 | Datei im Browser bearbeiten / speichern | PASS | Ausschließlich neue QA-Dateien; 07, 09; Inhalt auf PC geprüft. |
| C07 | Gespeicherten Inhalt nach Seitenneuladen erneut öffnen | PASS | Markierter Inhalt wieder geladen; 09. |
| C08 | Falsche Dirty-Warnung nach erfolgreichem Speichern | PASS | Im geprüften Ablauf keine falsche Warnung; Save deaktiviert, Ansichtwechsel möglich. |
| C09 | Ungespeicherten Entwurf intern mitnehmen | PASS | Entwicklung → Übersicht → Entwicklung; 29. |
| C10 | Entwurf verwerfen | PASS | Gespeicherter Inhalt wiederhergestellt; Tooltimeout anschließend verifiziert. |
| C11 | Externen Dateikonflikt erkennen / Entwurf bewahren | PASS | Kontrollierter Konflikt ausschließlich QA-Datei; 27. |
| C12 | Vergleich laden / Basis bewusst übernehmen / speichern | PASS | Beide Inhalte sichtbar, bewusste Auflösung; 28. |
| C13 | Entwurf herunterladen | NOT TESTED | Schaltfläche gesehen; separater Entwurfdownload nicht ausgeführt. |
| C14 | Dateiabgleich und veraltete Testnachweise | PASS | Entfernung QA-Datei erkannt; 36, abschließend neue Tests/Vorschau. |
| C15 | Änderungsbeschreibung/-typ speichern | NOT TESTED | Schaltfläche am bestehenden Auftrag gelesen; vorhandene Beschreibung nicht verändert. |
| C16 | Pfadtraversal, Secrets, Symlinks, Dateigrößenlimits angreifen | NOT TESTED | Schutztexte/Source ergänzend gelesen; kein offensiver Sicherheitstest. |
| D01 | Vorhandene lokale Runnerkonfiguration finden | PASS | Profil und Starthelfer R5-A; keine geheimen Werte protokolliert. |
| D02 | Vorhandenen Runner ohne Neuregistrierung nutzen | PASS | Offline → Startskript → Online → echte Dateijobs. |
| D03 | Node/Git und konfigurierte Projektpfade prüfen | PASS | Node PATH 22.14; konfigurierte Runtime 24.19; Git 2.49; Pilotpfade/Remote geprüft. |
| D04 | Aktueller Git-Lesecheck über UI | PASS | 31; Hauptzweig erreichbar, Identität/Testbefehl vorhanden. |
| D05 | Git-Schreibzugriff / Branch-Push | BLOCKED | Keine Pushfreigabe; publish=false unverändert. |
| D06 | Runnerneuregistrierung | BLOCKED | Vorhandenes Gerät erhalten; neue Registrierung untersagt. |
| D07 | Reboot / automatischer Start / Verbindungsabbruch | NOT TESTED | Kein Reboot; kein passender Autostart in geprüften Standardorten gefunden. |
| D08 | Auditprozess nach beendeten Jobs wieder stoppen | PASS | Nur selbst gestarteten Prozess beendet; runner-stop.json. |
| E01 | Sicheren Testlauf über Studio ausführen | PASS | Ursprüngliche Kopie 3/3, nach Bereinigung erneut 3/3; 10 und 38. |
| E02 | Testausgabe im Browser anzeigen | PASS | Namen, Anzahl und Resultat aufgeklappt. |
| E03 | Statischen Vorschau-Build über Runner starten | PASS | 11 und abschließend 39; keine Veröffentlichung. |
| E04 | Neue HTTPS-Vorschau tatsächlich öffnen | PASS | Start und Services im echten Browser; 12, 13. |
| E05 | Vorschau-Navigation und schmale Darstellung | PASS | Start → Services, 390-px-Vorschau kontrolliert. |
| E06 | Abbruch eines laufenden Jobs | NOT TESTED | Keine künstlich langen/unkontrollierten Jobs gestartet. |
| E07 | Vollständige Studio-Produkttestsuite/CI | NOT TESTED | Ausgeführte Tests gehören zum Pilotprojekt, nicht zur gesamten Studioanwendung. |
| F01 | Vorhandene Reviews mit Commit/Diff/Tests öffnen | PASS | Nach vollständigem Laden korrekt; 25. |
| F02 | Korrekter initialer Review-Ladezustand | FAIL | B03; fehlende Detaildaten werden kurz als fachliche Fehler angezeigt. |
| F03 | Neuen lokalen QA-Prüfstand über UI erstellen | PASS | Commit 81563fc686; 2/2 Basistests; nur neue QA-Datei; 30, 41. |
| F04 | Kommentar an exaktem Prüfstand speichern / Reload | PASS | QA-Kommentar bleibt dem Prüfstand zugeordnet. |
| F05 | Eigene UI-Freigabe verhindern | PASS | Im eigenen Review nur Kommentar auswählbar. Keine API-Umgehungsprüfung. |
| F06 | Zweite Person genehmigt / fordert Änderungen an | BLOCKED | Keine reale zweite Person angemeldet. |
| F07 | Veraltete Freigabe nach Nacharbeit / Branchkonflikt | BLOCKED | Zwei-Personen-Abnahme fehlt. |
| F08 | PR-Link, GitHub-Review und CI Ende-zu-Ende | BLOCKED | UI meldet Betreiber-Einrichtung; alter PR nur als Kommentar gesehen, nicht neu verifiziert. |
| F09 | Merge / Deployment | BLOCKED | Ausdrücklich nicht autorisiert. |
| G01 | Alle acht Hauptansichten auf Desktop öffnen | PASS | UI-Snapshots und Screenshots. |
| G02 | Alle acht Hauptansichten auf schmalem Viewport | PASS | 20/mobile-*; mobile Chatbewertung über Viewportaufnahme. |
| G03 | Kein horizontaler Seitenüberlauf in gemessenen mobilen Hauptansichten | PASS | Dokumentbreite = Scrollbreite; Board/Chat haben eigene horizontale Bereiche. |
| G04 | Mobiles Menü per Navigation bedienen | PASS | Menü → Zielansicht schließt den Drawer. |
| G05 | Mobiles Menü per Escape / Zustandsankündigung | FAIL | B04; Drawer bleibt offen, aria-expanded fehlt. |
| G06 | Vollständige Tastatur-/Screenreaderabnahme | NOT TESTED | Grundlegende Tab-/Escape-Prüfungen, kein vollständiger Standardaudit. |
| G07 | Wissen: Leerzustand, Dialog, Pflichtfeldvalidierung | PASS | 17; leeres Pflichtfeld verhindert Absenden. |
| G08 | Wissen: Dokument speichern, Versionierung, Konflikt | BLOCKED | Keine erkennbare Pilotzuordnung; keine globalen Schreibtests gemäß Auftrag. |
| G09 | Teammitglieder und Rolleninformationen anzeigen | PASS | Ein tatsächliches Mitglied sichtbar; Anzeige nennt Studio-Mitglied. |
| G10 | Einladungen / Rollen / Konten ändern | BLOCKED | Auftrag untersagt Konto-/Einladungsanlage; keine Rechte erweitert. |
| G11 | Workspace-Link kopieren | PASS | Inhalt als korrekte Studio-Origin verifiziert. |
| G12 | Datenexport downloaden / JSON-Struktur | PASS | Sechs Projekte, drei Aufgaben; Strukturbeleg export-check.json. |
| G13 | Datenrestore aus Export / Datenbankbackup | NOT TESTED | Kein Restore/Reset autorisiert. |
| H01 | GitHub-Verbindungsstatus und Hilfen | PASS | Betreiber-Einrichtung transparent angezeigt; 33. |
| H02 | GitHub-OAuth tatsächlich anmelden | BLOCKED | Betreiberkonfiguration fehlt; keine Zugriffsänderung vorgenommen. |
| H03 | ChatGPT-Identitätslogin | BLOCKED | Offizieller Loginclient nicht registriert; Button deaktiviert. |
| H04 | Persönlichen Codex-Auftrag ausführen | BLOCKED | Lokal gesperrt; keine KI-Freigabe im Auftrag. |
| H05 | Lokales Modell / geteilte KI-Ressourcen | BLOCKED | Kein freigegebenes Modell erreichbar; Teamnutzung lokal gesperrt. |
| H06 | Claude / Copilot ausführen | BLOCKED | Produktive UI: noch nicht integriert. |
| H07 | Anbieterhilfen und KI-Historienbereich öffnen | PASS | Aufklappbereiche gelesen; keine Anfrage ausgelöst. |
| I01 | Browserkonsole abfragen und sichern | PASS | console.json/console-final.json; abgefragte Sammlungen leer. |
| I02 | Vollständige fehlgeschlagene Requests / HAR prüfen | BLOCKED | Request-/Response-API fehlt; Resource Timing in Browserauswertung nicht verfügbar. |
| I03 | Ausgerollten Produktions-SHA attestieren | NOT TESTED | SHA aus Auftrag; keine unabhängige Deploymentattestierung. |
| I04 | Windows + echter Mac / zwei Personen End-to-End | BLOCKED | Markus weder angemeldet noch sein Mac geprüft; nicht simuliert. |
| I05 | Firefox / Safari / reale Mobilgeräte / Dauerlast | NOT TESTED | Browserprüfung in vorhandener Chromium-basierten In-App-Umgebung. |

Screenshots und Textbelege liegen in den gleichnamigen Unterordnern. Nummerierte Belege stehen für genau den dokumentierten Zustand, nicht automatisch für die gesamte Funktion. Kritische Grenzen stehen im Auditbericht; ein Prozentwert über diese heterogenen Zeilen wäre irreführend.
