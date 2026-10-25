# R26 – Echte Zwei-Personen-Einrichtung ohne Umwege

## Stand

Zielgruppe: Marco (Owner, vorhandenes Produktionskonto) und Markus
(eigenes Teamkonto, eigener Rechner). Diese Arbeit ist **Teil von R26**
und verändert zunächst weder R25-Production noch irgendeinen
persönlichen Runner oder GitHub-Zugang.

Beim letzten bestätigten Produktionsstand hatte Studio **nur ein Mitglied**
(Owner) und nach der Passwortzurücksetzung einen widerrufenen
Runner-Zugang. Der unprivilegierte Agent kann die aktuelle private
Production-Datenbank und die Owner-Sitzung nicht öffnen. Er kann daher
weder Markus stillschweigend anlegen noch einen echten Einladungslink
aus der Owner-Sitzung erzeugen. Diese Grenzen sind gewollt.

## Der jetzt gebaute Weg

1. Owner öffnet die gewünschte Aufgabe auf dem Handy.
2. **„Mit dem Team“** → bei noch fehlendem zweiten Konto erscheint
   **„Markus direkt hier einladen“**, ohne Wechsel zu „Team & Ressourcen“.
3. Owner gibt die für Markus gewünschte E-Mail-Adresse ein.
   Studio erzeugt über den bestehenden owner-only Endpoint
   `POST /api/invites` einen **einmaligen, 48 Stunden gültigen Link**.
   Es gibt weiterhin keinen automatischen Mailversand.
4. Owner kopiert den Link und schickt ihn persönlich an Markus.
   Der Link ist ein Zugangstoken und gehört **nicht** in GitHub,
   öffentliche Screenshots oder Gruppen-Chats.
5. Markus öffnet den Link, erstellt seinen **eigenen** Account mit
   eigenem Passwort und meldet sich an. Ein verbrauchter Link kann
   nicht erneut verwendet werden.
6. Owner lädt die Aufgabe neu beziehungsweise wählt
   „Team aktualisieren“ und sieht Markus als Teammitglied.
7. Owner übergibt den konkreten Auftrag an Markus. Der Auftrag
   bleibt „Bearbeitung noch nicht gestartet“, bis echte Arbeit
   läuft. Markus sieht dieselbe Aufgabe und kommentiert dort.
8. **Erst wenn Code ausgeführt werden soll**, verbindet Markus
   auf seinem eigenen Rechner sein lokales Repository/Runner-Profil.
   Der Server kann weder seinen Computerdateipfad wissen noch
   ChatGPT- oder Codex-Zugangsdaten austauschen.
9. Markus prüft Git/Tests/Vorschau in seiner persönlichen Arbeitskopie.
   Marco öffnet das Ergebnis an derselben Aufgabe vom Handy.
   Veröffentlichung bleibt eine separate, überprüfte Aktion.

## Was Studio noch nicht kann

- Es verbindet einen *fremden lokalen Rechner* noch nicht
  allein durch Eingabe einer E-Mail-Adresse.
- Der erste lokale Git-Ordner und die zugelassenen Testbefehle
  werden weiterhin auf dem Rechner des Besitzers eingerichtet.
- Die aktuelle Browseroberfläche lädt keine privaten ChatGPT-Chats
  ohne ihre persönliche Berechtigung herunter.
- Ein freigegebenes lokales Textmodell ist keine Übernahme von
  Markus' Codex-Sitzung, GPU oder beliebigem Shellzugriff.
- SMTP-Passwort-Recovery ist weiterhin separat.
- Die historische H3-Archivprüfung meldete
  `BLOCKED_HISTORICAL_OWNER_MISMATCH`; das ist nicht durch
  diesen UI-Commit behoben.

## Nachweis

**Reale Chrome-/Playwright-Interaktion auf Loopback**, nicht nur
Unit-Simulation: getrennte Browserprofile, genau *ein*
synthetisches Owner-Konto zu Beginn, Einladung direkt in
derselben Aufgabe, persönliche Anmeldung des zweiten
synthetischen Kontos, Verweigerung einer zweiten Verwendung,
Übergabe und sichtbare Rückmeldung in derselben Aufgabe.
Es wurden keine echten Einladungen oder Tokens erzeugt.

Zusätzlich bleibt der bisherige R26-Browserpfad mit zwei
synthetischen Git-/Node-Runnern separat geprüft. Der
gesamte Source- und Runtime-Release muss vor einer
Production-Freigabe erneut gegen exakte SHA, Archive,
Backup/Restore und H3-Risikoscope geprüft werden.

**Release-Regel:** Kein ungefragtes Merge/Production-Switch.
R25 bleibt so lange live. Nach echter Eigentümerfreigabe
und operatorseitiger Prüfung kann R26 die bestehende
Datenbank ohne neue SQL-Tabelle nutzen; neue
Task-Revisionen werden im vorhandenen workspace_meta
abgelegt.
