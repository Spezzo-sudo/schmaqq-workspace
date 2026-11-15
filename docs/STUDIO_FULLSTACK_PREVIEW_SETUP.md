# SCHMAQQ Studio – echte automatische Cloudflare-Vorschau

**Stand:** 15.11.2026. Diese Arbeitskopie bereitet einen getesteten Full-Stack-Build auf jedem PR und auf `main` vor. **Noch keine öffentliche Cloudflare-Vorschau und kein automatisches Staging-Deployment.** Den Unterschied nicht verwischen.

## Überprüfter Infrastrukturstand

- Repository: `Spezzo-sudo/schmaqq-workspace`, echter Studio-Code unter `selfhost/` und `studio/`.
- Entwicklungsstand: PR #75 enthält PR #73 (Messenger), alle zwölf Avatare und Agentenprofile.
- Bestehender VPS `srv1365337`: `schmaqq-studio.service` läuft mit Node/SQLite auf eigener Loopback-Origin; `studio.schmaqq.com` über bestehendes Reverse-Proxy-System verfügbar.
- Verbundenes Cloudflare-Konto: ein Pages-Projekt `klimafinder-preview`, ein Worker `stufe9`, Tunnel `klimafinder-stable-preview`; **kein schmaqqstudio-Projekt und keine `schmaqq.com`-DNS-Zone**. Cloudflare Access ist in diesem Konto noch nicht aktiviert.
- Der angeschlossene Remote-Desktop-Zugang zum VPS läuft unter nichtprivilegiertem Benutzer `dc-remote` ohne `sudo -n`. Der produktive Host darf nicht ohne gesondert freigegebenen Betriebseingriff verändert werden.

## Bereitgestellt: CI-Paket

`.github/workflows/studio-preview-package.yml` erzeugt bei einem PR oder Push nach `main` automatisch:
1. CI-Abhängigkeiten, vollständige `studio:verify`-Prüfung inklusive Node/Vite und TypeScript.
2. Das **echte** Studio-Release (React-Dateien + Node/SQLite-Server), nicht den unabhängigen alten Starterpfad.
3. Einen isolierten HTTP-Probestart mit Test-Datenbank, Login-, Task- und Backup-Probe.
4. Ein herunterladbares `schmaqq-studio-fullstack.tar.gz` als GitHub Actions Artifact, 14 Tage Aufbewahrung.

Das ist **nicht** bereits eine erreichbare HTTPS-Test-URL. Keine GitHub-Secrets oder Live-Daten werden in das Paket kopiert.

## Zielarchitektur (noch aufzubauen)

```
GitHub PR/Push
   -> CI: Tests, Release, Smoke
   -> isolierter Staging-Release (eigener Prozess, eigener OS-Nutzer)
   -> eigener SQLite-Dateipfad + eigene Uploads/Backups
   -> dedizierter Loopback-Port (nicht 4310)
   -> Cloudflare-vermittelter HTTPS-Zugang mit Zugriffsschutz
   -> Statuskommentar: Git-SHA, URL, Gesundheitspruefung
```

Nur geprüfte Branches / Pull Requests dürfen das Staging aktualisieren; für einen ersten Pilot eine stabile `studio-preview`-Umgebung statt beliebig vieler exponierter Kundeninstanzen. Keine echten Produktionsdaten, keine persönlichen Provider-Tokens, keine Runner-Git-Rechte; sensible Integrationen deaktiviert.

## Blocker für echte Cloudflare-Autodeploys

1. **Cloudflare-Domain-/Routingbesitz:** `schmaqq.com` ist im verbundenen Konto nicht als Cloudflare-Zone sichtbar. Ein direkter Hostname wie `studio-preview.schmaqq.com` erfordert die passende DNS- und TLS-Kontrolle oder eine alternative Worker-/Container-Route.
2. **Getrennter Staging-Dienst:** auf dem VPS sind getrennte Nutzer, Dateipfade, Systemdienst, Origin/Preview-Origin, Backups und Zugriffsschutz durch Berechtigte einzurichten. Nicht den vorhandenen Live-Prozess verwenden.
3. **GitHub-Deployberechtigung:** ein minimal berechtigter Deploy-Kanal, im CI sicher verwaltete Secrets/Trust oder ein existierender freigegebener Runner muss festgelegt werden. Keine geheimen Schlüssel in GitHub-Quelltext.
4. **Cloudflare Access / Auth:** Access ist aktuell nicht aktiviert. Eine öffentlich erreichbare Preview mit Test-Accounts ohne Zugangsschutz ist nicht akzeptabel.
5. **Getrennte Freigabe:** Ein neuer HTTPS-Preview-Dienst ist ein Infrastruktur-/Sicherheitseingriff, kein bloßer UI-Build. Erst Server- und Cloudflare-Account-Rechte prüfen, dann einmalig aufsetzen.

Cloudflare Workers Builds kann bei Worker-Projekten GitHub-Pushes direkt veröffentlichen; dies löst für den vorhandenen Node/SQLite-Server ohne passenden Origin/Container aber **nicht** das Full-Stack-Problem. Containers können Linux-Workloads betreiben, benötigen jedoch eigene Laufzeit-, Persistenz- und Kostenentscheidungen.

## Abnahme einer funktionierenden Preview

- HTTPS auf einer eigenen Test-URL, Zugang kontrolliert, Git-SHA sichtbar.
- Login mit **isolierten Testkonten** und 100% getrennter Test-Datenbank.
- Messenger, zwölf Einzelbilder, Agentenprofile, Nachricht, Reload, Rechte- und Antwortbezüge funktionieren.
- Smartphone 390px getestet; keine falschen öffentlichen 1:1-Chats oder simulierten Modelljobs.
- Auf neuem PR-Commit wird genau der neue Commit gebaut und nach bestandenem Gate auf Staging aktualisiert.
- GitHub-PR erhält URL und Teststatus. Fehlgeschlagener Build lässt letzte funktionierende Staging-Version unangetastet.
- `studio.schmaqq.com`, `preview.schmaqq.com` und `klimafinder-preview` bleiben unverändert.
