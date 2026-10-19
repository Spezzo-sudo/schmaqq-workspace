# SCHMAQQ Studio – unabhängiger Produktionsaudit

Datum: 19.10.2026, Zeitzone Europe/Berlin. Zielsystem: https://studio.schmaqq.com. Prüfung im echten Codex-In-App-Browser mit gerenderter Oberfläche, Playwright-Locators, Tastatureingaben, Screenshots und lokalem Windows-Runner.

## Ergebnis: 6 von 10

**Als begrenzter technischer Pilot verwendbar. Für die tägliche gemeinsame KI-Entwicklung durch Marco und Markus noch nicht abgenommen.**

Die wesentliche Strecke funktioniert tatsächlich: Anmeldung → Projekt → Aufgabe/Kommentar → eigene Arbeitskopie → Datei bearbeiten/speichern → Test → statische HTTPS-Vorschau → lokaler Prüfstand mit Commit, Diff und Rückmeldung. Das ist mehr als ein Dashboard. Der tatsächliche Betrieb mit zwei unabhängigen Personen, zwei Rechnern, Konflikten zwischen ihren Branches und gegenseitiger Freigabe ist dagegen nicht nachgewiesen. In der Teamansicht existiert während dieses Audits nur Marco.

Die Bewertung berücksichtigt die funktionierende technische Basis, die fehlende Zwei-Personen-Abnahme, offene Integrationen und reproduzierte Bedienungsfehler. Sie ist kein Sicherheitszertifikat und keine Aussage über Verfügbarkeit unter Dauerlast.

Die dokumentierte Matrix umfasst 84 Teilprüfungen: **49 PASS, 5 FAIL, 19 BLOCKED, 11 NOT TESTED**. Dazu liegen **50 Screenshots** im Screenshotordner vor. Die fünf FAIL-Zeilen entsprechen den fünf reproduzierten Bedienungs-/Darstellungsbefunden; BLOCKED ist kein versteckter PASS.

## Umfang und Beweiskraft

- Alle acht Hauptansichten besucht: Übersicht, Projekte, Aufgaben, Team-Chat, Wissen, Team & Zugänge, Entwicklung, Verbindungen. Zusätzliche Dialoge, aufklappbare Details, Arbeitsbereiche, Testausgaben und Reviews geöffnet.
- Desktopdarstellung und schmale Viewports geprüft. Angefordert wurden unter anderem 1440 × 900 und 390 × 844. Die tatsächlichen schmalen Dokumentbreiten lagen je nach Browseraufnahme bei 375–390 px; die gemessenen Werte stehen in `browser-logs/mobile-layout.json`. Keine Aussage über echte iOS-/Android-Geräte.
- Sämtliche Schreibtests ausschließlich im bestehenden Projekt **Studio-Pilottest**, mit markierten synthetischen Artefakten. Keine neuen Konten, Einladungen oder Runnerregistrierungen. Kein Push, Merge, Deployment oder KI-Auftrag.
- Vorhandene Kommentare und alte erfolgreiche Läufe wurden als Bestandsdaten gelesen, nicht als neuer Testnachweis gezählt.
- Der im Auftrag genannte Produktionscommit `a4dfdfefbc16b29222337e2488245157bc2cd10d` wurde nicht unabhängig gegen eine Deploymentattestierung verifiziert. Geprüft wurde die tatsächlich ausgelieferte Produktionsoberfläche. Lokaler Studio-Checkout: `ecb74ce8fdb9ce49733780bfc1497dc4064d04ba`. Dieser lokale Stand ist kein Beweis für den Serverstand.
- Der vorhandene Starthelfer führt den Runner aus diesem lokalen Checkout aus. Somit gilt der Runnernachweis für genau diese vorhandene Installation; keine Behauptung einer Abnahme eines frisch installierten PR18-Runnerpakets.

## Was nachweislich funktioniert

