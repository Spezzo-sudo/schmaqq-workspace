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

- Alle Jobs laufen unter demselben Nutzer. Ein Job kann die Worker-Konfiguration samt Gerätetoken lesen.
  Das ist vertretbar, solange nur der Besitzer selbst Jobs auf seinen Worker legen kann (heutige Regel).
  Für Jobs anderer Personen braucht es zuerst Isolation pro Job (eigener Nutzer/Container pro Auftrag).
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
