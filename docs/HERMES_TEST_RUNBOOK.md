# R2 – Hermes Linux-Testauftrag

_Status: R2-Linux-Test und lokale Browserabnahme am 17.10.2026 auf dem bestehenden VPS durchgeführt; alle Testartefakte danach entfernt. Dauerbetrieb/öffentliches Studio weiterhin nicht freigegeben._

## Ziel und Grenzen

Hermes kann die eigenständige Anwendung `Spezzo-sudo/schmaqq-workspace` **in einem getrennten, zeitlich begrenzten Arbeitsverzeichnis auf dem bereits vorhandenen VPS** testen. Der Owner hat die Nutzung dieses VPS dafür ausdrücklich freigegeben. Eine zusätzliche Cloud-VM ist nicht erforderlich. Für jeden weiteren Lauf gelten die Ressourcen- und Bereinigungsgates unten. GitHub bleibt Source of Truth für den Code und sanitizierte Evidence; keine automatische Actions-Ausführung für jeden PR/Push.

**Kein Deployment, kein Merge, keine Änderungen an Produktionsdiensten, Reverse Proxy, Traefik, Docker-Volumes, Datenbanken, Tokens oder Provider-Konfigurationen.** Keine echten Codex-/ChatGPT-Sitzungen, keine Modell-Downloads und kein ungewollter Zugriff auf fremde Projekte. Diese Prüfung benötigt keine produktiven Secrets.

## Phase 0: Read-only Preflight (zwingend vor Installation)

- Prüfe für den vorgesehenen *isolierten* Ausführungsort: Linux/Architektur, Node >=24.15.0, npm, Git, Python 3, freier Speicher/Inodes, CPU, RAM, erreichbare Pakete und sichere Scratch-Pfade.
- Verwende ausschliesslich einen unprivilegierten Testbenutzer, exklusiven temporären Arbeitsordner, eigenen npm-/HOME-/TMP-Cache, zeitlich begrenzte Prozesse und explizites Monitoring von RAM, CPU und Disk. Keine produktiven Sockets, Verzeichnisse oder Secrets einbinden.
- Node >=24.15 nur **innerhalb des Testordners** bereitstellen (Download vorher gegen offizielle SHA256-Liste verifizieren). System-Node, globale Pakete und produktive Dienste unverändert lassen. `npm ci`/Build nur im geprüften Testordner und mit überwachten Limits.
- Wenn die Umgebung oder die Sicherheitsgrenzen nicht passen: **BLOCKED**, keine improvisierte Umrüstung.

**Verifizierter Befund vom 17.10.2026:** Host `srv1365337`, Linux x86_64, Root-Dateisystem ca. 71 % belegt (28,6 GiB frei), ca. 7,8 GiB RAM, System-Node v22.22.2. Ein benutzereigenes Node v24.22.0, exakter Checkout und `npm ci --ignore-scripts` wurden nur temporär installiert. **13/13 Tests**, TypeScript, Vite-Build und Zwei-Rollen-Demo-Smoke bestanden; ausserdem reale Chrome-/Playwright-Browserprüfungen auf 1440×900 und 390×844. Alle Testdaten/Ports wurden danach entfernt, drei Live-Websites weiter HTTP 200. Die ursprüngliche strikte `ulimit -v`-Grenze blockierte einmal V8; ein Retry ohne diese virtuelle Adressraumgrenze bestand. Vgl. [R2 Linux Evidence](evidence/R2_VPS_LINUX_TEST_20261017.md) und [R3-A Browser Evidence](evidence/R3A_LOCAL_BROWSER_20261017.md).

## R2 Speicherschutz und Rückbau (verbindlich)

1. **VPS erlaubt, nicht unbegrenzt:** Neue Tests auf demselben VPS nur als unprivilegierter, einmaliger Lauf in einem eindeutig benannten isolierten Testordner. Keine Änderungen an Production, Preview, KlimaFinder, Hermes, Docker-Volumes oder globaler Node-Installation. Keine externen, kostenpflichtigen Runner auf eigene Initiative.
2. **Budget und Überwachung:** Initial höchstens **3 GiB zusätzlich belegter Platz** für den Testordner (R2 beobachtet ca. 1,6 GiB); bei drohender Überschreitung abbrechen und melden. RAM-Verfügbarkeit, Last und Disk auch während des Builds prüfen; nice/ionice, `timeout` und Node-Heap-Limits einsetzen. Diese Massnahmen sind **keine** harte Container-/cgroup-Isolation; keine falschen Garantieaussagen. Für untrusted Code oder Fremdprojekte wären stärkere Grenzen nötig.
3. **Nur Wegwerfdateien:** `node_modules`, npm-Cache, Git-Checkout, Screenshots, `.studio`, Logs, Toolchain und `TMPDIR` im selben exklusiven Bereich. Keine persistierenden Worktrees, keine globalen npm-Caches oder externen Mounts.
4. **Vorsicht beim Cleanup:** Nur den vorher zweifelsfrei verifizierten Testordner entfernen, nachdem alle zugehörigen Prozesse beendet und die Test-Ports geschlossen sind. Keine fremden Pfade, Backups, Images oder Dienste anfassen. Sanitizierte Evidence vorher im PR ablegen; keine Testpasswörter, privaten Konten oder Tokens veröffentlichen.
5. **Abnahme:** Disk/RAM und HTTP-Gesundheit vorher/nachher; erwartete dauerhafte Build-Daten: **0 Bytes**. Bleibt etwas liegen, gilt `CLEANUP=FAIL` und keine weitere Testwiederholung ohne Klärung.

