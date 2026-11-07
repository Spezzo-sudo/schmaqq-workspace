# Persönlicher Pilot: GitHub, Rechnerverbindung und Bedienbarkeit

Stand: 28.10.2026. Lokale Browserabnahme, unterstützt durch Codex und den Nutzer.
Kein selbstständiger No-Coder-Test und keine pauschale Produktfreigabe.

## Ergebnis

Die echte GitHub-Kontobestätigung und die Registrierung eines persönlichen
Runners funktionieren am aktuellen lokalen Studio. Der Runner erreicht das
ausgewählte echte private Pilot-Repository lesend. Die zunächst fehlende lokale
Git-Autorenidentität wurde nach Rückmeldung des Nutzers nur im Pilotklon gesetzt.
Die gezielte erneute Git-Prüfung besteht und gibt den Bearbeitungsstart frei.
Der geführte Aufgabenablauf zeigte die konkrete ursprüngliche Fehlerursache
jedoch nicht an. Dieser Befund bleibt trotz behobener Konfiguration bestehen.
Anschließend wurden die eigene Aufgaben-Arbeitskopie angelegt, echte Git-Dateien
aufgelistet und genau einmal `node --test` über Studio ausgeführt: **2 PASS,
0 FAIL, 0 SKIP**. Keine Quelldateiänderung und keine Veröffentlichung.

## Geprüfter Aufbau und Grenzen

- Arbeitskopie: `schmaqq-studio-stale-review`, eigener Folgebranch; lokale,
  unveröffentlichte Änderungen. Exakter Git-Stand und SHA256 der relevanten
  Quell-/Builddateien stehen im lokalen `source-state.json`.
- Aktuelle lokale Anwendung: `http://127.0.0.1:47850`, Vorschau-Origin 47851.
  Die ältere öffentliche Website wurde hierfür nicht als Abnahmestand verwendet.
- Eigenständige lokale Datenbank und synthetisches Studio-Konto „Terra Testkonto“;
  daran wurde das echte persönliche GitHub-Konto bestätigt. Das ist kein Test
  einer neuen persönlichen Studio-Registrierung oder der Production-Datenbank.
- Echter privater Pilot `Spezzo-sudo/schmaqq-studio-pilot`, lokal neu geklont.
  Repository enthält synthetische Testinhalte; eigener bestehender Git-Zugang.
- Genau ein neues Runnergerät, genau dieses Projekt. Keine KI-/Codex-Freigabe,
  kein fremder Runner. Keine neue kostenpflichtige Modell-API.
- Der heruntergeladene Profilstandard wurde lokal auf `publish:false` und
  `workflow:pull-request` eingeschränkt. Diese Anpassung ist ein dokumentierter
  Eingriff des Assistenten, kein Beweis eines selbsterklärenden UI-Ablaufs.

## Tatsächlicher Verlauf

| Schritt | Wer / Eingriff | Tatsächliches Ergebnis |
|---|---|---|
| Lokale GitHub-OAuth-App vorbereiten | Nach ausdrücklicher Zustimmung; Nutzer übernahm persönliche GitHub-Bestätigungen | Eigene App erstellt; private Konfiguration und lokaler Serverstart nötig |
| GitHub anmelden / zustimmen | Nutzer am Anbieter | Studio zeigt „Konto bestätigt“, tatsächliches Konto und Datum |
| Rückkehr nach OAuth | Assistent navigiert zur Verbindungsübersicht | Callback landet über alte Route bei „Meine Arbeit“; Bestätigung erst nach weiterem Navigieren sichtbar |
| Projekt-Repository speichern | Über Studio | UI unterscheidet gespeicherte Adresse von bestätigtem Zugriff korrekt |
| Private Git-Arbeitskopie klonen | Lokaler Git-Befehl durch Assistenten | Erst Git-Umgebung korrigiert: vorhandener Credential Manager ausdrücklich ausgewählt; Clone danach erfolgreich |
| Runner-Dialog ausfüllen | Assistent: Name, Projekt, absoluter Git-Pfad, main, JSON-Testbefehl | „Runner-Zugang erstellen“ und Download funktionieren |
| Private Konfiguration speichern und starten | Download über UI; lokaler Hilfsstarter mit Node/Git und begrenztem eigenen Prozessbaum | Genau dieses Projekt wird vom Runner gemeldet; Studio zeigt „Erreichbar“ / „Verbunden“ |
| Veröffentlichungsstandard kontrollieren | Bereitschaftsansicht + Quellprüfung | Ohne Auswahl stand dort „Lokal erlaubt · kein Deployment“; Profil anschließend ausdrücklich gesperrt und Runner neu gestartet |
| Pilotaufgabe anlegen und übernehmen | Über UI | Aufgabe mit Ergebnis und Abschlussbedingungen angelegt; Bereich „Bearbeitung“ erreichbar |
| „Git jetzt prüfen“ | Ein tatsächlicher Runnerjob aus der Aufgabe | Repository, origin, Hauptzweig-Lesezugriff und Testkonfiguration erfolgreich; Git-Autorenidentität fehlt |
| Fehler verstehen | Aufgabenansicht, danach selektive lesende Diagnose durch Assistenten | UI nennt nur „Git-Verbindung braucht Aufmerksamkeit“; konkrete fehlerhafte Teilprüfung erst aus gespeichertem Jobresultat ermittelt |
| Identität vervollständigen | Nutzer nennt Commit-E-Mail; Assistent setzt Marco und die angegebene Adresse nur mit git config --local im Pilotklon | Genau eine erneute Git-Prüfung; Bearbeitungsstart danach frei |
| „Bearbeitung starten“ | Über Studio; Runner erstellt eigenen Branch und eigene Arbeitskopie | Tatsächliche Projektdateien erscheinen im Editor |
| „Tests starten“ | Genau ein Checkjob über Studio, danach „Testausgabe ansehen“ | Zwei echte Node-Tests bestanden, kein Fehler oder Skip; Ausgabe im Aufgabenbereich sichtbar |

