# Oberfläche: die vollständige Liste (verbindlich)

Stand 18.11.2026, mit dem Owner abgestimmt. Ergänzt [CONCEPT_MESSENGER.md](CONCEPT_MESSENGER.md).
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

## Bildschirme

### Anmelden
Anmeldung, Einladung annehmen, Passwort vergessen. Sonst nichts.

### Start
- Oben links: dein Avatar (öffnet das Menü). Oben rechts: SCHMAQQ Studio.
- Oben eine Begrüßung mit einem Satz, was gerade ansteht.
- **Wartet auf dich**: Karten, bei denen du dran bist (Freigeben, Vorschlag annehmen). Nur wenn es welche gibt.
- **Projekte**: eine Karte pro Projekt (Name, letzte Nachricht, offene Aufgaben, zum Freigeben, Zähler ungelesen). Tippen öffnet den Projektchat.
- Darunter ein Tipp „So geht es weiter“ mit Link zur Anleitung.
- Private Nachrichten mit Menschen gehören zum Projekt (Projektinfo → Person antippen); ihre Zähler stehen in der Projektzeile.
- Leer: „Noch kein Projekt. Ein Projekt ist ein Chat mit deinem Team aus Menschen und Agenten.“ Knopf „Projekt anlegen“.
- **Projekt anlegen**: Name, Ziel. Fertig. Herr Grau ist automatisch dabei.

### Menü (hinter dem Avatar)
Mein Konto · Projekt anlegen · Jemanden einladen · Projekte und Archiv · So funktioniert Studio · Abmelden.
Darunter der Zustand des KI-Zugangs (bereit / nicht erreichbar).

### Projekt
- **Kopf**: Zurück, Projektname (tippen öffnet Projektinfo), darunter „2 Menschen · 3 Agenten“.
- **Team-Leiste**: rundes Bild je Agent mit Namen und Job darunter (Herr Grau: „Leitung“), danach die Menschen (du als „Du“). Tippen öffnet den Direktchat,
  grüner Punkt = arbeitet gerade, Zähler = ungelesen. Am Ende „+ Einstellen“.
- **Reiter**: Chat · Aufgaben.
- **Chat**: Nachrichten, Karten, Markierungen. Eingabe „Nachricht … (@Name holt einen Agenten)“.
  Leerer Chat: Herr Grau stellt sich vor: „Ich bin Herr Grau, eure Projektleitung. Sagt mir, was ihr erreichen wollt:
  Ich mache einen Plan, verteile die Arbeit im Team und stelle ein, wen wir noch brauchen.“ Knopf „@Herr Grau“.
- **Lange drücken** auf eine Nachricht: Markieren → „Agent fragen“; Kopieren.
- **Aufgaben**: alle Karten als Liste in drei Gruppen: Bei dir · Läuft · Erledigt. Knopf „+ Aufgabe“ (Titel, Fertig wenn, Art: Code oder Sonstiges).

### Direktchat mit einem Agenten oder Menschen
Kopf: Bild, Name, Job, „privat“. Leer: der Agent stellt sich in einem Satz mit seinem Job vor.
Antworten können „Im Projekt teilen“. Tippen auf Bild/Name im Kopf öffnet das Profil.
Mit einem Menschen: Kopf mit Name und „privat“; nur die beiden lesen mit.

### Karte (Aufgabe) mit eigenem Gespräch
- Kopf: Titel, Status (Offen · In Arbeit · Zum Freigeben · Erledigt), Zuständig.
- **Ein Kasten „Jetzt“** mit genau einem nächsten Schritt in Klartext und höchstens einem Knopf:
  - Agent arbeitet: „Otto arbeitet daran.“ (Stopp an der Kette)
  - Änderung liegt vor: „Ansehen“ öffnet die Änderung (Dateien, Unterschiede, Vorschau falls eingerichtet), darin
    „Freigeben“ oder „Zurück an Otto“ (mit kurzer Notiz, die als Nachricht im Gespräch landet).
  - Freigegeben: „Übernehmen“ (bringt die Änderung in den gemeinsamen Code). Beim ersten Mal im Projekt fragt Studio
    vorher **„Wie kommt eine Änderung online?“**: ○ Geht von selbst online · ○ Wir stellen sie selbst online. Danach nie wieder.
    Bei „Wir stellen sie selbst online“ nach dem Übernehmen: „Ist jetzt online“.
  - Code des Projekts noch nicht da: „Wo liegt euer Code?“ (führt zur Frage in der Projektinfo).
  - Das erste Mal, dass das Team für dich Code ändern soll: „Damit Otto für dich programmieren kann, verbinde einmal
    dein ChatGPT. Gilt danach für alle Agenten.“ Knopf „Mit ChatGPT verbinden“, direkt im Kasten.
  - Sonstige Aufgabe: „Erledigt“.