**Historischer externer Runner:** `scripts/r2-hermes-ephemeral.sh` und `scripts/r2-guards.test.sh` bleiben im PR als *optionaler* Off-VPS-Docker-Ansatz dokumentiert. Ihre dortigen External-Runner-Guards sind beabsichtigt; sie sind **nicht** der tatsächliche Ausführungsweg vom 17.10.2026 und dürfen niemals auf dem produktiven Host verwendet werden. Die separate Docker-Variante wurde nicht vollständig ausgeführt.

## Phase 1: Checkout und echte Prüfungen (nach bestandenem Sandbox-Preflight)

**Fester freigegebener Testkandidat (R2-Quellstand):** `51786459aa9aef83600581f9977309e7bdd77e2e` (`main` bei R2-Vorbereitung). Vor dem Start darf Hermes abweichende Änderungen nicht stillschweigend mittesten. Wenn ein anderer Commit getestet werden soll, exakten SHA vorher dokumentieren und bewusst als neuen Testkandidaten behandeln. Der Auftrag prüft Code, nicht die noch ungemergten R1/R2-Dokumente.


1. Das private Repository über einen autorisierten **read-only** Git-Zugang in eine neue, isolierte Arbeitskopie übernehmen. Auf den für den Auftrag freigegebenen **exakten Commit SHA** wechseln, nicht auf einen wandernden Branch vertrauen. Token/Remote-Credentials nie in Logs ausgeben.
2. Prüfung der tatsächlichen Versionsvoraussetzungen und Checkout-Identität:

```sh
git rev-parse HEAD
node --version
npm --version
git --version
python3 --version
```

3. Erst im geprüften temporären Arbeitsordner, ohne Produktionssecrets und als unprivilegierter Benutzer:

```sh
npm ci --no-audit --no-fund
npm run studio:verify
```

`studio:verify` führt Source Guard, vorhandene Node-Backendtests, TypeScript-Prüfung und Vite-Studio-Build aus. Kein Entfernen oder Abschwächen von Checks bei Fehlern. **R2-Evidence:** `npm ci --ignore-scripts --no-audit --no-fund` wurde aus Sicherheitsgründen ausgeführt; ein Standardlauf mit npm-Lifecycle-Skripten war nicht Teil dieser Abnahme.

## Phase 2: Lokaler Zwei-Rollen-Smoke (optional nach Preflight)

In der Test-Sandbox `node selfhost/demo.mjs` auf Loopback 127.0.0.1:4320 und 4321 starten; nach erfolgreichem Readiness-Check von `/healthz` **getrennt** `node selfhost/demo-smoke.mjs` ausführen. Die Demo erstellt eigene Fixture-Konten und ein isoliertes Bare-Git-Repository; keine echte SCHMAQQ-Produktionsquelle. Testprozesse kontrolliert stoppen und den privaten `.studio/`-Inhalt nie in GitHub hochladen.

## Optionaler externer Docker-Teststarter (nicht auf dem VPS ausführen)

`scripts/r2-hermes-ephemeral.sh` ist ein optionaler separater Docker-Tester mit bewusster Host-Sperre. Dessen simulierte Guard-Prüfungen bestanden; der Docker-Live-Test wurde nicht ausgeführt. Der Owner bevorzugt Tests im begrenzten temporären VPS-Arbeitsverzeichnis; dafür **nicht** den externen Docker-Starter zweckentfremden.

## Phase 3: Sanitizierte Evidence

```text
SCHMAQQ_WORKSPACE_R2
REPO=Spezzo-sudo/schmaqq-workspace
EXPECTED_SHA=<approved>
CHECKOUT_SHA=<actual>
TEST_HOST=<isolated ephemeral VPS directory or separately approved environment>
OS_ARCH=<value>
NODE_VERSION=<value>
PREFLIGHT=PASS|BLOCKED
NPM_INSTALL=PASS|FAIL|NOT_RUN
SOURCE_GUARD=PASS|FAIL|NOT_RUN
BACKEND_TESTS=PASS|FAIL|NOT_RUN
TYPESCRIPT=PASS|FAIL|NOT_RUN
STUDIO_BUILD=PASS|FAIL|NOT_RUN
DEMO_SMOKE=PASS|FAIL|NOT_RUN
BROWSER_QA=PENDING|PASS|FAIL
PRODUCTION_MUTATION=NO
PRODUCTION_DISK_FREE_BEFORE_BYTES=<value>
PRODUCTION_DISK_FREE_AFTER_BYTES=<value>
EPHEMERAL_DISK_PEAK_BYTES=<value>
EPHEMERAL_SCRATCH_BUDGET_BYTES=<value>
TEST_SANDBOX_CLEANUP=PASS|FAIL|NOT_RUN
PERSISTENT_BUILD_BYTES_ON_PRODUCTION=<value>
SECRETS_EXPORTED=NO
ERRORS=<sanitized>
```

**Für den abgeschlossenen Test gelten die zwei verlinkten Evidence-Dateien.** Ergebnisse künftiger Testläufe dem zugehörigen PR zuordnen. **Nur tatsächlich ausgeführte** Schritte als PASS markieren. Fehlende/ausbleibende Logs sind `NOT_RUN`/ungeklärt, nicht erfolgreich. Erst nach echter Evidence `docs/STATUS.json` in einem eigenen Review-Änderungspaket aktualisieren.

## Unabhängige Abnahmen

Linux-Smoke allein beweist weder reale Browser-/Mobile-Usability noch Zusammenarbeit über das Internet, Live-OIDC, Hostinger-Dauerbetrieb, Admin-Rollen oder vertrauenswürdiges Community-Compute. Diese Gates separat prüfen; keinen Produktivbetrieb daraus ableiten.