Runnerzustand liegt außerhalb des geklonten Git-Repositories. Bestehende globale
Git-Einstellungen wurden nicht geändert. Der eigene Starter verwendet den
vorhandenen Credential Manager und lässt bestehende globale Git-Identität zu;
eine passende Autorenidentität war trotzdem nicht verfügbar. Die vom Nutzer
angegebene Commit-E-Mail wurde anschließend lokal verwendet; keine globale
Konfiguration verändert. Der tatsächliche fehlgeschlagene Erstversuch bleibt
zusammen mit dem erfolgreichen Korrekturlauf erhalten.

## Reproduzierte Befunde

**P1 – Veröffentlichungsfreigabe im einfachen Runner-Download fehlt.**
Der neue Download aus `app/runner-connect.tsx` enthält weder `publish:false` noch
eine ausdrücklich ausgewählte Workflowregel. `selfhost/local-ai.mjs` meldet
Veröffentlichen über `p.publish!==false` als erlaubt; `selfhost/runner.mjs` sperrt
`submit` nur bei ausdrücklich falschem Wert. Die Bereitschaft zeigte tatsächlich
„Lokal erlaubt · kein Deployment“. Kein Push wurde ausgeführt. Lokal wurde das
Profil eingeschränkt. Produktkorrektur und gezielter Nachweis sind noch offen.
Das beweist keine Umgehung aller übrigen Server-/Reviewregeln.

**P1 – Konkrete Git-Fehlerursache im geführten Aufgabenstart nicht erreichbar.**
In einer frisch angelegten Codeaufgabe: übernehmen → Bearbeitung → „Git jetzt
prüfen“. Ergebnis: „Git-Verbindung braucht Aufmerksamkeit“ und Hinweis auf den
Entwicklungsverlauf. Im sichtbaren Aufgabenbereich fehlen die Teilprüfungen und
eine zugängliche Ergebnisaktion. `app/development.tsx` filtert den fokussierten
Verlauf auf aufgabenbezogene Arbeitskopien; die projektweite `inspect`-Prüfung
hat noch keine solche Arbeitskopie. Das direkte Ergebnis wird in der fokussierten
Bearbeitung außerdem erst im Editor einer vorhandenen Arbeitskopie eingeblendet.
Auf diesem Weg fehlt damit beim ersten Start die Diagnose
„Lokale Git-Identität“. Screenshot/AX und originales, gezielt exportiertes
Prüfergebnis liegen lokal vor. Kein erneuter gleicher Check ohne Korrektur.

**P2 – „Projekt eingerichtet“ ist stärker als die tatsächliche Bereitschaft.**
Projekteinstellungen melden „Dein Rechner meldet dieses Projekt als eingerichtet“;
gleichzeitig zeigt die Detailübersicht eine problematische Git-Verbindung und
fehlende Vorschau. Besser nach Konfiguration, Git-Prüfung und Arbeitsbereitschaft
unterscheiden. Dies ist eine Bedienbewertung aus gleichzeitig sichtbaren Angaben.

**P2 – Die Einrichtung braucht technische Unterstützung.**
OAuth-App/Serverkonfiguration, lokaler Clone, Runnerpfad, JSON-Testbefehl,
Dateidownload und Terminalstart waren nötig. Erfolgreich mit Hilfe bedeutet noch
nicht intuitiv oder einfach für einen neuen Nutzer. Insbesondere reicht
„Mit GitHub verbinden“ nicht für Git-Schreibrechte oder einen eigenen Runner.

**P2 – Rückkehr nach GitHub-Bestätigung führt nicht direkt zur Bestätigung.**
Beobachteter Callback über `?view=models&connection=github` bei neuer Navigation.
Nach persönlicher Zustimmung war ein zusätzlicher Wechsel zu „Team & eigene
Verbindungen“ erforderlich. Noch kein isolierter zweiter OAuth-Durchlauf; nicht
unnötig erneut autorisieren, sondern Routing bei gezielter Korrektur abnehmen.

