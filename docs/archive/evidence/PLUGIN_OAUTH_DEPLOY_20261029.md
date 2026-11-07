# Production-Umschaltung: Plugin-OAuth-Release (Plugin deaktiviert)

Owner-GO im Chat am 29.10.2026 fuer genau diesen Ablauf: Commit lokal, Release
bauen/pruefen, Backup, isolierter Probestart, Umschalten von `schmaqq-studio`,
Plugin bleibt deaktiviert, bei Problemen Rollback.

## Identitaet

- Quellcommit: `e7ee710596465cf49c4dbdc4c2472b087a59500b` (Branch
  `local/studio-plugin-worker-prototype`, nicht gepusht).
- Archiv-SHA256: `3c25a71a75504996020fc123b6d554ccb4bcdaa653b135c0410591c7d5e85988`,
  3864 Dateien, keine nativen Module.
- Vorheriger Live-Release / Rueckweg: `c79309735f172691190db272fcec90ebb4a05cf8`.

## Tatsaechlich ausgefuehrt

1. Lokal `node selfhost/verify.mjs --local`: 231 Tests, 210 PASS, 0 FAIL,
   21 Plattform-Skips; Guard, TypeScript, Vite PASS. Linux-Recovery NOT_VERIFIED.
2. Lokaler Browserdurchlauf OAuth-Zustimmung -> Code -> Tokenaustausch PASS
   (synthetisches Konto, `.studio/oauth-visual-demo.mjs`).
3. `selfhost/release.mjs` aus sauberem Commit; auf dem VPS nach
   `/opt/schmaqq-studio/releases/<commit>` entpackt;
   `selfhost/deploy/verify-release.mjs` mit Commit und Archivhash: PASS (embedded).
4. Backup per `selfhost/backup.mjs` als Dienstnutzer:
   `/var/lib/schmaqq-studio/backups/predeploy-e7ee710-20261028T233156Z.sqlite`,
   integrity ok, 0 Foreign-Key-Fehler, Modus 0600.
5. Isolierter Probestart auf DB-Kopie (127.0.0.1:4390, Testclient nur dort):
   `/` 200, Session ohne Cookie 401, beide OAuth-Discovery-Dokumente 200,
   `/mcp` ohne Token 401 mit `WWW-Authenticate`-Resource-Metadaten. Kopie danach
   geloescht.
6. Umschaltung unter Lock mit Abgleich des erwarteten Altstands: Symlink atomar,
   `systemctl restart schmaqq-studio`. Lokal 200, `https://studio.schmaqq.com/` 200,
   Session 401, Dienst active. Loginseite im Browser normal dargestellt.

## Nicht geprueft / offen

- Kein Login mit echtem Konto, keine Runner-/Vorschaukontrolle nach Umschaltung.
- `STUDIO_PLUGIN_CLIENTS` unveraendert nicht gesetzt: OAuth/MCP live inaktiv
  (`/mcp` antwortet 403). Aktivierung braucht die tatsaechliche ChatGPT-
  Redirect-URI aus dem Einrichtungsdialog; Client-ID laut Plugin-Manifest
  `schmaqq-chatgpt`. Danach erst Normalchat-Interoperabilitaet testen.
- Kein Push, kein PR, kein Merge.

## Nachtrag: Plugin-Client aktiviert (Owner-GO im Chat)

Redirect-URI aus offizieller Doku (developers.openai.com/plugins/build/auth):
bei RFC-9207-Issuer-Unterstuetzung `https://chatgpt.com/connector_platform_oauth_redirect`.
In `/etc/schmaqq-studio.env` ergaenzt: Client `schmaqq-chatgpt`, genau diese
Redirect-URI. Vorherige ENV als Backup im Staging-Ordner unter `/root/`.
Nach Neustart live: Discovery-Dokumente 200, `/mcp` ohne Token 401 mit
`WWW-Authenticate`, Autorisierung mit fremdem Redirect 400, mit korrektem
Redirect 200 (Zustimmungsseite). Kein Tokenaustausch und keine echte
ChatGPT-Verbindung durch diesen Schritt nachgewiesen.
Deaktivieren: Zeile `STUDIO_PLUGIN_CLIENTS=` entfernen, Dienst neu starten.

## Rueckweg

    ln -sfn /opt/schmaqq-studio/releases/c79309735f172691190db272fcec90ebb4a05cf8 /opt/schmaqq-studio/current.next
    mv -T /opt/schmaqq-studio/current.next /opt/schmaqq-studio/current
    systemctl restart schmaqq-studio

Datenbank nur bei Bedarf und nach Pruefung aus obigem Backup wiederherstellen.
