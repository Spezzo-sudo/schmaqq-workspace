# Claude Code: Schutz vor abruptem Kontingentverbrauch

**Status:** Bedienhinweise und Repo-Regeln, keine serverseitige Quota-Sperre. Eine klare Kosten- oder Tokenobergrenze pro Claude-Code-Cloud-Thread kann dieses Repository allein **nicht** durchsetzen.

## Vor dem naechsten Reset: in Claude-Code-Projects selbst einstellen

1. In Claude Code zum betreffenden **Projekt > Settings > General** gehen. **Auto-continue when usage limits reset ausschalten**. Diese Option ist bei Projekten standardmaessig aktiv und setzt wegen des Limits angehaltene Threads sonst automatisch fort.
2. In der Projektuebersicht die laufenden und wartenden Threads kontrollieren. Nicht benoetigte Threads beenden; wenn unklar ist, ob noch etwas automatisch laeuft, das Projekt voruebergehend **pausieren**.
3. Unter **Settings > General** fuer **Thread model**, **Thread effort**, **Coordinator model** und **Coordinator effort** einen sparsamen Standard verwenden (z. B. Sonnet und niedrigen/mittleren Denkaufwand statt vieler Opus-High-Threads).
4. Unter **Settings > Usage** den Verbrauch nach Thread/Modell ansehen und mit **claude.ai Settings > Usage** vergleichen. Ein 5h-Limit ist kontoweit geteilt, auch mit anderen Claude-Oberflaechen.
5. Unter **Settings > Memory > Project instructions** folgende Regeln speichern (siehe Block unten).
6. Falls der Nutzer nur eine einzelne Remote-Cloud-Session statt eines Projekts startet: keine Projekt-Autofortsetzung annehmen, aber Modellwahl und Kontextregeln trotzdem beachten.

## Empfohlene Project instructions zum direkten Einfuegen

> **SCHMAQQ Studio – Sparbetrieb:** Ohne meine ausdrueckliche Zustimmung keine neuen Threads starten und keine laufenden Aufgaben nach einem Kontingent-Reset automatisch fortsetzen. Ein neuer Auftrag bekommt zuerst eine knappe Planung ohne Repo-Zugriffe; warte auf meine Freigabe. Standard: maximal **ein** aktiver Thread. Fuer normale Arbeiten Sonnet/geringerer Aufwand, Opus nur bei klar begruendeten komplexen Problemen. Vor groesseren Repository-Analysen die benoetigten Dateien und den ungefaehren Umfang nennen. Ganze `docs/STATUS.json`, Archive, grosse Logs und repo-weite Diffs nicht ungefiltert laden. Pro erste Untersuchung maximal drei relevante Dateien, hoechstens 150–200 Zeilen pro Datei; nach fuenf Toolaufrufen Zwischenstand und erneute Freigabe. Kein automatischer Full Test, Build, Merge oder Deployment. `CLAUDE.md` und `docs/CONTEXT_ENTRY.md` beachten. Saemtliche Sicherheits- und Reviewvorgaben bleiben gueltig.

**Hinweis:** Projektanweisungen und die Bitte um nur einen Thread sind eine Verhaltensregel, keine vom Anbieter garantierte feste Begrenzung. Projekten stehen keine repo-eigenen `.claude/settings.json`-Rechte/Hooks zur Verfuegung. `CLAUDE.md` wird in Cloud-Threads dagegen geladen. Bei einzelnen Cloud-Sessions ausserhalb eines Projects kann die versionierte `.claude/settings.json` wirken.

## Sichere Probe nach dem Reset

1. Vor dem Start: Usage/aktive Threads kontrollieren; Auto-continue aus.
2. Eine frische Sitzung oeffnen und lediglich fragen: „Sag mir, welche drei Dateien du pruefen wuerdest. Noch keine Tools.“ Die erste Antwort sollte **ohne Tools** erfolgen.
3. Erst nach Zustimmung eine konkrete, kleine Aufgabe geben. Maximal fuenf Toolaufrufe; danach vor Fortsetzung Usage erneut kontrollieren.
4. Wenn schon das Oeffnen ohne Auftraege massiv Usage kostet: weitere automatische Threads ausschliessen, laufende Sitzungen stoppen und Anthropic-Support mit Zeitpunkten, Thread-IDs und Usage-Beobachtung kontaktieren.

## Was diese Massnahmen nicht leisten

Sie beheben keine moeglichen Kontofehler oder Abrechnungsprobleme von Anthropic und begrenzen nicht die Nutzung anderer offener Claude-Sitzungen. Der dokumentierte Verbrauchsfaktor `docs/STATUS.json` wird nur dann reduziert, wenn Claude die gezielten Leseregeln auch beachtet.
