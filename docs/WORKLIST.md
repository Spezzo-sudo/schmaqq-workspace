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

## In Arbeit

**A. Studio mit Studio entwickeln** (Projekt „SCHMAQQ Studio“, Repository `schmaqq-workspace`)
1. [x] Projekt in Studio angelegt, Repository eingetragen (Owner, 29.10.)
2. [ ] Zielbranch auf `local/studio-plugin-worker-prototype` speichern (Owner)
3. [ ] Deploy-Key über „Projekt einrichten → Server-Worker → Schlüssel anzeigen“ bei GitHub eintragen,
       mit Schreibrecht (Owner)
4. [ ] Testbefehl für Studio im Job: Abhängigkeiten installieren + `node selfhost/verify.mjs --local`
5. [ ] Jobs dürfen die Git-Daten ihrer eigenen Kopie **lesend** sehen (Source Guard u. a. brauchen Git)
6. [ ] Laufzeit der Studio-Prüfung auf dem VPS (1 CPU) messen; Zeitlimit ggf. anpassen
7. [ ] Studio hört auf `HOST`/`PORT`, damit eine geänderte Studio-Version als Live-Vorschau läuft
8. [ ] Erste kleine Studio-Änderung komplett über Studio (KI → Tests → Branch → Pull Request)

## Als Nächstes

**B. Branches von GitHub auswählen statt tippen** – der Server-Worker liest per Deploy-Key die
Branches (`git ls-remote`); Auswahlliste beim Zielbranch und bei der Einrichtung.

## Später

- Live-Vorschau im Pilotprojekt wieder einrichten (jetzt über die Projekteinstellungen möglich).
- Teamfreigabe des Server-Workers (Freigaben pro Person/Projekt, Kontingente, eigene Git-Zugänge).
- Live-Vorschau: WebSockets durchreichen.
- Fremde Agent-Skills vor Nutzung mit NVIDIA SkillSpector prüfen (Installation nur nach Owner-OK).

## Erledigt (29.10.2026)

M1 Server-Worker und Vermittlung · KI-Anmeldung für Claude/ChatGPT/Gemini · Härtung (kein direktes Netz,
Proxy) · Stufe 1 Isolation pro Auftrag · GitHub per Deploy-Key (auch per Knopf in Studio) ·
Full-Stack-Vorschau (auch in Studio einstellbar) · `list_workspaces` · Branch auf GitHub gesichert.
Nachweise: `docs/evidence/*_20261029.md`.
