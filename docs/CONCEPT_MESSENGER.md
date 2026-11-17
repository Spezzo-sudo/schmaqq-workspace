# Konzept: Studio als Messenger (Telegram-Prinzip)

Stand 17.11.2026. Entwurf zur Owner-Abnahme, noch nicht umgesetzt.
Anlass: UX-Prüfbericht vom 17.11.2026 („keine rote Linie, alles zusammengestückelt“).
Leitlinien: [HANDOFF-AGENTS.md](HANDOFF-AGENTS.md) (kein Motorname in der Oberfläche, Bot-HQ-Klarheit, Projektleitung als Guru).

Skizzen: [concept/studio-messenger-konzept.png](concept/studio-messenger-konzept.png)

## Grundidee in einem Satz

**Ein Projekt ist eine Gruppe.** Wie bei Telegram: Die Gruppe steht in der Chatliste, und wer oben auf ihren Namen
tippt, kommt zur Gruppen-Info. Die heißt bei uns **Projektinfo** und ist zugleich die Projektübersicht mit Mitgliedern,
Aufgaben, Vorschau, Dateien, Wissen und Einstellungen. Es gibt keinen zweiten Weg zum selben Ort.

## Die vier Orte, mehr nicht

| Ort | Erreichbar über | Inhalt |
|---|---|---|
| **Chats** | Start, Reiter oben | eine Liste: Projektgruppen, Privatchats mit Menschen und Agenten, Gruppe „Team“ |
| **Kontakte** | Reiter oben | Menschen und Agenten, nach Projekt gruppiert; von hier Privatchat oder Profil |
| **Projektinfo** | Tipp auf den Gruppennamen im Chat | Mitglieder, Aufgaben, Vorschau, Dateien, Wissen, Einstellungen |
| **Seitenmenü** | Avatar oben links | eigenes Profil, Neues Projekt, Einladen, KI-Zugang, Einstellungen, Für Entwickler |

Die untere Leiste (Chats · Agenten · Projekte · Konto) entfällt, ebenso die Filter „Alle/Gruppen/Agenten“ und der
zweite Kontozugang. Am Desktop: links die Chatliste, Mitte der Chat, rechts die Projektinfo als Spalte.

## 1. Chats (Startseite)

```
[Avatar]  SCHMAQQ Studio                    [Suche]
   Chats (3)        |        Kontakte
--------------------------------------------------
 📌 Wartet auf dich (2)                         >   nur wenn es etwas zu tun gibt
 [KF] Klimafinder                         08:12
      Herr Grau: Plan mit 3 Aufgaben …       2
 [👑] Herr Grau · Klimafinder             08:10
      arbeitet gerade … liest Projektstand        Live-Zeile, solange ein Auftrag läuft
 [MS] Markus                              gestern
 [T]  Team                                Mo
                                         [ ✎ ]  Neuer Chat / Neues Projekt
```

- Sortiert nach letzter Aktivität, Ungelesen-Zähler rechts. Projektgruppen tragen das Projektzeichen,
  Agenten ihr Bild mit Agenten-Abzeichen, die Projektleitung die Krone.
- **Wartet auf dich** ist ein angehefteter Eintrag und erscheint nur bei echten Handlungen: Plan oder Vorschlag
  entscheiden, Aufgabe prüfen, Aufgabe ist dir zugewiesen. Jede Zeile nennt Projekt und nächsten Schritt
  („Klimafinder · Plan annehmen oder ablehnen“).
- Die Suche oben durchsucht Chats, Nachrichten und Kontakte. Die Nachrichtensuche ist damit zurück.

## 2. Kontakte

```
   Chats            |        Kontakte (8)
--------------------------------------------------
 [+ Jemanden einladen]   [+ Agent anstellen]
 MENSCHEN
 [MS] Marco Speth         Inhaber
 [MK] Markus              Entwickler · 2 Projekte
 KLIMAFINDER
 [👑] Herr Grau           Projektleitung
 [M]  Mara                Recherche
 PROBEPROJEKT
 …
```

- Tipp auf einen Kontakt öffnet das **Profil** (Abschnitt 4), von dort „Nachricht schreiben“.
- Ein Agent erscheint unter jedem Projekt, zu dem er gehört. Agenten gehören zum Projekt.

