# Technische Abnahme – Ergebnis und Grenzen

Stand: 17.10.2026. Die endliche Matrix ist eingeordnet. Vier reproduzierte Fehler
im lokalen Kandidaten behoben; kein Deployment. Der Kernablauf funktioniert in
den beschriebenen Prüfungen. Keine vollständige Sicherheits- oder Nutzerfreigabe.

## Nachweise

Vollständige Prüfung nach Korrekturen: .studio/overnight-audit/verify-final.log.
19 Tests PASS, 1 POSIX-Rechtetest unter Windows SKIP, 0 FAIL. Source Guard,
TypeScript und Frontend-Build PASS. Frühere Baseline: verify.log.

Sichtbarer Playwright/Brave, zwei getrennte synthetische Konten/Browserkontexte,
echte lokale Git-Kopien und zwei Runner. Neue Fixture nur auf Loopback 4350/4351,
lokale Bare-Remote, KI und Veröffentlichung gesperrt. Private Belege unter
.studio/overnight-audit/ bleiben ignoriert. Bereits belegter echter Pilot:
[P3 Full Flow](P3_FULL_FLOW_20261017.md). Kein weiterer Modellauftrag oder Live-Push.

## Vier reproduzierte und behobene Fehler

1. **Private Dateijob-Protokolle:** Fremdes angemeldetes Teammitglied erhielt bei
   development/events HTTP 200 mit Dateinamen/Metadaten, obwohl die Ergebnisroute
   403 lieferte. Für files/read-file/save-file gilt jetzt auch bei Events die
   Eigentümergrenze. Regression mit tatsächlich gespeicherten Runner-Events:
   Eigentümer 200, anderes Mitglied 403, ohne Anmeldung 401. Browser bestätigt.
   Kein Nachweis eines unauthentifizierten Zugriffs oder Token-Leaks.
2. **Ergebnisdialog:** Fokus lag außerhalb, Escape schloss nicht. Jetzt
   Anfangsfokus, Tab-Begrenzung, Escape und Rückkehr zum Auslöser. Sichtbarer
   Retest bestanden; keine pauschale Barrierefreiheitsabnahme aller Dialoge.
3. **Verzögerte Freigabe der Aktionen:** Nach abgeschlossenem Job blieb die
   Hauptansicht bis zum nächsten Poll gesperrt. Jetzt sofortige Aktualisierung;
   Tests-Schaltfläche nach Schließen direkt verfügbar, Browser-Retest PASS.
4. **Verschwindende Wissenskonfliktwarnung:** Zweites Speichern derselben Revision
   wurde korrekt abgewiesen, aber Polling löschte den Fehlertext. Sync- und
   Aktionsfehler sind jetzt getrennt. Nach mehr als einem Polling-Intervall bleiben
   Warnung und Entwurf erhalten; fremde gespeicherte Version unverändert.

## Matrix

