# Aufgeräumte Projektübersicht – Live-Nachweis, 30.10.2026

Aktuelle Freigabe des Owners im laufenden Chat: **„Ja, live“**, nachdem der lokal geprüfte Stand der neuen
Projektübersicht vorgestellt wurde. Keine Merge-Freigabe daraus abgeleitet. Ausgeführt von Claude Code nach
[OPERATIONS.md](../OPERATIONS.md) mit denselben Skripten wie im
[vorigen Release](NIGHT_RELEASE_DEPLOY_20261030.md).

## Release und Rückweg

- Studio und Worker auf Quelle `d72d8238e7874da74854702308f5de893e12c2cb`, 3891 Dateien.
- Archiv-SHA256 `7f1e46716db417957959194cd67d744cad9a5b39593d67e4f845c675790db1c3`.
- Rückweg für beide: `5c3208aab7ee84a1d11177efd9f3d673abffb2c5`.
- Backup: `/var/lib/schmaqq-studio/backups/predeploy-d72d823-20261030T093111Z.sqlite` (Integrität ok,
  0 Foreign-Key-Fehler, Modus 0600). Betriebsbelege: `/root/studio-staging-d72d823/`.
- Automatischer Rückweg des Switch-Skripts nicht ausgelöst.

## Selbst ausgeführt

1. Sauberer Commit, `node selfhost/verify.mjs --local` Exitcode 0: **277 Tests, 256 PASS, 0 FAIL,
   21 Plattform-Skips**; Source Guard, TypeScript, Build PASS (vor dem Commit, Commit enthielt nur diese Änderungen
   und Doku).
2. `release.mjs`, Upload, `sha256sum -c` OK, Linux-`verify-release.mjs` **PASS**.
3. Backup, Probestart auf der Datenkopie (Loopback 4390/4391): Health, private API 401, `/mcp` zulässig;
   Schema-Preflight vor und nach dem Start **PASS**, keine Migration (keine neue Tabelle).
4. Unter flock Altstand `5c3208a` geprüft, keine aktiven Jobs; Studio atomar umgeschaltet, Worker per
   `install-worker.sh` aktualisiert.
5. Job-Isolation **10/10 PASS**, Worker-Sandboxprobe **29/29 PASS**; alle vier Dienste aktiv; Worker meldet sich.
6. Öffentlich: Health PASS, private API 401, `/mcp` 405, Live-Schema PASS; ausgeliefertes Bundle
   `index-ACb0MjF5.js`/`index-DBcDu7Jz.css` gleich dem lokalen Build.
7. Datensatzzahlen vor/nach gleich (1 Mitglied, 1 Projekt, 3 Geräte, 1 Aufgabe, 0 Dokumente).

## Nicht geprüft

- Kein Login als Owner: die neue Übersicht mit den echten Daten ist noch nicht gesehen. Die ausgeblendeten
  älteren Lese-Einträge bleiben in der Datenbank.

## Nächster Schritt

Owner lädt Studio neu, öffnet Klimafinder → Übersicht und klickt bei der Analyse „Ergebnis festhalten“.
