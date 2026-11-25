# Oberfläche: die vollständige Liste (verbindlich)

Stand 22.11.2026 (Start als Zentrale, Gesprächsliste im Projekt, „fürs Team sichtbar“), mit dem Owner abgestimmt. Ergänzt [CONCEPT_MESSENGER.md](CONCEPT_MESSENGER.md).
**Jeder Bildschirm, jeder Knopf und jeder Begriff der App steht hier. Was hier nicht steht, gibt es in der App nicht.**
Neue Wünsche kommen erst hierher (mit Datum im [Entscheidungsprotokoll](DECISIONS.md)), dann in den Code.
Die alte Oberfläche wurde nicht umgebaut, sondern gelöscht; der Test `studio-surface.test.mjs` hält das fest.

## Grundsätze

- **Studio ist eine Firma im Messenger.** Menschen schreiben, Agenten sind Angestellte mit einem Job, Herr Grau leitet.
- **Menschen reden und geben frei.** Code ändern, recherchieren und prüfen die Agenten. Kein Datei-Editor, keine
  Test-Knöpfe, kein Terminal in der App.
- **Eine Ebene pro Bildschirm** auf dem Handy, alles nebeneinander auf dem Desktop.
- **Einstellungen sind nachrangig**: erreichbar über Projektinfo und Mein Konto, nie im Weg der Arbeit.
- **Wörter, die es nicht gibt:** Modell- und Motornamen, Arbeitskopie, Worker, Runner, Werkstatt-Probe, Deploy-Key,
  Connector, JSON, Branch, Commit, Pull Request, Field Guild, Legacy. Stattdessen: „Code“, „Änderung“, „Server“, „Vorschau“,
  „Freigeben“, „Übernehmen“, „online“ (nie „live“).
- **Code läuft auf dem Server.** Wo gearbeitet wird, ist eine Angabe des Projekts („Wo arbeitet das Team: Server“), damit
  später ein eigener PC als zweiter Ort dazukommen kann, ohne die Oberfläche umzubauen.

- Das SCHMAQQ-Zeichen führt zu Start. Die Originalform liegt in `studio/ui/brand-paths.ts`. Beim Antippen breitet sich die rote Welle vom Berührungspunkt über das Originalzeichen aus, wenn Animationen erlaubt sind.
- Wo es eine Zurück-Taste gibt, stehen auf dem Handy Zurück und SCHMAQQ Studio in der oberen Leiste. Unter einer feinen Linie stehen Titel, Zusatz und der passende Knopf oder das Bild. Lange Titel und Namen brechen in Listen, Fenstern und Köpfen um. Auf dem Desktop bleibt die Wortmarke links bei den Projekten.
- Wenn ein Profilbild nicht lädt, zeigt Studio ein kleineres oder größeres vorhandenes Bild oder die Anfangsbuchstaben.
- Beim Antippen von Knöpfen, Links und Feldern gibt es keinen blauen Browser-Kasten. Wer mit der Tastatur durch die Oberfläche geht, sieht am ausgewählten Element einen dunklen Rahmen.
- In Projektinfo, Mein Konto und Anleitung zeigt „Weiter nach unten“ bei weiterem Inhalt den Weg nach unten. Beim Schreiben und am Seitenende ist der Pfeil weg.

## Bildschirme

### Anmelden
Anmeldung mit E-Mail-Adresse, Einladung annehmen, Passwort vergessen per E-Mail. Nach dem Anlegen des Kontos öffnet Studio das eingeladene Projekt direkt, wenn genau eines freigeschaltet wurde. Bei mehreren Projekten oder einer Einladung ohne Projekt öffnet sich Start.

