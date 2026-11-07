# R24-E1 — Authentifizierung und Workspace-HTTP-Routen

Status: **nur isolierter Entwicklungszweig auf R24-D**, kein Merge und kein
Production-Deployment.

## Zweck und Modulgrenzen

R23/R24-D betreiben einen kleinen monolithischen Node-Server. Die bisherige
`selfhost/server.mjs` hatte zusätzlich zur Runner- und Entwicklungs-API
auch die gesamte Konto-/Session-Registrierung und das Workspace-CRUD direkt
als lange verschachtelte `if(route===...)`-Anweisungen implementiert.

R24-E1 trennt Verantwortlichkeiten, **ohne einen neuen HTTP-Endpunkt oder
Datenbankzugriffspfad einzuführen**:

| Datei | Verantwortlich für |
| --- | --- |
| `selfhost/server.mjs` | HTTP-Lifecycle, Origin/JSON/CSRF-Prüfung, Cookiesessions, Runner, Development-Jobs, Fehlerbehandlung und statische Assets |
| `selfhost/auth-http.mjs` | Login, Registrierung, Ersteinrichtung, Logout, aktueller Sessionuser und Owner-Einladungen |
| `selfhost/workspace-http.mjs` | Projekt-, Aufgaben-, Dokument- und Chat-Operationen; Mitglieder, Aktivitäten und gemeinsame Workspace-Daten |
| `selfhost/release.mjs` | Kopiert beide neuen Runtime-Module in das gepinnte Release-Archiv |

### Sicherheits- und Dateninvarianten

1. `server.mjs` prüft weiterhin vor dem Delegieren gültige POST-Origins
   und `application/json`, ausser bei bisherigen getrennten
   Runner-Aufrufen. Die einzelnen Routemodule dürfen nicht direkt als
   ungeprüfte öffentliche Listener eingesetzt werden.
2. Der bestehende Login-Ratelimiter bleibt zunächst unverändert: zwölf
   Versuche pro Minute und Socketadresse. Seine bekannte Reverse-Proxy-
   Schwäche ist **nicht** Teil dieses rein strukturellen Refactorings.
3. Sessions bleiben serverseitig an Cookie-Hashes und Mitglieder gebunden;
   die früheren Cookie-Eigenschaften gelten unverändert. Bootstrap ist
   einmalig, Registrierung verbraucht einen Invite atomar.
4. Projekt-/Aufgabenoperationen prüfen weiterhin Existenz und Rollen, das
   Dokumentenupdate erzwingt dieselbe Revision wie bisher und Nachrichten
   sind bei wiederholter ID idempotent.
5. Anwendungsdaten, Sessions, Geräte, Jobs, Runner, Stripe, DNS und
   Github-Provider sind weder bei Entwicklung noch beim Testen auf
   Production verändert worden.
6. Künftige funktionale Änderungen gehören als **eigene** kleine PRs mit
   negativen Auth-/CSRF-/Rollentests hinzu; nicht mit Codeverschiebung
   vermischen.

## Tests und Nachweise

`selfhost/router-boundaries.test.mjs` verwendet nur eine isolierte
temporäre Datenbank und einen Loopback-HTTP-Listener mit zufälligem Port.
Er prüft: anonymer Zugriff = 401, Invitezulassung, Cookie/Session, CSRF
403 bei fehlender Origin, Projekt und Aufgabe, idempotente Chatnachricht,
konkurrierende Dokumentrevision = 409, Member ohne Einladungsrecht = 403,
Logout invalidiert die alte Session.

Die unveränderte bestehende Gesamtsuite muss zusätzlich bestehen.
Ein grüner Test ersetzt keine authentifizierte Production-Browserprüfung.

## Freigabe-/Integrationsgrenzen

R24-E1 basiert auf `8af97b08a4b9ece0589fe2b7cace99e8e03d3ae4`
(R24-D Draft). Der laufende Produktionsstand bleibt `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`
(R23). Kein automatischer Merge, keine Freigabe anderer PRs und keine
Überschreibung geschützter Konfiguration.

**Nächster Refactor:** Runner/Development-API und reine HTTP-Hilfsfunktionen
ebenfalls als eigene Module aufteilen – zuerst mit unverändertem Routing-
Vertrag und Laufzeitpaket-Smoke, dann optional ein separates Proxy-
Ratelimit-/Security-Engineering-Paket.