## 3. Projektinfo (Gruppen-Info)

Öffnet sich mit einem Tipp auf den Gruppennamen im Chatkopf. Auf dem Handy als ganze Seite, am Desktop als rechte Spalte.

```
<  Klimafinder                              [⋯]
   Ziel: Klimaanlagen-Vergleich für die Schweiz
   [Chat]  [Vorschau]  [Aufgabe +]  [Mitglied +]
--------------------------------------------------
 JETZT
  2 offene Aufgaben · 1 wartet auf Prüfung
  Vorschau: Stand von heute 08:12          [öffnen]
 MITGLIEDER (4)                       [+ hinzufügen]
  [👑] Herr Grau   Projektleitung · Agent
  [M]  Mara        Recherche · Agent
  [MS] Marco       Admin
  [MK] Markus      Entwickler, Prüfer
 AUFGABEN                                      >
 DATEIEN UND CODE                              >
 WISSEN                                        >
 EINSTELLUNGEN                                 >   nur für Admins
```

- **Oben steht, was jetzt los ist**, nicht das Archiv: offene Aufgaben, wer dran ist, letzte Vorschau.
- **Mitglieder** sind Menschen und Agenten in einer Liste. Tipp öffnet das Profil; Admins sehen dort Rolle
  und Rechte und können sie ändern.
- **Mitglied hinzufügen** öffnet eine Auswahl:
  - **Mensch:** aus dem Team auswählen oder per Einladungslink einladen; Rolle wählen (Admin, Entwickler, Prüfer, Lesen).
  - **Agent:** neu anstellen (Rolle aus Vorlagen wie Recherche, Entwicklung, Kreation; Name, Bild, Auftrag)
    oder einen bestehenden Agenten aus einem anderen Projekt als Kopie übernehmen.
- **Einstellungen** (Admin): Name und Ziel, Code-Verknüpfung (GitHub), Werkstatt/Vorschau einrichten, Prüfregel
  (zweite Person oder Admin allein), Archivieren.

## 4. Profile

Ein Profil hat für Menschen und Agenten denselben Aufbau, wie eine Visitenkarte.

**Mensch:** Bild, Name, Rollen pro Projekt, Knopf „Nachricht“. Bei sich selbst zusätzlich „Profil bearbeiten“.

**Agent:**
```
        [Bild]
       Herr Grau  👑
   Projektleitung · Klimafinder
   [Nachricht]   [Im Gruppenchat erwähnen]
--------------------------------------------------
 AUFTRAG     Führt das Projekt, plant, verteilt Aufgaben
 ART         ruhig, knapp, fragt nach, wenn etwas unklar ist
 DARF        ✓ Projekt lesen  ✓ antworten  ✓ Aufgaben und Pläne vorschlagen
 ZULETZT     Plan „Vergleichsseite“ · heute 08:12
 [Bearbeiten]                       nur Admin
```

- **Darf** ist *eine* Rechteliste statt heute „Fähigkeiten“ und „Berechtigungen“ getrennt. Vorschläge werden
  immer von einem Menschen angenommen, das steht dabei.
- **Kein Modell- oder Anbietername im Profil.** Das Modell wählt man unter „Bearbeiten → Erweitert“ aus der Liste
  dessen, was der KI-Zugang der Person anbietet.
- Die Projektleitung kann man bearbeiten, aber nicht entfernen (wie heute).

## 5. Vorschau

So läuft es heute, und so bleibt es: Die **Werkstatt** (Server oder ein eigener Rechner) baut zu einer Code-Aufgabe
den geänderten Stand und startet eine Live-Vorschau, höchstens eine Stunde lang.
Man öffnet sie bei der Aufgabe unter „Prüfen“.

Neu im Konzept:
- **Vorschau-Knopf in der Projektinfo:** öffnet die jüngste laufende Vorschau. Gibt es keine, steht dort klar
  „Keine laufende Vorschau. Sie entsteht, wenn eine Code-Aufgabe zur Prüfung kommt.“ Admins sehen dazu
  „Werkstatt einrichten“, falls noch keine eingerichtet ist.