### Start (Zentrale)
Die Übersicht über ganz Studio, nicht über ein Projekt. Keine Projektspalte daneben, auch nicht auf dem Desktop (Owner, 22.11.2026).
Desktop: zwei Spalten (links Arbeit und Projekte, rechts ChatGPT, Woche, Team). Handy: dieselben Blöcke untereinander, in dieser Reihenfolge.
- Oben links: dein Profilbild oder deine Anfangsbuchstaben mit einem kleinen Pfeil. Tippen öffnet das Menü. Bei einem einzelnen Namen steht dort nur sein erster Buchstabe. Oben rechts: SCHMAQQ Studio.
- Oben eine Begrüßung mit einem Satz, was gerade ansteht (wartet auf dich, laufende Aufträge).
- **Wartet auf dich**: Karten, bei denen du dran bist (Freigeben, Vorschlag annehmen). Nur wenn es welche gibt.
- **Gerade am Arbeiten**: wer in welchem Projekt woran arbeitet („Otto ändert den Code · India Dieburg · Startseite · seit 2 min“). Tippen öffnet das Projekt bzw. die Aufgabe. Nur wenn es welche gibt. Fremde private Chats erscheinen hier nicht, außer sie sind fürs Team sichtbar.
- **Projekte**: eine Karte pro Projekt (Name, letzte Nachricht, offene Aufgaben, zum Freigeben, Zähler ungelesen, die Bilder des Teams, grüner Punkt = arbeitet). Tippen öffnet den Projektchat. Danach die Karte „Projekt anlegen“.
- **Zuletzt bewegt**: die sechs Aufgaben aus allen Projekten, in deren Gespräch zuletzt etwas passiert ist, mit Status und Projekt.
- **Dein ChatGPT**: wie viel von deinem ChatGPT-Kontingent verbraucht ist, als Balken für „Die nächsten Stunden“ und „Diese Woche“, mit „Wieder voll um …“. Die Zahlen meldet ChatGPT am Ende jedes Programmierauftrags für dich; dazu „Stand <Zeit>, nach dem letzten Programmierauftrag für dich.“ Ist ein Fenster inzwischen abgelaufen: „wieder frei“. Ohne Meldung: „Noch keine Angabe …“. Ist das Kontingent aufgebraucht, ein Hinweis. Darunter der eigene Verbrauch der letzten 7 Tage (Aufträge, neu gelesen, aus dem Zwischenspeicher, geschrieben) und „KI-Zugänge ›“.
- **Die letzten 7 Tage**: vier Zahlen (Antworten der Agenten, Programmieraufträge, Nachrichten von euch, offene Aufgaben), darunter eine Tabelle pro Projekt. Gezählt wird nur, was du auch lesen darfst.
- **Dein Team**: jeder Agent einmal (Bild, Name, Job, in welchen Projekten, „arbeitet gerade“). Tippen öffnet den Direktchat im ersten Projekt.
- Darunter ein Tipp „So geht es weiter“ mit Link zur Anleitung.
- Private Nachrichten mit Menschen gehören zum Projekt (Projektinfo → Person antippen); ihre Zähler stehen in der Projektzeile.
- Leer: „Keine aktiven Projekte.“ Knöpfe „Projekt anlegen“ und „Archiv öffnen“, wenn keine aktiven Projekte da sind.
- **Projekt anlegen**: Name, Ziel, optional „Wer ist dabei?“ mit den Studio-Konten. Ohne Auswahl ist nur die Person dabei, die das Projekt anlegt. Herr Grau ist automatisch dabei.

### Menü (hinter dem Avatar)
Der Kopf bleibt deckungsgleich mit Start: Profilknopf links, SCHMAQQ Studio rechts. Die Initialen bleiben mittig. Der Pfeil zeigt nach oben, solange das Menü offen ist. Name und E-Mail stehen unter dem Kopf. Ein erneutes Tippen, die Zurück-Taste oder Escape schliessen das Menü.
Mein Konto · Projekt anlegen · Jemanden einladen (Inhaber) · Projekte und Archiv · So funktioniert Studio · Abmelden.
Darunter der Zustand des KI-Zugangs (bereit / nicht erreichbar).

