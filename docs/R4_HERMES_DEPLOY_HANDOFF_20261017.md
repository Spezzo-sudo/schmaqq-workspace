# SCHMAQQ Studio – Hermes Deployment-Handoff R4-B (17.10.2026)

**Status: NO DEPLOY / PREPARED.** Der Owner hat die zwei gewünschten privaten Pilotadressen bestätigt: `studio.schmaqq.com` und `studio-preview.schmaqq.com`. Das ist die Freigabe der Zieladressen, **nicht** die Freigabe zum ungeschützten Start. Bestandsdienste SCHMAQQ Marketing, Preview, KlimaFinder, Hermes und Review Control dürfen nicht verändert oder neu gestartet werden.

## Bestätigte Fakten
- VPS `srv1365337`, Host-IP `187.77.68.24`. Root ca. 96 GiB; nach staging ca. 28,4 GiB frei, 7,8 GiB RAM. Host `/usr/bin/node` ist v22.22.2.
- `Spezzo-sudo/schmaqq-workspace` `main`: `b22175035f6f3d5c9a5c6894028ad7a0149f8761` beim letzten Release-Build (beim Einsatz erneut bestätigen).
- Kontrolliertes **nicht laufendes** Release und dedizierte Node v24.22.0 im Eigentümer-geschützten Bereich `/home/dc-remote/schmaqq-studio-pilot`. Keine Live-Studio-DB, keine offene Loopback-Portbindung. Dieses Verzeichnis ist `0700` und darf nicht von einem späteren Systemdienst direkt verwendet werden.
- Fertiges Testarchiv aus diesem SHA: 784389 Bytes; SHA256 `97037c0b17d7b199273b6e3938a2989a717771f1c9ee366127cf1dd93d555531`; Release-Manifest, 13/13 Backendtests, TS, Vite und erneuter entpackter Login-/HTTP-/Backup-Smoke PASS.
- Nach Build-Cleanup blieb der kleine vorbereitete Bereich (~206 MB), temporäre ~1,5 GB wurden entfernt. Schmaqq Production, Preview, KlimaFinder HTTP 200; globales Node unverändert.
- DNS für beide Studio-Subdomains ist **noch nicht vorhanden**; HTTPS deshalb ebenso nicht. Auf Host laufen Traefik und Docker, jedoch besitzt der verbundene Remote-Desktop-Nutzer `dc-remote` keinen Zugriff auf Docker-Socket, Root, Hostinger-DNS, systemd-Service-Installation oder Traefik-Konfiguration. Privilegien **nicht umgehen**.
- `marco@schmaqq.com` ist als Postfach in verbundenem Hostinger Mail sichtbar. `markus@schmaqq.com` ist Wunschadresse, aber Postfach/Empfang und endgültige Identität sind noch nicht bestätigt. Kein Einladungsversand vor Bestätigung.

## Administrative Umsetzung – erst durch ausdrücklich befugten Hermes-/Hostinger-Administrator

