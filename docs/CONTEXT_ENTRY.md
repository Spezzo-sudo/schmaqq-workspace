# SCHMAQQ Studio – schlanker Einstieg fuer KI-Agenten

**Zweck:** Nur den Kontext laden, der fuer den aktuellen Auftrag benoetigt wird. Diese Datei ist eine Orientierung, keine neue Statusquelle. Die massgeblichen Aussagen bleiben in `AGENTS.md`, `docs/PLAN.md`, `docs/PRODUCT_VISION.md`, `docs/ARCHITECTURE.md` und `docs/STATUS.json`.

## Was ist das Projekt?

`Spezzo-sudo/schmaqq-workspace` ist die eigenstaendige SCHMAQQ-Studio-Anwendung fuer kollaborative Softwareentwicklung. Der echte Studio-Kern liegt in `selfhost/` (Node/SQLite/API) und `studio/` (React-UI). Alte Starterpfade in `app/api/` und `db/` nicht mit dem Studio-Kern verwechseln.

## Start eines neuen Auftrags

1. `AGENTS.md` lesen und den aktuellen Branch sowie die offenen PRs ermitteln. Ohne Auftrag keine Dateien veraendern.
2. Dieses kompakte Briefing verwenden. **Nicht** `docs/STATUS.json` komplett in den Kontext laden.
3. Nur falls die Aufgabe es erfordert: die passenden Abschnitte aus `docs/PLAN.md`, `docs/WORKLIST.md`, `docs/ARCHITECTURE.md` oder `docs/PRODUCT_VISION.md` lesen.
4. `docs/STATUS.json` nur fuer die **einschlaegigen Eintraege** auslesen (per JSON-Schluessel, nicht per Komplettdump). Alte Statusabschnitte bleiben erhalten, sind aber kein neuer Auftrag.
5. Nur relevante Source-Dateien gezielt oeffnen; erst Dateipfade/Funktionen identifizieren, dann einen begrenzten Zeilenbereich lesen. Keine unbeschraenkten Repository- oder Log-Dumps.
6. Tests zuerst fokussiert; den vollstaendigen `npm run studio:verify` erst vor einer Engineering-Uebergabe ausfuehren. Bei umfangreichen Logs nur das Ergebnis und relevante Fehlerstellen zurueckgeben, Fehler nicht verbergen.
7. Abschluss kurz dokumentieren: Aenderungen, Testergebnis, verbleibende Grenzen, PR- und Preview-Links. Kein direkter Merge nach `main`, kein Produktions-Deployment.

## Aufgabentypen

- **UI/UX/Messenger:** `studio/room-components.tsx`, `studio/room-model.ts`, `studio/team-workspace.tsx` und betroffene Styles; bei Identitaet/Berechtigung `selfhost/room-http.mjs` und Rollen pruefen.
- **Backend/Berechtigungen:** gezielte `selfhost/`-Routen und deren Tests; Berechtigungen serverseitig pruefen.
- **Agenten/Runner/MCP:** die passenden MCP-/Runner-Dateien und das konkrete Integrationsdokument, nicht das gesamte Archiv.
- **Design/Avatare:** aktuelle Designvorgaben und vorhandene Asset-Pfade; Bilder nur laden, wenn die Aufgabe sie tatsaechlich benoetigt.

## Budgetdisziplin

- Kein breit angelegtes Repo-Audit bei kleinen Aufgaben.
- Kein paralleles Lesen der gleichen Grossdateien durch mehrere Agenten, wenn ein gezielter Befund reicht.
- Gefundene Evidenz mit Pfad/Zeilenbereich festhalten statt grosse Kopien weiterzureichen.
- Bei neuen Aufgaben kurzen, frischen Kontext verwenden. Nach Bedarf mehr nachladen.
- Vor dem ersten Toolaufruf bei begrenztem Kontingent einen maximalen Datei- und Pruefbereich festlegen.

**Warnung:** Reduzierte Lesemenge ist keine Ausrede fuer unbelegte Behauptungen. Wenn wesentliche Informationen fehlen, gezielt weitere Quellen lesen. Alle bestehenden Sicherheits- und Freigaberegeln in `AGENTS.md` gelten weiter.
