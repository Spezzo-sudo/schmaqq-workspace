# Lokaler Projektstart: vollständige Abnahme am 22.10.2026

Geprüft wurde der aktuelle uncommittete Windows-Arbeitsstand auf
`local/windows-setup-20261021`. Vorhandene lokale Änderungen blieben erhalten.
Git-Ausgangsstand und SHA256 ausgewählter Quellen stehen im lokalen Bericht;
dieser Nachweis gilt nicht für Production oder einen veröffentlichten Kandidaten.

## Tatsächlich ausgeführt

- Frontend aus aktuellem Quellstand gebaut: Vite, Exitcode 0.
- Sichtbares Edge-Fenster, frische isolierte SQLite-Datenbank und synthetisches
  Testkonto. Browser-Projektstart mit echtem Download des privaten Einrichtungsplans.
- Erstes Runnerprofil mit bestehender synthetischer Projektfreigabe gestartet.
  Neues Projekt vor Einrichtung ausdrücklich noch nicht gemeldet.
- Runner beendet; heruntergeladenen Plan mit `project-setup.mjs --apply` angewendet,
  Exitcode 0. Backup bytegleich zum ursprünglichen Profil; Gerätetoken, bestehende
  Projektfreigabe und zusätzliches Fixture-Feld erhalten. KI/Publish bleiben gesperrt.
- Echter neuer Runnerprozess mit demselben ergänzten Profil und demselben
  Studio-Gerät. Neue Projektbereitschaft erscheint.
- Fehlende Git-Autorenidentität führte korrekt zu `ready:false`. Danach nur im
  neu erzeugten Testrepository `git config --local user.name/user.email` gesetzt.
  Erneuter sichtbarer Git-Lesecheck erfolgreich; globale Einstellungen unverändert.
- Eigene Arbeitskopie im Studio erstellt, `site/index.html` im Editor geändert und
  gespeichert; Inhalt unabhängig auf dem Dateisystem mit UTF-8 bestätigt.
- Tests über Studio gestartet: tatsächlicher Node-Testlauf, 1 PASS, 0 FAIL.
- Statische Vorschau tatsächlich gebaut und auf getrennter lokaler Origin geöffnet.
  Geänderte Überschrift sichtbar; Test und Vorschau haben dieselbe Quellrevision.
- Desktop 1440px und Bereitschaftsansicht bei 390px geprüft; kein horizontaler
  Seitenüberlauf bei 390px, keine Browser-Pageerrors. Eigene Testprozesse beendet.

## Belege und Grenzen

Lokaler Abschlussbericht: `.studio/project-start-full-20261022/run-03/result.json`.
Dort liegen auch `preview.png`, `mobile-readiness.png`, Helfer-/Runnerlogs und die
ignorierten synthetischen Testdaten. Private Profile und Tokens bleiben außerhalb Git.

Der Ablauf wurde fortgesetzt, nachdem eine Auswahlfeld-Testabfrage, die bekannte
Windows-Sandbox-Prozessbereinigung und die Windows-Standardcodierung einer
Test-Dateiabfrage korrigiert wurden. Kein fehlerfreier Einzellauf behauptet.
Es wurde keine Produktlogik für diesen Test geändert. Die zuvor ausgeführten
2 Projektstart-Tests, TypeScript und Build bleiben separat im HANDOFF vermerkt;
eine vollständige Regression wurde in dieser Fortsetzung nicht erneut ausgeführt.

Offen: einfache Führung bei fehlender Git-Autorenidentität, echter persönlicher
Projektstart, macOS und Zwei-Personen-Fernablauf. Kein Push, Deployment, externe
Repositoryanlage oder persönliches Runnerupdate. Keine Modellaufrufe verwendet.

Wissensbasis-Vorschlag: Der lokale S2-Projektstart ist mit den genannten Grenzen
bis zur tatsächlich geänderten Vorschau geprüft. Fehlende Git-Identität ist eine
reale Einstiegsvoraussetzung. Nächster Produktschritt: diese Voraussetzung im
Einrichtungsablauf konkret erklären. Die externe Vault-Ablage liegt außerhalb
der freigegebenen Schreibpfade und wurde nicht vorgenommen.

## Git-Autorenhilfe

Die anschließend implementierte Hilfe in `app/git-identity-help.tsx` wird nur bei
einem negativen Identitätscheck angezeigt. Sie erklärt die Autorenangaben und den
Repository-Stammordner einschließlich des lokalen Starter-Unterordners. Zwei
kopierbare Vorlagen verwenden `git -C ... config --local`; Nutzer ersetzen Pfad,
Name und E-Mail selbst. Die ausdrückliche Wiederholung in `development.tsx` nutzt
Projekt und Gerät des angezeigten eigenen Prüfergebnisses. Offline-Geräte und
belegte Runner sperren den Knopf. Die bisherige Server-/Runnerlogik bleibt bestehen.

Am 22.10.2026 selbst ausgeführt:

- `node selfhost/verify.mjs --local`, Exitcode 0: 121 Backendtests, 100 PASS,
  0 FAIL, 21 begründete Plattform-Skips; Source Guard, TypeScript, Frontend-Build PASS.
  Strikter vollständiger Linux-/Release-Nachweis bleibt auf Windows INCOMPLETE.
- Sichtbarer isolierter Edge-Test, 7 Abnahmeschritte PASS: Login, fehlende Identität
  mit Hilfe/negativem Bereitschaftsstatus, echte Zwischenablage mit beiden Vorlagen,
  Desktop/Mobil, Ausführung der angezeigten ersetzten Befehle in PowerShell,
  erneuter erfolgreicher Check desselben Projekts/Geräts ohne Runner-Neustart,
  verschwundene Hilfe und aktualisierte Bereitschaft. Keine Browser-Pageerrors.
- `user.name`/`user.email` unabhängig mit `git config --local` im Testrepository
  gelesen; separate leere globale Fixture-Konfiguration unverändert bestätigt.
  Ausschließlich eigene Testprozesse gestartet und anschließend beendet.

Lokale Belege: `.studio/git-identity-help-20261022/run-02/result.json`,
`desktop-help.png`, `mobile-help.png`, `retry-success.png`; vollständiges lokales
Prüflog unter `.studio/git-identity-help-20261022/verify.log`. Der erste Browsertest
verglich Clipboard-Zeilenenden zu streng; nach Berücksichtigung der normalen
Windows-CRLF-Zeilenenden bestand der neue isolierte Durchlauf. Die Produktquellen
wurden für diese Testkorrektur nicht geändert.

Persönlicher Projektstart und macOS bleiben offen. Kein Deployment oder persönliches
Runnerupdate erfolgt. Wissensbasis-Vorschlag: Die konkret beobachtete fehlende
Git-Identität wird jetzt im Ergebnis verständlich aufgelöst; nächster Schritt ist
der persönliche Start eines abgegrenzten echten Projekts. Keine externe Vault-
Ablage innerhalb der vorhandenen Schreibrechte möglich.
