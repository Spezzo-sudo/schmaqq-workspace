# Arbeitsliste SCHMAQQ Studio

Eine Liste für alle (Marco, Claude Code, Codex). Immer nur **eine** Aufgabe „in Arbeit“.
Ablauf je Aufgabe: Plan → lokal bauen und testen → Plan/Ergebnis zeigen → Owner sagt „ja, live“
→ Live nach [OPERATIONS.md](OPERATIONS.md) → Nachweis in `evidence/` → hier abhaken.
Iststand mit Nachweisen: [STATUS.json](STATUS.json). Fernziel: [NETWORK_ROADMAP.md](NETWORK_ROADMAP.md).

## Ordnung

- Code: nur `C:\Users\hi\Documents\ChatGPT\SCHMAQQ\schmaqq-plugin-worker-prototype`, Branch
  `local/studio-plugin-worker-prototype` (auf GitHub gesichert). `schmaqq-workspace` und
  `schmaqq-studio-use-candidate` sind ältere Stände – dort nicht weiterarbeiten.
- GitHub `main` von `schmaqq-workspace` ist alt; der Studio-Projekt-Zielbranch ist deshalb
  `local/studio-plugin-worker-prototype`. Übernahme nach `main` nur als eigene, bewusste Entscheidung.
- Studio-Projekte: „SCHMAQQ Studio“ (Studio selbst), „Studio-Pilottest“ (Test-Repository
  `schmaqq-studio-pilot`). Andere Projekte unverändert.

## Neustart 29.10.2026 abends

Auf Owner-Wunsch („war bis jetzt eh alles nur ein Test“) wurden in Studio alle Projekte mit Aufgaben,
Gesprächen, Wissen, Aufträgen und Vorschauen gelöscht; Konto, Rechner, KI-Verbindungen und Einladung
blieben. Auf dem Server-Worker wurden Repository-Kopien, Arbeitskopien und der Pilot-Schlüssel entfernt.
GitHub unverändert. Backup: `/var/lib/schmaqq-studio/backups/before-fresh-start-20261029T182657Z.sqlite`.
Der Deploy-Key im Repository `schmaqq-studio-pilot` wird nicht mehr gebraucht (Owner kann ihn löschen).

## In Arbeit

**Nachtauftrag: live seit 30.10.2026** (Studio und Worker auf 5c3208a,
[Live-Nachweis](evidence/NIGHT_RELEASE_DEPLOY_20261030.md), [Status](NIGHT_STATUS_20261029.md)).
Jetzt Praxistest A fortsetzen: die Analyseaufgabe mit Lesekopie als allgemeines Ergebnis festhalten.

**Projektübersicht aufgeräumt: lokal fertig, wartet auf „ja, live“** (Befund des Owners vom 30.10.:
Verlauf voller „Bearbeitung aktualisiert“). Details im obersten Abschnitt von [HANDOFF](HANDOFF.md).

**A. Echter Praxistest mit Klimafinder** (echtes Projekt des Owners, Fokus bleibt Studio)

Unterbrechung im Owner-Praxistest am 29.10.: Repository gespeichert und Deploy-Key
vom Owner eingetragen; automatische Erkennung scheiterte am Python-/Make-Projekt.
Gesonderter Owner-Auftrag zur allgemeineren Einrichtung umgesetzt, geprüft und
nach aktuellem „ja, live“ veröffentlicht:
[Live-Nachweis](evidence/PROJECT_CONFIGURATION_DEPLOY_20261029.md).
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
Nachweise: `docs/evidence/*_20261029.md`.
