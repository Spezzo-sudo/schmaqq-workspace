# So funktioniert Studio

Dieselben Inhalte wie in der App unter **Menü → So funktioniert Studio** (`studio/ui/account.tsx`). Ändert beides zusammen.
Welche Bildschirme und Knöpfe es gibt, steht verbindlich in [OBERFLAECHE.md](OBERFLAECHE.md).

## In vier Schritten

1. **Ziel sagen.** Leg ein Projekt an und schreib Herrn Grau, eurer Projektleitung, was ihr erreichen wollt.
2. **Herr Grau plant.** Er schlägt einen Plan mit wenigen Aufgaben vor und sagt, wer sie macht. Fehlt jemand, schlägt er
   vor, wen ihr einstellt. Du nimmst an oder lehnst ab. Nach dem Annehmen legen die Genannten von selbst los.
3. **Das Team arbeitet.** Jede Aufgabe hat ihr Gespräch. Dort siehst du, wer gerade was macht: Otto ändert den Code,
   Eule sucht im Internet, Frau Kern prüft. Ist Otto fertig, schreibt er, was er geändert hat, und Frau Kern wird gefragt.
4. **Du gibst frei.** Ist eine Änderung fertig, tippst du „Ansehen“, schaust sie an und gibst frei oder gibst sie mit
   einem Satz zurück. Danach „Übernehmen“. Wenn ihr selbst online stellt, zum Schluss „Ist jetzt online“.

## Agenten holen

- **@Name** im Chat: genau dieser Agent antwortet. Ohne @Name schweigen alle.
- **Markieren:** lange auf eine Nachricht drücken (oder den Stift neben dem Eingabefeld), weitere antippen, einen Agenten
  wählen und sagen, was er damit tun soll. Er liest nur diese.
- **Antworten:** unter jeder Nachricht eines Agenten steht „Antworten“. Dann antwortet dieser Agent, auch ohne @Name.
- **Privat:** oben auf ein Bild tippen öffnet den Einzelchat. Was dort zur Aufgabe wird, erscheint als Karte im Projekt.

## Das Team

Jeder Agent hat einen Job: Entwicklung ändert Code, Recherche sucht im Internet, Prüfung prüft Änderungen. Herr Grau
leitet und stellt ein. Höchstens sechs im Team, pro Job einer. Einstellen über „Team erweitern“ → „Agent einstellen“ (Job wählen, Name ist vorgeschlagen) oder Herrn Grau fragen.

## Agenten einstellen

Jeder Agent ist einzeln einstellbar: Bild lange drücken oder im Einzelchat auf Bild und Namen tippen. Name, Bild, Persönlichkeit; unter **Erweitert** das KI-Modell und die Denkstufe, getrennt für das Gespräch und (bei Agenten, die Code ändern) für das Programmieren. „Standard“ lässt es offen. Stärkere Modelle und höhere Stufen kosten mehr vom Kontingent. Die Modellliste pflegt der Inhaber unter **Mein Konto → Studio verwalten → KI-Modelle**; neue Modelle brauchen kein Update von Studio.

## Grenzen und Kosten

Agenten geben Arbeit höchstens eine Stufe weiter und antworten pro Auftrag höchstens sechsmal, dann fragt Studio
„Weitermachen?“. Stopp geht jederzeit. Wer einen Agenten fragt, zahlt mit dem eigenen KI-Zugang, auch für
weitergegebene Schritte. Hat die Entwicklung gearbeitet, steht an der Aufgabe eine Zeile **Verbrauch** (neu gelesen, aus dem Zwischenspeicher, geschrieben).

## Dein ChatGPT verbinden

**Zwei Verbindungen, ein Konto.** Gespräche und Recherche laufen auf einem Weg, das Ändern von Code auf einem anderen; jeder Weg braucht seine Anmeldung. Es ist dasselbe ChatGPT-Konto und dasselbe Nutzungslimit, keine doppelten Kosten.

- **Chat und Recherche:** richtet der Betreiber einmal pro Person auf dem Server ein. Unter **Mein Konto → KI-Zugänge** steht, ob er bereit ist. Bei „Noch nicht eingerichtet“ dem Inhaber Bescheid sagen.
- **Code ändern:** einmal pro Person unter **Mein Konto → KI-Zugänge → Mit ChatGPT verbinden** (Seite öffnen, Code eintippen), oder direkt in der Aufgabe. Gilt für alle Agenten und Projekte.
- **Jede Person für sich:** Wer einen Agenten anstößt, arbeitet mit dem eigenen ChatGPT und verbraucht das eigene Limit. Niemand nutzt den Zugang eines anderen, auch nicht im selben Projekt.

## Damit das Team Code ändern kann

- **Einmal pro Projekt** (Projekt-Admin): Projektinfo → „Code“ → **„GitHub einrichten“**. Öffne dein Projekt auf GitHub und kopiere den Link aus der Browserzeile. Wenn du noch keins hast, wähle „Auf GitHub anlegen“. Füge den Link ein und tippe auf „Verbinden“.
  Den Arbeitsplatz für das Team richtet Studio danach selbst ein. Findet es noch keine Tests, tippst du „So anfangen“.
- **Einmal pro Person:** das ChatGPT für das Ändern von Code (siehe „Dein ChatGPT verbinden“). Studio fragt auch direkt in der Aufgabe danach.
- **Beim ersten Übernehmen** fragt Studio einmal: **Wo soll man das Ergebnis sehen?**
  - **Bei uns ansehen:** Studio baut nach jedem Übernehmen den aktuellen Stand und zeigt ihn unter einer festen Adresse
    (`studio-preview.schmaqq.com/ansehen/<projekt>-<schlüssel>/`). Wer die Adresse hat, kann sie öffnen; „Neuer Link“ in
    der Projektinfo macht die alte ungültig. Geht für Websites, die sich als Dateien bauen lassen.
  - **Wir stellen es selbst online:** Jemand macht es von Hand und tippt danach „Ist jetzt online“.
  Ändern jederzeit in der Projektinfo unter „Code“ → „Ergebnis … ändern“. Eigener Hoster (z. B. Hostinger) kommt später.

## Wer darf was

Beim Anlegen eines Projekts kannst du unter „Wer ist dabei?“ Menschen mit Studio-Konto auswählen. Ohne Auswahl beginnst du allein.
Wer das Projekt leitet, kann über **„Team erweitern“ → „Person einladen“** ein vorhandenes Konto dazunehmen oder einen Link für ein neues Konto erstellen.
Der Link gilt 24 Stunden und einmal. Sobald die Person ihr Konto anlegt, ist sie im Projekt und kann direkt anfangen.
Unter **Mein Konto → Team** kann der Inhaber auch mehrere Projekte auswählen oder nur ins Studio einladen. Eine Einladung ohne Projekt erlaubt der Person, eigene Projekte anzulegen.

Du siehst Chat, Aufgaben mit Gesprächen, Wissen und Team in deinen Projekten, während andere Projekte und fremde private Chats mit Menschen oder Agenten verborgen bleiben.

- **Leitet das Projekt** kann Menschen dazunehmen, ihre Rolle ändern und sie aus dem Projekt nehmen.
- **Macht mit** kann schreiben, Aufgaben bearbeiten und Änderungen freigeben.
- **Schaut nur zu** kann mitlesen.
- Unter **„Wer darf was“** steht die Freigaberegel. Entweder gibt eine zweite Person frei oder die Projektleitung darf allein freigeben.