| Bereich | Neuer Nachweis im Audit |
|---|---|
| Anmeldung | Persönliche Anmeldung durch den Nutzer; bestehende Sitzung über Reloads weiter nutzbar. |
| Projektübersicht | Sechs Projekte; Pilot auswählen, Projektkarte öffnen, Projektfilter und Fortschrittsanzeige prüfen. |
| Aufgaben | Neue markierte Pilotaufgabe anlegen, übernehmen, Status In Arbeit → Erledigt setzen; abgeschlossene Aufgabe einblenden. Ursprüngliche Aufgaben nicht umgewidmet. |
| Kommentare | Kommentar an der Testaufgabe speichern; nach Reload wieder sichtbar, Zuständigkeit und Status bleiben erhalten. |
| Projektchat | Markierte Nachricht ausschließlich im Pilot-Projektraum senden und nach Reload wieder öffnen. Keine zweite Person simuliert. |
| Runner | Vorhandenes Profil und Startskript gefunden, vorhandenen Runner gestartet, Onlinezustand im Studio und echte Dateijobs bestätigt. |
| Arbeitskopien | Zusätzliche isolierte QA-Arbeitskopie über die UI erstellt und nach Abschluss über die UI geschlossen. Ursprüngliche Kopie blieb erhalten. |
| Editor | Neue synthetische Datei über UI geöffnet, geändert und auf dem realen PC gespeichert; Inhalt zusätzlich auf Datenträger verifiziert; erneut geöffnet. |
| Speicherstatus | Nach Speichern: „Stand gespeichert“, Speichern deaktiviert. Kein falscher Dirty-Hinweis beim geprüften Wechsel. Ungespeicherter Entwurf blieb beim internen Ansichtswechsel erhalten; Verwerfen stellte den gespeicherten Inhalt wieder her. |
| Dateikonflikt | Externe Änderung ausschließlich an neuer QA-Datei erzeugt. Veraltetes Speichern abgewiesen, beide Inhalte erhalten, Vergleich und bewusste Basisübernahme ermöglicht, anschließend erfolgreich gespeichert. |
| Tests | Auf ursprünglicher Pilotkopie 3/3 bestanden, zuletzt nach Entfernen des temporären QA-Artefakts erneut 3/3. Getrennte QA-Kopie basiert auf älterem main mit 2 Basistests: im neuen Prüfstand 2/2 bestanden. |
| Vorschau | Statischer Build über Studio/Runner erfolgreich; neue HTTPS-Vorschau tatsächlich geöffnet, Start-/Services-Navigation getestet und mobile Servicesansicht visuell kontrolliert. Nach Bereinigung erneut gebaut. |
| Review | Neuer lokaler Prüfstand `81563fc6864752f3e61c8fd261f361868f269275`: ausschließlich eine neue QA-Markdowndatei, Diff und Testausgabe sichtbar; Rückmeldung gespeichert und nach Reload wiedergefunden. |
| Selbstfreigabe | Im eigenen Prüfstand steht ausschließlich Kommentar zur Auswahl; unabhängige Freigabe bleibt ausstehend. Das prüft die UI-Sperre, nicht mögliche API-Umgehungen. |
| Git | Aktueller UI-Lesecheck erfolgreich: Repository, origin, erreichbarer Hauptzweig, lokale Git-Identität, Testbefehl. Schreibzugriff bewusst nicht geprüft. |
| Dateinachweise | Dateiabgleich erkennt, dass das Entfernen des temporären QA-Artefakts den Quellstand gegenüber vorherigem Test/Vorschau verändert hat. Nachfolgende Tests/Vorschau wurden deshalb erneuert. |
| Export | „Daten exportieren“ erzeugt lesbares JSON mit projects, tasks, members, messages, documents, activities. Nur Struktur/Zählwerte protokolliert. Workspace-Link korrekt kopiert. |

Die drei erfolgreichen Pilotprüfungen sind kleine Inhalts-/Navigationsprüfungen des synthetischen Pilotprojekts. Sie sind keine vollständige automatisierte Testsuite des Studio-Produkts.

## Fehler und UX-Probleme

Details mit Reproduktion, Erwartung, tatsächlichem Verhalten, Evidenz, Ursache und Lösung stehen in [BUGS.md](BUGS.md).

| ID | Priorität | Befund |
|---|---|---|
| B01 | P2 | Interne Ansichten erzeugen keine nutzbare Zurück-Historie. Browser-Zurück verlässt das Studio nach `about:blank`. Zweimal beobachtet. |
| B02 | P2 | Projektstartdialog übernimmt den Tastaturfokus nicht: Tab erreicht „Automatisierung“ hinter dem offenen Dialog. Zweimal reproduziert. |
| B03 | P2 | Review zeigt während des Nachladens falsche Negativmeldungen: kein Testergebnis, keine Änderungen und „Änderung zu groß“. Nach dem Laden erscheinen Tests und kleiner Diff korrekt. Wiederholt reproduziert; kein dauerhafter Verlust der Reviewdaten. |
| B04 | P3 | Mobiles Menü bleibt nach Escape offen; der Menüknopf besitzt kein `aria-expanded`. Zweimal geprüft, Position des sichtbaren Navigationselements dokumentiert. |
| B05 | P3 | Projektsuche ohne Treffer entfernt die Karten ohne erklärenden Leerzustand; „Neues Projekt starten“ bleibt als dominierende Aktion stehen. |

