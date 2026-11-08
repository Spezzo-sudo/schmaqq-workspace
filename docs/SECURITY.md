# Sicherheit – wer hereinkommt und was er darf (Stand 08.11.2026)

## Zugang nur mit Einladung
- Keine freie Registrierung. Ein Konto entsteht nur mit Einladungslink (auch bei „Mit ChatGPT anmelden“,
  dort muss zusätzlich die E-Mail passen). Der erste Inhaber nur über den einmaligen Einrichtungslink.
- Links: 32 Byte Zufall, gespeichert nur als SHA-256, gültig 24 Stunden, einmal verwendbar.
- Nur der Inhaber erstellt Links (Server prüft). Mitglieder schlagen vor (`/api/invites` → Vorschlag),
  der Inhaber gibt frei oder lehnt ab. Höchstens 5 offene Vorschläge pro Mitglied.
- Jedes Konto merkt sich, wer es eingeladen hat (`member:v1:invited:<id>`); sichtbar unter Team.
- Offene Einladungen sieht der Inhaber unter Team und kann sie zurücknehmen.
- Bekannte Grenze: Bei Passwort-Anmeldung wird die E-Mail nicht bestätigt; wer den Link hat, legt das Konto an.
  Darum: Link direkt an die Person, kurze Gültigkeit, im Zweifel zurücknehmen.

## Mitglied entfernen (Team → Entfernen, nur Inhaber)
Sofort: alle Anmeldungen beendet, KI-Assistenten getrennt, Rechner/Server gesperrt, ChatGPT-Anmeldung gelöst,
offene Vorschläge zurückgezogen. Das Konto bleibt als Autor von Nachrichten/Aufgaben stehen, kann sich aber nie
wieder anmelden (auch nicht über „Passwort vergessen“). Code: `selfhost/team-access.mjs`.

## GitHub
- Eine Studio-App; jedes Mitglied gibt eigene Repos frei (App für alle Konten installierbar, Repos bleiben privat).
- Studio nutzt nur Installationen, die über Studio registriert wurden oder dem App-Besitzer gehören
  (`installationFor` in `selfhost/github-app.mjs`). Schlüssel gelten je ein Repo und kurz.
- Änderungen kommen als Pull Request. Hauptzweig auf GitHub schützen; Studio warnt sonst.

## Fremder Code auf dem Server (Tests, Vorschau)
Läuft im Server-Worker: eigener Benutzer `schmaqq-worker`, keine Rechte/Capabilities, Dateisystem schreibgeschützt
ausser dem Worker-Laufwerk, jeder Job als eigene systemd-Einheit (2 GB Speicher, 1,5 CPU, 256 Prozesse, Zeitlimit),
Internet nur über Allowlist-Proxy. Siehe `selfhost/deploy/worker/README.md`.

## Offen
1. Rechte pro Projekt (heute sieht jedes Mitglied alle Projekte).
2. Zwei-Faktor-Anmeldung.
3. Hermes hat Root über Telegram – einschränken oder begründen (PLAN.md, Etappe 0).
4. Fehler „hunderte gleiche Aufgaben“ über den ChatGPT-Connector untersuchen.
