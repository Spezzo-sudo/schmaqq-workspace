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

## Gemeinsame lokale Kandidatenprüfung mit R28 / PR #46

PR #46 und der separate Datei-Event-Fix wurden ausschliesslich in einer **wegwerfbaren lokalen Git-Arbeitskopie** kombiniert; beide Quell-PRs blieben unabhängig und wurden nicht gemergt.

- **Kombinierte Integrationsprobe:** GitHub-Import mit lokalem Git-Testtransport und anschliessendem `inspect` / `prepare`, Projekt- und Geräteberechtigungen, privater Datei-Review-Test — **4/4 PASS**.
- **Gesamtsuite:** `npm run studio:verify` — **194 Tests: 191 PASS, 0 FAIL, 3 erwartete Linux-Skips; Source Guard, TypeScript und Vite-Build PASS** (Node 24.15.0).
- **Kontrollierte lokale Browserbereitstellung:** Studio-Server auf Loopback mit synthetischem Eigentümerkonto und eigenem SQLite-Teststand, UI-Build aus der kombinierten Arbeitskopie. Google Chrome 147: Desktop 1320×920, mobile Emulation 390×844, echter Klickweg zu „Bestehendes GitHub-Repository importieren“, Eingabe von Repository und Windows-Beispielpfad, explizite Zustimmungsverweigerung mit Fehlermeldung, danach Zustimmung und Downloadplan. Aus dem vom Browser erzeugten JSON-Blob wurden `schema: schmaqq-project-setup-v1`, `mode: github` und die Test-Repository-Adresse geprüft. **Kein Token/Passwort, 0 uncaught JavaScript exceptions.**
- **Nachweise:** bisherige browserbasierte Screenshots aus [PR #46](https://github.com/Spezzo-sudo/schmaqq-workspace/pull/46) unter `docs/evidence/issue45/`. Die neuen kombinierten Screenshots wurden im temporären Testbereich visuell geprüft; sie enthalten nur synthetische Identitäten und werden nicht als Production-Abnahme ausgegeben.
- **Kein externer Staging-Host geändert:** Diese lokale Bereitstellung war nicht `studio.schmaqq.com`, nicht `preview.schmaqq.com` und kein Provider-Deployment.

**Kein Merge, kein Production-Deployment.** Die reale Lenovo-/Windows-Abnahme und der historische H3-Owner-Mismatch sind weiterhin offen.
