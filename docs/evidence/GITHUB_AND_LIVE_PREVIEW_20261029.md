# GitHub-Zugang und Full-Stack-Vorschau auf dem Server-Worker – Nachweis

Datum 29.10.2026, Owner-GO im Chat („Ja, live“) nach vorgelegtem Plan.

## Live

- Studio: Quelle `d6d587ea2e91010e48f77cd9e56ceaf8208cfb75`, Archiv-SHA256
  `ed85289a45ea0ceaa4ee5833583ee2c06d05c355b896532bb613b931b90d8385`, Backup
  `predeploy-d6d587e-20261029T170425Z.sqlite`; Probestart und Schema-Preflight PASS. Rückweg `4e11987…`, davor `9f1bf1f…`.
- Worker: Quelle `da2aeb260f3b750883913f03a1f52c89ac51f621`, Archiv-SHA256
  `62080504b7670a75693fc35461dea53080bfa5c9dbfe1f14799dad0a1bf7598d`; Job-Prüfung 10/10, Worker-Probe PASS,
  Worker meldet sich. Rückweg `d6d587e…`.
- Lokal: 254 Tests, 233 PASS, 0 FAIL, 21 Plattform-Skips.

## GitHub-Zugang (Deploy-Key pro Projekt, kein neues Konto)

- `connect-github.sh key|clone` (siehe `selfhost/deploy/worker/README.md`). SSH über
  `ssh.github.com:443` durch den Egress-Proxy, GitHub-Host-Schlüssel fest hinterlegt.
- Auf dem VPS geprüft: Verbindung über den Proxy ohne Schlüssel ergibt
  „Permission denied (publickey)“ (Verbindung und Host-Identität korrekt); mit falsch hinterlegtem
  Host-Schlüssel verweigert SSH („REMOTE HOST IDENTIFICATION HAS CHANGED“).
- Erstes echtes Projekt angebunden (29.10.2026 abends): „Studio-Pilottest“ →
  `Spezzo-sudo/schmaqq-studio-pilot` (synthetisches Test-Repository). Deploy-Key mit Schreibrecht vom
  Owner im Repository eingetragen. Über die Vermittlung `auto` auf dem Server-Worker:
  `inspect` ready (origin und `main` per SSH erreichbar), `prepare` aus GitHub, `check` 2/2 bestanden
  (als `schmaqq-job`), `submit` hat Branch `studio/20678aee-1c45-4f7b-90b1-0019fd349b97` nach GitHub
  gepusht (per `ls-remote` bestätigt). Operator-gestartet, Arbeitskopie im Verlauf des Owners
  sichtbar. Die bisherige Pilot-Konfiguration (lokales Test-Repository, Live-Vorschau-Mini-App)
  wurde dabei durch den GitHub-Eintrag ersetzt; Sicherung `runner.json.before-github` im Staging-Ordner.

## Full-Stack-Vorschau

- Pilotprojekt mit Mini-App (`preview.serve`): Vorschau-Job completed, Ergebnis `scope: live`
  mit geheimem Link auf `studio-preview.schmaqq.com`. Über den Link: Antwort der App, auch auf
  absolute Pfade (`/api/health`) und mit Parametern (`?x=1&y=2`); ohne Link 404.
  Die App lief als eigene Unit `schmaqq-live-…` (Nutzer `schmaqq-job`, Sandbox wie Jobs, 30 min).

## Unterwegs gefunden und behoben (alle live nachgeprüft)

1. SSH startet den ProxyCommand mit der Login-Shell des Workers (`nologin`) und brach ab →
   `SHELL=/bin/sh` im SSH-Befehl.
2. Der Einstiegs-Redirect des Vorschau-Links verlor Parameter → Query bleibt erhalten.
3. Nach einem Neustart des Job-Starters lief die alte Vorschau-App weiter, belegte den Port und
   antwortete statt der neuen (EADDRINUSE) → vor jedem Start werden alle `schmaqq-live-*` gestoppt;
   danach genau eine Unit, kein Portkonflikt.

## Grenzen

Keine WebSockets; Datenbank nur eingebettet (z. B. SQLite); Vorschau ist ein geheimer Link
(jeder mit dem Link sieht sie); höchstens eine Live-Vorschau gleichzeitig pro Worker.
