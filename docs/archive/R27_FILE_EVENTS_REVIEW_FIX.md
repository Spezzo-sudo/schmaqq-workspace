# R27: Datei-Ereignisprotokoll / Review-Test wiederherstellen

**Status:** Isolierter Review-Kandidat, nicht in R27 zusammengeführt und nicht in Production bereitgestellt.

## Fehlerdiagnose

Der bereits auf dem unveränderten R27-Ausgangsstand reproduzierbare Test `selfhost/review.test.mjs` scheitert bei `assert.ok(own.data.events.some(event => event.text.includes('value.txt')))`. Der Test prüft explizit die Eigentümergrenze für `/api/development/events` bei `files`, `read-file` und `save-file`.

Der HTTP-Server schützt Datei-Ereignisprotokolle bereits mit einem Eigentümercheck. Der persönliche Runner erzeugt in `LocalRunner.run` allerdings für alle drei Dateioperationen bislang **nur** das generische Start-Ereignis, nicht ein dateibezogenes Erfolgsereignis. Der Fehler stammt aus der fehlenden Ereigniserzeugung im Runner und ist nicht durch den R28-GitHub-Import entstanden.

## Minimale Korrektur

Nur bei erfolgreichen Dateiaktionen wird zusätzlich `type: 'files'` mit bewusst begrenzten und erlaubten Dateinamen ausgegeben:

- **Dateiliste:** maximal 2.000 zuvor mit `allowedFile` gefilterte Namen, Text höchstens 3.513 Zeichen.
- **Öffnen:** der bestätigte Git-verfolgte Dateiname, nicht der Inhalt.
- **Speichern:** der bestätigte Git-verfolgte Dateiname, nach erfolgreichem Schreiben und der bestehenden Revisionsermittlung.

Die Protokolle enthalten **keine Dateiinhalte**, keine lokalen Zugangsdaten und keine beliebigen Dateipfade. Unzulässige, fehlgeschlagene oder nicht in Git erfasste Dateiaktionen erzeugen keine Datei-Erfolgsmeldung. Die bestehende Server-Berechtigungsprüfung (Eigentümer des Dateijobs) und die Git-Review-, Push-, Merge- und Veröffentlichungsregeln bleiben unverändert.

## Abnahme (isolierte Linux-Arbeitskopie)

1. Vorher auf unverändertem R27: `node --test selfhost/review.test.mjs` — reproduzierbarer FAIL wegen fehlendem `value.txt`-Ereignis.
2. Mit der Korrektur: `node --test selfhost/review.test.mjs selfhost/studio.test.mjs selfhost/editor-size-contract.test.mjs` — **5 PASS, 0 FAIL**.
3. Vollständiger `npm run studio:verify` mit Node 24.15.0 — **190 Tests: 187 PASS, 0 FAIL, 3 erwartete Skips; Source Guard, TypeScript und Vite-Build PASS**.
4. Nachweis der Eigentümergrenze: fremdes Konto erhält für Datei-Ergebnisse und Datei-Ereignisse HTTP 403; unangemeldet HTTP 401.
5. Nachweis gegen Inhaltsabfluss: `Gemeinsam prüfen` und der nicht Git-erfasste Inhalt `Neue Datei` erscheinen nicht in den gespeicherten Ereignissen.

## Grenzen

Die Tests verwenden synthetische persönliche Konten, isolierte lokale Git-Repositories und einen temporären Studio-Server. Kein echter Lenovo-Runner, keine realen Accounts, keine automatische Codex-Modellnutzung. Dieser Fix ist unabhängig vom GitHub-Import in R28 / Draft-PR #46; für einen gemeinsamen R28-Kandidaten beide Quellstände ausschliesslich in einer temporären Test-Arbeitskopie kombinieren.

**Kein Merge, kein Production-Deployment.** Die reale Lenovo-/Windows-Abnahme und der historische H3-Owner-Mismatch sind weiterhin offen.