### Projekt
- **Kopf**: Vollständiger Projektname (Tippen öffnet Projektinfo) und Info-Knopf. Die Zahl der Menschen und Agenten steht bei aufgeklapptem Team unter dem Namen.
- **Team-Leiste**: Auf dem Handy sind anfangs nur die runden Bilder zu sehen, zuerst die Agenten, dann die Menschen. Der Knopf „Team“ klappt Namen, Jobs und „Team erweitern“ auf und wieder zu. Weitere Bilder sind seitlich erreichbar. Auf dem Desktop sind die Namen durchgehend zu sehen. Tippen auf ein Bild öffnet den Direktchat, grüner Punkt = arbeitet gerade, Zähler = ungelesen.
- **Reiter**: Chat · Gespräche · Aufgaben auf dem Handy; auf dem Desktop Chat · Aufgaben (die Gespräche stehen links).
- **Gespräche**: alle Gespräche dieses Projekts, und nur dieses Projekts, in einer Liste: Projektchat; **Mit Agenten** (dein Direktchat mit jedem Agenten, letzte Nachricht, „arbeitet gerade“); **Mit Menschen** (dein Privatchat mit jeder Person); **Fürs Team sichtbar** (Chats anderer, die sie fürs Team sichtbar gemacht haben, z. B. „Markus mit Otto“, nur lesen); **Aufgaben** (offene Aufgaben mit Gespräch, neueste zuerst, „Alle Aufgaben ›“); „+ Team erweitern“. Zähler = ungelesen. Auf dem Desktop ist das die linke Spalte, oben „‹ Zentrale“ und SCHMAQQ Studio; andere Projekte stehen dort nicht.
- **Chat**: Nachrichten, Karten, Markierungen. Eingabe „Nachricht … (@Name holt einen Agenten)“.
  Ein Chat mit Nachrichten öffnet bei der neuesten Nachricht. Ein leerer Chat öffnet am Anfang der Begrüßung.
  Herr Grau stellt sich im leeren Projektchat vor: „Ich bin Herr Grau, eure Projektleitung. Sagt mir, was ihr erreichen wollt:
  Ich mache einen Plan, verteile die Arbeit im Team und stelle ein, wen wir noch brauchen.“ Knopf „@Herr Grau“.
- **Auftragszeile** unter einer Nachricht an einen Agenten: „Otto fängt gleich an“ · „Otto wartet (Platz 3)“ · „Otto liest den Projektstand · 12 s“ (Stopp) · „Otto hat nicht geantwortet. <Grund>“ (Nochmal). Kam der Auftrag nie beim Agenten an (Verbindung weg, Seite zu früh geschlossen): „Otto hat nicht geantwortet. Der Auftrag ist nicht angekommen.“ mit „Nochmal“; das schickt dieselbe Nachricht erneut, keine zweite. Direkt nach dem Senden steht in diesem Fall über der Eingabe „Nachricht gesendet, aber Otto hat den Auftrag nicht bekommen: <Grund>“.
- **Antworten**: Unter jeder Nachricht eines Agenten im Projektchat und in der Aufgabe steht „Antworten“. Über der Eingabe steht dann „Antwort an <Name>“ (mit Schließen); der Agent antwortet, ohne dass @ nötig ist. Zeilen von Aufgaben im Projektchat haben das nicht, dort öffnet man die Aufgabe.
- **Lange drücken** auf eine Nachricht: Markieren → „Agent fragen“; Kopieren.
- **Aufgaben**: alle Karten als Liste in drei Gruppen: Bei dir · Läuft · Erledigt. Knopf „+ Aufgabe“ (Titel, Fertig wenn, Art: Code oder Sonstiges).

### Direktchat mit einem Agenten oder Menschen
Kopf: Bild, Name, Job, „privat“ bzw. „fürs Team sichtbar“. Leer: der Agent stellt sich in einem Satz mit seinem Job vor.
Unter dem Kopf eine Zeile **Sichtbarkeit** (Owner, 22.11.2026, Weg C: jede Person entscheidet pro Chat):
- Mit einem Agenten: „Privat: nur du liest hier.“ · „Fürs Team sichtbar machen“ bzw. „Fürs Team sichtbar: alle im Projekt können mitlesen.“ · „Wieder privat“.
- Mit einem Menschen: sichtbar erst, wenn **beide** zustimmen. „Privat: nur ihr zwei.“ · „Fürs Team sichtbar machen“; danach „Du hast zugestimmt. Fürs Team sichtbar, sobald auch <Name> zustimmt.“ · „Zurücknehmen“; die andere Person sieht „<Name> möchte dieses Gespräch fürs Team sichtbar machen.“ · „Zustimmen“. Einer von beiden kann es mit „Wieder privat“ jederzeit zurücknehmen.
- Sichtbar heißt: alle im Projekt lesen den ganzen Chat, schreiben nur die Beteiligten. Agenten lesen weiterhin nur den Projektchat.
Antworten können „Im Projekt teilen“. Tippen auf Bild/Name im Kopf öffnet das Profil.
Mit einem Menschen: Kopf mit Name und „privat“; nur die beiden lesen mit, solange er nicht fürs Team sichtbar ist.

