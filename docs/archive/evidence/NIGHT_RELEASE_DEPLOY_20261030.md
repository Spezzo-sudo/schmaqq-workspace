# Nachtlauf P0–P4 – Live-Nachweis, 30.10.2026

Aktuelle Freigabe des Owners im laufenden Chat: **„Ja, live“**, nachdem der lokal geprüfte
Nachtlauf-Stand vorgestellt wurde. Daraus keine Merge-Freigabe abgeleitet. Ausgeführt von Claude Code
(Opus 5.5) streng nach [OPERATIONS.md](../OPERATIONS.md), mit den Skripten aus dem vorigen Release
(`prepare-release.sh`, `switch-release.sh`, `runtime-state.mjs`) ohne inhaltliche Änderung.

## Release und Rückweg

- Studio und Worker auf Quelle `5c3208aab7ee84a1d11177efd9f3d673abffb2c5`, Git-Tree
  `a07d54d45dd38c91ecedc177d53b669de9a8c9a2`, 3891 Dateien.
- Archiv-SHA256 `d104584d40d138231323bf0b451bb18abd7238ee9dc28f3e92b38ea5f70aa756`.
- Vorheriger Stand / Rückweg für beide: `f1394194b50c9f2153668d9d853cfac03be36bcc`.
- Backup: `/var/lib/schmaqq-studio/backups/predeploy-5c3208a-20261030T055101Z.sqlite`
  (Integrität ok, 0 Foreign-Key-Fehler, Modus 0600). Datenkopie für den Probestart:
  `/var/lib/schmaqq-studio/preflight-5c3208a-20261030T055101Z`.
- Betriebsbelege auf dem VPS: `/root/studio-staging-5c3208a/`; nicht geheime Berichte lokal unter
  `.studio/deploy-5c3208a/` (nicht in Git).

Rückweg wie im vorigen Nachweis: unter `/run/schmaqq-studio-switch.lock` Studio-Symlink atomar auf
`f139419…` setzen, Dienst neu starten, `install-worker.sh` des alten Release ausführen, Worker neu
starten, Prüfungen wiederholen. Keine Datenbank zurückkopieren ohne belegte Beschädigung. Der
automatische Rückweg des Switch-Skripts wurde nicht ausgelöst.

## Selbst ausgeführt

1. Sauberer Arbeitsbaum, `node selfhost/verify.mjs --local` Exitcode 0: **273 Tests, 252 PASS, 0 FAIL,
   21 Plattform-Skips**; Source Guard, TypeScript, Build PASS.
2. `node selfhost/release.mjs` aus dem sauberen Commit; Upload per scp; `sha256sum -c` OK;
   Linux-`verify-release.mjs` **PASS** (Quelle eingebettet und gleich).
3. Backup als `schmaqq-studio`, dann Probestart auf der **Datenkopie** (Loopback 4390/4391, gleiche
   EnvironmentFile): Health 200, private API 401, `/mcp` zulässig; Schema-Preflight vor und nach dem
   Start **PASS** (`R23-unversioned-v0`, keine Migration).
4. Unter flock Altstand beider Komponenten geprüft (`f139419`), keine aktiven Jobs. Studio atomar
   umgeschaltet, Worker mit `install-worker.sh` aktualisiert.
5. Job-Isolationsprüfung **10/10 PASS**, Worker-Sandboxprobe **29/29 PASS** (die Zeilen mit
   „fetch failed“ sind erwartete Sperren, jeweils als PASS gewertet).
6. Alle vier eigenen Dienste aktiv (Studio, Worker, Egress-Proxy, Job-Starter); Worker meldet sich frisch
   mit `setupPlanVersion: 1`.
7. Öffentlich: `https://studio.schmaqq.com/healthz` PASS, private API 401, `/mcp` 405; Live-Schema-
   Preflight PASS. Die Startseite liefert genau das lokal gebaute Bundle (`index-CeY-Tb6j.js`,
   `index-QVju2Np0.css`); Anmeldeseite im Browser sichtbar geprüft.
8. Datensatzzahlen vor/nach gleich (1 Mitglied, 1 Projekt, 3 Geräte, 1 Aufgabe, 0 Dokumente).

Die kurzen Connection-Refused-Meldungen direkt nach den Starts lagen in den vorgesehenen
Bereitschaftswiederholungen; die Prüfungen danach bestanden.

## Nicht geprüft

- Kein Login als Owner, keine Projekt-/Aufgabenänderung in dessen Namen. Die neuen Oberflächenteile sind
  live also nur über das ausgelieferte Bundle belegt, nicht durch Bedienung im Owner-Konto.
- Kein Aufruf von `list_tasks`/Abschnittslesen über echtes ChatGPT/Claude; kein echter Job auf
  Klimafinder-Dateien.
- Reduced Motion weiterhin nur im Code geprüft.

## Nächster Schritt

Owner lädt Studio neu und setzt den Klimafinder-Praxistest fort: die Analyseaufgabe mit Lesekopie jetzt als
allgemeines Ergebnis festhalten; „Mit ChatGPT oder Claude bearbeiten“ einmal mit dem echten Assistenten
ausprobieren und Unklares notieren.
