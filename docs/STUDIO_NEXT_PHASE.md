# SCHMAQQ Studio – nächste Produktetappe (Vorbereitung)

**Status:** Arbeitsvorschlag, 08.11.2026. Keine Implementierung, kein Merge, kein Livegang.
**Gilt für:** `Spezzo-sudo/schmaqq-workspace`, NICHT für das Marketing-Repository `NetzKontor`.
**Quelle:** `AGENTS.md`, `docs/PLAN.md`, `docs/PRODUCT_VISION.md`, `docs/ARCHITECTURE.md`, Übergabe in PR #60 (`docs/HANDOFF.md`).
**Ziel:** Anfang Februar 2027 arbeiten zwei echte Personen täglich und mobil mit Studio; KI ist optional.

## 1. Prioritäten und harte Freigaben

Die schon festgelegte Reihenfolge bleibt bestehen. Dieses Dokument ist eine additive Planung und kein Auftrag für sofortige Server-Mutationen.

1. **Bestehenden Livegang klären:** Hermes-/VPS-Nachweis für den auf `main` vorhandenen Stand `d2c2df0` einholen; GitHub-`main` beweist keinen laufenden Release. Keine automatische Wiederholung eines unklaren Livegangs.
2. **PR #60:** Quick-Deploy/CI und `docs/HANDOFF.md` nach fachlicher Prüfung und ausdrücklichem Merge-Ja übernehmen. Der neue Deploypfad gilt erst nach bewusstem Bootstrap und separater Live-Freigabe.
3. **Navigation zuerst:** Sichtbares, responsives Konzept und Owner-Abnahme; danach Frontend-PR mit Browsernachweis. Nicht die Aufgaben-/Review-Logik neu entwickeln.
4. **Mit Markus testen:** Einladen, die drei Wege Aufgabe öffnen → Vorschau anschauen → «Passt» sowie allgemeine Gespräche und Kontoeinstellungen ohne Anleitung finden lassen.
5. **Connector-Stabilität und Rechte:** Den dokumentierten Fehler «hunderte gleiche Aufgaben» anhand VPS-/DB-Evidence isoliert untersuchen. Kein zusätzlicher Schreib-Endpunkt vor der Abnahme.
6. **Codex-Praxisspike:** Verfügbarkeit, Kontonutzung, Tokenisolation und Kosten bei zwei eigenen ChatGPT-Business-Nutzern im freigegebenen Umfeld separat nachweisen. Erst danach Codex Bridge implementieren.
7. **Claude Code optional:** Dünner MCP-basierter Client, wenn die Studio-Codex-Ausführung funktioniert. Kein paralleler zweiter Agenten-Kern.

**Freigabegrenzen:** Branch + PR; Merge nur nach ausdrücklichem «Ja» des Owners; produktiv nur nach «JA LIVE <kurz>» zum exakten Commit und über den geregelten Betriebsweg. Weder dieser PR noch sein grüner Check sind eine Live-Freigabe.

## 2. Informationsarchitektur

**Global, Desktop:** `Meine Arbeit · Projekte · Gespräche · Team · Mein Konto` in fester Seitennavigation.
**Global, Handy:** Eine einzige untere Navigationsleiste `Arbeit · Projekte · Gespräche · Mehr`. «Mehr» öffnet klar beschriftete Ziele «Team» und «Mein Konto». Keine zweite gleichzeitig angezeigte Bottom-Navigation.
**Im Projekt:** `Übersicht · Aufgaben · Gespräch · Wissen · Einstellungen` als lokale Reiter im Seiteninhalt (mobil horizontal scroll- und bedienbar), niemals als zweite globale Fussleiste.
**In einer Aufgabe:** Fokusansicht mit Zurück, Symbol-Zeitstrahl, genau einem primären Schritt, Review und Gespräch. Globale Navigation darf nicht mit der Aufgabe konkurrieren.

### Klare Bedeutungen

- **Meine Arbeit:** persönliche nächste Handlung, relevante Mitteilungen und zuletzt geöffnete Projekte. Nicht mit einem überladenen Dashboard beginnen.
- **Projekte:** alle Projekte, Erstellen, Projektübersicht. Projektbezogene Gespräche bleiben in ihrem Projekt.
- **Gespräche:** projektübergreifender allgemeiner Chat und frühere Unterhaltungen. Das bestehende allgemeine Legacy-Chatziel zunächst offen und ehrlich beschriften; es ist noch keine neue gemeinsame Chat-API.
- **Team:** Mitglieder, Einladungen, Rollen und teambezogene Rechte. Bei fehlender Berechtigung keine gefährlichen Aktionen anbieten; serverseitige Prüfung bleibt zwingend.
- **Mein Konto:** Profil, eigene Assistenten-Verbindungen, «Mit ChatGPT anmelden», Abmelden; spätere Nutzungsanzeige. «ChatGPT greift auf Studio zu» (MCP-Inbound) und «Studio startet Codex mit meinem Konto» (Outbound-Ausführung) als **verschiedene** Verbindungen erklären.
- **Für Entwickler:** Diagnose, Runner, Worktrees, technische Logs; bewusst eingeklappt, aber erreichbar.

### Tatsächlicher Code / minimaler Schnitt