### Fürs Team sichtbares Gespräch (nur lesen)
Kopf: „Markus mit Otto“ bzw. „Markus und Lena“, darunter „fürs Team sichtbar · nur lesen“, Bild. Die Nachrichten wie im Direktchat, „Ältere Nachrichten“, keine Eingabe. Wird es wieder privat: „Dieses Gespräch ist wieder privat.“ · „Zum Projektchat“.

### Karte (Aufgabe) mit eigenem Gespräch
- Kopf: Titel, Status (Offen · In Arbeit · Zum Freigeben · Erledigt), Zuständig.
- **Ein Kasten „Jetzt“** mit genau einem nächsten Schritt in Klartext und höchstens einem Knopf:
  - Agent arbeitet: „Otto arbeitet daran.“ (Stopp an der Kette)
  - Änderung liegt vor: „Ansehen“ öffnet die Änderung (Dateien, Unterschiede, Vorschau falls eingerichtet), darin
    „Freigeben“ oder „Zurück an Otto“ (mit kurzer Notiz, die als Nachricht im Gespräch landet).
  - Freigegeben: „Übernehmen“ (bringt die Änderung in den gemeinsamen Code). Beim ersten Mal im Projekt fragt Studio
    vorher **„Wo soll man das Ergebnis sehen?“**: ○ **Bei uns ansehen** (Studio baut nach jedem Übernehmen den
    aktuellen Stand unter einer festen Adresse) · ○ **Wir stellen es selbst online**. Danach nicht mehr; ändern geht in der Projektinfo.
    Bei „Wir stellen es selbst online“ nach dem Übernehmen: „Ist jetzt online“. (Eigener Hoster wie Hostinger: später.)
  - Code des Projekts noch nicht da: „GitHub einrichten“ (führt zur Projektinfo).
  - Das erste Mal, dass das Team für dich Code ändern soll: „Damit Otto für dich programmieren kann, verbinde einmal
    dein ChatGPT. Gilt danach für alle Agenten.“ Knopf „Mit ChatGPT verbinden“, direkt im Kasten.
  - Sonstige Aufgabe: „Erledigt“.
- Darunter **das Gespräch** inklusive Agent ↔ Agent, Kette mit Zähler, Stopp, Weitermachen.
  Antwortet ein Kollege auf eine Aufgabe, die ihm ein Agent gegeben hat, ist seine Antwort das Ergebnis der Aufgabe; sie steht dann auf „Zum Freigeben“ bzw. „Fertig – bitte abschliessen“. Im Projektchat steht dazu nur eine kurze Zeile.
- Hat die Entwicklung schon gearbeitet, steht unter dem Kasten eine leise Zeile **Verbrauch** („Verbrauch der Entwicklung (3 Aufträge): 120 Tsd. neu gelesen · 80 Tsd. aus dem Zwischenspeicher · 4 Tsd. geschrieben“). Die Zahlen meldet Codex pro Lauf; Studio addiert sie pro Aufgabe. Ohne Meldung steht keine Zeile.
- „Worum es geht“ (Beschreibung, Fertig wenn) eingeklappt oben.
- ⋯ : Bearbeiten (Titel, Beschreibung, Fertig wenn), Wieder öffnen, Löschen (nur Ersteller/Admin).