- Darunter **das Gespräch** inklusive Agent ↔ Agent, Kette mit Zähler, Stopp, Weitermachen.
- „Worum es geht“ (Beschreibung, Fertig wenn) eingeklappt oben.
- ⋯ : Bearbeiten (Titel, Beschreibung, Fertig wenn), Wieder öffnen, Löschen (nur Ersteller/Admin).

### Projektinfo
- Name, Ziel, Bild. Zahlen: Offen · Bei dir · Zum Freigeben. „Vorschau öffnen“, nur wenn eine läuft.
- **Team**: Agenten (Name, Job) und Menschen (Name, Rolle). Tippen: Profil bzw. „Privat schreiben“. „+ Einstellen“, „+ Mensch einladen“.
- **Code**: genau eine Frage, **„Wo liegt euer Code?“** (Projekt-Admin; alle anderen: „Legt der Projekt-Admin fest.“)
  - ○ **Neu anfangen**: „Leg auf GitHub ein leeres Repository an (privat, mit README) und trag die Adresse ein.“
  - ○ **Vorhandener Code**: „Trag die GitHub-Adresse ein.“
  - Braucht GitHub noch eine Erlaubnis, steht dort genau ein Knopf „Zugriff bei GitHub erlauben“.
  - Danach richtet Studio **von selbst** den Arbeitsplatz ein (Tests und Vorschau erkennen, Probelauf). Zu sehen ist nur
    eine Zeile: „Code: name/projekt · Arbeitsplatz wird eingerichtet …“, dann „… · bereit“.
  - Findet Studio keine Tests (leerer Code oder unbekannter Aufbau): „Noch keine Tests gefunden. Das Team kann trotzdem
    anfangen; Änderungen schaust du dann selbst an.“ Knopf „So anfangen“. Später „Neu einrichten“, sobald es Tests gibt.
  - Klappt etwas nicht: ein Satz, was los ist, und „Nochmal“.
- **Bereich** (nur bei mehreren Projekten auf demselben Repository): Pfade + „Gleiches Repository wie …“.
- **Wissen**: Projektdokumente, die Agenten lesen (Liste, + Dokument).
- **Wer darf was**: Rollen der Menschen; „Zweite Person gibt frei“ oder „Admin darf allein freigeben“.
- ⋯ : Projekt umbenennen, Archivieren.

### Agent einstellen (+ Einstellen)
Ein Schritt: **Job wählen** (Entwicklung, Oberflächen, Recherche, Prüfung, Sicherheit, Strategie, Gestaltung und Text,
Kundendienst), jeder mit einem Satz, was er tut. Name ist vorgeschlagen, änderbar. „Einstellen“. Belegte Jobs sind
ausgegraut („Otto macht das schon“), bei 6 im Team: „Das Team ist voll.“
Alternative oben: „Lieber Herrn Grau fragen“ (öffnet seinen Direktchat).

### Agentenprofil
Bild, Name, Job mit Satz „Was er tut“, Persönlichkeit (änderbar), „Privat schreiben“. Unter „Erweitert“ das KI-Modell (nur die freigeschalteten).
„Bild ändern“. Admin: „Kündigen“ (Herr Grau nicht). Keine Rechte-Häkchen.

### Mein Konto
- Name, Anmeldung, Passwort ändern, Abmelden.
- **KI-Zugang**: bereit / nicht erreichbar, ein Satz Erklärung („Fragst du einen Agenten, arbeitet er mit deinem Zugang“).
- **ChatGPT fürs Programmieren**: verbunden / verbinden (einmal, gilt für alle Agenten). Wird sonst erst gefragt, wenn es gebraucht wird.
- **Team** (Inhaber): Wer dabei ist, Einladungen, Vorschläge.
- **Deine Daten**: Alles herunterladen.

### Projekte und Archiv
Aktive und archivierte Projekte, Wiederherstellen.

### So funktioniert Studio
Vier Schritte mit Bildern: 1. Ziel sagen → 2. Herr Grau plant und verteilt → 3. Das Team arbeitet, du siehst alles im
Gespräch → 4. Du gibst frei. Darunter: Agenten holen (@Name, Markieren, Direktchat), Grenzen (Ketten, wer zahlt).

## Desktop
Links schmal: Projekte und Direktnachrichten. Mitte: Projektchat bzw. Direktchat. Rechts: Projektinfo oder die geöffnete Karte.

## Nicht in der App (bewusst)
Datei-Editor, Testlauf-Knöpfe, eigenes ChatGPT als Connector, lokale Rechner, Gerätetokens, JSON-Konfiguration,
Deploy-Keys, Rechte-Häkchen pro Agent, „Bisherige Ansicht“. Der Server kann vieles davon weiter; es kommt
nur über diese Liste zurück.
