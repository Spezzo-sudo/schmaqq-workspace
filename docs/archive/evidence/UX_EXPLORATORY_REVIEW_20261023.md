# Freier UX-Rundgang – 23.10.2026

## Urteil und Umfang

**Bedienabnahme noch nicht bestanden.** Die neue Aufgabenansicht ist eine
Verbesserung; der freie Rundgang findet aber einen riskanten Aufgaben-/Kopienwechsel
und mehrere Orientierungsbrüche. Der vorherige technische P1-Nachweis bleibt für
seine beschriebenen Fälle gültig und wird dadurch nicht zur vollständigen UX-Abnahme.

Datierte Prüfgrundlage: Commit `52b191783da56d522684223c4b3bb3dc186c886d`, Branch
`local/studio-a0-terms-20261023`. Produktcode während dieses Rundgangs unverändert.

Nach der Anmeldung durch den Owner selbst über die interaktive Browsersteuerung
ausgeführt: freie Navigation mit jeweils neuer AX-/Sichtbeobachtung.
Kein vorgegebenes Playwright-Ablaufskript und keine API-/DB-Abkürzungen für die
Bedienung. Eine Anmeldung als Marco im bestehenden isolierten Testbestand auf
Loopback 4394/4395. Die zweite Rolle wurde in diesem freien Rundgang nicht benutzt;
deren früherer skriptgesteuerter Nachweis ist separat dokumentiert.

Besucht: Übersicht, Aufgabenboard, mehrere Aufgaben, Bearbeiten, Diskussion,
Nachweise, Prüfstandsdialog, Einrichtung, vollständige Entwicklung, Projekte samt
Anlagedialog, Verbindungen, Team-Chat, Wissen, Team & Zugänge und mobiles Menü.
Zusätzlich ungespeicherten Entwurf, Reiterwechsel, Neuladen und den echten
Vorschau-Build mit neuem Vorschau-Tab ausprobiert. Standardfenster, 1280x900 und
390x844 verwendet; temporäre Grössenvorgabe anschliessend zurückgesetzt.

## Priorisierte tatsächliche Fundstellen

### E1 – P1: Andere Aufgabe, andere Kopie, unveränderte Kopfzeile

Reproduktion: Aufgabenboard → „Startseitenüberschrift ändern“ (in der Testkopie
ohne aktive zugeordnete Kopie) → unter „Aktive Arbeitskopie“ die Kopie
„UX P1: Überschrift gemeinsam prüfen“ wählen. Der Editor öffnet die Datei der
zweiten Aufgabe, während Titel, URL und nächster Schritt weiter zur ersten
Aufgabe gehören und sogar noch zum Anlegen einer Kopie auffordern.

Die geöffnete Datei wurde über ihre sichtbare Textfeldbelegung bestätigt;
nichts gespeichert oder in der falschen Kopie ausgeführt. Beide Kopien gehören
demselben Nutzer: kein Nachweis eines fremden Kontozugriffs, aber ein riskanter
Kontextfehler. `app/development.tsx` filtert die auswählbaren Kopien nach Nutzer,
Gerät und Projekt, ohne sie im Aufgabenmodus auf die aktuelle Aufgabe zu begrenzen.

Soll: Im Aufgabenmodus nur Kopien dieser Aufgabe anbieten. Ein expliziter Wechsel
zu einer anders zugeordneten Kopie muss den gesamten Aufgabenkontext wechseln.
Kopfzeile, bearbeitete Kopie, Aufträge und Nachweise müssen dieselbe Zuordnung haben.
Beleg: `.studio/explore-05-wrong-task-copy.png` und live gelesene Textfeldbelegung.

### E2 – P1: Historische Freigabe im Dialog ohne Warnung zum aktuellen Stand

Reproduktion: Aufgabe mit Änderungen nach Freigabe → Nachweise. Dort steht korrekt
„Für diesen Stand freigegeben · danach Änderungen“. „Prüfstand öffnen“ zeigt
prominent „Von zweiter Person freigegeben“ in Grün, aber im sichtbaren Dialog fehlt
die hervorgehobene Information, dass die heutige Arbeitskopie weiter geändert ist.
Der exakte Commit ist vorhanden; die gespeicherte Freigabe ist nicht verfälscht.
Die Darstellung kann trotzdem als Freigabe der aktuellen Arbeit missverstanden werden.

Soll: Historischen Stand im Dialog klar kennzeichnen und Abweichung zur aktuellen
Kopie sichtbar mitführen; unbekannte Aktualität ebenfalls benennen. Keine Änderung
an der eigentlichen Commitbindung der Freigabe nötig.
Beleg: `.studio/explore-04-review-dialog.png`; korrekte Stale-Hinweise zuvor im
Nachweisreiter selbst gelesen.

### E3 – P2: Nächster Schritt widerspricht einem ungespeicherten Entwurf

