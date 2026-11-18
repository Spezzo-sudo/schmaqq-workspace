# Konzept: Studio als Messenger (verbindlich)

Fassung 2, Stand 17.11.2026. Abgestimmt mit dem Owner. Löst Fassung 1 und PR #95 als Richtung ab.
**Was hier nicht steht, wird nicht gebaut.** Neue Ideen kommen unter „Später“ und ins
[Entscheidungsprotokoll](DECISIONS.md), nicht in den laufenden Bau.
Skizze: [concept/konzept-v2.png](concept/konzept-v2.png). Jeder Bildschirm und Knopf im Einzelnen: [OBERFLAECHE.md](OBERFLAECHE.md).

## Der Kern in einem Satz

**Ein Projekt ist ein Chat für Menschen. Agenten schweigen, bis man sie bewusst holt.
Alles, was zu Arbeit wird, erscheint als Karte in diesem Chat.**

## Drei Bausteine

| Baustein | Was es ist | Wer sieht es |
|---|---|---|
| **Projektchat** | Der eine Chat pro Projekt. Menschen schreiben normal; kein Agent antwortet ungefragt. | alle im Projekt |
| **Direktchat** | Privat mit einem Agenten (jedem, nicht nur der Projektleitung) oder einem Menschen. | nur die zwei |
| **Karte** | Plan, Aufgabe, Ergebnis, Vorschau. Steht im Projektchat und hat ein eigenes Gespräch. Eine Karte wird zur Aufgabe, sobald es ein prüfbares Ziel gibt. | alle im Projekt |

Agenten und Menschen sind **Mitglieder** des Projekts (Projektinfo). Die Projektleitung (anfangs Herr Grau) plant
und verteilt, ist aber kein Pflicht-Umweg.

## Regeln

1. **Agenten schweigen im Projektchat**, bis man sie holt. Kein automatisches Mitreden.
2. **Einen Agenten holen**, drei Wege:
   - **@Name** im Projektchat: nur dieser Agent antwortet.
   - **Nachrichten markieren**: lange drücken, mehrere wählen, „Agent fragen“, Agent wählen, kurz sagen was.
     Die gewählten Nachrichten bekommen eine farbige Markierung. Der Agent liest **nur diese** (sparsam, genau).
   - **Direktchat** mit dem Agenten.
3. **Arbeit wird immer sichtbar:** Wird aus einem Direktchat ein Plan, eine Aufgabe, ein Ergebnis oder eine Vorschau,
   erscheint automatisch eine Karte im Projektchat („aus Marcos Gespräch mit Herr Grau“). Zusätzlich „Im Projekt teilen“
   für einzelne Antworten. Direktchats bleiben sonst privat.
4. **Agenten untereinander** nur im Gespräch einer Karte, für alle lesbar. Grenzen:
   höchstens 2 Ebenen (A → B, B gibt nicht weiter), höchstens 6 Agenten-Antworten pro Auftrag, dann hält die Kette an und
   fragt „Weitermachen?“. Zähler „3 von 6“ und „Stopp“ für die ganze Kette an der Karte.
5. **Wer anstößt, zahlt**, auch für weitergegebene Schritte. An der Karte sichtbar.
6. **Was ein Agent weiß:** im Projektchat die markierten bzw. erwähnenden Nachrichten plus offene Aufgaben; im Direktchat
   dieses Gespräch plus Projektstand; an einer Karte deren Gespräch. Nie den ganzen Verlauf.
7. **Kein Motor- oder Modellname** in der Oberfläche (nur unter „Erweitert“ im Agentenprofil).
8. **Ehrlich, was ein Agent kann:** Das Profil zeigt unter „Kann“ nur, was wirklich freigeschaltet ist
   (heute: Projekt lesen, Aufgaben vorschlagen, Pläne vorschlagen für die Projektleitung, in einer Aufgabe einen anderen Agenten fragen; mit Freigabe: Code in der eigenen Arbeitskopie ändern, öffentliche Webseiten lesen).

## Bildschirme

**Handy** (eine Ebene pro Bildschirm)
- **Start:** „Wartet auf dich“, dann **nur die Projekte**, eine Zeile pro Projekt (führt in den Projektchat; die Zahl
  zählt auch Ungelesenes aus Direktchats mit den Agenten dieses Projekts). Direktchats mit Menschen als **eine**
  eingeklappte Zeile „Direktnachrichten“. Agenten-Direktchats stehen nie auf dem Start.
  Avatar oben links öffnet das Menü (Konto, Neues Projekt, Einladen, KI-Zugang, Projekte und Archiv, Anleitung).
