# R2 – Hermes Linux-Testauftrag

_Status: Prüfauftrag vorbereitet und per read-only Host-Preflight aktualisiert am 17.10.2026. Studio-Tests nicht ausgeführt; kein Runtime-Eingriff freigegeben._

## Ziel und Grenzen

Hermes soll die eigenständige Anwendung `Spezzo-sudo/schmaqq-workspace` auf einer **vom laufenden SCHMAQQ-/NetzKontor-Stack getrennten, autorisierten Linux-Testumgebung** prüfen. GitHub bleibt Source of Truth für den Code und sanitizierte Evidence; keine automatische Actions-Ausführung für jeden PR/Push.

**Kein Deployment, kein Merge, keine Änderungen an Produktionsdiensten, Reverse Proxy, Traefik, Docker-Volumes, Datenbanken, Tokens oder Provider-Konfigurationen.** Keine echten Codex-/ChatGPT-Sitzungen, keine Modell-Downloads und kein ungewollter Zugriff auf fremde Projekte. Diese Prüfung benötigt keine produktiven Secrets.

## Phase 0: Read-only Preflight (zwingend vor Installation)

- Prüfe für den vorgesehenen *isolierten* Ausführungsort: Linux/Architektur, Node >=24.15.0, npm, Git, Python 3, freier Speicher/Inodes, CPU, RAM, erreichbare Pakete und sichere Scratch-Pfade.
- Trenne Tester vom produktiven Host durch unprivilegierten Benutzer plus geeignete Sandbox/Ressourcenlimits; keine Host-Sockets oder Produktivverzeichnisse einbinden.
- Installiere auf dem bestehenden Produktionshost nicht stillschweigend eine neue Node-Version und führe dort weder `npm ci` noch einen schweren Build aus.
- Wenn die Umgebung oder die Sicherheitsgrenzen nicht passen: **BLOCKED**, keine improvisierte Umrüstung.

**Aktualisierter read-only Host-Befund vom 17.10.2026:** Verbundener Produktions-VPS `srv1365337`: Linux x86_64, ext4 Root-Dateisystem ca. 71 % belegt (~28,6 GiB frei nach separater freigegebener Modell-Bereinigung), 7,8 GiB RAM, kein Swap und System-Node v22.22.2. GitHub-Zugang zum privaten Studio-Repository ist vorhanden, aber es gibt dort keine bereits vorbereitete isolierte Studio-Testumgebung. **Kein Build auf dem produktiven Host!** Der separate Test-Runner benötigt Node >=24.15.0 und begrenzte Ressourcen. Dieser Befund ersetzt nicht den erneuten Preflight bei Ausführung.

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

3. Erst in der isolierten Umgebung, ohne Produktionssecrets und als unprivilegierter Benutzer:

```sh
npm ci --no-audit --no-fund
npm run studio:verify
```

`studio:verify` führt Source Guard, vorhandene Node-Backendtests, TypeScript-Prüfung und Vite-Studio-Build aus. Kein Entfernen oder Abschwächen von Checks bei Fehlern.

## Phase 2: Lokaler Zwei-Rollen-Smoke (optional nach Preflight)

In der Test-Sandbox `node selfhost/demo.mjs` auf Loopback 127.0.0.1:4320 und 4321 starten; nach erfolgreichem Readiness-Check von `/healthz` **getrennt** `node selfhost/demo-smoke.mjs` ausführen. Die Demo erstellt eigene Fixture-Konten und ein isoliertes Bare-Git-Repository; keine echte SCHMAQQ-Produktionsquelle. Testprozesse kontrolliert stoppen und den privaten `.studio/`-Inhalt nie in GitHub hochladen.

## Phase 3: Sanitizierte Evidence

```text
SCHMAQQ_WORKSPACE_R2
REPO=Spezzo-sudo/schmaqq-workspace
EXPECTED_SHA=<approved>
CHECKOUT_SHA=<actual>
TEST_HOST=<isolated environment>
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
SECRETS_EXPORTED=NO
ERRORS=<sanitized>
```

Ergebnisse dem R2-PR zuordnen. **Nur tatsächlich ausgeführte** Schritte als PASS markieren. Fehlende/ausbleibende Logs sind `NOT_RUN`/ungeklärt, nicht erfolgreich. Erst nach echter Evidence `docs/STATUS.json` in einem eigenen Review-Änderungspaket aktualisieren.

## Unabhängige Abnahmen

Linux-Smoke allein beweist weder reale Browser-/Mobile-Usability noch Zusammenarbeit über das Internet, Live-OIDC, Hostinger-Dauerbetrieb, Admin-Rollen oder vertrauenswürdiges Community-Compute. Diese Gates separat prüfen; keinen Produktivbetrieb daraus ableiten.
