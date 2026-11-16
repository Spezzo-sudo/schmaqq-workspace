# Arbeitsliste SCHMAQQ Studio

Eine Liste für alle (Marco, Markus, Claude Code, Codex). Immer nur **eine** Aufgabe „in Arbeit“.
Ablauf je Aufgabe: Plan → auf einem Branch bauen und testen → Ergebnis zeigen → Owner sagt „ja, live“
→ Live nach [OPERATIONS.md](OPERATIONS.md) → Nachweis im Pull Request → hier abhaken.
Etappen und Entscheide: [PLAN.md](PLAN.md). Iststand mit Nachweisen: [STATUS.json](STATUS.json).

## Ordnung (ab 07.11.2026)

- Code: GitHub `Spezzo-sudo/schmaqq-workspace`, Branch **`main`** ist der offizielle Stand
  (am 07.11.2026 aus `local/studio-plugin-worker-prototype` übernommen). Neue Arbeit nur auf Branches von `main`.
- Der frühere Laptop-Arbeitsordner ist nicht mehr verfügbar (Laptop defekt). Nichts mehr nur lokal halten.
- Historische Dokumente und Nachweise: `docs/archive/`.
- Studio-Projekte: „Klimafinder“ ist das Testprojekt für alle Etappen (siehe PLAN.md).

## Reihenfolge ab 16.11.2026

Ablauf und Rollen: [WORKFLOW.md](WORKFLOW.md). Wer einen Schritt übernimmt, schreibt sich unter „In Arbeit“ ein
(z. B. „Claude Code – Aufräumen“ oder „Codex – Messenger-Feinschliff“).