| Bereich | Ergebnis | Beleg / Grenze |
| --- | --- | --- |
| Anmeldung/Autorisierung | PASS im geprüften Umfang | Browser: ohne Sitzung 401, falsche Origin 403, fremdes Gerät 403, private Dateijob-Ergebnisse/Events 403. Getrennte Abmeldung zuvor in P3_IDENTITY_AND_ENVIRONMENT_20261017.md; Backend-Verträge erneut bestanden. |
| Aufgaben/Kommunikation | PASS | Gleichzeitige UI-Übernahme: genau 200/409; Zuständigkeit nach Polling konsistent. Kommentarentwurf über Navigation erhalten; gesendet nach Reload vorhanden. collaboration.test.mjs ergänzt Persistenz/Zuordnung. |
| Eigene Arbeitskopien | PASS | Eigene Kopie aus Aufgabe erstellt/geöffnet. Getrennte Kopien und parallele Ausführung zuvor in PARALLEL_COLLABORATION_HANDOFF.md. Aktuelle workspaces/studio/development-target Tests bestanden. |
| Dateieditor | PASS | Browser: Stale-Save erzeugt Konflikt, schützt externe Version, erhält Entwurf. Vergleich/Basisübernahme/Speichern erfolgreich. files.test.mjs prüft Bytes, Revisionen, Secrets, Hardlinks, Nichttext und Limits. |
| Runner/Jobs | PASS / NOT_TESTED | Echter Fixture-Runner gestoppt: Offline, Aktionen gesperrt, Kopie/Entwurf erhalten. Gleiche Konfiguration wieder verbunden. Laufenden Check per UI abgebrochen; Prozessbaum-Abbruch per process.test.mjs bestanden. Neuer voller Lauf bis maximalem Timeout und Windows-Neustart NOT_TESTED. |
| Tests | PASS | Bewusst ungültige Überschrift führt zu echtem fehlgeschlagenem Check, ohne Erfolgsmeldung. Wiederhergestellte Datei besteht. Initial ungültiges Checkskript war Fixture-Generatorfehler und wurde nur dort korrigiert. Live-Pilot 3/3 schon belegt. |
| Vorschau | PASS im belegten Umfang | Echter gebauter Pilotstand, getrennte HTTPS-Origin, Navigation und 390px in P3_FULL_FLOW_20261017.md. Aktuelle Backend-Preview-Verträge bestanden; kein neuer Produktionsjob. |
| Review | PASS technisch / BLOCKED menschlich | review.test.mjs: echte Git-Snapshots, keine Selbstfreigabe, Commit-Bindung, Rückmeldung/Merge-Gate. Vorheriger Zwei-Rollen-Browserlauf belegt. Keine unabhängige menschliche Freigabe. |
| GitHub | PASS mit Produktlücken | Pilot-PR #1 erneut lesend bestätigt: offen, Draft, ungemergt; Kopf entspricht Prüfcommit, main unverändert. Kandidaten-PR #6 Draft. Direkte PR-Erstellung aus Studio und GitHub Actions fehlen. |
| Persönliche KI | PASS für bestehenden Pilot | Ein echter begrenzter CLI-Auftrag bereits belegt. Hier keine Modellnutzung, keine persönlichen Sperren geöffnet. |
| Sicherheitsgrenzen | PASS im geprüften Umfang | Aktuelle pilot-runner/review/studio Tests und vorherige reale Sperrproben. PR-Workflow verhindert direkte Integration. Source Guard für bekannte Muster PASS; kein vollständiger Secret-/Penetrationstest. |
| Bedienbarkeit | PASS mit Restlücken | Acht Hauptbereiche bei 390/1024/1440px ohne Seitenüberlauf (responsive-sweep.json), keine erfassten JS-Pageerrors. Ergebnisdialog/Fehler nachgetestet. Gesamte Barrierefreiheit NOT_TESTED. Gleiche Demo-Initialen, Erstinstallation und fehlender PR-Übergang bleiben Lücken. |
| Gemeinsames Wissen | PASS nach Fix | Zwei Browser bearbeiten gleiche Revision: zweite Speicherung abgewiesen, Entwurf/Warnung erhalten. knowledge-conflict-fixed.png. Auflösung weiterhin manuell sichern/neu öffnen. |
| Backup/Betrieb | PASS laut bestehender Evidence | P2_HERMES_BACKUP_REPORT_20261017.md und P2_SWITCH_ACCEPTANCE_20261017.md. Keine neue Live-DB-Operation. Offsite-Restore NOT_TESTED. |
| Externe Einrichtung | BLOCKED / NOT_TESTED | Echte zweite Person/Mac nicht verfügbar; echte OAuth-Clients nicht eingerichtet. Nicht durch Windows-/Testanbieterergebnisse ersetzt. |

## Höchstens fünf nächste Arbeiten

1. Vier Korrekturen reviewen und separat für kontrollierten Dienstwechsel freigeben;
   noch nicht live.
