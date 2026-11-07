# Hermes: R25 Workspace Rooms – geprüfte Übergabe, keine Production-Freigabe

## Identität und Herkunft

Repository: `Spezzo-sudo/schmaqq-workspace`.
Branch: `feat/workspace-rooms-r25-20261025`.
Die exakte Quell-SHA, Source-Tree-ID und der SHA256 des neuen Releasearchivs
stehen im zugehörigen PR sowie in `handoff.json` des privaten Übergabepakets.
Nicht mit einem mutablen Branchnamen oder einem alten Archiv allein freigeben.

Der Kandidat baut auf PR38 (Recovery + Zod-Sicherheitsfix) auf, nicht auf
GitHub-main. Alle bisher nicht produktiv übernommenen Änderungen dieser
Abstammung gehören bei der Betreiberabnahme zum Releaseumfang. Insbesondere
ist SMTP weiterhin nicht konfiguriert; R25 behauptet keine produktive
Passwort-Recovery, keine versandte Mail und keine erneute Owner-Passwortänderung.

## Beabsichtigte Wirkung

Ein bestehendes Team erhält Projekträume mit Gespräch, Aufgaben, Entscheidungen,
Wissen und Ergebnissen. Planung erfordert weder Git noch einen Rechnerpfad.
Der vorhandene Runner führt Code weiterhin in eigenen freigegebenen Kopien aus.
Optional freigegebene lokale Textmodelle sind aus dem Raum nutzbar; keine
pauschale Freigabe fremder Geräte, Modelle, Kontingente oder Cloud-Anmeldungen.

Keine neue SQL-Tabelle und keine automatische Schema-Migration. Neue Zuordnungen
liegen unter `room:v1:` in der vorhandenen `workspace_meta`. Vorherige Daten
werden nicht gelöscht; unzugeordnete allgemeine Chats und Dokumente bleiben in
der ausdrücklich gekennzeichneten bisherigen Ansicht erreichbar.

## Engineering-Evidence

- Gesamtcheck: Backend-Verträge, Linux-Operator-Fixtures, TypeScript, Vite,
  Source Guard und Diff-Check.
- Neue Room-HTTP-/Navigationsregressionen: Auth/Origin, idempotente Erstellung,
  projektgebundene Quellen, sichere Verweise, Revisionskonflikte, explizite
  Modellfreigabe, private Ausgabe und kontrolliertes Teilen.
- Reproduzierbarer Chrome-Pilot mit getrennten synthetischen Konten.
- Tatsächliche lokale Git-Repositories, zwei echte isolierte Runner, Dateisave,
  Node-Tests, statische Vorschau und menschliche Zweitprüfung durch zweites Testkonto.
- Der lokale Textmodell-Output wird ausdrücklich synthetisch injiziert;
  Modellinferenz, persönliches Codex-Abonnement und echte Markus-Hardware
  werden damit NICHT als erfolgreich getestet ausgegeben.
- Alle realen Screenshots enthalten nur synthetische Testprojekte/Personen.

## Reproduzierbarer isolierter Browserlauf

Aus einem sauberen Checkout, mit passenden Node-Abhängigkeiten und vorhandenem
Chrome + Python Playwright:

```
python3 scripts/r25-room-browser.py \
  --node /opt/schmaqq-studio/runtime/node/bin/node \
  --output /PRIVATE/NEW/EVIDENCE \
  --release-dir /PRIVATE/FRESHLY_UNPACKED_RELEASE \
  --expected-sha EXACT_APPROVED_SOURCE_SHA
```

Der Test startet ausschliesslich Loopback-Ports 45631/45632. Vorher auf freien
Port prüfen. Er verwendet private Wegwerfzustände, beendet eigene Testprozesse
und entfernt synthetische Daten. Keine realen Konten oder Runner verwenden.
Diese Ports niemals als neue öffentliche Produktionslistener freischalten.

## Vor einer isolierten Bedienvorschau

Exaktes Archiv und eingebettete Herkunft unabhängig prüfen. Eine private,
authentifizierte Vorschau mit eigener synthetischer Datenbank kann nach
ausdrücklicher Freigabe bereitgestellt werden. Keine produktiven Sessions,
Runner-Tokens, Mail-/Provider-Secrets oder Datenbanken in die Vorschau kopieren.
Kein öffentlich offenes Testkonto und keine Produktion durch localhost ersetzen.

## Vor einer späteren Production-Entscheidung

1. Tatsächlichen Live-Pointer und Servicezustand lesend prüfen. GitHub-Read unter
   vorhandenem `dc-remote`-Kontext, nicht mit defekten Root-GitHub-Credentials.
2. Unveränderliches Archiv, Manifest, Source-Tree und Lockfile-Hash prüfen.
   Root führt keinen Quellcode direkt aus fremdbeschreibbaren Arbeitskopien aus.
3. Aktuellen privaten Studio-Datenbestand sichern, isoliert wiederherstellen
   und mit genau diesem R25-Runtime-Code auf Kompatibilität prüfen.
4. Historische Sicherungen einschließlich späterer Notfall-Owner-Reset-Backups
   rein lesend inventarisieren. Alte H3-Belege nicht umetikettieren und keine
   Dateirechte/Sicherheitsprüfungen für ein grünes Gate aufweichen.
5. Neue eng begrenzte H3-Evidence gegen aktuellen Daten-/Source-Stand binden.
   Vollständige Host-Recovery und Offsite-Backup bleiben getrennte offene Themen.
6. Laufenden R24-Code als Rückweg erhalten. Rückweg für neue Raummetadaten
   dokumentieren; kein ungeprüftes Zurückspielen einer älteren DB.
7. Separates Owner-GO für genau Source, Archiv, Dienst und Scope einholen.
   Keine automatische Migration, kein main-Merge, keine PR16/PR17-/Marketing-
   oder Provideränderung im Namen dieses Builds.

## Nach einer genehmigten Aktivierung

Persönliche Anmeldung, vorhandene Projekte/Tasks, neues Mobilprojekt ohne Pfad,
Zuordnung von Gesprächen und Rückweg zu allgemeinen Daten prüfen. Echte
Runnerverbindung und persönliche KI-Accounts einzeln prüfen. Der technische
synthetische Pilot ersetzt nicht Marcos und Markus' persönliche Bedienabnahme.

Erfolgsmeldung nur mit tatsächlicher Live-SHA und konkreten Nutzungsnachweisen.
Kein „live“ aufgrund eines gebauten Archivs und kein „alle Integrationen bereit“
aufgrund eines vorhandenen Repository- oder ChatGPT-Links.
