# R3-A – Echte Studio-Browserprüfung (17.10.2026)

## Testumfang und Abgrenzung

Read-only-Audit des lokalen, **nicht öffentlich erreichbaren** Demo-Studios auf dem vorhandenen VPS `srv1365337`, unprivilegierter Nutzer `dc-remote`. Keine produktiven Credentials, keine DNS-/Reverse-Proxy-Änderung, kein Deployment. Testquelle `Spezzo-sudo/schmaqq-workspace` `51786459aa9aef83600581f9977309e7bdd77e2e` (`main`).

Temporary Node v24.22.0; `npm ci --ignore-scripts --no-audit --no-fund` mit 692 Paketen PASS; `npm run studio:build` PASS, Vite 8.0.13, 1806 Module. Headless Chrome 147 mittels Playwright; keine öffentlichen Studio-Ports geöffnet. Screenshots `desktop.png`, `mobile.png`, `desktop-loggedin.png`, `mobile-loggedin.png` nur innerhalb des temporären QA-Ordners erzeugt, **nicht** mit Testpasswörtern/privater Demo-Datenbank nach GitHub hochgeladen.

## Sichtbare Browser-Gates

| Gate | Resultat |
| --- | --- |
| Desktop 1440×900, Login-Seite HTTP 200 | PASS |
| Mobile 390×844, Login-Seite HTTP 200 | PASS |
| Beide Ansichten ohne horizontales `documentElement`-Overflow | PASS (1440=1440 und 390=390) |
| Desktop-/Mobil-Login mit verschiedenen Fixture-Konten | PASS; nach Login unterschiedliche Accountnamen und passende Runner angezeigt |
| Nach Login JavaScript-`pageerror` | PASS: keine |
| Mobile Menütaste `aria-label="Menü"` öffnet Navigation | PASS |
| Mobil zur Ansicht „Projekte“ navigieren | PASS |
| Mobiles Menü nach Navigation wieder geschlossen | PASS |
| Mobile Projektansicht ohne horizontales Overflow | PASS |
| Nicht authentifizierte API-Anfrage auf Loginseite | HTTP 401 beobachtet, erwartete Auth-Grenze; keine Browser-Ausnahme |
| Echter Fernnutzer über HTTPS (Schweiz–Thailand) | NOT_RUN |
| Mobile reale Touch-Hardware und manueller Design-Review | NOT_RUN |
| Automatische Nutzung aller fachlichen Bereiche | NOT_RUN |

Hinweis: Die erste automatisierte `networkidle`-Navigation lief in ein Timeout, da die Seite laufende Verbindungen besitzt; mit `domcontentloaded` liefen die Tests. Ein weiterer initialer Mobil-Navigationsversuch versuchte versteckte Sidebar-Buttons direkt anzuklicken und scheiterte erwartungsgemäss; die anschliessende Prüfung über die sichtbare Menütaste war erfolgreich. Kein Fix erforderlich.

## Offene Qualitätsschritte

- Visuelle Bewertung der entstandenen Screenshots durch einen Menschen (Abstände, Typografie, visuelle Hierarchie) war noch kein vollständig ausgewerteter Review; die automatisierten Browser-Gates sind kein Ersatz.
- Echte Zwei-Personen-Fernverbindung, Rechte-/Admin-Prüfung mit realen Geräten und sicherer öffentlicher Origin erst mit gesondertem R4-Deployment-/Auth-Go.
- Für die spätere Studio-Produktversion getrennte Hostnamen, TLS, sichere Cookies, serverseitige Autorisierung und Backup/Restore testen.
- Cleanup abgeschlossen: Demo beendet, Loopback-Ports 4320/4321 geschlossen, vollständiger temporärer QA-Ordner entfernt. Freier Speicher vor Cleanup: 29,026,279,424 Bytes; nach Cleanup: 30,734,778,368 Bytes. System-Node weiterhin v22.22.2. SCHMAQQ Production, Preview und KlimaFinder nach Cleanup jeweils HTTP 200. Ergebnisse niemals als allgemein produktionsreife UI deklarieren.