2. Veröffentlichten Branch direkt zum passenden GitHub-PR führen; PR/CI klar von
   lokalen Tests unterscheiden.
3. Projektbezogene Runner-Freigaben vor Aufträgen erklären/anzeigen, Erststart
   vereinfachen. Online-Heartbeat allein erlaubt weder KI noch Push.
4. Wissen: Entwurf sichern und neue Version vergleichen statt nur manuell kopieren;
   weitere Dialoge auf Fokusführung und Entwurfsverlust prüfen.
5. Echter Zwei-Personen-/Mac-Pilot und unabhängiger Review. Kein Blocker für lokale
   Produktverbesserungen.

## Fortsetzung

Matrix eingeordnet; NOT_TESTED/BLOCKED sind keine versteckten PASS. Keine
unveränderten Wiederholungsprüfungen im nächsten Heartbeat. Neue Arbeit nur an
konkreter Änderung oder verfügbarem Zugang. Der Auftrag zur Produktverbesserung
bleibt bestehen; dies schließt die begrenzte Abnahme, nicht die Produktentwicklung.

## Erneute sichtbare Browserprüfung am 18.10.2026

Vom Owner nach externem Browserbericht ausdrücklich erneut beauftragt. Sichtbarer
Playwright/Brave mit bestehender eigener autorisierter Sitzung; Live-Studio und
lokale Zwei-Konten-Fixture getrennt. Kein Cloud-Browser behauptet.

| Funktion | Tatsächliches Ergebnis |
| --- | --- |
| Live Team & Zugänge | Nur Marco sichtbar. Reales zweites Mitglied weiterhin nicht nachgewiesen. |
| Live Pilot-Arbeitskopie | Vorhandene Kopie ausgewählt; site/index.html geladen, erwarteter Inhalt vorhanden. Live-Dateien nicht bearbeitet. |
| Live Tests | Neu ausgeführter konfigurierter Check: 3 PASS, 0 FAIL. Keine GitHub-Actions-Ausführung. |
| Live Prüfstand | Bestehender veröffentlichter Prüfstand: Commit und echter Diff im Dialog sichtbar; zweite Freigabe ausstehend. Keine neue Veröffentlichung. |
| Live Vorschau | Neu gebaut und geöffnet; Startseite bei 390/1440px ohne Seitenüberlauf. Services-Link navigiert korrekt; mobile Services-Seite visuell geprüft. |
| Lokale Dateibearbeitung | In eigener synthetischer Kopie geändert/gespeichert und anschließend bytegleich wiederhergestellt. |
| Lokale Kontentrennung | Zwei getrennte Browserkontexte: eigenes Das-bist-du je Konto, zwei sichtbare Mitglieder, zweite eigene Arbeitskopie erstellt. |
| Lokale Teamprüfung | Ersteller sieht ausschließlich Kommentar. Zweites Konto kann Änderungen anfordern und denselben Prüfstand freigeben. Beide Aktionen tatsächlich ausgeführt; synthetischer Rollentest, kein unabhängiger menschlicher Review. |
| Kommentarentwurf | In Fixture über Team-Navigation und Rückkehr erhalten, anschließend als synthetischer Testkommentar gespeichert. |

Zusätzliche Bedienlücke reproduziert: Projektauswahl innerhalb Entwicklung wird
nach Reload auf die äußere Standardauswahl zurückgesetzt; erneute Wahl nötig.
Ähnliche Demo-Initialen bleiben ein Anzeigeproblem; unterschiedliche Identitäten
wurden in der Fixture bestätigt. In diesem Retest kein Anwendungscode geändert.
Screenshots lokal ignoriert unter .studio/browser-recheck-20261018/: live-team.png,
live-tests.png, live-review.png, live-preview-390.png, live-preview-1440.png,
live-preview-services-mobile.png, fixture-peer-review.png, fixture-task-comment.png.
Keine Modelljobs, Git-Push-Aufträge, Merges oder Deployments. Persönlicher Runner
unverändert; nur separate Fixture wurde für die Prüfung gestartet und beendet.

