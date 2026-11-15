# SCHMAQQ Studio – Claude Code: sparsame und kontrollierte Starts

## VOR DEM ERSTEN TOOLAUFRUF EINER NEUEN SITZUNG
**STARTSPERRE:** Erst kurze Antwort ohne Tools, Repository-Scan, Subagenten, Tests oder Hintergrundauftraege. Nenne den kleinsten naechsten Arbeitsschritt, maximal drei relevante Dateien und die voraussichtlichen Grenzen. Warte auf das ausdrueckliche **"Start"** des Nutzers. Selbst ein allgemein formulierter Analyse-/Entwicklungsauftrag hebt die Startsperre nicht auf. Wenn der Nutzer bereits wortwoertlich `START:` mit einem begrenzten Auftrag vorgibt, darfst du direkt mit diesem begrenzten Schritt beginnen.

## NACH DER FREIGABE
- Zuerst `docs/CONTEXT_ENTRY.md` verwenden; `AGENTS.md` bleibt verbindlich.
- `docs/STATUS.json` **niemals komplett ausgeben/einlesen**. Nur benoetigte JSON-Schluessel filtern und begrenzte Textausschnitte lesen.
- Zuerst Dateipfade ermitteln, dann **hoechstens 3 Quelldateien in der ersten Runde**, jeweils max. 150–200 Zeilen. Keine repo-weiten Diffs, unlimitierten Git-Logs, Volltests oder Builds zum Einstieg.
- Nach **maximal 5 Toolaufrufen** oder einem klaren ersten Befund den Zwischenstand nennen und auf Freigabe fuer den naechsten Block warten. Nur falls die Aufgabe konkret sicherheitskritisch ist, notwendige Pruefungen mit knapper Ausgabe ergaenzen und dies kennzeichnen.
- Keine Subagenten, parallele Threads, wiederholte Komplettanalysen, Hintergrundaufgaben oder automatischen Repolauf starten, wenn der Nutzer das nicht eigens bestaetigt hat.
- Primaer fokussierte Tests; `npm run studio:verify` vor der fertigen Codeuebergabe statt am Anfang. Grosse Ausgaben in Logdateien umleiten und nur Zusammenfassung/Fehlerstelle zurueckgeben; Exitstatus erhalten.
- Modellwahl bleibt beim Nutzer: Sonnet fuer normale Codearbeit bevorzugen, Opus fuer gezielte schwierige Entscheidungen; nicht eigenmaechtig Modell, Abonnement, Tokenbudget oder Berechtigungen wechseln.
- **Nie** ein von Claude selbst geschaetztes Tokenlimit oder Nutzungsquota als technisch durchgesetzt behaupten. Repository-Anweisungen sind keine serverseitige Ausgabensperre.

Keine Veraenderungen an `main`, keine Deployment-/Merge-Aktionen, keine Secrets in Logs oder Commits.
