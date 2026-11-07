# Persönliche Verbindungen: technischer Stand

Stand: 17.10.2026. Lokale Änderungen auf `fix/studio-first-workspace-layout`.
Zum Zeitpunkt dieser lokalen Prüfung kein Push, Merge, Deployment oder externer KI-Auftrag. Aktuelle Kandidatensicherung: `PILOT_PLAN.md` und `STATUS.json`.

## Tatsächlich umgesetzt

- Navigation „Verbindungen“ ersetzt „KI & Rechner“. Ein gemeinsamer Bereich zeigt
  GitHub, ChatGPT/Codex und die ausdrücklich noch nicht integrierten Claude- und
  Copilot-Adapter. Die vorhandenen lokalen KI-/Teamfreigaben bleiben erhalten.
- GitHub besitzt einen echten serverseitigen OAuth-Ablauf zur Bestätigung des
  persönlichen Kontos. Endpunkte: GET `/api/connections`, POST
  `/api/connections/github/start`, GET `/api/connections/github/callback`, POST
  `/api/connections/github/disconnect`. Status erfordert eine Studio-Sitzung.
- State, PKCE S256, kurzlebige HttpOnly-/SameSite-Lax-Browserbindung und die
  ursprüngliche gültige Sitzung schützen die Rückleitung. Pro Person ist nur
  ein aktueller Versuch erlaubt. Die Rückleitung ist einmalig. Trennen während
  einer laufenden Profilabfrage verhindert eine spätere erneute Verknüpfung.
- GitHub-ID, Username, Mitglied und Bestätigungszeit liegen in einer eigenen
  SQLite-Tabelle. Es gibt keine E-Mail-basierte automatische Zusammenlegung und
  dieselbe persönliche GitHub-ID kann nicht still zwei Mitgliedern zugeordnet werden.
- `read:user` wird angefordert. Der kurzzeitig erhaltene OAuth-Token wird nur
  zur Profilprüfung verwendet und weder gespeichert noch an den Browser gegeben.
  Das bestätigt die Identität; es gewährt Studio keinen Repository-Zugriff,
  keinen Git-Zugang auf einem Runner und keinen Copilot-Zugang.
- Entfernen löscht die lokale Zuordnung und beendet ausstehende Versuche. Ein
  Widerruf der Autorisierung bei GitHub ist eine separate Aktion beim Anbieter.
- ChatGPT/Codex zeigt ausschließlich den gemeldeten Status eigener Runner.
  Ein Studio-Identitätslogin bleibt separat, vorhandene OIDC-Implementierung
  unverändert. Direkte Plan-Nutzung, Login-Start auf Runnern und zusätzliche
  Claude-/Copilot-Auftragsadapter wurden nicht implementiert.

## Nachweise

`node selfhost/verify.mjs` mit Node 24: PASS, 15 Tests inklusive zwei neuer
GitHub-Tests, TypeScript, Frontend-Build und Source-Guard.

OAuth-Test gegen ausdrücklich lokalen HTTP-Anbieter: PKCE-Codeaustausch,
Browserbindung, Ablaufzeit, Replay, fremde Origin, Kontentrennung, falsche
Profildaten, ausgeloggte Sitzung, Ablehnung beim Anbieter, Trennen während
Profilprüfung sowie nicht konfigurierter Client geprüft. Dieser Test ist
kein Nachweis einer tatsächlichen GitHub-Autorisierung.

Sichtbarer Browser gegen lokale Instanz: unkonfigurierter GitHub-Status,
vorhandener echter Runnerstatus, Links/Einrichtungshinweise und als fehlend
gekennzeichnete Adapter geprüft. Desktop 1280 und Mobil 390 Pixel ohne
horizontalen Seitenüberlauf; Karten innerhalb des sichtbaren Inhalts.
Screenshots ausschließlich im ignorierten `.studio/r5-ui-20261017/`.

Lokales Runtime-Paket erzeugt und `selfhost/release-smoke.mjs` bestanden:
Manifest, statische Assets, Anmeldung, Arbeitsbereichschema und Backup.
`connections.mjs` ist im Runtime-Paket enthalten. Keine produktive Bereitstellung.

## Was für die echte Nutzung fehlt

Ein Betreiber muss die eigene GitHub-App einmalig registrieren, exakte Callback-
URL festlegen und Client-ID/Secret in der privaten Serverumgebung hinterlegen.
Die Anleitung und ENV-Namen stehen in `selfhost/README.md` und
`selfhost/deploy/studio.env.example`. Es wurden keine fremden OAuth-Clients,
Browserprofile oder vorhandenen Tokens übernommen. Registrierung, persönliche
Live-Anmeldung und Rollout wurden nicht durchgeführt.

Danach: echten GitHub-Browserablauf prüfen. Für Repository-Auswahl und minimale
Repository-Berechtigungen ist eine eigene GitHub-App-Integration erforderlich.
Copilot braucht einen eigenen SDK-Adapter und persönlichen Zugriff. ChatGPT-
Plan-Nutzung muss nach Einsatzform (lokales/OSS-Tool oder entfernt gehostete App)
mit dem offiziellen Flow umgesetzt werden. Claude benötigt seinen eigenen
unterstützten Adapter. Keine dieser künftigen Fähigkeiten als fertig melden.

## Geprüfte offizielle Quellen

- GitHub OAuth/PKCE: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Copilot SDK mit persönlichem OAuth: https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth
- ChatGPT-Plan-Nutzung und Einsatzformen: https://developers.openai.com/siwc/token-sharing-open-source
- ChatGPT-Identitätslogin: https://developers.openai.com/siwc/website
- Claude-Plan/Agent SDK: https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