1. **Preflight ohne Mutation:** exakter Git-SHA, Hash des staged Releases, Node-Archiv (offizieller SHA256), Host-Ports, vorhandene Traefik-/Compose-/Systemd-Router, Firewall, DNS-Zoneninhaber, Datenträger/Memory und Systemzugänge prüfen. Inventar und Konfig-Sicherung der berührten Router samt Rollback aufschreiben. Bestehende Container, Datenbanken und Backups nicht verändern.
2. **DNS im tatsächlich autoritativen DNS-Provider** additiv einrichten (nach Prüfung der Zone und bestehender Records). Falls der Host weiterhin `187.77.68.24` bedient: je ein `A` für `studio` und `studio-preview` auf diese IP; TTL z. B. 300 Sekunden. Vorher CNAME-/A-/AAAA-Konflikte prüfen. Kein Wildcard-Overwrite, keine Mail-/SPF-/MX-Änderungen, keine Änderung an `schmaqq.com` oder `preview.schmaqq.com`.
3. **Dedizierter Dienst statt Live-Build:** Release auf `/opt/schmaqq-studio/releases/<gitsha>` (root-owned, readonly), Runtime aus geprüftem Node-24-Archiv auf `/opt/schmaqq-studio/runtime/node/bin/node`; Symlink `current` erst nach Hash- und Dateiinventarprüfung. Neuer `schmaqq-studio`-Serviceuser (nologin), keine geteilten App-Benutzer. Kein globales Node-Update. Runtime-Sandbox gemäss `selfhost/deploy/schmaqq-studio.service`, aber User/Group/Rechte, WorkingDirectory, `STUDIO_DATA_DIR` und ExecStart auf echten Zustand gegenprüfen.
4. **Persistente Daten:** `/var/lib/schmaqq-studio` 0700, nur Studio-Benutzer. Env in `/etc/schmaqq-studio.env` mit `STUDIO_ORIGIN=https://studio.schmaqq.com`, `STUDIO_PREVIEW_ORIGIN=https://studio-preview.schmaqq.com`, `STUDIO_BIND=127.0.0.1`, `PORT=4310`, `STUDIO_PREVIEW_PORT=4311`, `STUDIO_DATA_DIR=/var/lib/schmaqq-studio`, `NODE_ENV=production`. Keine Zugangsdaten in Git/Logs. Initial vor Anmeldung nur geschützten einmaligen Setup-Link kontrolliert über den Studio-Eigentümer zustellen.
5. **Sicherheitsrelevanter Netzwerk-Gate:** Traefik läuft in einem Docker-Netz. Ein Dienst auf **Host 127.0.0.1:4310/4311 ist aus einem normalen Traefik-Container nicht automatisch erreichbar.** Vor Änderung Netzwerkweg und Host-Binding beweisen. Weder stillschweigend `STUDIO_BIND=0.0.0.0` noch öffentliche Ports öffnen. Nur nach konkretem Test eine abgeschirmte Docker-Netzwerkverbindung oder einen gleichwertigen sicheren Loopback-Proxy herstellen, ohne bestehende Routing-Netze zu verändern. Bei ungelöstem Reachability-Thema `BLOCKED` statt Schnelllösung.
6. **TLS und Reverse Proxy:** für beide Domains eigene, erfolgreiche HTTPS-Routen plus gültige Zertifikate. App und Preview **müssen unterschiedliche Browser-Origins bleiben**, sonst droht Zugriff durch fremdes Vorschau-JavaScript. Preview darf keine Cookies/Sessions der Hauptanwendung erhalten. Nur additive, eindeutig gehostname-gebundene Traefik-Router; bestehende Router/Resolver nicht überschreiben. Headers/Request-Limits (Studio JSON bis 9 MB) prüfen.
7. **Gesicherte Aktivierung:** erst nach erfolgreichem DNS/TLS-Preflight und gültigem eigenen Runtime-/Datensicherheits-Setup, ausschliesslich Studio-Dienst starten; keine automatischen Repo-/Code-Agent-Jobs auf dem VPS. Rate-/Origin-/CSRF-/Secure-Cookie-Tests, Login- und Unauthorized-Tests vor Einladungsversand. Keine Selbstregistrierung ausser einmaliger Bootstrap/E-Mail-gebundener Einladung.
8. **Datenwiederherstellung:** `selfhost/backup.mjs` als `schmaqq-studio`-User für WAL-sicheren SQLite-Snapshot; separat Datenintegrität und Restore aus frischer Instanz testen. Ein geschützter **externer Backup-Ort** muss klar benannt und praktisch geprüft sein, nicht nur Backups auf derselben VPS-Festplatte. Keine vorhandenen Backups löschen.
9. **Pilottest:** `marco@schmaqq.com` als Owner; Markus erst nach Bestätigung seiner tatsächlich nutzbaren Adresse persönlich einladen. Zwei reale Browser, zwei Geräte, Offline/Online Runner, differenzierte Rechte, Tests, Reviews, separater Vorschau-Origin. Keine gemeinsamen ChatGPT-Tokens; ChatGPT-OIDC ist ohne registrierten Client deaktiviert.
10. **Abnahme:** DNS A/AAAA und TLS beide PASS, App-/Preview-HTTP, Systemd-Logs ohne Secrets, CPU/RAM, Speicher, getrennte Daten. Bestehende `schmaqq.com`, `preview.schmaqq.com`, `klimafinder.ch` weiterhin HTTP 200; Review Control getrennt kontrollieren. Bei Fehler nur Studio-Routing/-Service zurückrollen, **keine** produktiven DBs, Volumes oder gemeinsamen Router entfernen.

## Ausführungsgates

```text
R4_GITHUB_RELEASE_PINNED=b22175035f6f3d5c9a5c6894028ad7a0149f8761
R4_RELEASE_SHA256=97037c0b17d7b199273b6e3938a2989a717771f1c9ee366127cf1dd93d555531
R4_MAIN_TESTS=PASS
R4_RELEASE_SMOKE=PASS
R4_STAGED_ARTIFACT=PASS
R4_DNS_RECORDS=NOT_CREATED
R4_TLS_CERTS=NOT_READY
R4_CONTAINER_TO_HOST_REACHABILITY=NOT_VERIFIED
R4_PERMANENT_SERVICE=NOT_INSTALLED
R4_LIVE_ACCOUNT=NOT_CREATED
R4_OFFSITE_RESTORE=NOT_VERIFIED
R4_USER_DEPLOYMENT_GO=REQUIRES_EXPLICIT_PRIVILEGED_EXECUTION
R4_PRODUCTION_CHANGE=NO
```

**Wichtige Bedienregel:** Dieses Dokument ist ein Handoff für die autorisierte Admin-Lane, keine Aufforderung zu improvisiertem `sudo` oder einer Freigabe ungeschützter Serverports. Bis die DNS- und privilegierte Router-/Dienst-Lane verfügbar sind, bleibt der aktuelle Zustand bewusst unangetastet.