Weitere Verbesserungsmöglichkeiten: Teamansicht zeigt für Marco nur „Studio-Mitglied“, obwohl Eigentümerfunktionen an anderer Stelle verfügbar sind. Aufgabenkommentare und detaillierte Nachweise sind vor allem über Übersicht zugänglich; das Aufgabenboard präsentiert andere Statusbegriffe (Review gegenüber Zur Prüfung). Der Editor kann laut UI nur bestehende UTF-8-Dateien bis 24 KB bearbeiten. Neue Testdateien mussten lokal vorbereitet und für die Dateiliste in Git aufgenommen werden; eine UI-Dateianlage wurde nicht gefunden. Das sind dokumentierte Produktgrenzen, keine pauschale Behauptung defekter Datenhaltung.

## Windows-Runner: konkreter Ausgangszustand und Ursache

Vor Beginn der Runnerprüfung war kein Prozess mit `selfhost/runner.mjs` aktiv; Studio zeigte „PC nicht verbunden“. Vorhanden waren:

- Profil: `C:/Users/mark/Documents/ChatGPT/reverse/schmaqq-workspace/.studio/r5-a/runner.private.json`.
- Starthelfer: derselbe Ordner, `Start-SchmaqqRunner.ps1`.
- Ziel im Profil: `https://studio.schmaqq.com`.
- Standard-Node im normalen PATH: **22.14.0**, unter der Projektanforderung >=24.15.
- Im vorhandenen Startskript ausdrücklich gewählte Runtime: **24.19.0**, vorhanden und verwendbar. Git: **2.49.0.windows.1**.
- Freigegeben waren nur zwei lokale Projektzuordnungen: die vorhandene Automation-Testumgebung und die Pilot-Repositoryquelle. Pilot-Remote ohne Ausgabe von Zugangsdaten als `Spezzo-sudo/schmaqq-studio-pilot` verifiziert.
- Pilot-Testbefehl: fest konfigurierte Argumentliste für Node `--test`; statischer Build über `scripts/build.mjs` nach `dist`.
- `allowCodex=false`, `publish=false`, Workflow `pull-request`; diese Sperren blieben unverändert.

**Konkreter Grund der anfänglichen Nichterreichbarkeit: Der vorhandene Runner war nicht gestartet.** Mit seinem bestehenden Starthelfer funktionierte die Verbindung. Keine passenden Aufgaben, Dienste oder Einträge im Benutzer-Startupordner wurden gefunden; diese Prüfung ist keine vollständige Inventur aller denkbaren Autostartmechanismen. Ein Reboot wurde nicht durchgeführt.

Nach vollständig beendeten Auditjobs wurde ausschließlich der für diesen Audit gestartete Runnerprozess wieder beendet. Damit ist der ursprüngliche gestoppte Betriebszustand wiederhergestellt. Für weitere lokale Studioarbeit muss der bestehende Starthelfer erneut laufen. Registrierter PC, Profil, Berechtigungen und vorhandene Kopien bleiben erhalten.

Die Projekt-/Befehlsfreigaben, HTTPS-Zielbindung, Konfliktprüfung und getrennten Arbeitskopien sind positive Sicherheitsgrenzen. Geheime Dateien, Tokens, Auth-Caches und Umgehungen der Pfadgrenzen wurden nicht ausgelesen oder aktiv angegriffen. Aus dem Audit folgt keine vollständige Sicherheitsabnahme.

## Was die Zusammenarbeit von Marco und Markus noch verhindert

