# R4-A – Geschützter Zwei-Personen-Pilot auf vorhandenem VPS

_Status: Vorbereitungs- und Abnahmeplan, 17.10.2026. Kein Deployment und keine Änderung an DNS, TLS, Docker, Traefik oder Systemdiensten._

## Ziel und bestätigte Grundlage

SCHMAQQ Workspace/Studio für zwei namentlich eingeladene Personen erreichbar machen. Dauerhaft online bleiben ausschliesslich die schlanke Webanwendung und ihre SQLite-Daten. Builds, Codex-Jobs und persönliche Git-Runner laufen auf autorisierten Geräten. Kein zusätzlicher Cloud-Server, kein Abo-/Compute-Pooling.

Am 17.10.2026 auf `srv1365337` read-only geprüft: 96-GiB-Root, ca. 28,6 GiB frei, ca. 7,8 GiB RAM, 2 CPUs, kein Swap; System-Node v22.22.2; Studio-Ports 4310/4311 frei; SCHMAQQ, Preview, KlimaFinder HTTP 200. Der einmalige Linux- und Browser-Test ist mit Cleanup belegt: [R2](evidence/R2_VPS_LINUX_TEST_20261017.md) und [R3-A](evidence/R3A_LOCAL_BROWSER_20261017.md) liegen derzeit **auf PR #2**, nicht main.

## Blocker vor jeder externen Erreichbarkeit

1. **Quellstand konsolidieren:** R1-Architektur-PR #1 sowie R2-/Browser-Evidence-PR #2 unabhängig prüfen und in richtiger Reihenfolge zusammenführen. Dokumentationsstatus aktualisieren; für das spätere Release einen exakten, erneut geprüften SHA festhalten. Kein stillschweigender Merge.
2. **Schlankes Release offline vorbauen:** Auf demselben VPS nur in einem exklusiven, temporären Benutzerordner mit lokaler Node-24-Laufzeit und eigenem Cache bauen. `selfhost/release.mjs` erzeugt ein Manifest mit SHA256 und ein Paket, nicht den gesamten `node_modules`-Baum. `selfhost/release-smoke.mjs` muss gegen das **tatsächlich gepackte** Release laufen. Cleanup auf 0 dauerhafte Build-Daten und 3-GiB-Arbeitsbudget prüfen. Keinen Docker-Build auf dem Produktiv-Host.
3. **Node-Pfad korrigieren:** `selfhost/deploy/schmaqq-studio.service` verweist derzeit auf `/usr/bin/node` (Node 22). Studio braucht >=24.15. Ziel ist eine separat geprüfte, eigene runtime mit explizitem unveränderlichem Pfad, ohne globale Umstellung. Systemd-Vorlage erst nach bestätigtem Zielpfad ändern.
4. **Datenpfade klar trennen:** `/var/lib/schmaqq-studio` ausschliesslich Studio; Rechte 0700, Dienstbenutzer ohne Login; Releases separat unter `/opt/schmaqq-studio`. Niemals NetzKontor-/SCHMAQQ-/KlimaFinder-DB, Docker-Volumes oder gemeinsame Cookies nutzen.
5. **TLS/DNS/Reverse-Proxy-Konzept:** Zwei getrennte HTTPS-Origins für Studio und unsichere statische Vorschau definieren. Noch keine Subdomain reserviert oder live gestellt. Reverse Proxy nur als additive, separat geprüfte Konfiguration mit Rollback und Test der vorhandenen Routes. **Keine direkte öffentliche Portfreigabe**, Studio-Ports nur Loopback.
6. **Zugangsgrenzen:** Erst Eigentümer-Konto, danach eine an E-Mail gebundene Einladung. Registrierung fremder Personen deaktiviert, beide Konten mit individuellen Passwörtern. `STUDIO_CHATGPT_CLIENT_ID` bleibt ungesetzt, solange kein offiziell registrierter Client vorliegt. Kein Austausch von ChatGPT-Sitzungen, API-Schlüsseln oder Runner-Tokens.
7. **Backup/Restore:** Vor Pilotstart einen konsistenten SQLite-Snapshot erstellen, Restore auf getrennter Testinstanz mit Besitz-/Schema-/Datentest belegen; Aufbewahrung, Schutz und externe Kopie festlegen. Ein erfolgreiches `VACUUM INTO` ohne Restore ist kein vollständiger Nachweis.
8. **Runtime-Ressourcen:** `MemoryMax=256M`, `CPUQuota=50%` nur als Startwerte, nicht als garantierte Grössen. Nach echte Last unter zwei Accounts mit Speicher-, Prozess-, Disk- und Logmessungen entscheiden. Keine Aufgaben-Runner im Studio-Servercontainer.
9. **Sicherheitsprüfung:** Session-Cookies (Secure/HttpOnly/SameSite), CSRF-Origin, Setup-Link-Lebensdauer, Rollen/Admin-Rechte, Runner-Revocation, Dateipfade, Vorschau-Origin und unauthentifizierte API-Antworten auf dem fertigen HTTPS-Betrieb testen. Keine persönlichen Secrets in Logs oder Git.
10. **Echtes Zwei-Geräte-Gate:** Eine Person auf Mobil/PC und zweite Person am anderen Ort: Login, Projekt, Aufgabe, Datei, Runner offline/online, unabhängiger Review, Freigabe; Konflikt und Abbruch auch negativ testen. PC darf aus sein, während Dashboard erreichbar bleibt; dessen Runner muss dann korrekt offline erscheinen.

## Release- und Rollback-Vertrag

- **PRE:** Hauptsites HTTP 200, Backup, freier Speicher, aktueller Dienst-/Router-Fingerprint, exakter Release-SHA und Wiederherstellungsweg dokumentiert.
- **APPLY:** Nur nach **explizitem Owner-Go für R4-Deployment**; gezielt einen neuen unprivilegierten Studio-Service und zwei HTTPS-Origins anlegen. Keine bestehenden Dienste neu erstellen oder Secrets anderer Anwendungen anfassen.
- **POST:** Studio-Health, Auth, Freigabe-/Negativfälle, Datenpersistenz nach Neustart, Preview-Origin, Restore-Test, bestehende Websites und Diskgrenzen prüfen.
- **ROLLBACK:** Nur Studio-Routing und Studio-Dienst zurücknehmen, ohne bestehende Websites zu verändern oder neue Teamdaten zu überschreiben. Datenbank-Schema-Kompatibilität beachten.

## Aktueller Status

```text
R2_LINUX_VERIFY=PASS
R2_TWO_ROLE_SMOKE=PASS
R3A_BROWSER_AUTOMATED=PASS
R4_READ_ONLY_VPS_PREFLIGHT=PASS
R4_RELEASE_PACKAGE_SMOKE=NOT_RUN
R4_NODE24_SERVICE_PATH=BLOCKED
R4_HTTPS_ORIGINS=UNDECIDED
R4_BACKUP_RESTORE=NOT_RUN
R4_REMOTE_TWO_REAL_USERS=NOT_RUN
R4_OWNER_DEPLOYMENT_GO=NO
PRODUCTION_MUTATION=NO
```

**Nächster sinnvoller Codeblock:** Release-Paket samt Test-Manifest überprüfen und die systemd-Vorlage auf eigene Node-24-Laufzeit vorbereiten. Keine neue Infrastruktur bestellen und kein Deployment eigenmächtig auslösen.