- **Projekt:** Kopf mit Projektname (Tipp öffnet Projektinfo), darunter die **Agentenleiste**: rundes Bild je Agent,
  Tipp öffnet den Direktchat, lange drücken das Profil, grüner Punkt = arbeitet gerade, Zähler = ungelesen, (+) Agent
  anstellen. Darunter zwei Reiter: **Chat** (Nachrichten, Karten, markierte Nachrichten; Eingabe „Nachricht …
  (@Name holt einen Agenten)“) und **Aufgaben** (alle Karten als Liste: bei dir, läuft, erledigt).
- **Karte:** Status, Zuständige, Vorschau, darunter das Gespräch der Karte inklusive Agent ↔ Agent.
- **Projektinfo:** Jetzt (offen, bei dir, Prüfung, Vorschau), Mitglieder (Tipp: Profil oder „Privat schreiben“),
  Aufgaben, Ergebnisse, Einstellungen, ⋯ Archivieren.

**Desktop** (alles nebeneinander, die Breite wird genutzt)
- Links schmal: Projekte mit Zählern und Direktchats.
- Mitte: Projektchat.
- Rechts: Projektinfo (Mitglieder, Jetzt, offene Karten). Eine angetippte Karte öffnet sich rechts mit ihrem Gespräch.

## Ein Repository, mehrere Projekte

Mehrere Projekte dürfen auf dasselbe Repository zeigen (z. B. Frontend und Backend). Damit sie sich nicht in die Quere
kommen:
- Jedes Projekt hat einen **Zuständigkeitsbereich** (Pfade, z. B. `frontend/`).
- Will eine Aufgabe Dateien außerhalb ändern, warnt Studio und nennt das Nachbarprojekt.
- Gemeinsame Teile (Schnittstellen) bekommen eine Karte, die beide Projekte sehen.
- Projektinfo zeigt „Gleiches Repository wie: …“.
Änderungen laufen wie heute über eigene Branches und Pull Requests; Git meldet echte Konflikte beim Zusammenführen.
**Das ist Voraussetzung für Programmierläufe durch Agenten (Schritt 5).**

## Bauplan

Jeder Schritt: eigener Pull Request, Prüfung auf dem Pilot (Handy und Desktop), dann „merge“ und „JA LIVE“.

1. ✅ live · **Start und Desktop-Gerüst:** nur Projekte auf dem Start, Menü hinter dem Avatar, KI-Zugang mit Status,
   Agentenleiste und Reiter Chat | Aufgaben im Projekt, Desktop mit drei Spalten, Projektinfo (aus PR #95 übernommen).
2. ✅ live · **Projektchat und Direktchats:** Agenten schweigen, @Name holt genau einen Agenten, Direktchat mit jedem Agenten.
3. ✅ live · **Karten:** Plan, Aufgabe, Ergebnis, Vorschau als Karten mit eigenem Gespräch; automatische Karte aus Direktchats;
   „Im Projekt teilen“.
4. ✅ live · **Markieren und Weitergabe:** Nachrichten markieren → „Agent fragen“; Agent ↔ Agent an der Karte mit Grenzen,
   Zähler und Stopp.
5. ✅ live · **Agenten machen wirklich etwas:** zuerst Zuständigkeitsbereiche pro Projekt mit Warnung; dann Programmierläufe mit
   persönlicher Anmeldung über den Launcher (eigener Sicherheits-PR) und Webrecherche als Werkzeug für Agenten.

## Später (nicht im laufenden Bau)

- Eigene Rechner als Agenten-Worker; weitere Anbieter (API-Schlüssel, OpenRouter) mit Modellen pro Worker.
- Projektakte (dauerhaftes Projektwissen).
- Antworten Wort für Wort.
- ~~Dauerhafte Vorschau des gemeinsamen Stands pro Projekt~~ → gebaut als „Bei uns ansehen“ (18.11.2026).
- Eigener Hoster (z. B. Hostinger) als Ergebnis-Ort.
- **Hilfe-Bot** (Owner, 18.11.2026): eine Blase „Fragen?“ auf jeder Seite. Kennt Konzept, Anleitung, Entscheidungen und die
  offene Seite (Ist-Zustand aus den Dokumenten im Repository, also mit jedem Update aktuell), erklärt Wege und Gründe,
  arbeitet nicht mit (keine Aufgaben, kein Code). Läuft über den vorhandenen KI-Zugang der Person, keine eigene Anmeldung.
- **Ein Schlüssel pro Person** (Owner, 18.11.2026): Programmierläufe leihen sich eine kurzlebige Kopie des vorhandenen
  Zugangs statt einer zweiten Anmeldung (Test mit echtem Login steht aus).
