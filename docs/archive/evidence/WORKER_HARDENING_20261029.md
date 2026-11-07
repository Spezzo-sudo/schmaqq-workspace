# Härtung Server-Worker und KI-Anmeldung – Nachweis

Datum 29.10.2026, Owner-GO im Chat („ja, live“) für genau diese Änderungen.

## Ausgangslage (lesender Audit in der Worker-Sandbox)

Der Worker konnte lokale Dienste über Unix-Sockets erreichen: PostgreSQL
(`/run/postgresql`), D-Bus, snapd, CUPS, uuidd, systemd ManagedOOM/DynamicUser-Varlink
und einen abstrakten iSCSI-Socket. Direktes Internet und DNS waren offen (Datenabfluss,
auch über DNS-Anfragen, und Missbrauch der Server-IP möglich). Automatische
Sicherheitsupdates waren bereits aktiv, kein Neustart ausstehend (Kernel 6.8.0-142).

## Umgesetzt

1. **Kein direktes Netz für Jobs:** `IPAddressDeny=any`, nur der Egress-Proxy
   (`127.0.0.60:3128`) erlaubt; kein DNS; `RestrictAddressFamilies=AF_INET AF_INET6`
   (kein AF_UNIX, damit auch keine abstrakten Sockets); `/run` durch leeres tmpfs ersetzt.
2. **Allowlist-Egress-Proxy** `schmaqq-worker-egress.service` (DynamicUser, Sandbox):
   nur HTTPS-CONNECT auf Port 443 zu `studio.schmaqq.com`, `registry.npmjs.org`,
   `github.com`, `codeload.github.com`, `objects.githubusercontent.com`; der Proxy löst
   selbst auf und verbindet nur zu öffentlichen Adressen (keine DNS-Umleitung auf interne
   Dienste); IP-Literale und Klartext-HTTP abgelehnt; Ablehnungen nur mit Hostnamen geloggt.
3. **KI-Selbstregistrierung nur von bekannten Absendern:** Client-Metadatendokumente und
   dynamische Registrierungen nur für `claude.ai`, `claude.com`, `chatgpt.com`
   (`STUDIO_PLUGIN_CLIENT_HOSTS`) oder Loopback-Rücksprünge lokaler Programme. Bei jeder
   Nutzung erneut geprüft.
4. **Ergebnisse gekennzeichnet:** `get_code_job` liefert Ausführer (Name, Art) und den
   Hinweis „Vom Ausführer gemeldet, nicht unabhängig geprüft“.

## Live und geprüft

- Studio: Quelle `9f1bf1f836b07a6e40ea906712d66d30479c74ed`, Archiv-SHA256
  `2779c315fdcc3f7e433c07021fb685302415e19661a77b4307ace372fd31f6be`, Backup
  `predeploy-9f1bf1f-20261029T152255Z.sqlite`, Probestart: Registrierung claude.ai 201,
  Loopback 201, evil.example 400, ChatGPT-Autorisierung 200; Schema-Preflight PASS;
  Umschaltung ohne Rollback. Rückweg `7bd7ea4…`.
- Worker: Quelle `7c379efa2ddf6251b2acac90c09772feb27a8de4`, Archiv-SHA256
  `1581ff116ab86c5a643128a1c121989b934455c18b53a1b63e39c1dbecd72be4`. Sandbox-Probe
  **29/29 PASS** (u. a. DNS/Internet direkt gesperrt, Datenbank-/D-Bus-/abstrakte Sockets
  EAFNOSUPPORT, keine Service-Sockets in `/run`, Studio und npm über Proxy erreichbar,
  example.com über Proxy abgelehnt). Worker meldet sich über den Proxy bei Studio.
  Danach echter `check`-Job in der Pilot-Arbeitskopie: completed, 1/1 bestanden.
- Lokale Prüfung: 245 Tests, 224 PASS, 0 FAIL, 21 Plattform-Skips.

## Unterwegs (beide Male automatisch zurückgerollt, ohne Ausfall)

1. Erster Worker-Rollout: die einmalige Probe lief, bevor der Proxy lauschte. Das
   Installationsskript wartet jetzt auf den Proxy.
2. Zweiter Rollout: der Proxy beendete sich still, weil er über den Release-Symlink
   gestartet wurde (derselbe Fehler wie beim Runner). Realpath-Vergleich plus Regressionstest.

## Weiterhin offen

- **Isolation pro Auftrag** (eigener Wegwerf-Nutzer je Job): Jobs können weiterhin die
  Worker-Konfiguration samt Gerätetoken lesen und andere eigene Arbeitskopien sehen.
  Braucht einen kleinen privilegierten Helfer, weil Ubuntu unprivilegierte
  User-Namespaces sperrt (`apparmor_restrict_unprivileged_userns=1`).
- Über erlaubte Ziele (GitHub) bleibt Datenabfluss mit fremden Zugangsdaten denkbar
  (z. B. Push in ein fremdes Repository). Weitere Einengung pro Projekt möglich.
- Kernel-Lücken bleiben ein Restrisiko jeder Prozess-Sandbox.