- `studio/team-workspace.tsx`: Shell, globales Menü, bisher Team und dort versteckte Verbindungen.
- `studio/room-model.ts`: `RoomRoute` / `readRoomRoute` / Projekt-Reiter.
- `studio/team-workflow.css`: Brand-Tokens, responsive Navigation und mobile Projektleiste.
- `studio/task-timeline.tsx`: runde Symbole ohne Zahlen sind bereits vorhanden. **Nicht erneut bauen.**
- `studio/task-next-step.ts`: autoritative nächste Aktion – keine zweite Logik oder doppelten Aufforderungen.
- `app/connections.tsx` und `app/chatgpt-auth`: Konto-/Verbindungsfunktion nur wiederverwenden, nicht Auth-Verhalten neu erfinden.
- Altansichten: `/?legacy=1&view=chat` und `/?legacy=1&view=docs` – vor endgültiger Migration ihre echten Funktionen prüfen.

### Navigations-/Migrationsregeln

- Legacy-Links für `?page=team`, `?room=<id>&tab=talk` und Task-Deep-Links bleiben funktional.
- Eine neue «Gespräche»-Route darf Projektgespräche nicht mit allgemeinem Chat verwechseln. Öffnen ohne verbundene Unterhaltungen zeigt einen verständlichen, ehrlichen Zustand.
- Back/Forward, Aktualisieren, Einloggen/Zurückkehren und Abmelden verhalten sich konsistent.
- Schütze offene Dateientwürfe beim Navigieren und Abmelden. Prüfe Focus/Keyboard und Touch-Flächen (mindestens ca. 44 px).
- Keine leere Fantasie-Kachel, kein Fake-Betriebsstatus, keine «KI verbunden»-Behauptung ohne tatsächlichen Check.
- Design: Ink `#111225`, Paper `#f1efe8`, Light `#fbfaf6`, Lime `#d9ff6b`, sehr helles Korall für offene Schritte; echte Lucide-Icons, keine Emojis.

## 3. Entwurfsvarianten und klare Empfehlung

- **A, empfohlen – ruhige Arbeitsoberfläche:** Desktop linke Navigation, mobil eine Bottom-Bar mit vier Zielen und «Mehr»-Sheet. Inhalte beginnen mit «Als Nächstes». Kein zweiter Footer.
- **B – Kompakt:** Header-Hamburger mobil statt Bottom-Bar; etwas mehr Platz, aber schlechtere Erreichbarkeit. Als Alternativtest.
- **C – Projekte zuerst:** Projektliste prominent, aber persönliche Arbeit schwerer sichtbar. Nicht als Standard für den Zwei-Personen-Alltag.

Das separate statische Konzept in `docs/prototypes/studio-navigation-v1.html` ist bewusst **keine** laufende Studio-Anwendung, kein Server- oder Kontentest. Es soll den Navigationsentscheid demonstrieren, bevor produktiver Code verändert wird.

## 4. Abnahmeszenarien

1. Marco öffnet auf 375/390 px «Meine Arbeit», findet «Klimafinder», die nächste Aufgabe und die Vorschau; der aktuelle Task verliert keine Daten.
2. Markus findet «Team» und kann eine Einladung erkennen; «Mein Konto» führt ohne Umweg zu seinen eigenen Verbindungen; allgemeiner Chat ist ohne «Team → Entwickler → Archiv» erreichbar.
3. Ein direkter Projekt-/Task-Link funktioniert nach Reload und Browser-Zurück.
4. Desktop 1280/1440 px, Tablet ca. 768 px und Handy 375/390 px: keine Überlagerung, keine Doppel-Navigation, keine abgeschnittenen Touch-Ziele.
5. Tastaturbedienung, sichtbar fokussierte Buttons, verständliche Labels, Dialog-/Sheet-Schliessen und Screenreader-Ansagen sind geprüft.
6. Ein echtes Zwei-Personen-Review im Klimafinder endet bei «Passt» ohne ungefragten Merge oder Livegang.

## 5. Arbeitspakete (sequenziell; jeweils ein eigenständiger PR)

- **UX-01: Navigation Shell.** Keine neue Datenbank; Frontend und ggf. vorhandene Routen adaptieren. Unit-Tests für Route/Deep-Link, Browser-Smoke mobil/Desktop, Screenshots zur Owner-Abnahme.
- **UX-02: Gespräche und Konto aufräumen.** Vorhandene Funktionen migrieren; Berechtigungen und Auth-Sitzungen unangetastet; bestehende Legacy-Daten nicht löschen.
- **UX-03: Praxisabnahme mit Markus.** Beobachtungen als priorisierte echte Fehler, nicht Wunschliste von Funktionen.
- **SEC-01: Connector-Duplikate + Identitäten.** Ursache, idempotente Auftragserstellung, Widerruf, Wiederholung, UI-Fehlerpfad, Regressionstests.
- **AI-01: Codex Berechtigungs- und Auth-Spike.** Separater Nachweis mit eigenem Konto; kein Produktiv-Token in Source/GitHub/Chat.
- **AI-02: Codex Adapter.** Minimaler Task→Ausführung→Ergebnis-Vertrag hinter Feature-Flag, nur wenn AI-01 freigegeben.
- **AI-03: Optionaler Claude-Code-MCP-Client/Plugin.** Kein direkter Proxy auf fremde Kontingente.

## 6. Übergabe an weitere Agenten

Vor jeder Aufgabe: `AGENTS.md`, `docs/PLAN.md`, `docs/WORKLIST.md`, `docs/STATUS.json` und nach PR #60 `docs/HANDOFF.md` lesen, dann nur die relevanten Dateien. **Dieses Dokument ist ein Vorschlag; `main` und echte Runtime-Evidence bleiben die Statusquellen.** Keine Dateien aus PR #60 auf einem anderen Branch ohne Konfliktprüfung überschreiben. Berechtigungs- und Provideränderungen vorab explizit freigeben.
