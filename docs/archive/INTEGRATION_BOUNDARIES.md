# SCHMAQQ — Grenzen zwischen Website/Plattform und Workspace
_Status: R1-Integrationsvorschlag. Nur Workspace-Repository; keine Änderung im Plattform-Repo und keine produktive Aktivierung._

## Eigentümerschaft

| System | Eigenes Repository | Verantwortlich für |
| --- | --- | --- |
| Bestehende SCHMAQQ-Plattform | `Spezzo-sudo/NetzKontor` (Name historisch, Umbenennung separat) | `schmaqq.com`, bestehende Service-/Kundenlogik, Preview-/Production-Release, aktuelle Domain-/Provider-Integrationen |
| SCHMAQQ Workspace/Studio | `Spezzo-sudo/schmaqq-workspace` | Workspace-Code, lokale Runner, Studio-Projekte und deren eigene Auth-/Daten-/Releasestrategie |

Eine gemeinsam sichtbare Marke ist **kein** gemeinsamer Releasezug, kein gemeinsamer Datenbankzugriff und kein automatisches Berechtigungsrecht zwischen Repositories.

## Navigation und Domains

- Zukünftiger öffentlicher Einstieg: Link „Workspace/Studio“ von der SCHMAQQ-Website zur eigenen Studio-Origin; nur aktivieren, wenn Ziel funktioniert und Zugriff geschützt ist.
- `studio.schmaqq.com` bzw. `workspace.schmaqq.com`: **noch nicht entschieden**. Als Konfiguration behandeln, nicht hart in Datenmodellen verankern.
- `bewertung.schmaqq.com`/Review Control: unabhängige Service-Domain. Öffentliches Rebranding oder Redirects brauchen gesonderte Migrationsprüfung.
- Subdomainwechsel: DNS, TLS, Reverse Proxy, OAuth-Callback-URIs, Cookie-Scope, Links und Redirects mit Übergangszeit prüfen. Nicht nur DNS umstellen.

## Login und Autorisierung

- Kurzfristig eigene Studio-Identitäten; optionaler OIDC-Login nur mit registriertem Client.
- Künftige gemeinsame Anmeldung verlangt einen **ausdrücklichen SSO-Vertrag** zwischen den Anwendungen (Issuer, Client, Claims, Subject, Session- und Logout-Verhalten).
- Website-Identität beweist **keine** Studio-Projektberechtigung; Membership/Role/Scope werden serverseitig im Workspace geprüft.
- Admin ist für Berechtigte in der Oberfläche erreichbar, aber nur durch Authentisierung und serverseitige Autorisierung geschützt.
- Keine gemeinsam benutzten Session-Cookies, Auth-Datenbanken, Codex-Credentials oder Tokens als Integrationsabkürzung.

## Geplante Integrationsobjekte (noch kein API-Vertrag)

- Stabile `service_id` (`studio`, `review-control` ...) von Anzeige-/Marketingnamen und Hostnames trennen.
- Deklarative Service-Registry: Owner-Repo, UI-URL, technische Base-URL, Status, Auth-Modus, Verantwortlicher, Release-/Rollback-Verweis. Ohne Secrets.
- Bei tatsächlicher Integration ein versioniertes API-/Event-Schema definieren: Zweck, Datenminimierung, Authz/Scopes, Fehlerklassen, Idempotenz, API-Version, Rückwärtskompatibilität.
- Keine Datenbanktabellen oder internen Filesystempfade direkt zwischen Anwendungen lesen.

## Dokumentations-Synchronisation

Dieses Dokument hält den **Studio-Blick** fest. Plattformfakten verbleiben in NetzKontor und dessen `AGENTS.md`, `docs/ARCHITECTURE.md` und Betriebs-Evidence. Ein künftiger, eigener NetzKontor-PR kann nach Review auf diese Architektur verweisen und Navigations-/SSO-Entscheidungen dokumentieren.

Bis dahin **keine Behauptung**, die Plattform habe die neue Navigation, Authentifizierung oder Domain bereits übernommen. Ein Commit hier bewirkt dort nichts.
