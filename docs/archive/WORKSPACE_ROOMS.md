# SCHMAQQ Workspace R25 — ein Raum, ein Arbeitszusammenhang

## Produktentscheidung

Der Projektraum ist der normale Einstieg. Ein Raum braucht nur einen Namen;
ein Ziel ist hilfreich, aber kein Rechner, Git-Repository oder KI-Zugang ist
Voraussetzung für ein Gespräch, eine Aufgabe oder eine Entscheidung.

Das frühere Studio bleibt die Ausführungsgrundlage. Seine vorhandenen
Authentifizierungs-, Runner-, Datei-, Git-, Prüfungs- und Vorschau-Grenzen
werden nicht durch eine neue privilegierte Agentenschicht ersetzt.

Buzz liefert die Produktinspiration: Menschen und Agenten im gemeinsamen
Kontext, nachvollziehbare Übergänge und Ergebnisse beim Ursprung. Es wurde
kein Buzz-Quellcode übernommen und kein zweites Chat-/Task-System installiert.
Primärreferenz: https://github.com/block/buzz.

## Die fünf Bereiche eines Raums

| Bereich | Zweck | Wirkung |
| --- | --- | --- |
| Raum | Diskussion, Antworten, Quellenbezug | Nachrichten sind für das vorhandene private Team sichtbar. |
| Aufgaben | Konkrete Ergebnisse und Zuständigkeit | Eine Nachricht kann atomar in genau eine verknüpfte Aufgabe überführt werden. |
| Ergebnisse | Tests, Vorschau, Review und Git-Übertragung | Diese Zustände werden getrennt angezeigt; kein behaupteter Livegang. |
| Wissen | Entscheidungen, Notizen, externe Verweise | Ein KI-Vorschlag ist nicht automatisch eine angenommene Entscheidung. |
| Code & KI | Repository-Verweis, eigener Rechner, lokale Modelle | Technische Einrichtung ist ein separater Schritt, keine Einstiegshürde. |

Eine Aufgabe bleibt als Seitendialog im Projektraum. Auftrag, Gespräch,
Editor, Tests, Vorschau und unabhängige Codeprüfung beziehen sich auf dieselbe
Aufgaben-ID. Auf dem Handy wird daraus eine ganze Aufgabenansicht, nicht ein
zu schmales Desktop-Fenster.

## Durchgängiger Standardweg

1. Raum am Handy oder Desktop eröffnen, ohne Verzeichnisfeld.
2. Idee diskutieren, eine Nachricht beantworten, eine Entscheidung festhalten.
3. Aus einer Nachricht eine Aufgabe erstellen; die Nachricht verlinkt zurück.
4. Eine Person übernimmt die Aufgabe, das Team sieht Zuständigkeit/Kommentare.
5. Bei Codearbeit einen freigegebenen eigenen Rechner verwenden. Eine bereits
   eingerichtete Verbindung wird genutzt; keine neue Registrierung pro Aufgabe.
6. Der vorhandene Runner erstellt eine echte aufgabenbezogene Git-Arbeitskopie.
7. Datei bearbeiten, speichern, echte konfigurierte Tests ausführen, Vorschau bauen.
8. Prüfstand erstellen; die zweite Person sieht Diff, Tests und den exakten Commit.
9. Freigabe, Git-Push/Merge und Produktions-Deployment bleiben getrennte Aktionen.

Bei einer Aufgabe ohne Code reicht ein entsprechendes Ergebnis im Gespräch
oder als Wissenseintrag/Verweis. Code- und KI-Einrichtung blockieren sie nicht.

## Abzweigungen und ehrliche Grenzen

| Ausgangslage | R25-Verhalten |
| --- | --- |
| Noch kein Git/PC/KI | Projekt, Gespräch, Aufgaben und Wissen funktionieren sofort. |
| Existierendes GitHub-Repository | HTTPS-Verweis wird geprüft und vorgemerkt. Kein behaupteter Clone oder OAuth-Zugriff. |
| Lokales Git-Projekt | Einmalige lokale Freigabe über den vorhandenen Projekt-Helfer. Dateien und origin bleiben erhalten. |
| Neues lokales Projekt | Bestehender Helfer kann den Start erzeugen; dies geschieht bewusst am ausführenden Rechner. |
| Handy ohne Laptop | Planen, kommentieren, Aufgaben/Ergebnisse ansehen; Codeausführung verlangt einen erreichbaren freigegebenen Rechner. |
| Offline-Rechner | Sichtbarer Status, keine falsche Bereitschaft; Planungsfunktionen bleiben nutzbar. |
| Lokales Modell eines Teammitglieds | Erst lokale Team-Erlaubnis, dann persönliche Freigabe des Gerätebesitzers; keine Passwort-/Token-Weitergabe. |
| Modellauftrag | Der Benutzer sieht den begrenzten Kontext und bestätigt den Zielrechner. Serverseitiger Hash schützt vor unbemerktem Kontextwechsel. |
| Modellantwort | Zunächst privat für Auftraggeber und Rechnerbesitzer, erst ausdrücklich im Raum geteilt. Immer als KI-Ergebnis gekennzeichnet. |
| Codex-Auftrag in Aufgabe | Optionaler sichtbarer Projekt-/Aufgabenkontext wird automatisch vor den expliziten Auftrag gesetzt. Persönlicher Zugang und lokale Projektfreigabe bleiben erforderlich. |
| ChatGPT-/externer Chat | Link mit Projektbezug; klar als verlinkt, nicht ausgelesen oder synchronisiert gekennzeichnet. |
| Rückkehr/Neuladen | Raum-/Aufgabenadresse bleibt erhalten; Gesprächs-/Kommentarentwürfe liegen nur in diesem Browser-Tab. |
| Ungespeicherte Codeänderung | Tests/Vorschau gesperrt; Warnung beim Verlassen. Bestehender Editor bietet lokalen Entwurf/Download. |
| Abgelaufene Sitzung | Verständlicher Hinweis; nach erneuter Anmeldung nur eine validierte interne Raum-/Aufgabenadresse wiederherstellen. |
| Doppelklick/Retry | Neue Raumaktionen sind über eindeutige Anfragen idempotent. |
| Gleichzeitige Repo-Verweisänderung | Revisionskonflikt statt stilles Überschreiben. |
| Alter Direktlink | Bekannte Projekt-/Aufgabenlinks führen in den neuen Raum. Die alte UI ist nur explizit mit legacy=1 erreichbar. |
| Fehlgeschlagener Lauf | Auftrag bleibt nachvollziehbar, keine automatische Wiederholung einer möglicherweise schreibenden Aktion. |