| Frage | Belastbare Antwort |
|---|---|
| Unabhängige Anmeldung beider Personen? | Für Marco nachgewiesen. Für Markus BLOCKED: kein tatsächlicher zweiter Login, kein zweites Mitglied im geprüften Zustand. |
| Dieselben Projekte und Aufgaben? | Marcos Daten sind konsistent und persistent. Gleichzeitiger Zugriff von Markus nicht geprüft. |
| Eigene Kopie und Runneridentität pro Person? | Marcos bestehende und zusätzliche isolierte Kopie funktionieren. Markus' Mac und Runneridentität fehlen als Nachweis. |
| Getrennte Entwicklung und nachvollziehbarer Review? | Eigener Branch, lokaler Prüfcommit, Diff, Tests und Kommentar funktionieren. Personenübergreifende Prüfung bleibt offen. |
| Konflikte und Reviewregeln? | Dateirevisionskonflikt und UI-Selbstfreigabesperre funktionieren. Gleichzeitige Aufgabenübernahme, Branchkonflikte zwischen Personen, Änderungen-angefordert → Nacharbeit → neue Freigabe fehlen als reale Abnahme. |
| Aufgabe → Code → Test → Vorschau → Freigabe? | Technische Teilstrecken nachgewiesen. Echte zweite Freigabe und GitHub-Übergang nicht vollständig abgenommen. |
| Gemeinsame Codex-Entwicklung? | Aktuelle lokale Projektfreigabe sperrt Codex; gemäß Auftrag kein KI-Lauf. Persönlicher Codex-Zugang und ausführbarer Auftrag je Person müssen später separat kontrolliert freigegeben werden. |

Die GitHub-Verbindungsansicht meldet **„Einrichtung durch Betreiber nötig“**. Der erfolgreiche Runner-Git-Lesecheck ersetzt diesen OAuth-/App-Aufbau nicht. Die UI blockiert die geschützte Zusammenführung mit **„Pull Request erforderlich“**. Ein alter Kommentar nennt einen Draft-PR; dessen aktueller GitHub-Zustand und CI wurden in diesem Audit nicht unabhängig geprüft. Es wurde kein neuer PR erstellt.

Weitere nur teilweise verfügbare Funktionen: ChatGPT-Identitätslogin ohne registrierten Client deaktiviert; Codex benötigt zusätzliche persönliche lokale Anmeldung/Freigabe; kein erreichbares freigegebenes lokales Modell; Teamnutzung lokaler KI lokal gesperrt; Claude und Copilot laut produktiver UI noch nicht integriert. Der Wissensbereich ist leer. Dokumentdialog und Pflichtfeldvalidierung wurden geprüft; Speichern eines gemeinsamen Dokuments wurde wegen fehlender erkennbarer Pilot-Projektzuordnung nicht durchgeführt.

## Priorisierte nächste Schritte nach Wirkung und Aufwand

| Rang | Maßnahme | Wirkung | Aufwand |
|---|---|---|---|
| 1 | Geplanten echten Zwei-Personen-Pilot durchführen: Markus separat anmelden, Mac-Runner und eigene Projektkopie einrichten, gemeinsame Sichtbarkeit bestätigen. In diesem Audit ausdrücklich nicht ausgeführt. | Belegt das eigentliche Produktziel. | Mittel; Mitwirkung beider Personen nötig. |
| 2 | GitHub-App/Identitätsverbindung betreiberseitig einrichten und PR-Zuordnung, aktuellen Commit, erforderliche Reviews und CI im Studio verständlich sichtbar machen. | Schließt die größte Integrationslücke bis zur Freigabe. | Mittel bis hoch. |
| 3 | Persönliche Codex-Freigaben je Projekt/Person kontrolliert prüfen; erst danach einen eng begrenzten, separat genehmigten KI-Auftrag je Rechner ausführen. | Belegt tatsächliche gemeinsame KI-Entwicklung. | Mittel; Zugang und Freigabe erforderlich. |
| 4 | Runner-Start/Beenden und Node-Version klar führen; gewünschten dauerhaften Start mit Nutzer abstimmen und Reboot/Netzverlust testen. | Verhindert „Studio geht, Entwicklung geht nicht“. | Klein bis mittel. |
| 5 | B02 Fokusführung und B03 Review-Ladezustand beheben. | Tastaturbedienbarkeit und Vertrauen in Nachweise. | Klein bis mittel. |
| 6 | B01 Routerhistorie mit pushState/popstate sauber implementieren, mit Entwurfsschutz abstimmen. | Verhindert ungewolltes Verlassen des Studios. | Mittel. |
| 7 | B04/B05 und konsistente Status-/Rollenbezeichnungen verbessern; langfristig UI-Dateianlage und komfortablere Dokumentzuordnung ergänzen. | Weniger Bedienungsunsicherheit. | Klein bis mittel, Dateianlage separat größer. |
| 8 | Sichtbare Build-/Runner-Version, Diagnoseexport ohne Geheimnisse und kontrollierte Netzwerkaufzeichnung ergänzen. | Reproduzierbare Releaseabnahme und Support. | Klein bis mittel. |

