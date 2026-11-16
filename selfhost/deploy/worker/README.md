# SCHMAQQ Studio – Server-Worker

Ein Server-Worker ist ein Runner auf dem VPS. Er führt Codejobs aus, auch wenn
kein PC eingeschaltet ist. Er ist ein **Gerät des Studio-Besitzers**: Die Regel
„Codejobs nur auf eigenen Geräten“ bleibt unverändert, und er lässt sich in
Studio wie jeder PC sehen und widerrufen.

## Isolation (systemd, `schmaqq-studio-worker.service`)

- Eigener Systemnutzer `schmaqq-worker`: kein root, keine Zusatzgruppen (kein docker), keine Capabilities.
- Schreibbar ist nur `/var/lib/schmaqq-worker`: ein 3-GB-Volume (Loop-Image), also hartes Speicherlimit.
- `/opt`, `/srv`, `/var/lib` (außer dem Worker), `/var/backups`, Home-Verzeichnisse, Docker-Socket und Studio-Secrets sind unsichtbar oder gesperrt.
- Netzwerk: kein direkter Zugang (kein Internet, kein DNS, keine Unix-Sockets, `/run` leer).
  Nach außen nur über `schmaqq-worker-egress.service`: HTTPS zu einer Allowlist
  (Studio, npm-Registry, GitHub), nur zu öffentlichen Adressen. Liste anpassbar über
  `EGRESS_ALLOW` in `/etc/schmaqq-worker/egress.env`.
- Gemeinsame Limits aller Jobs: 2 GB RAM ohne Swap, 1,5 CPU, 256 Prozesse; Zeitlimits je Befehl kommen vom Runner.
- `schmaqq-studio-worker-probe.service` hat exakt dieselben Sandbox-Zeilen und prüft sie (`probe-sandbox.mjs`).

## Bekannte Grenzen

- Projektcode läuft über den Job-Launcher als `schmaqq-job` und sieht nur seine eine Arbeitskopie
  (nicht Worker-Konfiguration, Gerätetoken oder andere Kopien). Es läuft immer nur ein Auftrag gleichzeitig.

## ChatGPT-Anmeldung pro Person (Codex)

- Jede Person verbindet in Studio unter „Mein Konto“ ihr **eigenes** ChatGPT-Konto (Device Code, auch vom Handy).
- Die Anmeldung liegt unter `/var/lib/schmaqq-worker/codex/<mitglied>` (Ordner `codex` nur root). Der Launcher
  leitet den Ordner aus dem Besitzer des Studio-Auftrags ab, bindet genau diesen einen Ordner in die Unit ein und
  führt nur feste Codex-Befehle aus. Projektjobs sehen keinen dieser Ordner.
- Codex ist eine eigene, fest versionierte Kopie unter `/usr/local/lib/schmaqq-worker/codex` (sha512 geprüft),
  nie `/usr/bin/codex`. Codex-Codeaufträge sind auf dem Server-Worker gesperrt, bis sie über diese Anmeldung laufen.
- Voraussetzung: Im ChatGPT-Workspace ist „Device Code Login“ erlaubt.
- Kein Zugang zu privaten GitHub-Repositories: Dafür müssten Zugangsdaten auf den Server. Der Pilot
  verwendet deshalb ein lokales Test-Repository.

## Befehle (root, auf dem VPS)

```
install-worker.sh /opt/schmaqq-studio/releases/<commit>   # Programm + Unit + Volume, idempotent
configure-worker.sh <projekt-id>                           # einmalig: Gerät, Konfiguration, Pilot-Repo
systemctl start schmaqq-studio-worker-probe; journalctl -u schmaqq-studio-worker-probe -b --no-pager
systemctl enable --now schmaqq-studio-worker
```

Abschalten: `systemctl disable --now schmaqq-studio-worker` und das Gerät in Studio widerrufen.

## Echtes GitHub-Projekt anbinden (ohne neues Konto)

```
connect-github.sh key   <projekt-id>              # zeigt den öffentlichen Schlüssel
# im bestehenden Repository: Settings -> Deploy keys -> Add deploy key
# ("Allow write access" nur, wenn der Worker Aufgaben-Branches pushen soll)
connect-github.sh clone <projekt-id> <owner/repo> [basis-branch] '["npm","test"]' [true|false]
```

Git nutzt SSH über Port 443 (`ssh.github.com`) durch den Egress-Proxy; GitHubs Host-Schlüssel
ist fest hinterlegt. Der private Schlüssel liegt unter `/var/lib/schmaqq-worker/keys/<projekt>`
und ist für Jobs unsichtbar. Widerruf: Deploy-Key im Repository löschen.

## Full-Stack-Vorschau

Im Projekteintrag von `runner.json`: `"preview":{"serve":{"argv":["npm","start"],"port":3000}}`.
Die App muss auf `process.env.HOST` und `process.env.PORT` lauschen. Sie läuft wie ein Job
(eigener Nutzer, nur die eigene Kopie, kein direktes Netz), höchstens 30 Minuten; eine neue
Vorschau ersetzt die alte. Studio liefert einen geheimen Link auf der Vorschau-Adresse.
Grenzen: kein WebSocket-Durchreichen, Datenbank nur eingebettet (z. B. SQLite in der Kopie),
jeder mit dem Link kann die Vorschau öffnen.
