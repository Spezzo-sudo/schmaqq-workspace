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
- **Privat:** oben auf ein Bild tippen öffnet den Einzelchat. Was dort zur Aufgabe wird, erscheint als Karte im Projekt.

## Das Team

Jeder Agent hat einen Job: Entwicklung ändert Code, Recherche sucht im Internet, Prüfung prüft Änderungen. Herr Grau
leitet und stellt ein. Höchstens sechs im Team, pro Job einer. Einstellen über „+ Einstellen“ oder Herrn Grau fragen.

## Grenzen und Kosten

Agenten geben Arbeit höchstens eine Stufe weiter und antworten pro Auftrag höchstens sechsmal, dann fragt Studio
„Weitermachen?“. Stopp geht jederzeit. Wer einen Agenten fragt, zahlt mit dem eigenen KI-Zugang, auch für
weitergegebene Schritte.

## Damit das Team Code ändern kann

- **Einmal pro Projekt** (Projekt-Admin): Projektinfo → „Code“ → **„Wo liegt euer Code?“**. Neu anfangen: auf GitHub ein
  leeres Repository anlegen (privat, mit README) und die Adresse eintragen. Vorhandener Code: die Adresse eintragen.
  Den Arbeitsplatz für das Team richtet Studio danach selbst ein. Findet es noch keine Tests, tippst du „So anfangen“.
- **Einmal pro Person:** Das erste Mal, wenn Otto für dich programmieren soll, fragt Studio direkt in der Aufgabe nach
  deinem ChatGPT. Gilt danach für alle Agenten (auch unter Mein Konto).
- **Beim ersten Übernehmen** fragt Studio einmal: **Wo soll man das Ergebnis sehen?**
  - **Bei uns ansehen:** Studio baut nach jedem Übernehmen den aktuellen Stand und zeigt ihn unter einer festen Adresse
    (`studio-preview.schmaqq.com/ansehen/<projekt>-<schlüssel>/`). Wer die Adresse hat, kann sie öffnen; „Neuer Link“ in
    der Projektinfo macht die alte ungültig. Geht für Websites, die sich als Dateien bauen lassen.
  - **Wir stellen es selbst online:** Jemand macht es von Hand und tippt danach „Ist jetzt online“.
  Ändern jederzeit in der Projektinfo unter „Code“ → „Ergebnis … ändern“. Eigener Hoster (z. B. Hostinger) kommt später.

## Wer darf was

In der Projektinfo unter „Wer darf was“: Rollen der Menschen (Admin, Entwickler, Prüfer) und ob eine zweite Person
freigibt oder der Admin allein freigeben darf. Einladen, neues Passwort und Entfernen macht der Inhaber unter Mein Konto.