- **Im Chat:** Wenn eine Vorschau fertig ist, erscheint in der Projektgruppe eine kurze Karte
  „Vorschau bereit: <Aufgabe> [öffnen]“.
- Später, eigener Schritt: eine dauerhafte Vorschau des gemeinsamen Stands (`main`) pro Projekt.

Ehrliche Grenze heute: Agenten programmieren noch nicht. Vorschauen entstehen also aus Code-Aufgaben, die ein Mensch
bearbeitet, bis Programmierläufe über den Launcher freigegeben sind.

## 6. Seitenmenü und Konto

```
 [Bild] Marco Speth                    [Hell/Dunkel]
        Inhaber
 --------------------------------------------------
 Mein Profil
 Neues Projekt
 Jemanden einladen
 KI-Zugang                    ● bereit
 Einstellungen
 --------------------------------------------------
 Für Entwickler               (eingeklappt)
 Abmelden
```

- **KI-Zugang** ist *eine* Seite mit dem echten Zustand: „Deine Agenten können antworten“ oder „Noch nicht
  eingerichtet, so geht’s“. Grundlage ist der Agenten-Worker der Person, nicht die ältere Programmier-Anmeldung.
  Später stehen hier mehrere Zugänge (Abo, API-Schlüssel, OpenRouter, eigener Rechner).
- **Für Entwickler:** Rechner und Werkstätten, Programmier-Anmeldung, Zugriff von ChatGPT/Claude auf Studio
  (Connector), GitHub. Nur sichtbar, wer es braucht; alles in Alltagssprache mit Status.

## Was dafür wegfällt

| Heute | Neu |
|---|---|
| Untere Leiste Chats · Agenten · Projekte · Konto | Reiter Chats · Kontakte, Seitenmenü |
| Filter Alle / Gruppen / Agenten | entfällt |
| Seite „Agenten“ mit langer Erklärung | Kontakte und Projektinfo → Mitglieder |
| Seite „Projekte“ | Projekte sind die Gruppen in der Chatliste; Archiv unter Einstellungen |
| Kachel-Symbol mit Aufgaben/Dateien/Wissen/Info | Projektinfo |
| Bereich „Aktivität“ (alter KI-Auftragsweg) | entfällt nach Prüfung; Agenten ersetzen ihn |
| Avatar oben und Reiter „Konto“ | nur Seitenmenü |
| „Dein ChatGPT für deine Agenten“ mit falschem Status | KI-Zugang mit echtem Status |
| schwebender Pfeil über Inhalten | nur noch, wo er nichts verdeckt |

Daten gehen dabei nicht verloren. Es verschwinden nur doppelte Wege.

## Umsetzung in Paketen

Jedes Paket kommt als eigener Pull Request: erst auf dem Pilot am Handy ansehen, dann „merge“ und „JA LIVE“.

1. **Schnelle Korrekturen (klein):**
   - KI-Zugang zeigt den echten Agentenstatus.
   - „Wartet auf dich“ nur mit Handlungen und Kontext.
   - Filter weg, Kontozugang nur einmal.
   - Agententext kürzen, Pfeil korrigieren.
   - Testreste löschen, falls der Owner zustimmt.
2. **Navigation:** Reiter Chats · Kontakte, Seitenmenü, Projektgruppen in der Chatliste, Suche über alles.
3. **Projektinfo:** Kopfbereich „Jetzt“, Mitgliederliste, Hinzufügen von Menschen und Agenten,
   Vorschau-Knopf und Vorschau-Karte im Chat.
4. **Profile:** Visitenkarte für Menschen und Agenten, eine Rechteliste.
5. **Aufräumen:** alter Bereich „Aktivität“, Entwicklerteil im Seitenmenü, Altlasten nach Laufzeitprüfung entfernen.

Pakete 2–4 sind der große Umbau und gehören zusammen live. Sie werden einzeln gebaut und geprüft,
aber gemeinsam freigegeben, damit Studio nicht halb alt, halb neu ist.

## Offene Entscheidungen für den Owner

1. Konzept so umsetzen?
2. Probeprojekt und [TEST UX]-Reste löschen (mit Sicherung vorher)?
3. Agenten in mehreren Projekten: als Kopie übernehmen (Vorschlag) oder ein Agent in mehreren Projekten?