Im Editor einen nur ungespeicherten Probeentwurf ergänzt. Die Aktionsleiste
fordert korrekt zum Speichern auf, hebt Speichern hervor und sperrt Tests.
Die Kopfzeile fordert weiterhin „Tests erneut ausführen“.

Soll: Der unmittelbare nächste Schritt berücksichtigt Entwurf und laufende Arbeit
an allen sichtbaren Stellen. Erst Speichern, dann erneut Prüfen.
Belege: `.studio/explore-08-mobile-top-draft.png`, `explore-09-mobile-at-start.png`.

### E4 – P2: Aufgabentitel führt je nach Ansicht woandershin

Auf dem Aufgabenboard öffnet ein Klick auf den Titel den Aufgabenarbeitsplatz.
Auf der Übersicht öffnet derselbe Titel eine Diskussions-/Nachweis-Seitenspalte;
erst „Im Arbeitsplatz weiterarbeiten“ führt in den Arbeitsplatz. Zusätzliche
„Diskussion“-Knöpfe stehen daneben bereits bereit.

Soll: Titel öffnet überall dieselbe Aufgabe. Diskussion bleibt eine gezielte
Unterfunktion mit eigener Beschriftung. Quelle: `app/collaboration-board.tsx`.

### E5 – P2: Rückwege und Wiederaufnahme verlieren den Reiter

„Nachweise“ → Prüfstand öffnen schaltet intern auf Bearbeiten.
Nach Schliessen des Dialogs bleibt Bearbeiten aktiv, statt zu Nachweise
zurückzukehren. Auch Neuladen im Nachweisreiter startet wieder unter Bearbeiten.
Quelle: `openReview()` in `app/task-workspace.tsx` setzt ausdrücklich `tab='edit'`;
der Reiter selbst ist nicht Bestandteil der gespeicherten Route.

Soll: Dialog merkt Ausgangsort und stellt ihn beim Schliessen wieder her.
Wiederaufnahme soll Aufgabe und gewählten Bereich erhalten.

### E6 – P2: Zu viel Orientierungstext vor der eigentlichen Arbeit

Im Aufgabenarbeitsplatz stehen Titel, lange Kopien-/PC-Metadaten, Fortschritt,
vier Begriffserklärungen, nächster Schritt, Reiter, Editorüberschrift, Aktionsleiste,
Einführung und Dateiliste vor dem Textfeld. Gemessen am tatsächlichen mobilen
Seitenanfang: Textfeld-Oberkante etwa **1239 px** bei **390x844**. Schon ohne
Ergebnisblock liegt die Eingabefläche damit unter dem ersten Bildschirm.
Ein aufgeklappter Ergebnisblock schiebt sie weiter herunter. Speicheraktionen
erscheinen oberhalb und unterhalb des Editors.

Soll: Kompakte dauerhafte Kopfzeile, kurze nächste Aktion, Hilfen bei Bedarf,
Ergebnisse kompakt bzw. im passenden Reiter; auf kleinen Bildschirmen direkt
erreichbarer Editor. Eine primäre Aktionsleiste statt konkurrierender Wiederholungen.
Belege: `.studio/explore-03-task-entry.png`, `explore-09-mobile-at-start.png`,
`explore-11-mobile-preview-result.png`.

### E7 – P2: Zwei konkurrierende Entwicklungsoberflächen bleiben Haupteinstiege

„Einrichtung“ erklärt nachvollziehbar 4/4 erledigte Schritte. Ihr Knopf
„Zur Entwicklung“ führt jedoch wieder in die alte vollständige Ansicht mit
eigenen Dreierschritten, Arbeitskopienwahl, Codex, Verlauf, Reviewliste und Einladungen.
Daneben besteht der neue Aufgabenarbeitsplatz mit fünf Fortschrittsstationen.
Im mobilen Menü ist innerhalb einer Aufgabe „Übersicht“ hervorgehoben, nicht
„Aufgaben“. Diese Zuordnungen sind erlernbar, erklären sich aber nicht selbst.

Soll: Ein normaler Arbeitsweg über die Aufgabe. Vollständige technische Ansicht
bleibt als bewusst benannter Experten-/Verwaltungsweg erreichbar.
Belege: `.studio/explore-06-full-development.png`, `explore-10-mobile-menu.png`.

### E8 – P2: Anforderung ist beim Bearbeiten versteckt

Titel und Metadaten sind in Bearbeiten sichtbar; die eigentliche
Aufgabenbeschreibung wurde erst in Diskussion angezeigt. Gerade bei längeren
Aufträgen muss man dadurch zum Nachlesen der Anforderung den Bereich wechseln.

Soll: Kurzes Ziel bzw. aufklappbare Beschreibung direkt am Arbeitsplatz;
Diskussion enthält die Unterhaltung, nicht den einzigen Zugang zur Anforderung.
Quelle: `app/task-workspace.tsx`, Beschreibung im Diskussionspanel.

