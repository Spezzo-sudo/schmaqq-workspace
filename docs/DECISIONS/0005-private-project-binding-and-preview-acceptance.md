# ADR-0005 — Ausgewählte Projektquellen, interaktive Preview und nachvollziehbare Abnahme

- **Stand:** 18.10.2026; abgestimmte Produktleitplanken, technische Umsetzung noch ausstehend.
- **Geltung:** SCHMAQQ Workspace/Studio als Steuerzentrale; gemeinsame Bedienung von SCHMAQQ-Projekten und weiteren ausdrücklich eingebundenen Projekten.

## Studio koordiniert, es spiegelt nicht das ganze Privatkonto

Studio verknüpft **ausgewählte** Aufgaben, Projektdaten, GitHub-Referenzen, Ergebnisse, Laufzeitnachweise, Kommentare, Tests, Vorschauen und Freigaben. Bestehende Werkzeuge wie ChatGPT Work, Codex Desktop, GitHub und freigegebene VPS-/Hermes-Runner dürfen weiter benutzt werden. Studio muss weder alle Agenten selbst ausführen noch bestehende Tools ersetzen.

**Private by default / bewusst zuordnen:**
- Kein globaler Import, kein Crawling und keine Hintergrundindizierung persönlicher ChatGPT-Chats, ChatGPT-Projekte, E-Mails, Dateien oder sonstiger Kontoinhalte.
- Nur explizit ausgewählte Repositories, Projekte, Aufgaben, PRs oder Artefakte dürfen übernommen werden; Auswahl von Benutzer und Zielprojekt vor Übernahme bestätigen. Ein KI-/SSO-Login allein stellt **keine** Datenlesefreigabe dar.
- Wenn PR-URL, Commit, Status und Testnachweis ausreichen, wird **kein** kompletter Chatverlauf gespeichert. Nutzer sollen vor einer manuellen Übergabe sehen, welche Daten inklusive Titel und Metadaten geteilt werden.
- Berechtigungen, Umfang und Widerruf pro Quelle; bereits gespeicherte Artefakte benötigen eigene Aufbewahrungs-, Zugriffsschutz- und Löschregeln. Keine stillschweigende Übernahme von Tokens, privaten Prompts oder fremden Projektinhalten.
- Für externe Agenten nur den tatsächlich verfügbaren Status abbilden. Ein nicht integrierter ChatGPT-Work-Auftrag ist **nicht** automatisch fernsteuerbar oder auslesbar. Von GitHub belegte Commits/PRs dürfen nach Projektfreigabe sichtbar sein, ohne den zugrunde liegenden Chat zu kopieren.

## Preview als Abnahme, nicht als Screenshot-Ersatz

Vor **produktiver** Freigabe relevanter Software-/Oberflächenänderungen erhält die prüfende Person eine tatsächlich nutzbare, klar gekennzeichnete Vorschau. Das gilt auch auf mobilen Geräten. Sichtbare Funktionen sollen durch Klicks, Navigation und erlaubte Testeingaben erfahrbar sein; reine Screenshots, Code-Diffs oder grüne Tests ersetzen diese fachliche Abnahme nicht.

- Preview besitzt eine eigene isolierte Origin/Umgebung, zeitlich begrenzte Zugriffsrechte und **keine** produktiven Daten oder Credentials. Tests und Vorschau dürfen keine Produktionsmutationen auslösen.
- Prüfstand beschreibt Quell-Commit **und** relevante Artefakt-/Buildrevision, Umgebung, Tests, Zeitpunkt und Gültigkeit. Nicht nachweisbare oder veraltete Ergebnisse werden als unbekannt/veraltet gekennzeichnet.
- Nachbesserung erzeugt eine neue eindeutig zugeordnete Vorschau; geänderte Dateien/Abhängigkeiten/Bauparameter können ältere Prüfungen entwerten. Die Freigabe gehört ausschliesslich zur geprüften Revision.
- Für reine Backend-/Infrastrukturänderungen ohne sinnvolle klickbare Oberfläche ist eine verständliche, reproduzierbare Funktionsdemonstration in einer sicheren Testumgebung plus relevante technische Evidence zulässig. Keine Behauptung, jede Änderung habe automatisch eine visuelle Preview.
- Entwurfs- und Entwicklerpreview sind **nicht** Produktion; Merge und Deployment haben getrennte Gates. Ein Release muss nachweisen, dass sein tatsächliches Artefakt dem zuletzt akzeptierten Stand entspricht, sonst erneut prüfen.

## Nutzungsablauf

`Ausgewähltes Projekt → Aufgabe → eigener Branch/Runner oder externer Auftrag → Änderungen/Tests → benutzbare Preview oder sichere Funktionsdemo → unabhängige Rückmeldung → erneute Prüfung bei Änderung → freigegebener PR/Commit → getrennt autorisierter Release`.

Studio soll verständlich anzeigen: Wer hat gearbeitet? Was ist neu? Welcher Stand wurde wirklich getestet? Wo kann ich ihn ausprobieren? Was ist offen? Wer muss als Nächstes entscheiden? Nicht nur Roh-Logs oder technische Kennzahlen.

## Umsetzung und negative Akzeptanzfälle

Diese ADR ist **keine** Implementierung. Vor Produktversprechen entsprechende UI, serverseitige Berechtigungsprüfungen und Tests liefern:
1. Privater Chat/anderes Projekt wird ohne ausdrückliche Auswahl **nicht** importiert oder sichtbar; ein angebundener persönlicher Login erteilt keinen globalen Datenzugriff.
2. Nicht berechtigte Personen sehen weder geheime Artefakte noch geschützte Preview-URLs.
3. Autor genehmigt nicht seinen eigenen unabhängigen Review; anderer Nutzer kann gültig abnehmen.
4. Geänderter Quellstand/Build verweigert die Nutzung einer alten Freigabe.
5. Fehlgeschlagener Test, offline Runner, unbekannter externer Agentenstatus oder abgelaufene Preview erscheinen **nicht** als Erfolg.
6. Produktion wird weder durch Preview-Erzeugung noch durch PR-/Merge-Ereignis ungefragt geändert.

## Anschluss

- Rollen, gleichberechtigte Review-Policy und GitHub-Migration: [ADR-0004](0004-shared-git-governance-and-portability.md).
- Vorhandener technischer Stand: `docs/STATUS.json`; Umsetzung in kleinen separaten S-Paketen gemäss `docs/ROADMAP.md`.
- Für SCHMAQQ Marketing/Review Control bleibt `Spezzo-sudo/NetzKontor/docs/WORKING_MODEL.md` mit seinen spezifischen Betriebsgrenzen massgeblich.