## S1 – erster Umsetzungsabschnitt am 18.10.2026

Nach Owner-Freigabe des Plans implementiert, noch nicht deployed.
Die vorhandene Projektübersicht verbindet nun Aufgabe und persönliche Arbeitskopie
mit letztem Testlauf, letzter Vorschau, lokalem Review und Branch-Übertragung.
Zeit, Herkunft, gemeldeter Commit und nächster Schritt sind sichtbar. Alle
Prüfstände bleiben als aufklappbare Historie erreichbar. Reload behält das Projekt.

Der neue API-Lesestand enthält ausschließlich freigegebene Metadaten; keine Prompts,
Dateiinhalte, Befehlsausgaben, private Dateinamen oder Preview-Capability-URLs.
Zuordnung prüft Kopie, Person, Gerät und Projekt. Keine neue Datenmigration.

Wichtige Grenze: normale Checks melden nur HEAD, obwohl Dateien uncommitted sein
können. Vorschauen tragen keine Inhaltsrevision. Deshalb keine grüne aktuelle
Freigabe: aktuelle Revision bleibt unbestätigt; bekannte spätere Saves/Agentenläufe
markieren alte Ergebnisse. Auch eine fehlgeschlagene Agentenausführung kann Dateien
verändert haben. Historische Commit-Freigaben bleiben historisch sichtbar.
Nicht von Studio beobachtete externe Änderungen werden noch nicht erkannt.

Verifikation des letzten Codebuilds: 21 Tests, davon 20 PASS, 1 POSIX-SKIP, 0 FAIL;
Source Guard, TypeScript und Build PASS. Log: .studio/overnight-audit/verify-s1-final.log.
Neue Regression prüft Statusfolgen, gleiche Zeitstempel, historische Freigaben,
spätere Änderungen, falsche Projekt-/Ownerzuordnung und Redaktion. API-Integration
prüft Teamzugriff und Projektfilter.

Sichtbarer Playwright/Brave gegen vorhandene Loopback-Fixture, zwei echte synthetische
Sitzungen und Runner: absichtlicher Checkfehler korrekt angezeigt; Datei danach
bytegleich wiederhergestellt, Check und Preview erneut erfolgreich; alte Freigabe
als nachträglich bearbeitet gekennzeichnet. Fremde Kopie hat keine Bearbeiten-Aktion;
Prüfstand aus Aufgabe erreichbar. Projektwahl nach geladenem Reload für automation
und website bestätigt. Keine erfassten JS-Pageerrors. 390/1024/1440px ohne Seitenüberlauf;
mobile Ansicht im sichtbaren Vordergrund nach Layout-Transition visuell geprüft.
Belege: .studio/s1-change-overview/result.json, failed-check.png, overview-final-390.png,
overview-final-1440.png. Keine Live-Aufträge oder KI-Aufträge in diesem S1-Lauf.

S1 insgesamt bleibt offen: belastbare Inhaltsrevisionen und eigene Änderungsbeschreibung/
Kategorie folgen. S2–S5 nicht als erledigt ausgeben; keine automatische GitHub-Synchronisierung,
keine zentralen VPS-Tests und kein Markus-Mac-Nachweis durch diese Änderung.

## S1 – Dateirevision und Änderungsbeschreibung, 18.10.2026