**P2 – Aktionsknöpfe berücksichtigen die gemeldete Einrichtung nicht ausreichend.**
Nach dem Arbeitskopiestart sind „Vorschau erstellen“ und „Code zur Prüfung teilen“
bedienbar, obwohl im Profil noch keine Vorschau konfiguriert und Veröffentlichung
ausdrücklich gesperrt ist. Beide Aktionen wurden nicht ausgelöst. Belegt ist
die widersprüchliche Führung, nicht ein fehlgeschlagener Preview-/Push-Versuch.

## Bedienbewertung

Positiv: stabile Hauptnavigation, klare Projektbereiche und Aufgabenbereiche,
sichtbare Verantwortlichkeit, verständliche Trennung von Kontobestätigung und
Repository-Zugriff. Die Bereitschaft trennt Rechner, Projekt, Git, optionale KI
und Veröffentlichung. Fehlende Git-Bereitschaft blockiert den Bearbeitungsstart.

Verbesserungsbedürftig: Einrichtungswissen verteilt sich über Anbieter, lokale
Dateien, Terminal, Teamverbindungen, Projekteinstellungen und Aufgabenstart.
„Rechner verbinden“ öffnet die Registrierung auch dann, wenn schon ein Rechner
vorhanden ist; der Einrichtungsplan wiederum setzt einen bestehenden Runner
voraus. Das begünstigt Missverständnisse und doppelte Zugänge. Fehler brauchen
konkrete Ursache und nächsten ausführbaren Schritt an derselben Stelle.

Bewertung ist qualitative Expertenbeobachtung mit Nutzerbeteiligung. Keine
erfundene Erfolgsquote, Zeitmessung oder unabhängige Nutzerstudie. Aktueller
sichtbarer Desktopausschnitt geprüft; mobile Bedienung in diesem Durchlauf nicht
erneut geprüft. Frühere mobile Nachweise bleiben ältere, getrennte Evidence.

## Was nicht geprüft wurde

Neue Studio-Kontoerstellung; zweite echte Person / zweiter physischer Rechner;
Git-Schreibrechte, Push, Pull Request, unabhängiges Review, Merge, Deployment;
persönliche KI-Aufträge; Vorschaukonfiguration und tatsächlicher Preview-Build;
Passwortwiederherstellung / SMTP; Linux-/Production-Betrieb. Nur der vorhandene
Pilot-Testbefehl wurde einmal in diesem persönlichen Pilotlauf ausgeführt. Bestehende allgemeine
Testnachweise wurden weder wiederholt noch als neue Tests gezählt.

## Nachweise und nächster Schritt

Lokale Originale: `.studio/personal-pilot/acceptance/20261028/` mit HTML-Auswertung,
Screenshots, AX-Texten, gefiltertem `checks.json`, `source-state.json` und einem
SHA256-Manifest ausschließlich dieser freigegebenen Belegdateien. Private
Konfiguration, Token, OAuth-Secrets, Datenbank und Auth-Caches sind ausgeschlossen.
Ein früher Screenshot einer Secret-Erstellungsseite wird bewusst nicht übernommen.

Git-Korrektur, eigene Aufgaben-Arbeitskopie und einmaliger Testbefehl über Studio
sind abgeschlossen. Als nächstes die dokumentierten Produktlücken gesondert
umsetzen und gezielt nachprüfen, ohne unveränderte
allgemeine Prüfsuiten erneut auszuführen. Bis dahin kein vollständiger
Onboarding-PASS und keine Freigabe für Veröffentlichung/Betrieb.

## Lokale Durchführungshilfen und Unterbrechungen

Der Runner wird durch einen privaten, begrenzten Hilfsstarter mit eigenem
Windows-Prozessbaum gestartet; Zustand und Profil liegen außerhalb des Pilot-Git.
Der lokale Studio-Launcher wurde auf maximal vier Stunden für die gemeinsame
Sitzung begrenzt und mit derselben Datenbank neu gestartet. Ein zusätzlicher
Startversuch nach einer missverständlich formatierten Portausgabe scheiterte
zuvor mit EADDRINUSE; erst nach beendetem eigenem Vorgänger wurde neu gestartet.
Dies ist eine Durchführungspanne des Assistenten, kein Produktfehler. Keine
fremden Prozesse wurden beendet und keine Datenbank neu angelegt.

Die HTML-Auswertung ist als lokale Datei gespeichert. Eine zusätzliche direkte
Öffnung per Browser-Use wurde durch dessen URL-Richtlinie für `file:` blockiert;
kein Umgehungsversuch. Der HTML-Bericht wurde deshalb in dieser Sitzung nicht
im Browser visuell abgenommen. Die Studio-Screenshots wurden gesichert und die
Ergebnisse anhand der sichtbaren UI, AX-Texte und gefilterten Originaljobs geprüft.