### Projektinfo
- Name, Ziel, Bild. Zahlen: Offen · Bei dir · Zum Freigeben. „Vorschau öffnen“, nur wenn eine läuft.
- **Team**: Agenten (Name, Job) und Menschen (Name, Rolle). Tippen: Profil bzw. „Privat schreiben“. „+ Team erweitern“ öffnet wie im Projektchat denselben Dialog. Wenn du Personen einladen darfst, öffnet sich die Personenauswahl direkt. Falls du auch Agenten einstellen darfst, kannst du im selben Fenster zu „Agent einstellen“ wechseln.
  - Die Projektleitung wählt über „Team erweitern“ → „Person einladen“ ein vorhandenes Studio-Konto oder erstellt über „Ins Projekt einladen“ → „Einladungslink erstellen“ einen einmaligen Link für ein neues Konto. Die Person kommt beim Annehmen direkt in dieses Projekt. Der Link gilt wie bisher 24 Stunden. Offene Links lassen sich hier ansehen und über „Zurücknehmen“ sperren.
  - Pro Person eine Rolle. „Leitet das Projekt“, „Macht mit“ oder „Schaut nur zu“ (mitlesen). Die Projektleitung kann über „Ändern“ Rollen ändern und „Aus dem Projekt nehmen“. Mindestens eine Person leitet das Projekt. Wer bisher dabei ist, bleibt dabei.
  - „Du siehst Chat, Aufgaben mit Gesprächen, Wissen und Team in deinen Projekten. Andere Projekte bleiben verborgen, fremde private Chats auch, solange sie nicht fürs Team sichtbar gemacht wurden.“
- **Code**: „GitHub einrichten“ (Projekt-Admin). Ein Feld „Link zu deinem Projekt auf GitHub“ mit der Erklärung „Öffne dein Projekt auf GitHub und kopiere den Link aus der Browserzeile.“
  - „Noch kein Projekt auf GitHub? Auf GitHub anlegen“. Danach den Link einfügen und „Verbinden“.
  - Braucht GitHub noch eine Erlaubnis, steht dort genau ein Knopf „Zugriff bei GitHub erlauben“.
  - Danach richtet Studio **von selbst** den Arbeitsplatz ein (Tests und Vorschau erkennen, Probelauf). Zu sehen ist nur
    eine Zeile: „Code: name/projekt · Arbeitsplatz wird eingerichtet …“, dann „… · bereit“.
  - Findet Studio keine Tests (leerer Code oder unbekannter Aufbau): „Noch keine Tests gefunden. Das Team kann trotzdem
    anfangen; Änderungen schaust du dann selbst an.“ Knopf „So anfangen“. Später „Neu einrichten“, sobald es Tests gibt.
  - Klappt etwas nicht: ein Satz, was los ist, und „Nochmal“.
  - Darunter immer eine Zeile **„Ergebnis: bei uns ansehen · ändern“** (bzw. „wir stellen es selbst online“ / „noch offen“).
- **Ansehen**: Bei „Bei uns ansehen“ steht oben in der Projektinfo der Knopf **„Ansehen ›“**. Er öffnet den aktuellen Stand
  unter der festen Adresse `studio-preview.schmaqq.com/ansehen/<projektname>-<kurzer schlüssel>/`. Eigene Domain, damit
  der Code der Website nie an Studio-Anmeldungen kommt; der kurze Schlüssel macht die Adresse unerratbar (wer sie hat,
  kann sie öffnen). „Neuer Link“ macht die alte Adresse ungültig. Während gebaut wird: „Wird gebaut …“.
- **Bereich** (nur bei mehreren Projekten auf demselben Repository): Pfade + „Gleiches Repository wie …“.
- **Wissen**: Projektdokumente, die Agenten lesen (Liste, + Dokument).
- **Wer darf was**: Nur die Freigaberegel „Zweite Person gibt frei“ oder „Projektleitung darf allein freigeben“.
- ⋯ : Projekt umbenennen, Archivieren.

### Agent einstellen (Team erweitern)
Ein Schritt: **Job wählen** (Entwicklung, Oberflächen, Recherche, Prüfung, Sicherheit, Strategie, Gestaltung und Text,
Kundendienst), jeder mit einem Satz, was er tut. Name ist vorgeschlagen, änderbar. „Einstellen“. Belegte Jobs sind
ausgegraut („Otto macht das schon“), bei 6 im Team: „Das Team ist voll.“
Alternative oben: „Lieber Herrn Grau fragen“ (öffnet seinen Direktchat).

### Agentenprofil
Bild, Name, Job mit Satz „Was er tut“, Persönlichkeit (änderbar), „Privat schreiben“. Unter „Erweitert“ **Modell und Denkstufe** für das Gespräch und, bei Agenten die Code ändern, getrennt dafür „Beim Programmieren“ (leer = Standard). Das Modell wählt man aus der Liste oder tippt einen anderen Namen ein; die Denkstufen zeigen nur, was das gewählte Modell kann.
„Bild ändern“. Admin: „Kündigen“ (Herr Grau nicht). Keine Rechte-Häkchen.

