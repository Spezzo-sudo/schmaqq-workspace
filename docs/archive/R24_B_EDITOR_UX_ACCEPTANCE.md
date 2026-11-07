# R24-B — Editor-Grenze und Anmelde-UX (Review-Evidence)

Basis: Production-R23-Quellstand
`aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`.
Status: **separater Draft-Kandidat; nicht gemergt, nicht deployed**.

## Behobene konkrete Auditbefunde

1. `selfhost/files.mjs` akzeptiert nun reguläre Git-getrackte UTF-8-Dateien
   bis **64 KiB (65'536 Byte)** statt 24 KB. Damit liegen die bisherigen
   grossen Studio-eigenen TSX-/CSS-Dateien unterhalb des Limits.
   Geschützte Dateipfade, Symlinks, Hardlinks, Binär-/ungültige UTF-8-Dateien
   sowie Revision-Konflikte bleiben gesperrt.
2. `selfhost/server.mjs` gleicht die API-Limits an: maximal 65'536
   Zeichen für Editor-Schreibaufträge, 500'000 Byte JSON-Transport für
   Entwicklungsaufträge und bis 500'000 Zeichen für die stark escaped
   Dateilese-Ergebnisse. Normale Job-Resultate behalten die Grenze 150'000.
   Der Runner schützt **zusätzlich** anhand tatsächlicher UTF-8-Bytes.
3. Die lokale Studio-Passwortanmeldung erscheint vor der nicht
   eingerichteten ChatGPT-Website-Anmeldung. Bei schmalen Bildschirmen
   steht die Login-Karte vor der langen editorialen Einleitung. Desktop
   bleibt zweispaltig. Der ortsspezifische Startseitentext wurde neutral.
4. Benutzerhinweise in `app/source-editor.tsx` und
   `selfhost/README.md` wurden an die neue Dateigrösse angepasst.

## Prüfungen in isolierter Entwicklungsumgebung

- Negativtests: mehr als 65'536 Byte, nicht autorisierte Pfade,
  ungültiges Encoding, Hardlinks, veraltete Revision: Ablehnung.
- Positivtest: eine über 34 KB grosse Quelldatei wird gelesen und
  revisionssicher gespeichert.
- Server verweigert auch bei weniger als 65'536 JavaScript-Zeichen
  tatsächliche UTF-8-Payloads über 64 KiB **vor** Auftragserstellung.
- Vollständiger API-Test: rund 48 KB Text werden vom angemeldeten
  Browser zur Jobwarteschlange übertragen; 65'537 Zeichen werden
  abgewiesen; 65'536 stark escapte Zeichen können als Dateilese-Ergebnis
  korrekt über HTTP zurückgegeben werden.
- `node selfhost/verify.mjs`: 32/32 Backendtests, Source Guard,
  TypeScript und Vite Studio-Build PASS.
- Echter Playwright-Chromium-Lauf gegen Loopback-Testserver:
  Desktop 1440×900 und Mobil 390×844: Passwortfeld vor deaktiviertem
  ChatGPT-Login, mobil Anmeldekarte vor Marken-Einleitung,
  kein horizontales Überlaufen, keine JavaScript-Fehler: **8/8 PASS**.
- Screenshots bleiben lokal im ignorierten Testverzeichnis
  `.studio/r24b-ui-audit/`, ohne Konten oder Production-Daten.
- Temporärer Loopback-Testserver beendet, keine Runner erzeugt.
- Production ist unverändert auf R23 und Healthcheck HTTP 200;
  PR16 und PR17 bleiben aktiv.

## Grenzen

- 64 KiB ist bewusst weiterhin eine **kleine Quellcodedatei-Grenze**,
  kein Ersatz für eine allgemeine IDE mit grossen Binär-/JSON-Artefakten.
- Entwürfe bleiben während der Browsersitzung im Arbeitsspeicher;
  ein sicheres Reload-Recovery braucht eine gesonderte Entscheidung.
- Kein funktionierender OpenAI-Website-OAuth-Client wurde registriert;
  die deaktivierte Option bleibt sichtbar und als nicht eingerichtet
  gekennzeichnet.
- Das bestehende produktive Studio wurde **nicht authentifiziert**.
  Realer Zwei-Personen-Workflow benötigt eine gesonderte Abnahme.

**Kein Merge und kein Production-Deployment durch dieses Dokument.**
