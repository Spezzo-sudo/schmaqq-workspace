# SCHMAQQ Studio — Fortsetzen ohne alten Chat

## 25.10.2026: R28 – ein Produkt, ein Pilot, Ideen geparkt

Die verbindliche nächste Arbeitsrichtung steht in [R28_PRODUCT_LINE_AND_PILOT.md](R28_PRODUCT_LINE_AND_PILOT.md); weitere analysierte Möglichkeiten sind unter [R28_IDEAS_PARKING_LOT.md](R28_IDEAS_PARKING_LOT.md) **nicht verloren, aber nicht beauftragt**. R28 ist in diesem Stand nur ein **Review-Entwurf der Produktentscheidung**, keine neue Runtime-Funktion.

Nordstern: **SCHMAQQ Workspace = gemeinsamer Projekt-/Wissensraum für Menschen. Studio = dessen Fachbereich für Coding.** Zunächst nur Marcos und Markus' getrennte ChatGPT-/Codex-Zugänge auf ihren freigegebenen persönlichen Runnern. Kein neuer Harness, keine heimliche Kontingentnutzung, kein gemeinsamer Provider-Login und keine doppelte Aufgabenverwaltung. Vorhandenes `AGENTS.md`, Projektziel und bestätigte Entscheidungen bilden selektiven Kontext statt ganzer Chats.

**Unmittelbarer nächster Beweis:** Marco lädt Markus im existierenden R27-Studio als echte zweite Person ein; beide arbeiten an einem echten kleinen Task im selben Projekt, verwenden persönliche Codex-Anmeldungen auf eigenen freigegebenen Rechnern, sehen realen Code-/Test-/Diff-Stand und führen einen gegenseitigen Review durch. Erst diese reale Abnahme bestimmt nötige UX- und Kontext-Korrekturen. Der letzte Betreiberbericht wies nur **ein** reales Studio-Mitglied aus; synthetische Zwei-Konto-Browserabnahmen ersetzen Markus' Anmeldung nicht.

**Betriebsfakt vor diesem R28-Dokument:** Hermes meldete R27_PRODUCTION=LIVE mit frischem, isoliert geprüftem SQLite-Backup/Restore und erhaltener R26-Binär-Rückfallebene. Release-Pointer, HTTPS-Asset und API-Grenze wurden separat kontrolliert. **H3_HISTORICAL_OWNER_MISMATCH ist weiterhin UNRESOLVED.** Die darunter folgenden R26/R27-Notizen beschreiben ihre damalige Kandidatenphase und sind nicht der neueste Produktionsstatus.

Keine Code-/DB-/Produktionsänderung, kein Merge und keine neue Authentifizierung durch diese reine Planungsübergabe.


## 25.10.2026: R27 – Designkonvergenz und gemeinsamer Git-Diff (noch nicht live)

Die bestehende SCHMAQQ-Website ist das verbindliche Designvorbild.
Die R27-Quelle fixiert das Marketing-Commit 92aad747 und übernimmt die
benutzten Farben, Schriften, Abstände und Linien statt weiterer freier
Workspace-Farben. In jedem Projektraum sind die Referenzen unter Wissen
sichtbar, die neuere V1-Markenrichtung bleibt als Entwurf gekennzeichnet.

Das bisher verborgene Git-Review zeigt jetzt **direkt in der Aufgabe**
einen vollständigen, taskgebundenen Diff mit grünen Ergänzungen, roten
Löschungen, Commit und Warnung vor möglicher Veraltung. Andere Personen
mit eigener Studiositzung können denselben *abgeschlossenen Prüfstand*
sehen; ungespeicherte Editor-Entwürfe und private Runnerinhalte werden
niemals dazu synchronisiert. Laufende Aufgaben zeigen die letzte
bestätigte Aktion (nur Typ/Status/Zeit) bei bestehendem 5-Sekunden-Poll.

Source-Prüfung: 190 Tests / 187 PASS / 0 FAIL / 3 erwartete Skips;
Source Guard, TypeScript und Vite PASS. Chrome: 8/8 isolierte checks
mit zwei synthetischen Konten, 390px-Handy, normalem Desktop, keinem
Seitenüberlauf und keinen ungefangenen Browser-Fehlern. Das Diff stammt
für den Browsernachweis aus ausdrücklich **synthetischen Fixture-Daten**.

**Kein** Live-Editing desselben Dokuments, keine WebSockets oder
Cursorübertragung, keine persönlichen Geräte/Accounts geprüft. R26
bleibt produktiv. H3-Historiengrenze bleibt offen.

[Design-/Diff-Plan](R27_DESIGN_AND_TEAM_DIFF.md) ·
[Browserbelege](evidence/R27_DESIGN_DIFF_ACCEPTANCE_20261025.md)


## 25.10.2026: R26 – Markus direkt in einer Aufgabe einladen

Die zuerst gebaute R26-Aufgabenansicht musste für den tatsächlichen
Single-Owner-Produktionszustand einen weiteren Navigationsbruch vermeiden.
Owner kann jetzt direkt unter „Mit dem Team“ eine **persönliche Einladung**
erzeugen, ohne den Aufgabenbereich zu verlassen. Single-use-Link mit
48 Stunden Laufzeit; kein SMTP-Versand, keine Konto-/Runner-Übernahme.

Echter isolierter Chrome-Lauf: ein synthetischer Owner startet ohne
zweites Konto, erstellt den Link, ein zweites eigenes Konto registriert
sich, Wiederverwendung des Links wird abgewiesen, der Owner übergibt
dieselbe Aufgabe und bekommt eine Antwort zurück. **7/7 PASS.**
Persönliche Registrierung von Markus und der lokale Git-Runner sind noch
nicht ausgeführt. R25-Produktion bleibt unverändert.

[Onboarding-Runbook](R26_REAL_TEAM_ONBOARDING.md).


## 25.10.2026: R26 – ein einziger Aufgabenablauf (Review-Kandidat)

Die tatsächliche Handy-Bedienung von R25 war trotz erfolgreicher Integration
zu technisch und tablastig. R26 entfernt die vier Pflicht-Reiter aus der Aufgabe
und verbindet Auftrag, tatsächlichen Arbeitsstatus, Übergabe an Teammitglied,
optionale persönliche Git-/KI-Ausführung, Ergebnis und Gespräch auf einer
scrollbaren Seite. Direkt im Raum werden die nächsten Aufgaben gezeigt.

Neue API-Aktionen `handoff` (atomare erwartete Zuständigkeit, kein vorgetäuschter
Job) und `brief` (revisionierte Änderung in bestehender workspace_meta).
Task-Kommentare, Git-Berechtigungen, persönliche Modellfreigaben und bisherige
R25-Daten bleiben erhalten. Kein Datenbankschema-Migrationsschritt.

Source-Gesamtcheck: 190 Tests, 187 PASS, 0 FAIL, 3 erwartete Linux-Skips.
Chrome-Browser mit zwei synthetischen Konten, echtem isoliertem Git-Runner und
390px-Handy: 13/13 PASS; keine Browser-Ausnahmen. Ein zuvor beobachteter
doppelter Editor wurde korrigiert und anschliessend neu geprüft. Kein reales
Markus-Gerät, kein echtes privates KI-Abo und keine automatisierte GitHub-
Einrichtung wurden behauptet oder angetastet.

R25 bleibt bis zum gesondert freigegebenen Deployment produktiv; der
R26-Branch ist ein überprüfbarer Kandidat und **noch nicht live**.

