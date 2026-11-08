# Betrieb: Studio live schalten

Stand 08.11.2026. Für Menschen, Hermes und jeden Agenten gleich.
Kein Livegang ohne aktuelles „JA LIVE <kurz>“ des Inhabers für genau diesen Stand.

## Wer prüft was

| Wo | Wann | Was |
|---|---|---|
| GitHub (`.github/workflows/studio-ci.yml`) | jeder Pull Request und jeder Stand auf `main` | Geheimnis-Prüfung, alle Tests, Typen, Build, Release-Paket mit Probestart |
| VPS (`selfhost/deploy/studio-deploy.sh`) | jedes Update | nur Sicherheitsnetze: genau dieser Commit von `main`, Paket-Integrität, Dateirechte, Backup, Schema und Probestart auf einer Kopie, Umschalten mit automatischem Rückfall, Worker nur wenn nötig |
| Inhaber am Handy | sichtbare Änderungen | kurz durchklicken |

Zusammengeführt wird nur, wenn die GitHub-Prüfung grün ist. Der VPS wiederholt die Tests deshalb nicht.

## Ein Update (zwei Befehle)

Der Commit ist immer der volle 40-stellige Stand von `main` **nach** dem Zusammenführen (nicht der Branch-Commit).

```bash
# 1. Vorbereiten – ändert nichts am Live-Betrieb
bash /opt/schmaqq-studio/current/selfhost/deploy/studio-deploy.sh prepare <commit>
#    → Zusammenfassung melden, auf „JA LIVE <kurz>“ warten

# 2. Live schalten – nur nach „JA LIVE <kurz>“, genau einmal
bash /opt/schmaqq-studio/current/selfhost/deploy/studio-deploy.sh live <commit>
```

Das Skript läuft immer aus dem **aktuell live** laufenden Stand (geprüft und bewährt), nie aus dem neuen.
Jeder Lauf endet mit einem Block `KEY=VALUE` und `RESULT=PASS` oder `RESULT=STOP` mit Grund.
Bei `STOP` nichts von Hand nachbessern, sondern den Block melden.

- `prepare` holt den Commit in einen Zwischenspeicher (`/var/cache/schmaqq-studio-build`), installiert
  Abhängigkeiten nur, wenn sich `package-lock.json` geändert hat, baut das Paket, entpackt es nach
  `/opt/schmaqq-studio/releases/<commit>`, prüft es, macht ein Backup mit dem Skript des neuen Stands,
  prüft das Schema und startet eine Kopie auf Port 4390/4391. Es erkennt selbst, ob die Werkstatt
  (Worker) betroffen ist (`WORKER_UPDATE=yes|no`), über die Dateien, die der Worker wirklich lädt.
- `live` schaltet unter Sperre atomar um, prüft lokal, öffentlich, `/mcp` und den laufenden Prozess,
  fällt bei Fehler sofort auf den alten Stand zurück und aktualisiert den Worker nur bei `yes`
  (Installation, Sandbox-Probe, Neustart, Meldung bei Studio).
- Erster Lauf auf einem Server: `STUDIO_REPO_URL=<dieselbe Adresse wie beim bisherigen git clone>` setzen.
- Bewusst auf einen älteren Stand zurück: `STUDIO_ALLOW_OLDER=1` vor `prepare`.

## Wo was liegt

- Studio: `schmaqq-studio.service`, `/opt/schmaqq-studio/current` → `releases/<commit>`,
  Daten `/var/lib/schmaqq-studio` (Backups in `backups/`), ENV `/etc/schmaqq-studio.env`.
- Worker: `schmaqq-studio-worker.service`, Programm `/usr/local/lib/schmaqq-worker/current`,
  Konfiguration `/etc/schmaqq-worker/`, Daten `/var/lib/schmaqq-worker`,
  dazu `schmaqq-worker-egress` (Proxy) und `schmaqq-worker-launcher`. Details: `selfhost/deploy/worker/README.md`.
- Andere Dienste auf dem VPS (Klimafinder, NetzKontor, Hermes, Vorschauen) sind tabu.

## Rückfall von Hand

Der vorherige Stand bleibt unter `releases/` liegen. Zurück geht es mit demselben Skript:
`STUDIO_ALLOW_OLDER=1 … prepare <alter-commit>`, dann `… live <alter-commit>`.
Datenbank-Backups liegen unter `/var/lib/schmaqq-studio/backups/predeploy-<kurz>-<zeit>.sqlite`.

## Fallstricke (alle schon einmal passiert)

- Squash-Merge: Der Branch-Commit landet nicht auf `main`. Immer den Commit von `main` nennen.
- Archive mit langen Pfaden: gepackt wird mit `tar --format=ustar` (`release-archive.mjs`).
- Auf Windows gebaute Pakete hatten Rechte 777: entpackt wird mit `--no-same-permissions`, geprüft mit `find -perm /022`.
- Neue Tabellen brechen den Schema-Preflight: einfache Werte in `workspace_meta`.
- Programme über den Symlink `current`: Realpath vergleichen.