## Bestehende Daten und Zugriff

Keine neue SQL-Tabelle und keine automatische Migration. R25 verwendet
projects, messages, tasks, task_comments, documents, jobs und die vorhandene
workspace_meta-Tabelle mit dem Namespace room:v1:.

Diese Installation ist weiterhin EIN privates Team, nicht ein Multi-Tenant-SaaS
mit voneinander isolierten Organisationen. Projekträume sind nicht privat vor
anderen Teammitgliedern. Die UI sagt dies beim Anlegen und im Raumkontext.

Frühere projektbezogene Nachrichten/Aufgaben werden weiter angezeigt. Frühere
allgemeine Nachrichten und nicht zugeordnete Dokumente werden nicht gelöscht
oder ungefragt umsortiert; sie bleiben über die explizite bisherige Ansicht
zugänglich. Eine automatische inhaltliche Migration ist kein Teil dieses Releases.

Persönliche Code-Arbeitskopien bleiben unter der vorhandenen eigenen-Geräte-
Berechtigung. Team-Sharing betrifft lokale Textmodell-Aufträge, nicht allgemeinen
Shellzugriff oder eine unbegrenzte Übernahme fremder Codex-Abonnements.

## Warum keine neue Infrastruktur

Der bestehende Node/SQLite-Dienst trägt die neue Orchestrierung. Der bekannte
Runner bleibt die Ausführungsgrenze, Git die Code-Wahrheit. R25 benötigt weder
Buzz-Relay/Nostr noch Redis, einen neuen PostgreSQL-Dienst oder einen zweiten VPS.
Codex-App-Server/Cloud-Adapter können später gezielt ergänzt werden; sie sind
hier nicht als bereits eingerichtet gekennzeichnet.

## Sicherheitsvertrag

- Authentifizierte Teamgrenze und bestehende strikte Origin/JSON-Regeln.
- Begrenzte Eingaben, max. 100 Einträge pro Nachrichten-Seite, begrenzter KI-Kontext.
- Raumübergreifende Quellen-/Antwort-Verknüpfungen werden abgewiesen.
- Nur HTTPS-Verweise ohne URL-Zugangsdaten; bekannte Geheimnisparameter auch
  percent-kodiert und im Fragment ablehnen. Kein Server-Fetch von Fremdlinks.
- Fremde KI-Ressource nur nach bestehender persönlicher Freigabe, Online-/Projekt-
  und Modellprüfung; max. drei aktive Warteschlangenaufträge pro Gerät.
- Nur der tatsächliche Auftraggeber darf sein privates KI-Ergebnis im Raum teilen.
- Bestehender Review-Schutz: keine eigene Codefreigabe, konkrete Commitbindung,
  keine automatische Veröffentlichung.
- Keine Provider-Key-Weitergabe, kein Zugriff auf persönliche ChatGPT-Chats,
  keine heimliche API-Abrechnung und kein globaler Konfigurationswechsel.

## Abnahme und Freigabe

Unit-/HTTP-Tests sind durch echte Chromium-Szenarien mit getrennten synthetischen
Konten ergänzt. Der Codepfad verwendet disposable Git-Repositories, zwei echte
isolierte Runner-Prozesse sowie echte Node-Test-/Build-Kommandos. Die zusätzliche
KI-Antwort ist dagegen bewusst synthetisch; sie testet Zustellung, Berechtigungen
und Freigabe, nicht die Qualität eines realen Modells.

Erst der unveränderte, frisch entpackte Release muss die gleiche Abnahme bestehen.
Danach: Betreiber prüft aktuelle R24-Daten, Backup/Restore, H3-Scope und Rückweg;
separates Owner-GO vor Aktivierung. Insbesondere die nach dem Notfall-Passwortreset
angelegten Betreiber-Backups sind gesondert zu inventarisieren, nicht umzudeklarieren.

Offen bleibt der persönliche Pilot mit echten Geräten, tatsächlichem Codex-/KI-
Zugang, repositoryspezifischen Kommandos und den heutigen individuellen Freigaben.
SMTP und produktive Passwort-Recovery sind weiterhin separate Betreiberaufgaben.