### Mein Konto
- Übersicht mit **Profil**, **Sicherheit**, **KI-Zugänge**, **Deine Daten** und für den Inhaber **Studio verwalten**. Jeder Bereich öffnet sich einzeln. Zurück führt zur Kontoübersicht.
- **Profil**: Name und Anmeldung, „Foto auswählen“, „Foto speichern“, „Foto entfernen“ und Vorschau. Im Projekt sieht das Team das Foto in Chat und Team. Ohne Foto stehen die Initialen.
- **Sicherheit**: Passwort ändern und Abmelden.
- **KI-Zugänge**: zwei Anmeldungen, beide macht die Person selbst, jede einmal: **„Gespräche und Recherche“** (damit die Agenten antworten) und **„ChatGPT fürs Programmieren“**. Beide: „Mit ChatGPT verbinden“, Seite öffnen, Code eintippen. Fragst du einen Agenten, arbeitet er mit deinem Zugang. Für Programmierarbeit fragt Studio beim ersten Mal auch in der Aufgabe nach, falls die Verbindung fehlt. Sind alle Plätze für die Chat-Anmeldung vergeben, steht „Bitte frag den Inhaber von Studio“.
- **Deine Daten**: „Datenauszug herunterladen“ mit sichtbaren Projekten, Aufgaben, Dokumenten und bis zu 500 Nachrichten.
- **Studio verwalten** (Inhaber): Abschnitt **KI-Modelle** (Liste, aus der die Agentenprofile wählen: Modell mit Anzeigename und Denkstufen hinzufügen, aus- und einschalten, entfernen; neue Modelle brauchen kein Update von Studio) und Team, „Entfernen“, offene Einladungen mit „Zurücknehmen“ und Vorschläge. Beim „Einladen“ sind unter „Für welche Projekte?“ die aktiven Projekte, die der Inhaber leitet, einzeln auswählbar. Ohne Auswahl ist es eine Einladung ins Studio. Der Link wird kopiert und direkt an die Person geschickt.

### Projekte und Archiv
Aktive und archivierte Projekte, Wiederherstellen. Ein alter Link oder Browser-Zurück zeigt „Dieses Projekt ist archiviert“ mit „Archiv öffnen“.

### So funktioniert Studio
Vier Schritte mit Bildern: 1. Ziel sagen → 2. Herr Grau plant und verteilt → 3. Das Team arbeitet, du siehst alles im
Gespräch → 4. Du gibst frei. Darunter: Agenten holen (@Name, Antworten, Markieren, Direktchat), „Das Team“ (Agent einstellen, Einladungen, Sichtbarkeit), **Agenten einstellen** (Profil, Modell, Denkstufe, Modellliste des Inhabers), Grenzen und Kosten (Ketten, wer zahlt, Verbrauch), **Dein ChatGPT verbinden** (zwei Verbindungen, ein Konto; Chat und Code; jede Person für sich) und „Damit das Team Code ändern kann“. Wo es einen Ort in der App gibt, steht ein Link darunter (KI-Zugänge, KI-Modelle verwalten für den Inhaber, Zu deinen Projekten). Die Anleitung in `docs/ANLEITUNG.md` und diese Seite werden zusammen geändert.

## Desktop
Start (Zentrale), Mein Konto, Anleitung, Archiv: volle Breite, keine Seitenspalte.
Im Projekt: links schmal die Gespräche dieses Projekts (siehe „Gespräche“). Mitte: Projektchat, Direktchat oder fürs Team sichtbares Gespräch. Rechts: Projektinfo oder die geöffnete Karte.
Handy und Desktop haben dieselben Funktionen; nur die Anordnung ist anders.

## Nicht in der App (bewusst)
Datei-Editor, Testlauf-Knöpfe, eigenes ChatGPT als Connector, lokale Rechner, Gerätetokens, JSON-Konfiguration,
Deploy-Keys, Rechte-Häkchen pro Agent, „Bisherige Ansicht“. Der Server kann vieles davon weiter; es kommt
nur über diese Liste zurück.