[Detaillierter Scope](R26_TASK_FLOW.md) ·
[Browser-Abnahme](evidence/R26_TASK_FLOW_ACCEPTANCE_20261025.md).


## 25.10.2026: R25 Workspace Rooms – zusammenhängender Arbeitsweg

Eigener Engineering-Branch `feat/workspace-rooms-r25-20261025`, auf der
PR38-Linie statt ungeprüftem main. Neue normale Oberfläche ist der Projektraum:
Raumgespräch, Aufgaben, Ergebnisse, Wissen und Code/KI gehören zusammen.
Projektanlage am Handy verlangt keinen Rechnerpfad. Nachrichten lassen sich
mit Herkunft in Aufgaben und Entscheidungen überführen. Zwei Benutzer können
an derselben Aufgabe diskutieren; Code-Arbeitskopien und Prüfrechte bleiben
personengetrennt. Kontext für Codex wird sichtbar und optional mitgegeben.

Lokale Textmodelle verwenden bestehende persönliche Freigaben des Rechner-
besitzers. Eine Antwort ist zuerst privat für Auftraggeber und Gerätebesitzer;
der Auftraggeber teilt sie ausdrücklich im Raum. ChatGPT/GitHub-Verweise
werden nicht als automatisch synchronisierte Chats oder geklonte Repos ausgegeben.

Source-Gesamtcheck: 188 Tests, 185 PASS, 0 FAIL, 3 erwartete Skips; TypeScript,
Vite, Source Guard PASS. Source-Chromium-Pilot: 22 Punkte, echte isolierte
Git-Arbeitskopie/Runner/Datei/Tests/Vorschau und Zweitprüfung. Modelloutput im
Pilot ist synthetisch; persönliche Accounts/Hardware bleiben ungeprüft.
Der abschliessende Prüflauf am unveränderten Release wird im privaten
Handoff und PR dokumentiert. Kein Merge, Deployment oder Production-Mutation.

[Produkt und Abzweigungen](WORKSPACE_ROOMS.md) ·
[Abnahme](evidence/WORKSPACE_R25_ACCEPTANCE_20261025.md) ·
[Betreiberübergabe](HERMES_R25_ROOMS_HANDOFF.md).


## 25.10.2026: Zod-Lücke im Recovery-Kandidaten gezielt adressiert

Zod 3.25.76 durch 4.6.7 ersetzt, record-Schnittstelle migriert und
Runner-Preview-Dateizahl vor Zod geprüft. Studio-Gesamtsuite, gezielte
Runner-HTTP-Regressionen und unabhängiger Audit bestätigen: der frühere
Zod-HIGH-Befund entfällt. Fünf Warnungen für nicht im separaten Studio-Runtime-
Paket enthaltene Monorepo-Abhängigkeiten bleiben bestehen. Keine Production-
Änderung. SMTP-Betreiberkonfiguration und echte Mail-/Browser-End-to-End-
Freigabe sind weiterhin offen. Siehe PASSWORD_RECOVERY_SECURITY.md.

## 25.10.2026: Sicherheitsfunktion „Passwort vergessen“ – isolierter Kandidat

Auf eigenem Review-Branch auf der unveränderten produktiven R24-Quelle: Einmalige
15-Minuten-Links über ausschliesslich TLS-geschützten, operator-konfigurierten
SMTP-Versand. SHA256 statt Roh-Token in der vorhandenen workspace_meta-Tabelle,
kein neues Schema, neutrale Anfrageantworten, Rate-Limits und atomarer Widerruf
aller Studio-Sitzungen/Gerätetokens beim Passwortwechsel. Anmeldung, Bearbeitung
und vorhandene Konten bleiben bis zu einer separaten Deploymentfreigabe unverändert.

Die Betreiber-Konfiguration für die SCHMAQQ-Absenderdomain und ein echter
Postfachempfang stehen noch aus. Test- und Sicherheitsumfang sowie Grenzen:
[Passwort-Wiederherstellung](PASSWORD_RECOVERY_SECURITY.md).


## 24.10.2026: Navigation, Vorschau und verständliche Rückwege

Der vorherige persönliche Test war für den Owner nicht selbständig bedienbar.
Mit aktuellem Owner-Auftrag wurde deshalb die Struktur auf fünf Haupteinstiege
plus „So funktioniert Studio“ ausgerichtet. Team-Gespräch/Wissen liegen bei Team,
Einrichtung/Verbindungen/technische Werkzeuge unter einem gemeinsamen Einstieg.
Bestehende Direktlinks bleiben gültig. Einladungen liegen jetzt bei Team und
nutzen unverändert die geschützte Eigentümer-Schnittstelle.

Aufgaben haben einen erklärten Startknopf, sichtbares Ziel und eigene Reiter für
Bearbeitung, Vorschau, Ergebnis & Prüfung, Gespräch und Verlauf. Aktionen nennen
vorher ihre Wirkung. Vorherige Dateifassung kann nach einem erfolgreichen Save
zuerst als Entwurf geladen werden; erst ein erneuter Save schreibt, mit dem
bestehenden Revisions-/Konfliktschutz. Anleitung benennt die Grenzen ausdrücklich.

Selbst ausgeführt: lokaler Gesamtcheck 151 PASS, 0 FAIL, 21 Linux-Skips;
Source Guard/TypeScript/Build PASS. Nach letzter reiner Vorschau-Textkorrektur
8 gezielte Tests und TypeScript/Build erneut PASS. Eigene interaktive Browser-
prüfung auf 1280x900 und 390x844: echter Start, Save, Entwurferhalt über Hilfe,
Dateirückweg, Diff, Tests, gebaute Vorschau und lokaler Prüfstand. Neue Konten,
Einladungen, KI-Ausführung, Peer-Freigabe und Git-Übertragung nicht ausgeführt.
[Arbeitsauftrag, Abnahme und Grenzen](evidence/UX_NAVIGATION_20261024.md).

Lokaler Branch: `local/studio-navigation-20261024`. Kein Push/Deployment.
Nächster Schritt ist die erneute selbständige Bedienabnahme durch den Owner.
Technische Erstverbindung, vollständige Projektwiederherstellung und automatische
Übergabe des Aufgaben-/Gesprächskontexts an Codex sind damit noch nicht gelöst.
Der vorhandene isolierte Probelauf auf 127.0.0.1:4394/4395 bleibt für die Auswertung
erreichbar, mit bestehendem privaten Profil (KI und Git-Veröffentlichung gesperrt).




## 23.10.2026: Aufgabenorientierung E1–E8 lokal umgesetzt und geprüft

Der freie Rundgang wurde mit Owner-GO umgesetzt: Aufgabenmodus strikt an passende
Kopien gebunden, historische Prüfstände mit deutlicher Aktualitätswarnung,
Speichern vor Prüfen auch in der Kopfzeile, stabile Reiter-/Dialogrückwege,
einheitlicher Einstieg über Aufgabentitel aus Übersicht, Board und Teamkarte.
Einrichtung führt zu Aufgaben; projektweite Funktionen bleiben unter „Weitere
Werkzeuge“. Ziel, Metadaten und Hilfen aufklappbar, nur eine Speicherleiste.

Selbst ausgeführt: finaler lokaler Gesamtcheck 147 PASS, 0 FAIL, 21 Linux-Skips;
Source Guard/TypeScript/Build PASS. Zusätzlich interaktiver eigener Browserlauf
auf 1280x900 und 390x844 mit bestehenden Testidentitäten: echter Dateisave,
Testlauf, gebaute Vorschau und lokaler Prüfstand; Entwurf und Reiter erhalten,
Warnung vor historischer Freigabe auch nach neuerem Prüfstand korrekt. Editor
im gemessenen Bearbeitungszustand ab ca. 689 statt 1239 px. Details, Testanläufe,
Grenzen und Abnahme: [Aufgabenorientierung](evidence/UX_ORIENTATION_20261023.md).
Der frühere Audit unten bleibt als Befund vor diesen Korrekturen erhalten.