### E9 – P3: Teamverwaltung verweist für Einladungen auf Entwicklung

Unter „Team & Zugänge“ steht, persönliche Einladungen würden durch den Eigentümer
unter Entwicklung erstellt. Dort erwartet man sie als Benutzer nicht; im alten
Entwicklungsbereich ist das Formular tatsächlich weiterhin vorhanden.

Soll: Zugangsverwaltung im Team-/Zugangsbereich bündeln, mit bisherigen Rechten.
Keine Einladung in diesem Rundgang erstellt oder verschickt.

### E10 – P2, separates Thema: Anmeldung bietet keine Wiederherstellung

Anmeldeseite zeigt keinen Weg „Passwort vergessen“, dafür einen deaktivierten
ChatGPT-Knopf samt Clientregistrierungslink. Das frühere tatsächliche Passwortproblem
des Owners lässt sich damit im Produkt nicht selbstständig auflösen. Der unnutzbare
alternative Login lenkt vom verfügbaren Zugang ab.

Soll: Verfügbaren Anmeldeweg priorisieren. Sicheren Wiederherstellungsprozess
gesondert entwerfen; keine Passwortänderung oder neue Authentifizierung aus dieser
Beobachtung ableiten. Beleg: `.studio/explore-01-login.png`.

## Was im freien Rundgang gut funktioniert hat

- Weitermachen ist auf der Startseite sichtbar und öffnet die passende laufende
  Aufgabe ohne erneute Auswahl von Projekt und PC.
- Gruppierte Navigation, Aufgabenname und Projekt schaffen mehr Kontext als zuvor.
- Zugeordnete Datei öffnet sich im passenden Arbeitsplatz automatisch.
- Ein ungespeicherter Entwurf blieb beim Wechsel Bearbeiten → Diskussion →
  Bearbeiten erhalten. Tests, Vorschau und Prüfstand waren nachvollziehbar gesperrt.
- Probeentwurf anschliessend durch den ursprünglichen Text ersetzt, ohne Speichern.
- Nachweise kennzeichnen geänderte Dateien korrekt; Problem E2 betrifft deren
  fehlende Weitergabe in den geöffneten historischen Dialog, nicht die Speicherung.
- Echter Vorschau-Build lief erfolgreich. Der Link öffnete einen neuen Tab mit
  erwartetem Inhalt; Schliessen des Tabs führte zurück zum Arbeitsplatz. Die Vorschau
  selbst hat keine Studio-Navigation; der Rückweg erfolgt über die Browser-Tabs.
- Mobiles Menü liess sich öffnen und über den eigenen Schliessen-Knopf schliessen.

## Empfohlener nächster begrenzter Schritt

Zuerst E1 (Aufgabenbindung) und E2 (historische Freigabe klar darstellen) mit
Regressionsnachweisen beheben. Danach E3–E8 als zusammenhängendes Orientierungspaket:
ein Einstieg, stabile Rückwege, richtige nächste Aktion und kompakter Arbeitsplatz.
E9/E10 separat behandeln. Noch keine vollständige Bedienfreigabe und kein erneuter
Owner-Test mit Klickanweisungen als Ersatz für die offenen Punkte.

## Durchführung, Grenzen und Ablage

Die Bildschirmfotos `.studio/explore-01-...png` bis `explore-13-...png` wurden im
interaktiven Rundgang erzeugt und jeweils betrachtet. Rohnotizen liegen in
`.studio/exploratory-ux-notes-20261023.md`. Bilder und private Testdaten nicht nach
GitHub übernehmen. Die doppelte synthetische Aufgabe und archivierten Alt-Kopien
stammen aus der Testvorbereitung; sie werden nicht als Produktfehler gezählt.

Die Credential-Datei war in der Browser-Sandbox nicht lesbar. Eine beantragte
temporäre Kopie mit zusätzlichem Lesezugriff wurde automatisch abgelehnt und
nicht ausgeführt. Owner meldete sich anschliessend selbst an. Keine Authentifizierung
oder bestehende ACL verändert und keine Sperre umgangen.

Keine neuen Konten oder Geräteregistrierungen. Nur vorhandenen isolierten Testserver
und vorhandene Testgeräteanmeldung benutzt, automatische Dateilesejobs und einen
Vorschau-Build ausgelöst. Kein Speichern des Probeentwurfs, kein neuer Prüfstand,
Commit, Push, Merge, Deployment oder Eingriff am VPS. Keine umfangreichen Tests
wiederholt; dies ist eine explorative Bedienprüfung, keine technische Vollprüfung.
Die eigenen Prozesse (Server 28956, Runner 23760) nach Befehlszeilenprüfung beendet;
anschliessend keine Listener auf 4394/4395 festgestellt. Eine unabhängige menschliche
Abnahme bleibt offen. Externe Arbeitsbasis mangels Schreibrecht nicht beschrieben;
dieser datierte Bericht dient als Vorschlag zur geprüften Übernahme.
