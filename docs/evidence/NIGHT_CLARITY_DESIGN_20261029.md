# Nachtlauf 29./30.10.2026: Praxistest-Blocker, Klarheit und Design (lokal)

Ausgeführt von Claude Code (Opus 5.5) nach [NIGHT_HANDOFF_20261029.md](../NIGHT_HANDOFF_20261029.md).
Fortschritt und Pakete im Detail: [NIGHT_STATUS_20261029.md](../NIGHT_STATUS_20261029.md).
**Nur lokal und auf dem eigenen Branch.** Kein Deployment, kein VPS-, Datenbank- oder Providereingriff,
kein Owner-Login. Production läuft unverändert auf dem zuvor ausgelieferten Stand.

## Was sich ändert

| Paket | Kern | Dateien |
| --- | --- | --- |
| P0 | Lesekopie macht keine Codeaufgabe; nur ändernde Aufträge tun es | `selfhost/team-model.mjs`, `selfhost/team-http.mjs` |
| P1 | Kriterien, Art und Fassung im KI-Kontext; `list_tasks` sucht Aufgaben per Titel | `selfhost/room-http.mjs`, `selfhost/studio-mcp.mjs`, `selfhost/server.mjs` |
| P2 | Dateien bis 4 MiB lesbar in lückenlosen 64-KiB-Abschnitten; Bearbeiten bleibt 64 KiB | `selfhost/files.mjs`, `selfhost/runner.mjs` |
| P3 | „PC oder Server hinzufügen“, „<Projekt> einrichten“, ehrlicher Einrichtungsstand, KI-Übergabe, Fokus | `studio/*.tsx`, `app/executors.tsx`, `selfhost/placement.mjs` |
| P4 | Eckige Formen, Website-Knöpfe, Hover-Schatten, ein Fokusbild, Logo zurück zu „Meine Arbeit“ | `studio/schmaqq-convergence.css`, `app/studio-brand.tsx` |

## Design (P4) – Referenz und Grenzen

Referenz ist die **ausgelieferte** Website, keine neue Markenrichtung: `NetzKontor/marketing/site/assets/styles.css`
(`.button`, `.header-cta`), am 29.10.2026 zusätzlich live auf schmaqq.com ausgelesen (Ink `#111225`, Paper
`#f1efe8`, Acid `#d9ff6b`, Coral `#ff6f59`, Arial, Knöpfe 13 px/800, Ecken 0 px, Hover
`translate(-2px,-2px)` mit hartem Ink-Schatten). Umgesetzt in einer eigenen, zuletzt geladenen Datei mit
ausschließlich vorhandenen `--schmaqq-*`-Tokens. Keine V1-Markenfarben, kein neues Logo, keine Bibliothek.

Bewusst nicht geändert: die dunkle Seitenleiste (Owner-Entscheidung nach Screenshot-Vergleich offen) und die
Anmeldeseite (stimmte bereits mit der Website überein). Die alte Grundregel `.rw-button` setzt Größe/Stärke mit
`!important`; nur diese zwei Werte werden gezielt mit `!important` überschrieben.

Logo: Das vorhandene SCHMAQQ-Logo mit Welle führt im Arbeitsbereich jetzt zur Startansicht „Meine Arbeit“
(Beschriftung „SCHMAQQ Studio – zur Startansicht „Meine Arbeit““), schließt am Handy das Menü und verlässt
Studio nie. Die Welle entfällt bei `prefers-reduced-motion` (bestehender Code); CSS-Hover-Bewegung ebenfalls.

### Vorschlag: Einbindung in schmaqq.com (nicht umgesetzt)

Kein Eingriff in das Website-Repository oder Production. Konkreter Vorschlag für eine spätere, gesondert
freigegebene Website-Änderung:

1. Im Website-Header einen Eintrag „Studio“ neben „Kontakt“, Ziel `https://studio.schmaqq.com/`, als
   sekundärer Knopf (`.button.secondary`), damit die primäre Website-Aktion gleich bleibt.
2. Studio behält seine Anmeldeseite mit dem bereits vorhandenen Link „Zur Website ↗“ als Rückweg.
3. Gemeinsame Tokens langfristig aus einer Datei (heute: Website `entry-root.css`, Studio
   `studio/schmaqq-design-system.css`). Wechselt die Website auf Markenrichtung V1, nur dort ändern und
   Studio mitziehen.

## Selbst ausgeführte Prüfungen

- Fokussierte Tests je Paket (siehe NIGHT_STATUS), TypeScript `tsc --noEmit` Exit 0, Studio-Build PASS.
- Browser, synthetische Fixture `scripts/task-handoff-browser-fixture.mjs` (127.0.0.1:45791, Testkonto aus der
  Fixture), Desktop 1024×768 und 390×844: kein horizontaler Seitenüberlauf (`scrollWidth = clientWidth`),
  Fokus sichtbar (2 px Ink-Umriss + Acid-Schatten), Karten/Knöpfe 0 px Ecken, Hover-Lift nur mit Maus
  (`hover: hover`; am Handy blieb der Effekt nach Tippen sonst hängen), Knöpfe 13 px/800, Logo → „Meine Arbeit“.
- Vorher/Nachher-Bilder liegen privat unter `.studio/night-20261029/` (nicht in Git).
- Gesamtprüfung: siehe NIGHT_STATUS, Abschnitt P5.

## Nicht geprüft / offen

- Reduced Motion nur im Code geprüft (Media Query und bestehende `matchMedia`-Abfrage), nicht per Emulation.
- Kein echter Runner/Worker hat den neuen Code; P2 (Abschnittslesen) wirkt auf dem Server-Worker erst nach
  einem freigegebenen Release. Kein Test mit den echten Klimafinder-Dateien.
- Keine Prüfung mit dem echten Owner-Konto, ChatGPT oder Claude.
