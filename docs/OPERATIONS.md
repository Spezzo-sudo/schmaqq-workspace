# Betrieb: Live-Schalten von Studio und Server-Worker

Stand 29.10.2026. Für jeden Agenten (Codex, Claude Code) und Menschen gleich.
Kein Deployment ohne aktuelles, ausdrückliches Owner-GO für genau diesen Stand
(AGENTS.md). Historische GO-Texte gelten nicht.

## Wo was liegt

- Arbeitsordner: `C:\Users\hi\Documents\ChatGPT\SCHMAQQ\schmaqq-plugin-worker-prototype`,
  Branch `local/studio-plugin-worker-prototype` (Stand 29.10. nicht gepusht).
  `schmaqq-workspace` und `schmaqq-studio-use-candidate` sind ältere Stände.
- Werkzeuge ohne Installation: `..\.local-tools` (`git\cmd`, `git\ucrt64` inkl. git-daemon,
  `node-v24.22.1-win-x64`). PATH nur für den Prozess setzen, `GIT_EXEC_PATH` auf
  `git\ucrt64\libexec\git-core` für die volle Prüfung.
- VPS: SSH-Alias `schmaqq-vps` (root, Schlüssel in `~/.ssh`). Andere Dienste auf dem VPS
  (NetzKontor, Klimafinder, Hermes, PR16/17-Vorschauen) sind tabu.
  - Studio: `schmaqq-studio.service`, `/opt/schmaqq-studio/current` → `releases/<commit>`,
    Daten `/var/lib/schmaqq-studio`, ENV `/etc/schmaqq-studio.env`.
  - Worker: `schmaqq-studio-worker.service`, Programm `/usr/local/lib/schmaqq-worker/current`,
    Konfiguration `/etc/schmaqq-worker/`, Daten `/var/lib/schmaqq-worker` (3-GB-Volume),
    dazu `schmaqq-worker-egress` (Proxy) und `schmaqq-worker-launcher` (Job-Starter).
    Details: `selfhost/deploy/worker/README.md`.

## Ablauf Studio-Release (immer genau so)

1. Sauberer Commit; `node selfhost/verify.mjs --local` grün.
2. `node selfhost/release.mjs` → Archiv unter `.studio/releases/`; SHA256 des Archivs notieren.
3. Archiv per `scp` nach `/root/studio-staging-<kurz>/`, dort `sha256sum -c`, nach
   `/opt/schmaqq-studio/releases/<commit>` entpacken, `selfhost/deploy/verify-release.mjs
   --release … --source <commit> --archive … --archive-sha256 …` muss PASS melden.
4. Backup: `sudo -u schmaqq-studio env STUDIO_DATA_DIR=/var/lib/schmaqq-studio node
   selfhost/backup.mjs /var/lib/schmaqq-studio/backups/predeploy-<kurz>-<zeit>.sqlite`.
5. Probestart auf einer **Kopie** des Backups (Port 4390/4391, gleiche ENV wie live),
   Kernpfade prüfen, `selfhost/deploy/schema-preflight.mjs --db <kopie>` muss PASS melden.
6. Umschalten unter `flock /run/schmaqq-studio-switch.lock`: erwarteten Altstand prüfen,
   Symlink atomar (`ln -sfn … current.next && mv -T`), `systemctl restart schmaqq-studio`;
   lokal/öffentlich/`/mcp` prüfen; bei Fehler sofort zurück auf den alten Release.
7. Nachweis unter `docs/evidence/`, `STATUS.json`, `HANDOFF.md` aktualisieren.

## Ablauf Worker-Update

`bash /opt/schmaqq-studio/releases/<commit>/selfhost/deploy/worker/install-worker.sh <releaseordner>`
(idempotent; startet Proxy und Job-Starter; Pflicht-Job-Prüfung läuft mit). Danach
`systemctl start schmaqq-studio-worker-probe` (alle PASS), Worker neu starten, prüfen dass sich
das Gerät „SCHMAQQ-VPS Server-Worker“ innerhalb von 15 s meldet. Bei Fehler: vorheriges
Release mit demselben Skript installieren.

## Fallstricke (alle schon einmal passiert)

- PowerShell → ssh per Pipe hängt BOM und CR an jede Zeile: Skripte als LF-Datei schreiben,
  per `scp` kopieren, mit `bash datei` ausführen.
- `systemd-run -p` kennt `link-local`/`multicast` nicht (Unit-Dateien schon): Bereiche ausschreiben.
- Programme, die über den Symlink `current` gestartet werden, brauchen einen Realpath-Vergleich
  im Startcheck, sonst beenden sie sich still mit Code 0.
- Neue Tabellen in der Studio-Datenbank brechen den Schema-Preflight: versionierte Migration oder
  fest eingetragene Erweiterung; einfache Werte besser in `workspace_meta`.
- Einmalige Prüfungen erst starten, wenn abhängige Dienste lauschen (Proxy, Job-Starter).
