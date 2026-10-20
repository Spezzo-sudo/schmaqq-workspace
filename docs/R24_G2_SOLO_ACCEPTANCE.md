# SCHMAQQ Studio – R24-G2 Solo-Acceptance und Proxy-Sichtprüfung

Datum: 20. Oktober 2026. Status: **DRAFT / NO_MERGE / NO_DEPLOY**.

## 1. Prüffrage und Ergebnis

Kann der Owner SCHMAQQ Studio vor dem Onboarding von Markus bereits
als eigenständige Entwicklungsumgebung einsetzen?

**Für den getesteten lokalen Funktionsumfang: JA.**
Ein vollständiger neuer Browserdurchlauf mit Chromium/Playwright hat
**16/16 Szenarien PASS, 0 FAIL** geliefert. Das betrifft die **isolierte**
R24-G1-Kandidatenlaufzeit, **nicht** den produktiven, angemeldeten Studio-
Betrieb und **nicht** zwei echte Mitglieder.

Source of Truth des getesteten Codes:

- G1 Quell-SHA: `d5162f646cf1f9b40b88a2e845bd84b80e39f6e6`.
- Archiv SHA256: `776d87ec70849694c5c75673a4a89ae9013b2cf7af9aa8dc38c5a59fa490da30`.
- Exaktes TAR gegen Manifest/Dateien: **711/711 PASS**.
- Browser: Chromium Headless, Desktop 1440×900, Mobil 390×844.
- Server aus dem frisch entpackten R24-G1-Archiv, nur lokale Ports.
- Unabhängige private SQLite-Datenbank, **genau ein** synthetisches
  Owner-Konto und **ein** eigens isolierter Test-Runner.
- Git-Remote: ausschliesslich ein lokales Bare-Repository; **kein**
  Zugriff auf echte SCHMAQQ-Repos, Provider oder ChatGPT-Modellkonten.
- KI-/Codex-Ausführung im Testprojekt deaktiviert.

Maschinenlesbare, **sanitisierte** Evidence:
`docs/evidence/R24_G2_SOLO_ACCEPTANCE_20261020.json`.
Die Browser-Screenshots bleiben im privaten Git-ignorierten VPS-
Testverzeichnis und werden bewusst nicht veröffentlicht.

## 2. Vollständig überprüfte Bedienabläufe

| # | Test | Ergebnis |
|---|---|---|
| 1 | Anonym bleibt Workspace/Session HTTP 401; Health HTTP 200 | PASS |
| 2 | Privater Passwortlogin über sichtbare Studio-Oberfläche | PASS |
| 3 | Exakt ein Mitglied; Session über Browser-Reload hinweg erhalten | PASS |
| 4 | Projektsuche inkl. Leerzustand, Reset und Dialog-Fokus | PASS |
| 5 | Aufgabe über UI anlegen; Projekt/Priorität in SQLite verifizieren | PASS |
| 6 | Chatnachricht über UI senden und persistent wiederfinden | PASS |
| 7 | Wissensdokument über UI erstellen und persistent wiederfinden | PASS |
| 8 | Local-only Runner vorbereitet Worktree und prüft Git-Remote | PASS |
| 9 | Datei im Browser öffnen, ändern, auf lokalem Runner speichern | PASS |
| 10 | Tatsächlich konfigurierten Node-Testbefehl im Worktree ausführen | PASS |
| 11 | Änderung als statische Vorschau auf **separatem Origin** aufrufen | PASS |
| 12 | Prüfstand mit lokalem Commit erzeugen, ohne Branch zu veröffentlichen | PASS |
| 13 | Mobil Navigation und Layout ohne horizontalen Überlauf | PASS |
| 14 | Geführtes neues Projekt und privater Einrichtungsplan, ohne Dateieingriff | PASS |
| 15 | Zugänglicher Abmelden-Link widerruft Session (anschliessend HTTP 401) | PASS |
| 16 | Keine unbehandelten JavaScript-Ausnahmen im Browser | PASS |

Testdatenbank nach Browser-Abnahme: `PRAGMA integrity_check=ok`,
`PRAGMA foreign_key_check`: **0 Fehler**.
Acht testweise gestartete Runner-Jobs
(`prepare,inspect,files,read-file,save-file,check,preview,review`)
endeten mit `completed`. Ein nur lokaler neuer Projektstart erzeugte
Projektmetadaten und einen privaten Setup-Plan, **keine**
automatische Änderung des Rechner- oder Runnerprofils.

Die anfänglichen Fehlversuche des Testskripts kamen von mehrdeutigen
Playwright-Selektoren und verfrühter Auswertung eines Warteschlangen-
Zwischenstands. Diese **Testskriptprobleme** wurden korrigiert.
Danach wurde der ganze Ablauf erneut auf einer **frischen Testdatenbank**
ohne Fehlschläge ausgeführt.

## 3. Read-only Reverse-Proxy- und Production-Prüfung

Tatsächlich vom unprivilegierten VPS-Zugang beobachtet:

- Es laufen **Traefik** und **Nginx**-Prozesse; die genaue
  Router-/Forwarding-Kette konnte nicht eingesehen werden.
