# Arbeitsauftrag: technische Abnahme SCHMAQQ Studio

Owner-Auftrag vom 17.10.2026: eigenständig testen, Browser steuern, Ergebnisse statt
wiederholter Bestandsaufnahmen liefern. Dieser Chat wird stündlich lokal fortgesetzt.
PC und Codex müssen verfügbar bleiben; keine garantierte Cloud-Ausführung.

## Ziel und Fertigkriterium

Endliche Testmatrix vollständig einordnen: PASS, FAIL, BLOCKED oder NOT_TESTED.
Zu jedem Ergebnis Testart, Quelle, geprüftes Verhalten und Grenze nennen.
Bekannte Produktlücken nicht als bestandene Integration ausgeben. Abschlussbericht
mit höchstens fünf priorisierten notwendigen Korrekturen und reproduzierbaren Befunden.
Nach Abschluss ohne neue Änderung keine Wiederholungsjobs starten.

## Reihenfolge

1. Vorhandenen vollständigen Prüflauf auswerten: .studio/overnight-audit/verify.log.
   Prozesssitzung des ersten Laufs: 86652; falls nicht mehr vorhanden anhand Log prüfen.
   Source Guard, alle Backend-Tests, TypeScript, Build. Einmalig pro Quellstand.
2. Bestehende Tests und Evidence den nachfolgenden Bereichen zuordnen. Nicht behaupten,
   Unit-/Integrationstests seien aktuelle Live-Browserprüfungen. Nur tatsächliche Lücken
   gezielt zusätzlich testen.
3. Eigenständigen lokalen Browser-/Fixture-Lauf für noch unbewiesene kritische Fälle
   durchführen. Vorhandene Prozesse/Ports respektieren. Neue Fixtures getrennt und
   nur auf Loopback, ohne echte Konten oder Produktionsdaten anlegen. Dokumentierte
   Fixture-Starter verwenden, keine neue Architektur bauen.
4. Reale Live-Seiten und Pilot-PR nur lesend nachprüfen, soweit für offene Fälle nötig.
   Bereits belegte echte Codex-, Tests-, Preview- und Push-Strecke nicht wiederholen.
5. Kleine lokale reproduzierbare Fehler gezielt beheben und relevant nachtesten;
   keine großen Funktionsneubauten. Korrekturen bleiben unveröffentlicht im Kandidaten.
6. Bericht/STATUS/HANDOFF aktuell halten, bekannte Muster auf Secrets prüfen, git diff
   --check. Geprüfte Änderungen auf bestehendem Kandidatenbranch sichern. Kein Merge.

## Verbindliche Matrix

| Bereich | Zu prüfendes Verhalten |
| --- | --- |
| Anmeldung und Autorisierung | Ohne Sitzung kein privater API-Zugriff; falsche Origin abgewiesen; fremdes Gerät/Job/Datei nicht zugänglich; Logout getrennt |
| Aufgaben und Kommunikation | Übernahme atomar; Zuständigkeit sichtbar; Kommentar dauerhaft nach Neuladen; Entwürfe beim Navigieren erhalten |
| Eigene Arbeitskopien | Korrektes Projekt/Repository/Gerät; getrennte Branches; keine fremde Kopie bearbeiten; Konflikte verständlich abweisen |
| Dateieditor | Lesen/speichern; veraltete Revision abweisen; Pfad-Traversal, Symlinks, Secrets und Größenlimits abweisen |
| Runner und Jobs | Poll/Status/Heartbeat; Abbruch/Timeout; Offlinezustand; erneute Verbindung ohne doppelten Runner oder Datenverlust |
| Tests | Echter konfigurierter Befehl; Fehler darf keinen Erfolg anzeigen; Live-Pilot zuletzt 3/3 PASS |
| Vorschau | Gebauter Stand entspricht Änderungen; getrennte Origin; Navigation; Pfad-/Symlinkgrenzen; 390/1024/1440 px |
| Review | Exakter Commit; veraltete Freigabe abweisen; keine Selbstfreigabe; keine Integration ohne erforderliche Prüfung |
| GitHub | Live-Pilot-Branch entspricht Prüfcommit; Draft-PR vorhanden; main unverändert; fehlende CI und fehlender direkter PR-Weg als Lücke |
| Persönliche KI | Bereits echter begrenzter CLI-Auftrag PASS; keine erneuten Modelljobs. Studio-Login und KI-Freigabe getrennt |
| Sicherheitsgrenzen | Wiederhergestellte KI-/Push-Sperren; Pull-Request-Workflow verhindert direkte Integration; keine Geheimnisse in Git/Logs |
| Bedienbarkeit | Sichtbare Fehlermeldungen, Ladezustände, Tastaturfokus und Mobile-Überlauf gezielt prüfen; Demo/Live und lokale/veröffentlichte Reviews unterscheiden |
| Backup/Betrieb | Vorhandene P2-Nachweise verwenden; keine neue Live-DB-Operation oder Dienstneustart |

## Grenzen

Nur SCHMAQQ-Workspace-Kandidat und isoliertes privates Pilotprojekt. NetzKontor und
produktive Websites bleiben unverändert. Kein Deployment, Merge, Autostart, neue
Provider-/OAuth-App, externe Nachricht oder Installation. Kein weiteres KI-Kontingent
für Runneraufträge. Private Runner-Konfiguration unverändert: Codex OFF, Publish OFF.
Keine fremden Browserprofile/Anmeldedaten auslesen. Sicherheitsprüfungen gegen
lokale synthetische Fixtures; keine Angriffe auf produktive Dienste.

Echte zweite Person, macOS-Hardware, echte externe OAuth-Anbieter, Offsite-Restore,
Windows-Neustart und unabhängiger Review bleiben begrenzt beziehungsweise BLOCKED,
wenn kein passender Zugang vorhanden ist. Unabhängige Arbeit trotzdem fortsetzen.
Die Abnahme ist kein vollständiger Penetrationstest und kein Beleg für alle denkbaren Fehler.

## Ergebnis und Kommunikation

Fortlaufender Bericht: docs/evidence/OVERNIGHT_ACCEPTANCE.md.
Private Belege: .studio/overnight-audit/; nie Tokens oder Capability-URLs ausgeben.
Nur bei neuem Fehler, erforderlicher Aktion oder erreichtem Meilenstein melden.
Keine wiederholten PASS-Läufe auf unverändertem Stand, keine neuen Plan-Dokumentketten.
