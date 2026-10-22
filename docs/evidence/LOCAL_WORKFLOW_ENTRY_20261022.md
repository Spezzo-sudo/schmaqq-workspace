# Lokaler Workflow-Einstieg — 22.10.2026

## Auftrag und Änderung

Erster konkreter Durchlauf des vom Owner freigegebenen Entwicklungsablaufs:
Aufgabe auswählen → eigene Kopie öffnen → Änderung prüfen. Im bestehenden lokalen
Arbeitsbranch gearbeitet; frühere uncommittete Änderungen erhalten.

Vorher blieb beim Wechsel aus der Aufgabenübersicht die alte Scrollposition
erhalten. Der Einstieg erschien dadurch mitten oder unten in der Entwicklung.
Die zentralen Aktionen enthielten Tests/Vorschau, aber keinen direkten Editorweg.

Änderung in `app/workspace.tsx`, `app/development.tsx`, `app/source-editor.tsx`:

- Bei Ansichtswechsel sofort an den Seitenanfang; Datenaktualisierung und Eingaben
  lösen keinen solchen Effekt aus.
- „2. Bearbeiten und prüfen“ mit direktem „Dateien bearbeiten“-Button.
- Editor wird ins Bild gescrollt, vorhandener „Dateien laden“-Button erhält Fokus.
- „Weiterarbeiten“ bei eigenen Kopien verwendet denselben Editor-Einstieg.
- Keine automatischen Datei-/Modellaufträge; Serververträge und Rechte unverändert.

## Selbst ausgeführte Nachweise

Neue isolierte Demo unter `.studio/workflow-usability-20261022/`, eigene synthetische
Konten, lokale Beispiel-Repositories und zwei lokale Test-Runner. Keine persönlichen
Arbeitskopien oder vorhandene Demo verändert. Keine externe Git-Veröffentlichung.

Sichtbar im echten Browser durchlaufen:

1. Künstliches Testkonto angemeldet, konkrete eigene Aufgabe über „Weiterarbeiten“ geöffnet.
2. Danach Scrollposition 0 und Überschrift im sichtbaren Bereich bestätigt.
3. „Dateien bearbeiten“ führt direkt zum Editor; Fokus-ID `source-files-load`.
4. Echte Dateiliste und `site/index.html` über den Runner geladen.
5. Beispieldatei geändert, Bereich gewechselt und erhaltenen Entwurf wieder geöffnet.
6. Änderung gespeichert; echter konfigurierter Beispieltest zeigt „Tests bestanden“.
7. Echte Vorschau gebaut und geöffnet; geänderter Absatz sichtbar.
8. Desktopbreite 1280 und Mobilbreite 390 geprüft; kein horizontaler Überlauf.

TypeScript und Frontendbuild unmittelbar nach Änderung bestanden.
Gezielte vorhandene Navigation-/Entwurfs-/Größen-Vertragsprüfungen separat ausgeführt.
Der abschließende komplette lokale Prüflauf wird im Originalbericht dokumentiert;
der Abschlussbeleg im übergeordneten Arbeitsbereich verknüpft dessen tatsächliches
Ergebnis: `local-evidence/2026-10-22_Workflow-Einstieg.json`.

## Tatsächlicher Qwen-Einsatz

Ein echter Bildanalyse-Aufruf auf den Vorher-Screenshot. Originalantwort:
`.studio/local-intelligence/images/20261022T090549269846Z-4543675f/analysis.json`.
Qwen erkannte die leere Dateiauswahl, interpretierte den Dateifilter aber als fehlende
Pflichteingabe. Das wurde gegen `app/source-editor.tsx` widerlegt und nicht übernommen.
Die Korrektur beruht auf der sichtbaren Navigation und dem exakten Quelltext.
Kein Zeit-/Kontingentgewinn gemessen, keine Modellantwort als Abnahme verwendet.

## Grenzen und Fortsetzen

Dies ist ein lokaler S1/S2-Bedienfortschritt, kein fertiges Workspace-Release.
Keine echte Zwei-Personen-Abnahme, kein neuer Linux-Nachweis, kein Push/Merge/Deploy.
Die Testkonten repräsentieren nicht Marco und Markus als echte entfernte Nutzer.
Persönliche KI-Aufträge innerhalb der Demo bleiben deaktiviert; Qwen lief als
separat gestarteter lokaler Helfer. Nächster Schritt ist der nächste belegte
S2-/S3-Teil aus `docs/ROADMAP.md`, insbesondere Bereitschaft und PR-Übergang.
