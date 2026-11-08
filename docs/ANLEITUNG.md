# Anleitung: So funktioniert SCHMAQQ Studio

Für alle im Team, für Einrichter und für KI-Assistenten. Dieselben Abschnitte stehen in Studio unter
„So funktioniert Studio“ (`studio/guide.tsx`) – wer das eine ändert, ändert das andere mit.

Studio zeigt vieles erst, wenn es dran ist. Diese Anleitung zeigt den ganzen Weg im Voraus.
Am schnellsten lernt man ihn mit der **Übungsrunde**: Mein Konto → „So funktioniert Studio“ → „Übung starten“.
Das legt ein Übungsprojekt an, das nur du siehst. Darin darfst du dich selbst freigeben. Danach „Übung löschen“.

## Wo finde ich was

| Ort | Was dort ist |
|---|---|
| Arbeit | was bei dir ansteht – der nächste Schritt steht ganz oben |
| Projekte | alle Projekte; im Projekt: Übersicht, Aufgaben, Gespräch, Wissen, Einstellungen. Unten: Allgemeines Wissen |
| Gespräche | „Allgemein“ für alle, darunter die Gespräche der Projekte |
| Team | wer dabei ist; einladen (Inhaber) oder vorschlagen (alle anderen) |
| Initialen oben rechts | Mein Konto: ChatGPT verbinden, Assistenten trennen, Daten herunterladen, Abmelden, diese Anleitung |

## Der Weg einer Änderung

| # | Schritt | Wer | Was passiert | Danach erscheint |
|---|---|---|---|---|
| 1 | Projekt startklar machen | Projekt-Admin, einmal | Code auf GitHub auswählen, Werkstatt einrichten (Tests und Vorschau), Live-Weg festlegen | bei Code-Aufgaben „Änderung machen“ und die Vorschau |
| 2 | Aufgabe anlegen | Entwickler | im Projekt „+ Aufgabe“ oder im Gespräch aus einer Nachricht | die Aufgabe unter Aufgaben und bei der zuständigen Person unter „Meine Arbeit“ |
| 3 | Ändern | wer die Aufgabe übernommen hat | „Ich übernehme das“ → „Änderung machen“: selbst im Editor oder mit der eigenen KI (immer auch ohne KI möglich) | nach dem Speichern „Zur Prüfung geben“ |
| 4 | Zur Prüfung geben | wer geändert hat | Studio testet und baut eine Vorschau (ein paar Minuten) | bei den Prüfern „Bitte anschauen und freigeben“ |
| 5 | Anschauen und „Passt“ | Prüfer (zweite Person; der Admin allein, wenn das Projekt es erlaubt) | Vorschau und Änderungen ansehen, „Passt“ oder „Ändern“ mit Rückmeldung | nach „Passt“ beim Autor „Änderung übernehmen“; nach „Ändern“ ist der Autor wieder dran |
| 6 | Übernehmen | Autor oder Projekt-Admin | bei GitHub-Projekten Pull Request anlegen und zusammenführen (GitHub-Regeln gelten weiter) | der Live-Schritt |
| 7 | Live | je nach Projekt | geht von selbst live oder ihr schaltet selbst live (z. B. Hermes) und tippt „Ist jetzt live“ | Aufgabe erledigt |

Aufgaben ohne Code gehen kürzer: Ergebnis aufschreiben → anschauen und freigeben → abschliessen.

## Warum sehe ich das noch nicht?

| Knopf | Erscheint erst … |
|---|---|
| „Zur Prüfung geben“ | wenn du die Aufgabe übernommen und eine Änderung gespeichert hast |
| „Anschauen“ und „Passt“ | wenn jemand anderes etwas zur Prüfung gegeben hat – und nur mit der Rolle Prüfer |
| „Änderung übernehmen“ / „Zusammenführen“ | nach einem „Passt“ – nur für den Autor oder den Projekt-Admin |
| „Ist jetzt live“ | nach dem Übernehmen, wenn ihr selbst live schaltet |
| Vorschau, „Änderung machen“ | wenn das Projekt startklar ist (Werkstatt eingerichtet) |
| „Code auf GitHub auswählen“, Live-Weg, „Wer darf was“ ändern | nur für den Projekt-Admin (alle anderen sehen „Legt der Projekt-Admin fest“) |
| „Einladungslink erstellen“, Mitglied „Entfernen“ | nur für den Inhaber von Studio (alle anderen können vorschlagen) |
| „Aufgabe abschliessen“ | wenn alles erledigt ist: Ergebnis da, freigegeben, bei Code übernommen |

In jeder Aufgabe zeigt der Zeitstrahl oben dieselben Schritte. Antippen erklärt den Schritt und sagt bei
„Kommt noch“, was zuerst passieren muss.

## Wer darf was (pro Projekt)

| Rolle | Darf |
|---|---|
| Admin | alles im Projekt, auch Rollen, Prüfregel, Repo, Live-Weg und Übernehmen |
| Entwickler | Aufgaben anlegen, ändern, zur Prüfung geben |
| Prüfer | „Passt“ oder „Ändern“ sagen |
| Zuschauer | lesen und im Gespräch mitreden |

Der Inhaber von Studio ist überall Admin. Wer ein Projekt anlegt, ist dessen Admin; alle anderen sind zunächst
Entwickler und Prüfer. Rollen und Prüfregel („Zweite Person prüft“ oder „Admin darf allein freigeben“) stehen
unter Projekt → Einstellungen → „Wer darf was“.

## Für Einrichter und Admins

1. **Leute holen:** Team → „Jemanden einladen“ → Benutzername (z. B. `markus`) oder E-Mail eintragen →
   Link per WhatsApp schicken (gilt 24 Stunden, einmal). Die Person wählt Namen und Passwort (mind. 12 Zeichen)
   und meldet sich danach mit dem Benutzernamen und dem Passwort an. Eine E-Mail wird nicht verschickt.
   Vorschläge aus dem Team erscheinen dort mit „Einladen“ / „Ablehnen“. Offene Einladungen kann man zurücknehmen.
   **Passwort vergessen:** Team → beim Mitglied „Neues Passwort“ → Link schicken (24 Stunden, einmal).
   Eigenes Passwort ändern: Mein Konto → „Passwort ändern“.
2. **Projekt anlegen:** Projekte → „Neues Projekt“. Du bist Admin.
3. **Repo freigeben:** Projekt → Einstellungen → „Code auf GitHub auswählen“ → „Zugriff bei GitHub erlauben“.
   Wem das Repo gehört, gibt es auf GitHub selbst frei (private eingeschlossen) und kann es dort zurücknehmen.
4. **Werkstatt:** dort einrichten, wo Studio es vorschlägt (Server-Worker). Danach laufen Tests und Vorschau.
5. **Live-Weg** wählen und **Rollen** vergeben.
6. **Schutz auf GitHub:** Hauptzweig mit „Require a pull request before merging“ schützen; Studio warnt sonst.

Sicherheit im Detail: `docs/SECURITY.md`. Studio selbst live bringen: `docs/OPERATIONS.md`.