Nächster Schritt: Owner führt eine kleine Aufgabe ohne Klickanweisungen aus und
nimmt sie später wieder auf. E9 Einladungsverwaltung und E10 Anmeldung bleiben
separat; Ersteinrichtung/Kopienanlage weiterhin technisch. Keine unabhängige
menschliche Bedienfreigabe, keine Linux-/Betriebsfreigabe. Kein Push/Deployment.

## 23.10.2026: freier UX-Rundgang – Bedienabnahme weiterhin offen

Nach dem technischen P1-Abschluss wurde die Oberfläche persönlich über die
interaktive Browsersteuerung erkundet (kein vorgegebenes Ablaufskript).
Dabei wurden Aufgaben-/Kopien-Kontextfehler, fehlende Aktualitätswarnung im
historischen Prüfstand und weitere Orientierungsbrüche beobachtet. Prioritäten,
Reproduktion und Screenshotverweise: [Freier UX-Rundgang](evidence/UX_EXPLORATORY_REVIEW_20261023.md).
Kein Produktcode geändert. Nächster Schritt zuerst Aufgabenbindung und historische
Prüfstandsdarstellung; die technische P1-Abnahme ist keine vollständige UX-Freigabe.

## 23.10.2026: vier P1-Korrekturen nach dem UX-Umbau abgeschlossen

Auf `local/studio-a0-terms-20261023` wurden die zwei übernommenen uncommitteten
Korrekturen vervollständigt und zwei fehlende Wege ergänzt: Prüfstand zählt als
tatsächlicher revisionsgebundener Testlauf; Kopfzeile und Ergebnis kennen dieselbe
Vorschaufähigkeit; angeforderte Änderungen erscheinen direkt bei der Aufgabe mit
Link zum exakten Prüfstand; wartende aktuelle Fremdprüfstände stehen auf der
Startseite. Bestehende Berechtigungen und getrennte Veröffentlichungsaktionen
bleiben erhalten. Kein Push, Merge, Deployment oder Eingriff am VPS.

Selbst ausgeführt: lokaler Gesamtcheck 143 PASS, 0 FAIL, 21 Linux-Skips,
Source Guard/TypeScript/Build PASS. Sichtbarer Zwei-Rollen-Edge-Test mit echten
lokalen Jobs bei 1280/390px PASS, nach Diagnose einer alten Reservierung in der
isolierten Testkopie. Eigene Prozesse beendet, ursprüngliche Testdaten per Hash
unverändert. Nachweis und Grenzen: [UX-P1-Abschluss](evidence/UX_P1_COMPLETION_20261023.md).
Historische Statusfelder weiter unten sind keine neu ausgeführten Tests.

Damals vorgesehener nächster Schritt: Owner wiederholt eine kleine Aufgabe ohne
Klickanweisungen. Nach dem oben dokumentierten freien Rundgang zuerst dessen
P1-Fundstellen beheben; der menschliche Wiederholungstest bleibt danach offen.
Die technische Abnahme ersetzt diese noch offene Bedienabnahme nicht.

## Aktuell: Produktkandidat für GitHub und neuen Chat

Die Produktänderungen liegen zusätzlich in `../schmaqq-studio-use-candidate`
auf `local/studio-use-candidate-20261022`. Originalarbeitsverzeichnis und Index
wurden erhalten. Das Paket enthält Produktoberfläche, Windows-Portabilität,
feste Tests und zugehörige Dokumentation; keine neuen Qwen-/Modell-/Browserhelfer.
Eine `node_modules`-Junction verwendet die bereits vorhandenen Abhängigkeiten.

Tatsächlich neu geprüft: lokale Gesamtprüfung 100 PASS, 0 FAIL, 21 ausdrücklich
als Linux-spezifisch ausgelassene Tests, Source Guard, TypeScript und Build PASS.
Sichtbarer frischer Edge-Lauf mit synthetischen Daten: 7 Schritte PASS, Desktop
und 390px Mobilbreite, keine Browserfehler, eigene Prozesse beendet. Der erste
Browserversuch lief vor Fertigstellung des Builds und schlug deshalb fehl;
Sandbox-Prozessbereinigung war gesperrt. Der eigene Prozess wurde gezielt
beendet. Die Gesamtprüfung wurde nach Diagnose des blockierten Prozess-Tests
mit lokalen Prozessrechten wiederholt; Git-Ausnahme galt nur im Testprozess.
Globale Git-Konfiguration wurde nicht geändert.

Vergleich mit dem tatsächlich durchgespielten Zwei-Host-Snapshot: 44/44
Laufzeitmodule und 8/8 gebaute Oberflächendateien bytegleich. Das ersetzt keinen
Linux-Release-/Recovery-Nachweis für ein neu gebautes Archiv. Der Owner hat
die GitHub-Sicherung des eigenen Kandidatenbranches ausdrücklich beauftragt.
Die Commit-Metadaten werden über das angemeldete GitHub-Konto gesetzt.
Einstieg: [START_HERE.md](../START_HERE.md); portable Testzusammenfassung:
[evidence/USE_CANDIDATE_20261022.json](evidence/USE_CANDIDATE_20261022.json).
Der Branch ist kein Live-Release; kein Merge oder Dienstwechsel daraus.

Der konkrete Weg zum Alltag steht in [GETTING_TO_DAILY_USE.md](GETTING_TO_DAILY_USE.md).
Nächste Schritte: Kandidaten festhalten, persönliche Projekt-/Runner-Einrichtung,
eine echte Aufgabe mit Tests, Vorschau und Wiederaufnahme vollständig erledigen.
GitHub-Vollintegration und dauerhafte zentrale Prüfung bleiben eigene Pakete.
Lokale Originalnachweise: `.studio/use-candidate-20261022/` im ursprünglichen
Repository. Die externe Arbeitsbasis ist hier nicht beschreibbar; diese Notiz
ist ein Vorschlag zur späteren geprüften Übernahme, keine automatische Ablage.

## Aktuell: Zwei-Host-Pilot technisch bestanden

Nach ausdrücklicher Freigabe des dokumentierten Payloads/Ziels wurde der aktuelle
diagnostische Snapshot auf dem VPS verifiziert und isoliert getestet. Sichtbarer
Edge mit zwei Testkonten; tatsächliche Runner auf Windows-Laptop und Linux-VPS.
Aufgabenübernahme, Rückfragen, eigene verknüpfte Kopien, Edit/Save, gleichzeitig
laufende echte Checks, gebaute Vorschauen und gegenseitige Commitfreigaben PASS.
Überschneidung, fremder Geräteauftrag und Selbstfreigabe abgewiesen. Neuer Commit
verlangt neue Freigabe. Offline-/Reconnect-Test erhält Gerät, Kopie und Datei.

Der Lauf wurde nach Korrekturen am Testablauf fortgesetzt; kein fehlerfreier
Einzellauf behauptet. Zwei anfänglich unverknüpfte Fixture-Kopien sind archiviert
erhalten, die zwei aktiven Kopien nachweislich mit den Aufgaben verknüpft. Details
und Originalbelege in [TWO_HOST_PILOT_PLAN.md](TWO_HOST_PILOT_PLAN.md).

