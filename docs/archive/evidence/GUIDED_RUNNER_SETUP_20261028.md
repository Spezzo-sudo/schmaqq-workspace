# Geführte Projekteinstellungen im vorhandenen Runner

28.10.2026. Lokaler Folgeauftrag nach persönlichem Pilot. Keine Veröffentlichung.

## Änderung

Der bestehende `connect-project`-Auftrag kann jetzt auch bereits lokal
freigegebene Projekte konfigurieren. Der Server übernimmt Repository und Branch
aus dem gemeinsamen Projekt; nur der Geräteeigentümer kann den Auftrag starten.
Ein bestehender lokaler Klon muss zum erwarteten GitHub-Repository passen.

Projektwerte liegen getrennt vom Gerätezugang in einer atomar gespeicherten,
versionierten lokalen Einstellungsdatei. Der laufende Runner übernimmt sie direkt;
beim nächsten Start werden sie mit derselben lokalen Projektfreigabe abgeglichen.
Andere Projekte und zusätzliche lokale Einschränkungen bleiben erhalten.
Ein erfolgreicher neuer Klon bleibt bei fehlgeschlagener Erkennung als noch
nicht betriebsbereites Projekt erhalten, damit die Einrichtung fortsetzbar ist.

Die Oberfläche bietet automatische Erkennung an: vorhandenes package.json-test-
Skript; Vorschau für den Pilot-Build und den bekannten Vite-Standardbuild nach
dist. Metadaten werden begrenzt gelesen, keine Skripte bei der Erkennung gestartet.
Unbekannte Buildverfahren brauchen erweiterte Einstellungen; keine beliebige
Framework-Unterstützung behauptet. Projektbefehle führen Code aus dem gewählten
Repository aus, sobald der Nutzer Tests/Vorschau ausdrücklich startet.

Codex und Veröffentlichung sind getrennte ausdrückliche Optionen. Bestehende
Freigaben werden im Formular angezeigt. Neue einfache Runner-Downloads setzen
Veröffentlichung ausdrücklich auf false statt sie durch Weglassen zu erlauben.
Die Runner-Fähigkeit `setupVersion:1` lässt alte Runner im Projektformular mit
einem konkreten Updatehinweis erkennen. Softwareupdates bleiben ein Betreiber-/
Installationsschritt; normale Projektkonfiguration benötigt keinen Codeumbau.

Zusätzlich: Git-Diagnose im fokussierten Aufgabenstart schon vor vorhandener
Arbeitskopie sichtbar; Projektkonfiguration nicht mehr als allgemeine
Arbeitsbereitschaft bezeichnet; Vorschau-/Teilenaktionen beachten gemeldete
Projektfreigaben.

## Tatsächliche Prüfung

- 5 gezielte Node-Tests aus managed-projects.test.mjs und project-start.test.mjs
  bestanden: bestehendes Projekt ändern, Registrierungsdaten/andere Projekte
  erhalten, Neustartbeständigkeit, falsches Repository ablehnen, begrenzte
  Erkennung, vorhandener Einrichtungsablauf und Bereitschaftsgrenzen.
- Zusätzlich ein gezielter Test bestanden: fehlgeschlagene Erkennung erhält den
  Klon ohne Freigaben und lässt einen zweiten Einrichtungsversuch ohne erneutes
  Klonen zu. Insgesamt 6 gezielte Tests bestanden.
- TypeScript, Source Guard und Vite-Build bestanden. Keine unveränderte gesamte
  Studio-/Browser-Prüfsuite wiederholt. Build meldet bekannte Chunkgrößenwarnung.
- Neue Software einmalig im eigenen lokalen Server/Runner geladen. Danach im
  echten bestehenden Pilot per Browser: Einstellungen → Projekt auf meinem
  Rechner einrichten → automatische Erkennung → Auf meinem Rechner einrichten.
  Erfolgreicher tatsächlicher Runnerjob, kein Neustart für diese Projektänderung,
  kein Editieren des privaten Registrierungsprofils für diesen Vorgang.
- Gefiltertes result.json bestätigt node --test, Pilotbuild/dist, bestehende
  Codexfreigabe und publish=false. Arbeitsansicht: Vorschau verfügbar, Teilen
  gesperrt. Screenshots/AX unter `.studio/guided-setup-20261028/`.

Nicht erneut ausgeführt: persönliche Modellinferenz und unveränderter Preview-
Build; deren realer Pilotnachweis liegt separat unter
`PILOT_CODEX_VORSCHAU_20261028.md`. In diesem Auftrag keine weiteren Modelljobs.

## Grenzen

Einmalige Runnerinstallation und persönliche Anmeldung benötigen weiterhin einen
lokalen Installations-/Anmeldeschritt. Kein signierter Ein-Klick-Installer
hinzugefügt. Keine beliebigen Projekte/Frameworks automatisch erkannt. Keine neue
mobile Abnahme, kein unabhängiger No-Coder-PASS, kein Push/Merge/Deployment.
Der lokale Arbeitsstand ist nicht automatisch der Stand der öffentlichen Website.
