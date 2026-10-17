# R2 – VPS-isolierter Linux-Integrationstest (17.10.2026)

**Evidence-Status:** Verifizierte Testergebnisse vom eigenständig installierten, nichtprivilegierten Checkout auf dem bestehenden Hostinger-VPS `srv1365337`. Kein externer Cloud-Runner verwendet. Kein Production-Deployment und keine Portfreigabe. Der Freigabeumfang wurde auf ausdrücklichen Wunsch des Owners auf einen eng begrenzten Testbereich *auf dem bereits vorhandenen VPS* geändert.

## Quellstand und Umgebung

- Eigenständiges privates Repository: `Spezzo-sudo/schmaqq-workspace`
- Exakter Quell-SHA: `51786459aa9aef83600581f9977309e7bdd77e2e` (ursprüngliches `main`, keine Dokument-PRs gemergt)
- Laufzeit Node `v24.22.0`, offizielles Release-Archiv gegen Node.js-SHA256-Liste verifiziert; nur im benutzereigenen Testverzeichnis entpackt.
- System-Node `v22.22.2` blieb unverändert.
- Nichtprivilegierter Benutzer `dc-remote`, eigener temporärer Bereich `/home/dc-remote/schmaqq-r2-test-20261017` mit getrenntem HOME/npm-Cache und TMPDIR.
- Kein Docker-Socket verfügbar; daher **keine Containerisolation behauptet**. Der Testbereich nutzte Prozess-/Heap-/Zeitgrenzen und niedrigere CPU-/I/O-Priorität. Nicht identisch mit einem cgroup-limitierten Container.
- Kein GitHub-Actions-Run, kein Docker-Image oder Produktions-Deployment.

## Ausgeführte Tests

| Prüfung | Tatsächlich beobachtetes Ergebnis |
| --- | --- |
| Privates Git-Checkout auf exakten SHA | PASS |
| Isoliertes Node 24, SHA256-Archivprüfung | PASS |
| `npm ci --no-audit --no-fund --ignore-scripts` | PASS – 692 Pakete, ca. 44 Sekunden |
| `npm run studio:verify` | PASS (zweiter Lauf): Source-Guard für 179 Dateien; 13/13 Node-Tests; TypeScript; Vite v8.0.13, 1806 Module, Frontend-Build PASS |
| Erster `studio:verify`-Lauf | FAIL wegen zu striktem `ulimit -v` (V8-CodeRange/virtuelle Adressreservierung); keine Quellcodeänderung. Retry mit `NODE_OPTIONS=--max-old-space-size=1536` und ohne künstliches virtuelles Adressraumlimit PASS |
| Demo-Start `node selfhost/demo.mjs` auf `127.0.0.1:4320/4321` | PASS, `/healthz` und Studio-Frontend HTTP 200 |
| `node selfhost/demo-smoke.mjs` | PASS: 2 Fixture-Konten, 2 Runner, 2 Worktrees, Datei lesen/speichern, echte Tests auf beiden Runnern, gebaute Preview, commitgebundene Review/Freigabe durch zweites Konto |
| Öffentliche Websites nach Test | SCHMAQQ Production HTTP 200, Preview HTTP 200, KlimaFinder HTTP 200 |
| Visuelle Browser-Abnahme | NOT_RUN (kein visueller Test von Desktop-/Mobil-Viewport) |
| Echte Fernnutzer Schweiz–Thailand | NOT_RUN |
| Live OpenAI-/Codex-Login und Agent-Modelaufrufe | NOT_RUN |

## Ressourcen und Sicherheit

- Freier Speicher zu Beginn des Prüfblocks: ca. 30.74 Milliarden Bytes (read-only Preflight); vor Cleanup: `29,025,898,496` Bytes.
- Temporäres Testverzeichnis vor Cleanup: `1,508,091,451` Bytes Dateigrösse (belegter Disk-Blockbedarf `du -sh` rund 1.6 GB).
- Keine Änderung an Production/Preview, Host-Nginx/Traefik, PostgreSQL, Docker-Volumes oder produktiven systemd-Diensten.
- Eigener Loopback-Port; keine Internet-Exposition.
- Laufende Demo musste nach PASS kontrolliert beendet und Testverzeichnis vollständig entfernt werden. Cleanup-Ergebnis im PR-Status separat bestätigen.

**Einschränkungen:** `--ignore-scripts` war eine bewusste Sicherheitsmassnahme für npm-Install-Skripte; in einem späteren reproducibility-Test ohne dieses Flag sollte die Abweichung gesondert bewertet werden. Dieser Test beweist weder dauerhaften Studio-Webbetrieb noch browserseitige UI-Qualität, Multi-Tenancy oder echte Zwei-Personen-Fernnutzung.