Alle eigenen Testprozesse und Tunnel beendet, lokale und entfernte Testports
geschlossen, temporärer SSH-Zugang und lokale Schlüssel entfernt. Production
unverändert auf R23, active/running, NRestarts=0. Keine Modelljobs, kein Push,
Merge oder Production-Deployment. Markus/macOS ist für diesen technischen
Nachweis kein Blocker. Offen bleiben persönliche Alltagsabnahme und die separate
Konsolidierung/Freigabe eines tatsächlichen Nutzungskandidaten aus dem Dirty-Stand.

## Aktuell: Hilfe bei fehlender Git-Autorenidentität

Ein abgeschlossener Git-Check mit fehlender lokaler Identität zeigt jetzt eine
konkrete Anleitung mit kopierbaren `git -C ... config --local`-Befehlen. Pfad,
Name und E-Mail bleiben bewusst vom Nutzer einzutragen; der Unterordner
`repository` beim lokalen Startprojekt wird erklärt. Erneute Prüfung bleibt an
Projekt/PC des angezeigten eigenen Auftrags gebunden; offline oder bei laufendem
Auftrag ist der Knopf gesperrt. Kein automatischer Konfigurationsschreibzugriff.

Lokale Gesamtprüfung: 121 Backendtests, 100 PASS, 0 FAIL, 21 explizite Plattform-
Skips; Source Guard, TypeScript und Build PASS. Sichtbarer isolierter Edge-Test:
fehlende Identität, Kopieren, tatsächliche lokale Befehlsausführung, erfolgreicher
erneuter Check, ausgeblendete Hilfe und aktualisierte Bereitschaft PASS. Desktop
1440 und Mobil 390 geprüft. Windows-CRLF im Clipboard-Test berücksichtigt.
Keine persönlichen Runner oder globalen Git-Einstellungen geändert. Belege im
[Abnahmebericht](evidence/LOCAL_PROJECT_START_20261022.md#git-autorenhilfe).

## Aktuell: lokaler Projektstart verständlicher fortsetzen

Die geführte Einrichtung erklärt nach dem Plan-Download jetzt die drei lokalen
Schritte, benennt Quellordner und vorhandenes Runnerprofil, bietet Kopierknöpfe
für Einrichtungs- und Neustartbefehl und verweist erst danach auf Bereitschaft und
Git-Lesecheck. Gezielt zuvor geprüft: Projektstart-API 2/2, TypeScript und Build PASS.
Am 22.10.2026 anschließend vollständig mit neuen isolierten Testdaten geprüft:
Browser-Projektstart und echter Plan-Download, Helfer-CLI, Profilsicherung,
Runnerneustart mit demselben Gerätezugang, Arbeitskopie, Edit/Save, echter Test
(1 PASS, 0 FAIL) und gebaute Vorschau derselben Dateirevision. Sichtbarer Edge,
1440/390px; eigene Prozesse beendet. Der Ablauf wurde nach Test-/Umgebungsfehlern
fortgesetzt, kein fehlerfreier Einzellauf. Fehlende Git-Identität wird korrekt als
nicht bereit angezeigt; nur das neue Testrepository erhielt lokale Autorenangaben.
Persönliche Runner und Production unverändert. Belege und Grenzen:
[Lokaler Projektstart](evidence/LOCAL_PROJECT_START_20261022.md).

## Aktuell: automatischer Testauftrag mit direkter Abschlussmeldung

`scripts/local_browser_standalone.py --enable-ai --job` als direkten Prozess
ausführen und dessen Ende abwarten. Eine kompakte JSON-Werkzeugantwort und
`completion.json` liefern Erfolg/Fehler/Schrittgrenze/Zeitgrenze/Abbruch mit
entsprechendem Exitcode. Automatisches Fenster schließt; manueller --keep-open-
Modus bleibt getrennt. Kein neuer MCP-Dienst. 27 gezielte Prüfungen bestanden.
Zusätzlicher Befund der sichtbaren Wiederholung: Git-Besitzerabweichung zwischen
Sandbox-/Benutzerkonto blockierte die alte synthetische Arbeitskopie. Nur die
ignorierte isolierte Fixture erhält prozessbezogene Freigaben für ihre zwei
Testkopien; globale Einstellungen unverändert. Sichtbare Editorfehler werden
jetzt unmittelbar gemeldet (APPLICATION_ERROR), statt Qwen weiter warten zu lassen.
Beobachtete Navigationsschleife durch phasenabhängige Klickgrenzen verhindert;
keine Behauptung allgemeiner Qwen-Zuverlässigkeit. Anleitung:
[Lokaler Browserhelfer](LOCAL_BROWSER_HELPER.md).

## Aktuell: eigenständiges lokales Qwen-Browserfenster

Begrenzte Messung ergänzt: drei echte Wiederholungen PASS in 21–27 Sekunden,
5/6/5 lokale Modellaufrufe, GPU-Spitzen 99/100/100 Prozent (71 Messpunkte).
Starter `../Qwen-Browsertest-Messen.cmd`, Bericht und Roh-CSV unter
`.studio/local-intelligence/browser-measurements/20261022T142042432815Z-800f9cbf/`.
Ein redundantes Dateiladen bleibt sichtbar; keine allgemeine Browserkompetenz
oder gemessene Abo-Prozentersparnis daraus ableiten.

`../Qwen-Browsertest.cmd` verwendet `scripts/local_browser_standalone.py` mit
vorhandener Playwright-/Edge-Installation und lokalem Qwen. Keine CUA-/Codex-
Sitzung im Testprogramm nötig. Begrenzter lesender Fall auf synthetischer Demo
Port 4360, eigenes flüchtiges Browserprofil. Berichte liegen im ausgegebenen
`.studio/local-intelligence/browser/<Lauf>/report.md`. Kein allgemeiner
Browseragent und keine gemessene Prozentersparnis. Siehe den neuen Einstieg in
[Lokaler Browserhelfer](LOCAL_BROWSER_HELPER.md).

## Aktuell: begrenzter lokaler Qwen-Browserhelfer

Qwen hat in einer aktiven CUA-Sitzung fünf echte Navigationsentscheidungen bis
zum sichtbaren Datei-Editor selbst gewählt; Route und Ergebnis unabhängig geprüft.
Dateibrücke und Executor sind in `scripts/local_browser_worker.py` und
`scripts/local_browser_bridge.mjs`. Nur synthetische Demo auf Port 4360, lesender
fester Fall, kein eigenständiger Browserdienst. Screenshots als Beleg, separate
lokale Bildbeschreibung; keine allgemeine visuelle Steuerung oder Limitersparnis
behaupten. Anleitung und Grenzen: [Lokaler Browserhelfer](LOCAL_BROWSER_HELPER.md).

## Aktuell: erster echter Entwicklungsdurchlauf mit Qwen-Vorauswertung

Lokale Hürde im Ablauf Aufgabe → eigene Kopie → Änderung prüfen behoben:
Ansichtswechsel beginnen oben; „Dateien bearbeiten“ führt vom Arbeitsbereich
direkt zum Editor und fokussiert den vorhandenen Ladebutton. Auch „Weiterarbeiten“
an einer eigenen Kopie springt zum Editor. Dateiaufträge bleiben ausdrücklich.
Keine Backend-/Berechtigungsänderung und keine automatische Veröffentlichung.

Mit einer neu angelegten isolierten Demo sichtbar durchlaufen: Aufgabe wählen,
eigene Kopie, Datei laden/öffnen, Entwurf beim Bereichswechsel erhalten, speichern,
echte Beispieltests und gebaute Vorschau. Desktop 1280 und Mobil 390 geprüft,
kein horizontaler Überlauf. Qwen-Bildaussagen wurden gegen UI und Source geprüft;
die falsche Deutung des Suchfilters als Pflichtpfad wurde verworfen.
Abnahme und Grenzen: [Lokaler Workflow-Einstieg](evidence/LOCAL_WORKFLOW_ENTRY_20261022.md).
Nächster Entwicklungsschritt: verbleibende S2-Bereitschaft und S3-PR-Übergang anhand
des vorhandenen Plans konkretisieren; kein Provider-/Serverauftrag daraus ableiten.

## Aktuell: Qwen3.5 als lokaler Standard

Am 22.10.2026 ausdrücklich freigegebene Modelltests: Qwen3.5 9B Q4_K_M mit
Ollama v0.30.0 funktioniert für begrenzte Text-, Code- und Bildaufgaben. Standard
in `config/local-intelligence.json`; Lifecycle und alter Checkhelfer lesen dieselbe
Auswahl. Höchstens ein geladenes Modell, keine automatische Inferenz oder Autostart.
`Start-Lokale-KI.cmd` wählt die neue separate Laufzeit; Alternativen bleiben Dateien.

Der Windows-Absturz war in der systemweiten C++-Bibliothek `msvcp140.dll` verortet.
Lokale, zum selben offiziellen Archiv gehörende MSVC-DLLs neben `llama-server.exe`
beheben den reproduzierten Startfehler. Keine Systembibliothek geändert. Installer
und Hashnachweise bilden die lokale Ergänzung ab; eigene Controller-Kinder öffnen
bei nativen Abstürzen keine Fehlerdialoge mehr, melden aber weiterhin Fehler.
v0.17.5 passt nicht zum aktuellen getrennten Qwen3.5-Modell/Projektor-Format.

42 gezielte Regressionen PASS. Drei echte synthetische Modellfälle PASS,
einschließlich Bildtext/Statusfarben und leerem Array; zusätzlich echter übergebener
Absturz-Screenshot über `image --enable-ai` ausgelesen. Antworten bleiben UNREVIEWED:
der kleine Codefall zeigt teils unpräzise Erläuterungen trotz korrekter Kernkorrektur.
Kein umfassender Vergleich, keine Aussage über fehlerfreie Codequalität.
Nachweise und Bedienung: [Local Intelligence](LOCAL_INTELLIGENCE.md).
Abschlussbeleg im übergeordneten Arbeitsbereich:
`local-evidence/2026-10-22_Qwen35-Einrichtung.json`.

## Vorbereitungsstand vor der Modellfreigabe (historisch)

Neuer opt-in Ablauf mit `Studio-Bereitschaft.cmd`, `Studio-Kontext.cmd`,
`Studio-Workflow.cmd` und `Studio-Fehler-Auswerten.cmd`. Echte Prüfungen bleiben
im vorhandenen Helfer; ergänzende Hypothesen verändern dessen Exitcode nicht.
KI standardmässig deaktiviert. Vergleichsmodelle und separate Runtime werden nur
durch den ausdrücklich gestarteten Dateidownload eingerichtet. Keine heutigen
Modell-/GPU-/Studio-Testläufe daraus ableiten. Anleitung und manuelle Abnahme:
[Local Intelligence](LOCAL_INTELLIGENCE.md).

Am 22.10.2026 wurde der neue Ablauf ohne LLM geprüft: 11 eigene und 21 bestehende
Helfer-Regressionen PASS; echte Python-Unterprozesse mit synthetischem Erfolg und
absichtlichem Fehler behielten Exitcodes 0/1 bis zum Zusatzbericht. Kontextpaket
und Originalquellenvalidierung PASS. Dabei wurden zwei Logmaskierungsfehler
behoben: vollständig maskierte zitierte/JSON-Credentials und erhaltene Logzeilen
bei mehrzeiligen Schlüsselblöcken. Wiederholen ohne Modelle:
`../.local-tools/python/python.exe -B scripts/verify_local_intelligence.py`.
Dies ist keine Studio-Produkt-, Build-, GPU- oder Modellqualitätsabnahme.

Danach am 22.10.2026 echter Windows-Studio-Prüflauf ohne LLM: Source Guard PASS,
121 Backendtests (100 PASS, 0 FAIL, 21 begründete Skips), TypeScript und Build PASS,
originaler Exitcode 0, erfasster Quellstand während des Laufs unverändert.
Die Sandbox behinderte den Prozessabbruchtest; außerhalb der Sandbox bestanden
zuerst dessen 3 Prüfungen und anschließend der volle lokale Ablauf. Der neue
synthetische PEM-Test wird zur Laufzeit zusammengesetzt, damit der Secret-Scanner
keinen Schlüsselkopf im Quelltext sieht; Schutzregeln unverändert. Nach dem Lauf
unterstützt der Zusatzreport auch Node-Spec-Testzahlen (12 Python-Regressionen PASS,
Original-Log erneut verarbeitet). Keine Änderung an Backend-/Frontend-Quellen.
Nachweis: `.studio/local-checks/20261022T073825Z-e7d7cda027bc4a21b291b7e858dd0805/summary.json`.
Linux-Operator, Browser und Modellqualität bleiben getrennt ungeprüft.

## Lokaler Windows-Prüfweg und Modellhelfer

Für wiederholbare lokale Prüfungen `npm.cmd run studio:check:local` verwenden.
Der Helfer sammelt Logs, Exitcodes und den erfassten Quellstand unter
`.studio/local-checks/`. Der lokale Qwen2.5-Coder-14B-Helfer kann ein ausgewähltes
älteres Fehlerlog parallel zu einem Testjob oder zur Codex-Arbeit analysieren;
seine Ausgabe bleibt `UNREVIEWED`, echte Testresultate gelten separat.
Aufrufe, Installation und Grenzen: [Lokale Checks und LLM](LOCAL_CHECKS_AND_LLM.md).
Feste Tests brauchen keine Modellaufrufe. Bei schwierigen/umfangreichen Logs
zuerst eine begrenzte lokale Vorauswertung erwägen und deren Aussagen prüfen.
Keine Änderung persönlicher Runnerprofile oder Live-Anbindung daraus ableiten.
Windows-PASS ersetzt weiterhin keinen Linux-Operator- oder Release-Nachweis.

Wir bauen eine echte gemeinsame Entwicklungsumgebung für Marco in der Schweiz
und Markus in Thailand. Beide verwenden ihre eigenen ChatGPT-Konten. GitHub
bewahrt Code und Review; der vorhandene Hostinger-VPS betreibt bereits
den geprüften Kollaborationskandidaten. Der Heim-PC soll dafür nicht ständig laufen müssen.


## Langfristiges Produktbild (separat vom heutigen Status)

Workspace ist die universelle Arbeitsplattform für Menschen und Agenten; Studio ist der erste Bereich. Freiwilliges Peer-Compute und Monetarisierung sind spätere, sicherheitskritische Entwicklungsphasen. Vor Architektur-/Produktarbeit [Produktvision](PRODUCT_VISION.md), [Zielarchitektur](ARCHITECTURE.md), [Roadmap](ROADMAP.md) und [Integrationsgrenzen](INTEGRATION_BOUNDARIES.md) lesen. **Nur** [STATUS.json](STATUS.json) enthält den aktuellen technischen Fähigkeitsnachweis. Plattform-Repo und dessen Runtime bleiben unabhängig.

## Aktiver Umsetzungsplan vom 18.10.2026

Owner hat nach dem dokumentierten Plan die schrittweise Codearbeit beauftragt.
Maßgeblich ist jetzt die S1–S5-Reihenfolge in [ROADMAP.md](ROADMAP.md):
Änderungsansicht → Projektstart/Bereitschaft → GitHub-Verknüpfung → isolierte
Linux-Prüfung → echter Zwei-Personen-Pilot und kontrollierter Release.
Die nachfolgenden älteren P-/R-Prioritäten sind Hintergrund, keine parallelen Aufträge.

Erster begrenzter Teil von S1 lokal umgesetzt: change-overview in selfhost/app
verbindet bestehende Aufgaben/Kopien mit letztem Test, Vorschau, Review und
Veröffentlichung. Metadaten ohne private Jobinhalte. Eigene/Team-Aktionen getrennt,
Projektauswahl nach Reload erhalten. Vollprüfung 20 PASS, 1 POSIX-SKIP, 0 FAIL,
TypeScript/Build/Guard PASS; zwei Browserkonten und drei Breiten geprüft.
Noch nicht deployed. Details im S1-Abschnitt von evidence/OVERNIGHT_ACCEPTANCE.md.

S1 inzwischen erweitert und lokal abgenommen: source-revision bindet Tests,
statische Build-Vorschauen und Reviews an versionierte/nicht ignorierte Quelldateien.
Vor-/Nachabgleich erkennt instabile Läufe. Eigene Aktion Dateistand abgleichen
verwendet einen Statusjob; Unterschiede zu extern bearbeiteten Dateien werden
sichtbar. Keine dauerhafte Überwachung, keine Aussage über ignorierte Dependencies
oder Umgebung. Fallback bei alten Runnern, Links, sensiblen Pfaden oder Größenlimits:
unbestätigt. Erst aktualisierte Runner liefern neue Nachweise; Live-Runner unverändert.

Änderungstyp und Beschreibung liegen additiv in change_notes. Nur Eigentümer der
Kopie darf ändern; Stale-Save 409 erhält Entwurf. Team kann lesen. Server-/Runnerpakete
um neue Abhängigkeiten ergänzt, lokaler Release-Smoke und Paketimport PASS.
Letzte Vollprüfung: 21 PASS, 1 POSIX-SKIP, 0 FAIL, TypeScript/Build/Guard PASS.
Zwei Browserkonten, externer Edit/Restore, geteilter Text, Konflikt und drei Breiten
geprüft. Noch nicht deployed. Details im letzten Abschnitt des Abnahmeberichts.

S2 ist nun auf eigenem gestapeltem Branch `feat/studio-project-start` lokal geprüft
(Basis bleibt der bestehende Kandidat, kein Merge nach main). Neuer geführter Start
für vorhandenes Repo oder lokales Startprojekt, privater Plan und lokaler Helfer
mit Profilsicherung und Wiederverwendung des Zugangs. KI/Publish für neue Projekte
gesperrt; Online/Projekt/Git/KI/Veröffentlichung getrennt. Additive Tabellen
project_starts und runner_project_state, keine vorhandenen Spalten/Zeilen ersetzt.
24 Tests: 23 PASS, 1 POSIX-SKIP; TypeScript/Build/Guard PASS. Echter sichtbarer
Fixture-Ablauf inklusive neuer Kopie, Edit/Save, 1/1 Test und geänderter statischer
Vorschau PASS; 390/1024/1440px ohne Seitenüberlauf. Ausgepackter Runtime-Smoke PASS.
Nachweis: letzter S2-Abschnitt in evidence/OVERNIGHT_ACCEPTANCE.md.

Verbleibende Einstiegshürde: Plan einmal lokal mit project-setup.mjs anwenden und
bestehenden Runner neu starten; kein Ein-Klick-Installer. Der beschränkte Pilotstarter
akzeptiert weiterhin nur sein Pilotprojekt; ergänzte Profile explizit mit runner.mjs
starten. Ein neues lokales Startprojekt hat noch kein externes gemeinsames Remote.
Nicht deployed, persönlicher Live-Runner unverändert, kein KI-Auftrag oder Actions-Lauf.
Nächstes Paket S3: GitHub-Verknüpfung/PR-Übergang; Mac/Fernpilot bleibt S5.

## Aktueller Abschluss der begrenzten technischen Abnahme

Die Matrix ist eingeordnet: docs/evidence/OVERNIGHT_ACCEPTANCE.md. Vier lokale
Korrekturen sind geprüft: Dateijob-Eventzugriff, Dialogfokus, sofortige Freigabe
nach Jobabschluss und dauerhafte Wissenskonfliktwarnung. Vollprüfung nach Fixes:
19 PASS, 1 POSIX-SKIP, 0 FAIL, TypeScript/Build/Source Guard PASS. Acht Hauptansichten
bei drei Breiten ohne Seitenüberlauf. Noch nicht deployed. Keine unveränderten
Tests erneut starten. Nächste Produktarbeit: PR-Übergang, Runner-Freigabeführung
und komfortable Wissenskonfliktauflösung; kein neuer KI-Job oder Live-Eingriff.

## Ursprünglicher autonomer Testauftrag

Owner hat eine stündliche lokale Fortsetzung dieses Chats für die technische Abnahme
beauftragt. Endliche Matrix und Grenzen: `docs/OVERNIGHT_TEST_ORDER.md`. Fortschritt:
`docs/evidence/OVERNIGHT_ACCEPTANCE.md`. Vollständige Suite jetzt PASS: 19 bestanden,
1 Windows-bedingter POSIX-Skip, TypeScript/Build PASS. Nächste Arbeit sind gezielte
noch unbelegte Browser-/Fehlerfälle; keine erneuten KI-Aufträge, Push-Freigaben,
Produktionsänderungen oder endlosen identischen Testläufe.

## Aktuelle Priorität nach dem vollständigen Pilotlauf

Owner priorisiert die technische Strecke unabhängig von Markus. Ein echter begrenzter
Codex-Auftrag, 3/3 Studio-Tests, neue Desktop-/Mobilvorschau und Branch-Push sind belegt.
Draft-PR im privaten Pilot: https://github.com/Spezzo-sudo/schmaqq-studio-pilot/pull/1.
PR-Erstellung erfolgte außerhalb Studio über GitHub-Connector; CI fehlt.
Nachweis und konkrete Lücken: `docs/evidence/P3_FULL_FLOW_20261017.md`.
Ursprüngliche Runner-Sperren für KI und Push sind wieder aktiv; direkte Integration
bleibt gesperrt. Kein Merge/Deployment. Nächste Produktarbeit: direkten PR-Übergang
und klare Freigabeführung umsetzen. Markus und weitere Anbieter sind dafür kein Blocker.
Die folgende frühere P3/P4-Reihenfolge bleibt als Hintergrund erhalten.

## Nächster Meilenstein und Konsolidierung

Die operative Gesamtplanung steht in [ROADMAP.md](ROADMAP.md). Aktives Paket ist
**P3: Markus auf macOS und gemeinsamen Testremote verbinden**. P1 und P2 sind
abgeschlossen: `docs/evidence/P1_CANDIDATE_LINUX_20261017.md` und
`docs/evidence/P2_SWITCH_ACCEPTANCE_20261017.md`. Der Mac ist noch nicht
angebunden; vorbereiteter Ablauf in `docs/MARKUS_MAC_ONBOARDING.md`.
Der Owner hat inzwischen `Spezzo-sudo/schmaqq-studio-pilot` als privaten
Testremote genehmigt; Repository, Seed und zwei Aufgaben im Live-Projekt
„Studio-Pilottest“ sind angelegt. Markus hat laut Owner noch kein GitHub-Konto; persönliche Registrierung
steht vor der gezielten Einladung. Evidence: `docs/evidence/P3_PILOT_SETUP_20261017.md`.
Marcos vorhandener Runner ist inzwischen am Pilotprojekt mit eigener Kopie,
Tests und neuer Vorschau angebunden. Eingeschränktes Mac-Paket vorbereitet,
noch kein Mac-Test: `docs/evidence/P3_RUNNER_SAFETY_20261017.md`.
Der klare UI-Arbeitsvorgang steht jetzt in `docs/PILOT_PLAN.md`. Ein aktueller
Live-Browserlauf über Kommentare, Editieren/Speichern, Tests, neue Vorschau und
lokalen Prüfstand ist belegt: `docs/evidence/P3_LIVE_BROWSER_WORKFLOW_20261017.md`.
Die Pilotaufgabe steht auf Zur Prüfung; keine Selbstfreigabe oder Veröffentlichung.
Nach blockiertem Work-Browser in Codex fortgesetzt: Demo-/Live-Verwechslung
und gleiche Demo-Avatare diagnostiziert, getrennte Fixture-Sessions und isolierte
Abmeldung geprüft. Evidence: `docs/evidence/P3_IDENTITY_AND_ENVIRONMENT_20261017.md`.
Keine vermischten IDs in dieser Prüfung; reale zweite Person weiterhin offen.
Danach P4 echte gemeinsame Abnahme. Vorhandene Setup-/Live-Checks
nicht pauschal wiederholen. Langfristige Anbieter-/Compute-Arbeit bleibt Backlog.

Der verbindliche Ablauf für Sicherung, Review, kontrollierte Bereitstellung und
anschließende menschliche Abnahme steht in `PILOT_PLAN.md`. Neueste technische
Prüfung: `STATUS.json` unter `verification`; die frühere R4-Prüfung ist ausdrücklich
als `historical_verification_r4` erhalten. Quellcode-Backup und Draft-Review erteilen
keine Deployment-Freigabe. Zwei zusätzliche Review-Korrekturen schützen Kommentare
während des Speicherns und öffnen vorhandene Aufgabenkopien auf ihrem richtigen
PC. Runtimeprofile, SQLite-Daten und Browser-Screenshots bleiben lokal ignoriert.

## Aktuelle Priorität: gemeinsam parallel arbeiten

Die lokale Studio-Startseite ist jetzt die gemeinsame Projektübersicht. Aufgaben
können atomar übernommen, kommentiert und aus ihrem Kontext in eigene Arbeitskopien
geöffnet werden. Prüfstände sind direkt an Aufgaben verlinkt. Zwei getrennte
Testkonten, Browserkontexte und echte Runner haben diesen Ablauf inklusive
parallel laufender Tests, Vorschauen und gegenseitiger Freigabe durchlaufen.
Dies ersetzt keinen tatsächlichen Fernpilot mit Marco und Markus. Details,
Datenmigration und offene Grenzen: `docs/PARALLEL_COLLABORATION_HANDOFF.md`.
Die Änderungen gehören zum separaten Kandidatenbranch; Veröffentlichung/Review-Stand siehe `STATUS.json` und Git. Der freigegebene Betreiberwechsel ist abgeschlossen, main bleibt ungemerged.

## Aktuelle Fortsetzung: Windows-Runner und Bedienbarkeit

R5-A hat den persönlichen Windows-Runner mit dem Live-Studio verbunden und
Git, Arbeitskopie, Dateispeicherung, Tests, gebaute Vorschau und Runner-Neustart
mit einem isolierten lokalen Testrepository nachgewiesen. Details stehen in
`R5_A_TECH_HANDOFF.md`. Das ist kein Nachweis für Markus' Fernzugriff, persönliche
KI-Aufträge oder die Ausführung bei ausgeschaltetem Heim-PC.

Die anschließenden Korrekturen für die erste Arbeitskopie und den responsiven
Editor liegen auf `fix/studio-first-workspace-layout`. Sie sind lokal geprüft und inzwischen durch den befugten Betreiber deployed. Siehe `docs/USABILITY_FIRST_WORKSPACE.md`.
Der neue Bereich „Verbindungen“ ergänzt eine lokal getestete GitHub-Kontoverknüpfung
und tatsächliche Codex-Statusanzeigen. Echte GitHub-Clientregistrierung und Live-
Freigabe fehlen noch; Claude/Copilot sind nicht integriert. Aktuelle Details:
`docs/CONNECTIONS_HANDOFF.md`. Historische Aussagen
zu einem noch nicht eingerichteten VPS weiter unten sind keine aktuelle
Betriebsbestandsaufnahme. Der lesende Live-Audit vom 17.10.2026 ist nun in
`docs/LIVE_PREFLIGHT_20261017.md` dokumentiert (historischer Stand vor dem Update): alter main-Stand aktiv, eigener
Node-24-Dienst, gültiges HTTPS, persönlicher Runner online. Der neue Kandidat läuft inzwischen live; aktueller Nachweis in
`docs/evidence/P2_SWITCH_ACCEPTANCE_20261017.md`. Hermes hat die Live-Snapshot-/Restore-Probe inzwischen als bestanden gemeldet
(Owner-Weiterleitung: `docs/evidence/P2_HERMES_BACKUP_REPORT_20261017.md`).
Finaler Snapshot und Dienstwechsel sind laut anschließendem Hermes-Bericht
abgeschlossen; aktives Release, Oberfläche und erhaltener Runner direkt geprüft.
Das geprüfte Paket samt `HERMES_README.md` liegt geschützt unter
`/home/dc-remote/schmaqq-studio-handoff/p2-4a0092b-20261017`; Hermes benötigt
für die Übernahme keinen GitHub-Zugriff. Hash/Quelle in STATUS.json unter
`operator_delivery`. Dieses Paket wurde nach Owner-Freigabe deployed; weitere Änderungen sind damit nicht freigegeben.

## Wo der Stand liegt

Die zentrale Codebasis ist das private Repository
`https://github.com/Spezzo-sudo/schmaqq-workspace`, Remote-Hauptbranch `main`.
Der gesamte Code liegt direkt im Repository-Root. Die vorhandene lokale
Git-Historie wird unverändert als Vorgeschichte übernommen; Git zeigt den
aktuellen Commit und Branch. Ein vorhandener lokaler Branch namens `main`
kann noch den alten Starter zeigen: maßgeblich ist `origin/main`.

Der frühere NetzKontor-Branch `chatgpt/391-studio-cloud-handoff` und PR #392
sind historische Übergabe-Snapshots. Sie sind nicht die neue Studio-Codebasis.
Das NetzKontor-Repository wird durch diese Übertragung nicht verändert.
`STATUS.json` beschreibt Fähigkeiten und offene Nachweise, nicht den aktuellen
Betriebszustand des VPS.

## Codekarte und wichtige Entscheidungen

- `studio/main.tsx`: eigenständiger Einstieg und Anmeldung.
- `studio/brand.css`, `app/studio-brand.tsx`: Design aus der Live-Preview, originale
  Logo-Vektorpfade, vereinfachte lokale Welle; Logo-Klick verwirft keine Entwürfe.
- `app/workspace.tsx`: Projekte, Aufgaben, Chat, Wissen, Navigation und Team.
- `app/development.tsx`, `source-editor.tsx`, `team-workspaces.tsx`, `code-review.tsx`:
  echte Entwicklerabläufe; keine simulierten Erfolgsmeldungen als Testergebnis.
- `selfhost/server.mjs`, `store.mjs`: Node HTTP und SQLite WAL.
- `selfhost/runner.mjs`: ausgehende Verbindung zum Studio; Code läuft auf dem
  konfigurierten Gerät. Own-device-Grenze für Codejobs bleibt erhalten.
- `selfhost/oidc.mjs`: Identitätslogin mit PKCE/Nonce/JWKS; echter OpenAI-Client fehlt.
- `selfhost/local-ai.mjs`, `ai-routes.mjs`: ausdrücklich freigegebene lokale Modelle.
- `selfhost/release.mjs`, `backup.mjs`, `deploy/`: leichtes Runtime-Paket, konsistentes
  Backup, Preflight und Deployment-Vorlagen; aktueller Kandidat kontrolliert
  deployed und lesend nachgeprüft.
- `app/api/`, `db/`, `build/`: ursprünglicher Sites-Starter, anderer Hostingpfad.
  Für dieses Vorhaben `studio:*` verwenden. Root-`npm run dev` startet den Starter.

Sitzungen sind pro Person. Einladungen binden an die E-Mail. Eigene Git-Worktrees
verhindern gleichzeitiges Schreiben in dieselben Dateien. Aufgaben/Dateibereiche
können reserviert werden. Stale-Save-Prüfung schützt den Editor; inhaltliche
Git-Konflikte bleiben möglich und werden angehalten. Review gilt exakt einem
Commit und muss von der anderen Person stammen. Vorschau läuft auf anderer Origin.

## Was nicht durch einen Quellcode-Upload übertragen wird

Private Datenbanken, ChatGPT-/Codex-Sitzungen, Runnerprofile, persönliche Programme,
lokale Modelle und der gesamte Chatverlauf bleiben außerhalb des Git-Repositories.
Die vorhandene lokale Git-Historie wird vollständig in das eigenständige
Repository übertragen und zusätzlich als lokales Git-Bundle gesichert. Private
Runtime-Daten werden dabei nicht übertragen; eine neue Installation erzeugt
eigene Daten, Konten und Zugangsdaten.

Neue Standardinstallationen binden an localhost. Das in R5-A geprüfte Live-Studio
ist unter https://studio.schmaqq.com erreichbar; dessen Betrieb wurde hier nicht
vollständig auditiert. Ein
Cloud-Entwickler kann Code bearbeiten/testen, auch wenn dieser PC aus ist; er
ersetzt weder automatisch das Studio-Hosting noch einen ausgeschalteten Runner.
Ein normaler Chat hat nur die tatsächlich verbundenen Tools und kann nicht
allein wegen dieser Dokumentation Befehle auf einem Rechner ausführen.

## Einstieg in Codex Cloud oder Work

1. Der GitHub-Verbindung Zugriff auf `Spezzo-sudo/schmaqq-workspace` geben.
2. Den Remote-Branch `main` oder den gewünschten Entwicklungsbranch wählen.
3. Im Repository-Root arbeiten. Node >=24.15, Python 3 und Git bereitstellen.
4. Setup: `node selfhost/cloud-setup.mjs`. Das installiert aus dem Lockfile und
   baut das Studio. Keine echten KI-/VPS-/Provider-Secrets für diese Arbeit nötig.
5. `npm run studio:verify` ausführen. Linux-Fehler tatsächlich beheben und berichten.
6. Eigener Branch, eng begrenzte Änderung, Tests, PR und Review. Ein Merge ist
   keine Deployment-Freigabe. NetzKontor bleibt ein getrenntes Projekt.

Offizielle Referenz: https://learn.chatgpt.com/docs/environments/cloud-environment
Die tatsächliche Verfügbarkeit und Freigabe der Umgebung im Konto separat prüfen.

## Starttext für einen neuen Codex-/Work-Chat

> Wir entwickeln SCHMAQQ Studio weiter. Öffne main im privaten Repository
> Spezzo-sudo/schmaqq-workspace und arbeite im Repository-Root. Lies
> AGENTS.md, docs/STATUS.json und
> docs/HANDOFF.md. Prüfe den tatsächlichen Git-Stand. Starte mit studio:verify.
> Keine private Runtime aus dem alten PC voraussetzen. Nächste Aufgabe: Linux-
> Reproduzierbarkeit und sichtbare Abnahme des neuesten Layouts, danach den
> vollständigen Zwei-Personen-Ablauf prüfen. Änderungen nur im Studio-Bereich.
> Melde echte Testresultate und noch offene Voraussetzungen; kein Deployment.

## Starttext für einen normalen ChatGPT-Chat

> Lies im verbundenen privaten GitHub-Repository Spezzo-sudo/schmaqq-workspace
> auf main die Dateien docs/STATUS.json und docs/HANDOFF.md. Wenn dieser Branch nicht zugänglich ist, sage das ausdrücklich und
> verlange die beiden Dateien. Arbeite am nächsten eng begrenzten Arbeitspaket.
> Behaupte keine Ausführung, wenn keine Ausführungsumgebung verbunden ist.

## Test mit zwei Rollen

Zugangsdaten werden lokal von `node selfhost/demo.mjs` erzeugt und nur in `.studio/`
gespeichert. Zwei Browserprofile verwenden, da zwei Tabs dieselbe Sitzung teilen.
Marco: Datei öffnen → ändern → speichern → Tests → Vorschau → Teamprüfung.
Markus: Diff ansehen → Rückmeldung/Freigabe. Marco: geprüften Stand veröffentlichen
und zusammenführen. Das lokale Demo-Remote ist ein echtes isoliertes Bare-Repository.
Die echte NetzKontor-Quelle verlangt weiterhin Issue/PR/CI und wird dadurch nicht
automatisch freigegeben oder deployed.


## Historische Prüf-Evidence und offene Cloud-Abnahme

Lokal am 17.10.2026: `npm run studio:verify` bestanden (13 Tests, TypeScript,
Frontend-Build und Source-Guard). Die GitHub-Übertragung wurde als vollständiger
Baum geprüft. Entwurfs-PR: https://github.com/Spezzo-sudo/NetzKontor/pull/392.

Im früheren NetzKontor-Snapshot wurde der erste Studio-CI-Lauf https://github.com/Spezzo-sudo/NetzKontor/actions/runs/39011115243
wird von GitHub als fehlgeschlagen gemeldet; es wurden keine Jobschritte oder
abrufbaren Logs zurückgegeben. Auch die übergeordnete CI meldete einen Fehler.
Die Ursache ist nicht bewiesen. Dies ist kein grüner Linux-Nachweis. Zuerst die
GitHub-Laufausführung prüfen; alternativ in einer echten Cloud-Entwicklungsumgebung
installieren und prüfen. Kein Neustarten einer Schleife ohne neue Evidence.

Die Codex-Cloud-Umgebung selbst ist noch nicht angelegt/aktiviert. Dafür muss die
bereits GitHub-Verbindung Zugriff auf das neue Repository haben und
Node >=24.15 bereitstehen. Die Projektdateien und der obige Starttext sind dafür
vorbereitet. Ein Chat-/Cloud-Wechsel überträgt keine laufende lokale Sitzung.


Im eigenständigen Studio-Repository ist noch kein GitHub-Actions-Workflow
konfiguriert. Der fehlgeschlagene historische NetzKontor-Lauf ist kein aktueller
Studio-CI-Lauf. Maßgeblicher lokaler Prüfeinstieg bleibt `npm run studio:verify`.