**In Arbeit:** Claude Code – Agenten-Fundament und Messenger-Feinschliff (`feat/agent-messenger-foundation-20261116`, baut auf #87 auf): eigene Tabellen für Agentenläufe, Warteschlange, Arbeitszeile mit Schritten, ruhigere Sprechblasen. Vor Owner-Abnahme kein Merge und kein Livegang.

**Ebenfalls offen:** ChatGPT/Codex – Messenger R4 und mobile UX (Issue #84, `feat/studio-mobile-messenger-r4-20261116`). Vor Owner-Abnahme kein Merge und kein Livegang.

1. [ ] Aufräumen: Probeprojekt (TEST-UX-Reste) entfernen, Klimafinder frisch starten (Owner-Ja nötig, nicht umkehrbar).
2. [ ] GitHub-Prüfung stabil: restliche feste Test-Ports (44xxx) durch vom System vergebene Ports ersetzen.
3. [ ] Messenger-Feinschliff: letzte Nachricht und Ungelesen-Zähler in der Chatliste; „Wartet auf dich“ nur mit
   Dingen zum Handeln; Projektname im Chat-Kopf.
4. [ ] Hermes-Test: eine abgeschottete Hermes-Agent-Instanz pro Person (eigener Ordner, keine Shell, kein Root,
   Speichergrenze, Start bei Bedarf), Anmeldung mit dem eigenen ChatGPT-Konto über Studio, Studio-Werkzeuge per MCP,
   RAM gemessen. Ergebnis entscheidet den Motor; Ersatz ist Codex direkt.
5. [ ] Agent antwortet über diesen Motor, mit Live-Arbeitskarte. (Im Pilot erledigt; Arbeitszeile gebaut auf `feat/agent-messenger-foundation-20261116`, noch nicht auf dem Pilot installiert.)
6. [ ] Freigabekarten und Studio-Werkzeuge für Agenten.
7. [ ] Agent ↔ Agent als mitlesbarer Chat mit Rundenlimit und Stopp.

Bereits live am 16.11.2026: Messenger R3 (`ac65a05`), ChatGPT-Anmeldung pro Person (`3c6ee6c`), Chats als Startseite (`cdb7bd5`).

## Neustart 29.10.2026 abends

Auf Owner-Wunsch („war bis jetzt eh alles nur ein Test“) wurden in Studio alle Projekte mit Aufgaben,
Gesprächen, Wissen, Aufträgen und Vorschauen gelöscht; Konto, Rechner, KI-Verbindungen und Einladung
blieben. Auf dem Server-Worker wurden Repository-Kopien, Arbeitskopien und der Pilot-Schlüssel entfernt.
GitHub unverändert. Backup: `/var/lib/schmaqq-studio/backups/before-fresh-start-20261029T182657Z.sqlite`.
Der Deploy-Key im Repository `schmaqq-studio-pilot` wird nicht mehr gebraucht (Owner kann ihn löschen).

## Richtungsentscheid 30.10.2026 (Owner)

Studio ist in der heutigen Form für Nutzer unverständlich (Einrichtung, Aufgaben, Rechnerwahl). Zielbild
„Studio Zielbild Einfach“ (privates Artifact https://claude.ai/artifact/WS34uruQ4y2CSACNgjXBvP): GitHub = Code,
Studio = Raum (Team + KI im Gespräch), Werkstatt = unsichtbarer Server. **Zielgruppe zuerst Marco und Markus,
danach kleine Teams mit etwas Technik; Kunden ohne Technik später als eigener Schritt.** Vor dem Bau: Skizze mit
3–5 Personen testen und klären, ob ChatGPT-/Claude-Abos automatisches Arbeiten in der Werkstatt erlauben. Bis
dahin keine neuen Funktionen, nur Vereinfachung.

**Überholt am 07.11.2026:** Abo ist jetzt ChatGPT-Workspace (Business) mit zwei Standard-Sitzen, siehe PLAN.md.

~~KI-Abo entschieden (30.10.2026, Owner):~~ Claude Team mit zwei Standard-Sitzen (Marco, Markus), zuerst monatlich.
Abschluss durch den Owner. Danach: Console-Organisation verknüpfen (API-Guthaben), Ausgabenlimit setzen, damit
nichts nachberechnet wird. Erst dann Werkstatt für persönliche Claude-Code-Anmeldung pro Person vorbereiten.
Grundlage: [AI_SUBSCRIPTION_TERMS_20261030.md](archive/evidence/AI_SUBSCRIPTION_TERMS_20261030.md).

## In Arbeit

**Nachtauftrag: live seit 30.10.2026** (Studio und Worker auf 5c3208a,
[Live-Nachweis](archive/evidence/NIGHT_RELEASE_DEPLOY_20261030.md), [Status](archive/NIGHT_STATUS_20261029.md)).
Jetzt Praxistest A fortsetzen: die Analyseaufgabe mit Lesekopie als allgemeines Ergebnis festhalten.

**Projektübersicht aufgeräumt: live seit 30.10.2026** (Befund des Owners: Verlauf voller „Bearbeitung
aktualisiert“). [Live-Nachweis](archive/evidence/PROJECT_OVERVIEW_DEPLOY_20261030.md).

**Stand 30.10. abends** ([Nachweis](archive/evidence/KLIMAFINDER_PRACTICE_20261030.md)): Analyse erledigt; Code-Aufgabe
„Leise-Priorität“ umgesetzt, alle Finder-Tests grün, Vorschau funktioniert. **Blocker:** vorbestehender
`tests/test_backend.mjs` braucht Loopback im Job → gelöst mit eigenem Netz pro Job (`a4c1667`, live). Testlauf
komplett grün, **Prüfstand `67b1cab` mit Vorschau steht**. Drei Studio-Fehler live behoben (`94a51ca`, `fed02f9`,
`a4c1667`). Nächstes: Hochladen-Freigabe für den Worker → Branch/PR teilen; dann Bedienbarkeit (KI richtet ein und
hält fest).

**A. Echter Praxistest mit Klimafinder** (echtes Projekt des Owners, Fokus bleibt Studio)

Unterbrechung im Owner-Praxistest am 29.10.: Repository gespeichert und Deploy-Key
vom Owner eingetragen; automatische Erkennung scheiterte am Python-/Make-Projekt.
Gesonderter Owner-Auftrag zur allgemeineren Einrichtung umgesetzt, geprüft und
nach aktuellem „ja, live“ veröffentlicht:
[Live-Nachweis](archive/evidence/PROJECT_CONFIGURATION_DEPLOY_20261029.md).
Make/Python/venv/Jinja im isolierten Job gefunden, ensurepip fehlt. A deshalb
nicht abhaken: Owner lädt Studio neu und prüft den Vorschlag; echte Python-
Buildumgebung und Klimafinder-Build weiter offen. Keine Systeminstallation erfolgt.

1. [ ] Projekt „Klimafinder“ in Studio anlegen, GitHub-Repository eintragen, Zielbranch prüfen (Owner)
2. [ ] Server-Worker per Knopf verbinden (Deploy-Key) und Projekt einrichten
3. [ ] Mit Claude/ChatGPT eine kleine echte Aufgabe umsetzen: ändern → testen → Vorschau → Branch → PR
4. [ ] Alles notieren, was unklar oder umständlich war → fließt in B
   Hinweis: Auf dem VPS laufen Klimafinder-Dienste; der Worker sieht und berührt sie nicht (Sandbox).

**B. Klarheits-Paket für die Oberfläche** (Befunde vom 29.10.)
1. [ ] Einstellungen als 3 Schritte: Repository (mit echtem Zugriffsstatus) · Wo gearbeitet wird · KI-Assistenten
2. [x] Knöpfe ehrlich benannt: „PC oder Server hinzufügen“, „<Projekt> einrichten“ (Nachtlauf, lokal)
3. [ ] Branches von GitHub auswählen statt tippen (Worker liest per Deploy-Key mit `git ls-remote`)
4. [ ] Zwei Vorschau-Arten (statisch / Live-App) in der Oberfläche erklären
5. [ ] Vom Betrieb gestartete Aufträge nicht im persönlichen Verlauf mischen
6. [ ] Hinweis „Standard ist schmaqq-workspace“ in der übergeordneten SCHMAQQ-Anleitung korrigieren

## Als Nächstes

**C. Studio mit Studio entwickeln** – Projekt für `schmaqq-workspace` (Zielbranch
`local/studio-plugin-worker-prototype`), Testbefehl im Job, Jobs dürfen Git-Daten ihrer Kopie lesend sehen,
Laufzeit auf 1 CPU messen, Studio hört auf `HOST`/`PORT` für die Live-Vorschau.

## Später

- Live-Vorschau im Pilotprojekt wieder einrichten (jetzt über die Projekteinstellungen möglich).
- Teamfreigabe des Server-Workers (Freigaben pro Person/Projekt, Kontingente, eigene Git-Zugänge).
- Live-Vorschau: WebSockets durchreichen.
- Design: Formen/Knöpfe/Fokus im Nachtlauf lokal angeglichen. Offen: dunkle Seitenleiste (Owner-Entscheidung
  nach Screenshot-Vergleich, Bilder in `.studio/night-20261029/`), Studio-Link auf schmaqq.com (Vorschlag im
  Nachweis), Markenrichtung V1 erst übernehmen, wenn schmaqq.com sie nutzt.
- Fremde Agent-Skills vor Nutzung mit NVIDIA SkillSpector prüfen (Installation nur nach Owner-OK).

## Erledigt (29.10.2026)

M1 Server-Worker und Vermittlung · KI-Anmeldung für Claude/ChatGPT/Gemini · Härtung (kein direktes Netz,
Proxy) · Stufe 1 Isolation pro Auftrag · GitHub per Deploy-Key (auch per Knopf in Studio) ·
Full-Stack-Vorschau (auch in Studio einstellbar) · `list_workspaces` · Branch auf GitHub gesichert.
Nachweise: `docs/archive/evidence/*_20261029.md`.