Lokal umgesetzt und abgenommen; keine Produktivänderung. Runner misst HEAD sowie
Dateinamen/Modus/Inhalt der versionierten und neuen, nicht ignorierten Quelldateien.
Vor-/Nachmessung für Test, Review und statische gebaute Vorschau. Dateiänderung während
des Laufs, nicht messbare Eingaben oder alte Resultate ergeben keinen gültigen
Dateinachweis. Der Server erhält nur Hash/Zeit, keine zusätzlichen Dateiinhalte.
Dateistand abgleichen startet bewusst einen eigenen Statusjob und stellt auch
externe Änderungen fest. Es gibt keine kontinuierliche Überwachung und keine
Aussage über ignorierte Dateien, Dependencies oder Umgebungszustand. Ein passender
Hash bedeutet Übereinstimmung mit der datierten Momentaufnahme, keine unabhängige CI.
Laufende Devserver-Vorschauen bleiben ohne statischen Inhaltsnachweis.

Limits: 10000 Dateien, 8 MiB je Datei, 64 MiB insgesamt, begrenzte Git-Ausgaben.
Links, Hardlinks und sensible/disallowed Pfade werden nicht als Quellen bestätigt.
Dies ist keine Sandbox für unvertrauenswürdigen Code und keine atomare Filesystem-
Snapshot-Technologie; eigene vertrauenswürdige Runner bleiben Voraussetzung.

Additive Tabelle change_notes: Kategorie, Text, Revision, Verfasser und Zeit pro
Kopie. Eigentümer darf schreiben, Team lesen. Stale-Save HTTP 409; Entwurf und
Warnung bleiben trotz Nachladen erhalten. Beschreibungen sind Verfassertexte,
keine automatische Issue-Auflösung. Bestehende Daten werden nicht überschrieben.

Verifikation: 22 Tests, davon 21 PASS, 1 Windows-POSIX-SKIP, 0 FAIL; TypeScript,
Build und Guard PASS. .studio/overnight-audit/verify-s1-revisions-final.log.
Neuer echter Runner-Test: identischer Snapshot trotz ignorierter Datei, externer
Edit bei unverändertem Commit, neue/gelöschte Datei, Restore, statische Vorschau
mit passendem Quellstand, während Check veränderte Datei, sensible Eingaben,
Hardlink und Größenlimit. API-Regression: Eigentümer/Origin, Stale-Save und Teamlesen;
Projection vergleicht gleiche/abweichende/fehlende Revisionen und bewahrt Legacy-Fallback.

Sichtbarer Playwright/Brave mit zwei synthetischen Konten und getrennten Sitzungen:
Beschreibung geteilt, fremde Bearbeitung nicht angeboten; echter Test und statische
Vorschau passen zum Abgleich. Direkter externer Edit wird nach Abgleich als abweichend
angezeigt; Datei bytegleich zurückgesetzt, Zuordnung stimmt wieder. Zweiter Tab
speichert neuere Beschreibung; alter Entwurf wird abgewiesen und bleibt nach
mehr als einem Polling-Intervall erhalten. Beschreibung über lokalen Serverneustart
erhalten. 390/1024/1440px ohne Seitenüberlauf, keine erfassten JS-Pageerrors.
Belege ignoriert unter .studio/s1-revision-acceptance/: result.json,
external-edit-detected.png, description-conflict.png, overview-390-completed.png.

Zusätzliche Paketprüfung: fehlende neue Abhängigkeiten in expliziten Server-/
Runner-Packlisten ergänzt. Lokaler Runtime-Manifest/Auth/Schema/Backup-Smoke PASS
(release-smoke.log). Persönliches Mac-Runnerpaket aus sauberem Quellstand gebaut,
Module importiert PASS, kein Runner gestartet oder persönliche Konfiguration gelesen.
Keine Aussage über echten Mac-Betrieb. Bereits aktive persönliche Runner werden
nicht automatisch ersetzt; alte Runner liefern zunächst unbestätigte Quellen.
Keine KI-Jobs, GitHub Actions, Merges, Deployments oder neuen Live-Konten.

S1 ist in diesem begrenzten Umfang lokal abgenommen. Nächste Arbeit S2: Projektstart
und Bereitschaft. GitHub-App/Issue-Sync, zentrale Linux-Worker und echter Markus-Pilot
bleiben spätere Pakete; Rollout bleibt separat freizugeben.