- Die Studio-Backendports `127.0.0.1:4310` und
  `127.0.0.1:4311` lauschen ausschliesslich lokal.
- `https://studio.schmaqq.com/healthz`: **200, TLS valid**.
- Anonyme `/api/auth/session`: **401**.
- `/api/studio`: **200**.
- Runtime-Pointer zeigt unverändert auf Production R23
  `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`.
- `schmaqq-studio.service`, PR16 und PR17 weiterhin aktiv.
- Private Docker-API ist für `dc-remote` **nicht lesbar**;
  `sudo` verweigert Privilegien wegen `no new privileges`.

**BLOCKED / NICHT BESTÄTIGT:**
Die direkt vom Studio-Prozess beobachtete TCP-Peer-IP, die exakte
Traefik-/Nginx-Weiterleitung, Vertrauenslisten sowie das Anhängen/
Ersetzen von `X-Forwarded-For`. Die reine Anzeige von Nginx-/Traefik-
Prozessen und erfolgreichen HTTPS-Requests beweist **keine** dieser
sicherheitskritischen Eigenschaften.

Die optionale R24-G1-Variable `STUDIO_TRUSTED_PROXY_IPS` wurde
**durch diesen Auftrag auf Production weder gesetzt noch geändert**.
Ob geschützte Umgebungsdateien bereits einen gleichnamigen Eintrag
enthalten, war nicht lesbar; Production R23 wertet die neue Option
noch nicht aus. Ein vorgeschlagener Wert `127.0.0.1` ist lediglich
ein Beispiel und nicht als reale Traefik-Peer-IP nachgewiesen.
**Keine Proxy-Änderung durchführen**, bis ein berechtigter Operator
die Kette geprüft hat.

### Operator-Checkliste für einen späteren autorisierten Hermes-Run

1. Nur lesend den aktiven Router zum Hostnamen `studio.schmaqq.com`
   ermitteln und die vollständige Hop-Folge dokumentieren
   (Nginx/Traefik/Backend), ohne Zugangsdaten aus Labels/Environment
   auszugeben.
2. Die direkte TCP-Peer-IP von Node innerhalb des realen
   Service-/Netznamespace bestimmen. Nicht die öffentliche IP und nicht
   einfach das vermutete Docker-Netz einsetzen.
3. Prüfen, ob der letzte ausdrücklich vertraute Proxy
   `X-Forwarded-For` ersetzt oder verlässlich die tatsächliche
   Client-IP anhängt und ob fremde Client-Header neutralisiert werden.
4. Bewertung von mehreren Proxies, IPv4-/IPv6-Mapping und möglichen
   wechselnden Docker-IP-Adressen dokumentieren. Unklare Fälle
   **nicht** durch breite IP-Freigaben umgehen.
5. Eine eventuelle Änderung von Proxy-Regeln/Env bleibt ausdrücklich
   eine **separate, freizugebende Production-Mutation**.

Es wurde kein Root-Zugang umgangen, keine Proxy-Regel verändert und
kein Produktionslogin ausgeführt.

## 4. Restliche Grenzen und priorisierte Folgeschritte

1. **Production-Proxy-Header-Gate offen**: Betreiber-Read-only-
   Evidence fehlt. Solange diesen Punkt nicht bestanden, keine
   Aktivierung der optionalen Trusted-Proxy-Konfiguration.
2. **GitHub-CI offen**: GitHub-hosted Actions-Job konnte wegen
   Billing-/Spending-Limit nicht starten. Der grüne VPS-Test ist kein
   GitHub-Actions-PASS.
3. **Echte Produktion und Zusammenarbeit**: Bisher keine
   authentifizierte Live-Abnahme; Markus ist noch nicht aktiv.
4. **Migrations-/Release-Gates**: R24-D-v1-Migration wurde bislang
   nur auf synthetischen DB-Kopien durchgeführt. Vor Änderungen
   der echten DB sind frisches lokales Backup, isolierter Restore,
   Preflight, Rollback und gesonderter Owner-GO erforderlich.
5. **UX-Politur, niedrigere Priorität**: Einige Überschriften und
   Hinweise setzen sprachlich ein Team voraus (`Gemeinsam entwickeln`,
   `Teammitglied einladen`), obwohl nur ein Mitglied aktiv ist.
   Das verhindert die getestete Solo-Nutzung nicht. Ein
   kleiner separater UX-Entwurf könnte die Solo-Ansprache verbessern.

**Offsite-Backups bleiben auf Wunsch des Owners zurückgestellt.**
Das Restrisiko eines vollständigen VPS-Verlusts besteht weiter.

## 5. Abschlusssicherung

Nach den Prüfungen wurden beide temporären QA-Listener beendet.
Der synthetische Runner-Prozess ist gestoppt. Das verifizierte
Produktionsrelease ist weiterhin R23; seine Service- und TLS-
Gesundheit wurde **danach** erneut geprüft.

R24-G2 umfasst nur nachvollziehbare Abnahme-/Provenienz-
Dokumentation; **kein Merge, kein Preview-/Production-Deployment,
keine neuen echten Konten, Einladungen, Runner oder Provideraktionen.**
