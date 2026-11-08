# Hermes-Übergabe – SCHMAQQ Studio Navigation (08.11.2026)

**Ziel:** SCHMAQQ Studio nach der UI-Umstellung unter https://studio.schmaqq.com kontrolliert veröffentlichen. **Produktionsumschaltung ausschliesslich nach ausdrücklichem Owner-Kommando `JA LIVE <kurz>`.**

## Was zusammengehört

- PR #60 – `https://github.com/Spezzo-sudo/schmaqq-workspace/pull/60` – schneller, zweiphasiger Deploy und sparsame GitHub-CI. Am 08.11.2026 nach erfolgreichem GitHub-Check zusammengeführt (Squash).
- PR #62 – `https://github.com/Spezzo-sudo/schmaqq-workspace/pull/62` – Hauptnavigation, persönliches Konto und Verzeichnis aller bestehenden Projektgespräche. **Muss erst nach erfolgreicher GitHub-CI zusammengeführt sein.**
- PR #61 ist **nur ein Design-Draft** und wird **nicht** für den Livegang gebraucht.
- Neues UI ersetzt nicht die laufende App. Keine Datenbankmigration, keine Auth- oder KI-Provider-Änderung, kein neuer Chat-Backendpfad.
- Der kombinierte Baum von PR #60 und #62 wurde konfliktfrei gebaut und in einer isolierten Studio-Release-Probe geprüft. 302 Tests (299 bestanden, 3 übersprungen), Typprüfung, Vite-Build, tatsächlicher Chrome-Browsercheck bei 375/390/768/1280/1440 px und ein Zwei-Personen-Chat-Test (Marco/Markus mit separaten Demo-Accounts) bestanden.

## Vorbedingungen / STOP-Gates

1. Im GitHub-Repository `Spezzo-sudo/schmaqq-workspace` muss **PR #62 zusammengeführt** sein (nicht nur offen oder Draft). Vorher nicht deployen.
2. Für PR #62 muss der GitHub-Check `Tests, Typen, Build und Release-Paket` auf dem finalen PR-Head **grün** sein. Bei fehlender CI oder begrenzten Actions-Minuten: VOR einer Freigabe Ursache abklären; keinesfalls CI stillschweigend als bestanden behaupten.
3. Genau den **vollen, aktuellen 40-stelligen SHA von `main` nach dem Merge** verwenden; niemals die PR-Branch-SHAs aus diesem Dokument oder einen älteren `main`-Stand.
4. Der aktuelle Live-Stand vor Release ist `d2c2df0b2150aa6f616d970c3b136fdfc865c4bb`; `schmaqq-studio.service` und `schmaqq-studio-worker.service` waren aktiv, `/healthz` lokal und öffentlich antworteten mit `{"ok":true}`. Unmittelbar vor dem Update nochmals prüfen.
5. Keine anderen VPS-Dienste (Klimafinder, Marketing/NetzKontor, Hermes und andere Vorschauen) verändern.

## Hermes: erster Release mit neuem Skript

Der bislang aktive Release enthält `selfhost/deploy/studio-deploy.sh` **noch nicht**. Einmalig aus dem gültigen `main`-Commit bootstrapen; die Pfade ab dem zweiten Release sind im Betriebshandbuch dokumentiert.

```bash
set -euo pipefail
REPO=https://github.com/Spezzo-sudo/schmaqq-workspace.git
BOOT=/root/studio-bootstrap
if [ ! -d "$BOOT/.git" ]; then git clone --quiet "$REPO" "$BOOT"; fi
git -C "$BOOT" fetch --quiet origin main
SHA=$(git -C "$BOOT" rev-parse refs/remotes/origin/main)
test "${#SHA}" -eq 40
git -C "$BOOT" show "$SHA:selfhost/deploy/studio-deploy.sh" > /root/studio-deploy.sh
chmod 700 /root/studio-deploy.sh
# Vorbereiten: Release-Paket, Backup, Schema, Testserver – NICHT live umschalten.
STUDIO_REPO_URL="$REPO" bash /root/studio-deploy.sh prepare "$SHA"
```

Wenn `RESULT=PASS`, den gesamten `KEY=VALUE`-Block mit `SOURCE`, `PACKAGE`, `BACKUP`, `SCHEMA`, `PROBE`, `WORKER_UPDATE` und vollem `SHA` an Marco melden. **STOPP – auf seine exakte Freigabe `JA LIVE <kurz>` warten.**

Erst danach, genau einmal:

```bash
bash /root/studio-deploy.sh live "$SHA"
```

Wichtig: `SHA` muss in **derselben Shell-Sitzung** verfügbar sein, sonst anhand `git -C /root/studio-bootstrap rev-parse refs/remotes/origin/main` erneut bestimmen und mit dem zuvor vorbereiteten Commit vergleichen. Bei einem abweichenden SHA **STOP**, erneut `prepare` und neue Freigabe einholen. Nie eine leere SHA oder eine Kurz-SHA an das Skript übergeben.

## Nachkontrolle

- `RESULT=PASS` mit `SWITCH=PASS` und `WORKER=unverändert` oder expliziter Worker-Probe.
- `readlink -f /opt/schmaqq-studio/current` zeigt exakt `releases/<SHA>`.
- Lokale und öffentliche `/healthz` grün, `/mcp` erreichbar, Studio- und Worker-Dienste aktiv.
- Mit normalen Konten auf Handy und Desktop: Meine Arbeit, Projekte, Gespräche, Team, Mein Konto; auf Handy nur **eine feste globale Navigationsleiste**.
- `Gespräche → Projekt → Gespräch` führt in **denselben echten Projekt-Chat** und erhält vorhandene Nachrichten, Antworten und Aufgabenverweise.
- Projekt-Reiter Übersicht, Aufgaben, Gespräch, Wissen, Einstellungen bleiben **im Seiteninhalt** horizontal scrollbar.
- Projektaufgabe öffnen, Timeline/Vorschau/Review prüfen, keine Testnachrichten in Produktionsprojekte schreiben.

## Fehlerfall

Bei `RESULT=STOP` nicht per Hand umschalten oder die Sperren umgehen. Fehlermeldung und gesamten Ergebnisblock an Marco melden. Das Skript hat eine automatische Rückfallprüfung bei fehlgeschlagener Studio-Umschaltung. Bei Worker-Installationsfehler ausdrücklich melden: Studio kann bereits live sein; Betriebshandbuch `docs/OPERATIONS.md` beachten.

**Keine Geheimnisse, Anmeldungscodes, Runtime-ENV oder produktiven Nutzerdaten nach GitHub oder in die Hermes-Nachricht kopieren.**