Für die echte Zwei-Personen-Abnahme sind mindestens nötig: gemeinsame Aufgabe kommentieren, eigene getrennte Dateibereiche ändern, beide Tests/Vorschauen öffnen, gegenseitig den exakten Commit prüfen, Nacharbeit mit veralteter Freigabe testen und den GitHub-PR-Übergang kontrollieren. Push/Merge/Deployment benötigen weiterhin die jeweilige gesonderte Freigabe.

## Testgrenzen, Browserkonsole und Netzwerknachweise

Konsolenmeldungen wurden über die Browser-Diagnosefunktion gelesen und als JSON gesichert. Die abgefragten Sammlungen waren leer. Das bedeutet **keine in diesen Abfragen erfassten Konsolenmeldungen**, nicht den Beweis fehlerfreier sämtlicher Requests oder vollständiger Konsolenaufzeichnung über jede Navigation.

Der verfügbare Browserzugang bot DOM, Screenshots, Konsolenlogs und Viewports, aber keinen vollständigen Request-/Response-/HAR-Mitschnitt. Ein zusätzlicher Leseversuch auf Resource Timing war in der eingeschränkten Browserauswertung nicht verfügbar. Daher bleibt die vollständige Netzwerkprüfung **BLOCKED**. Für die fünf UI-Bugs ist kein konkreter fehlgeschlagener Netzwerkrequest nachgewiesen. Der kontrollierte Dateikonflikt ist ein erwarteter Runnerfehler, kein nachgewiesener HTTP-/Netzwerkausfall.

Die Automation meldete vereinzelt Locator-/CDP-Zeitüberschreitungen; Zustände wurden anschließend erneut gelesen. Beispielsweise war „Entwurf verwerfen“ trotz Tooltimeout erfolgreich. Diese Toolfehler wurden nicht ungeprüft als Produktfehler gezählt. Die Vollseitenaufnahme des Chats zeigte einen abweichenden Zuschnitt; die direkt geprüfte Viewportaufnahme war korrekt. Für mobile Chatbewertung daher `mobile-chat-viewport.jpg` verwenden.

Nicht abgenommen: Safari/Firefox, echter Mac/iPhone, Dauerlast, Netzunterbrechung unter Schreiblast, vollständige Barrierefreiheit, API-Rechteumgehung, Datenbankrestore, CI, neue Provideranmeldung und vollständiger Zwei-Personen-Workflow. Die vollständige Aufschlüsselung steht in [FUNCTION_MATRIX.md](FUNCTION_MATRIX.md).

## Hinterlassener Zustand und Artefakte

- Sechs Projekte und ein Konto erhalten; ein registrierter PC erhalten.
- Beide ursprünglichen Aufgaben behalten ihre ursprünglichen Zuständigkeiten/Status. Zusätzlich eine abgeschlossene, markierte QA-Aufgabe mit einem Kommentar.
- Eine gekennzeichnete Nachricht im Pilot-Projektraum.
- Ein gekennzeichneter Testkommentar am vorhandenen eigenen Review sowie ein Kommentar am neuen QA-Review.
- Neue QA-Arbeitskopie abgeschlossen, ihre Reservierung freigegeben. Lokaler QA-Branch und Prüfcommit bleiben nachvollziehbar erhalten; nichts gepusht.
- Neue Datei des QA-Prüfstands: `QA-AUDIT-2026-10-19/editor-check.md`. Die kurz in der ursprünglichen Kopie benötigte Testdatei wurde aus dem Index genommen und in `test-artifacts/` dieses Auditordners aufbewahrt.
- Ursprüngliche Pilotkopie sauber, HEAD weiterhin `3e6b305249cca00fd765a5f59ce9124b6661b48d`. Pilot-main unverändert `942b14b83df6b47f0870312c548d71023e38e277`. Studio-Source unverändert und sauber. Siehe `browser-logs/final-git-state.json`.
- Audit-Runner wieder beendet, keine neu registrierten Geräte, keine Berechtigungsänderung. Viewportoverride zurückgesetzt; Produktionsübersicht offen gelassen.

Dieser Ordner liegt außerhalb des Git-Repositorys. Er enthält Bericht, Fehlerliste, Funktionsmatrix, neue Screenshots, UI-Snapshots, Konsolenabfragen, lokale Umgebungsnachweise und eine Dateiprüfsummenliste. Vorschaukennungen sind in Textprotokollen redigiert; Zugangsdaten, Cookies und Auth-Tokens wurden nicht als Auditbelege exportiert.
