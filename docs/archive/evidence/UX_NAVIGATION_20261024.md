# Navigation und verständliche Aktionen – lokaler Arbeitsauftrag

Datum: 24.10.2026. Auftrag: Die mit dem Owner besprochene Orientierung umsetzen.
Ausgangspunkt ist der saubere lokale Stand vor diesem Paket (Git-Historie).
Der persönliche Test des Owners war trotz zuvor bestandener technischer Tests
nicht selbständig bedienbar. Technische PASS sind keine Bedienfreigabe.

## Ziel und Schreibbereich

Fünf Haupteinstiege (Start, Projekte, Aufgaben, Team, Einrichtung & Verbindungen),
dauerhaft erreichbare Anleitung, zusammenhängende Aufgabenansicht, sichtbare
Vorschau, kurze Aktionserklärungen und ehrliche Folgen-/Rückweghinweise.
Produktdateien nur in app/ und studio/, gezielte Tests in selfhost/ sowie
STATUS/HANDOFF und dieser Nachweis. Ein Schreiber, keine Unteragenten.

## Grenzen

Keine neue KI-Anbindung oder Anmeldung, kein Profilwechsel, Push, Merge,
Deployment oder Migration. Bestehende Konten/Projektfreigaben bleiben erhalten.
Speichern schreibt weiter nur in die eigene lokale Kopie. Prüfstände teilen
Änderungsnachweise mit dem Team und sichern einen Commit; sie sind weder
Zusammenführung noch Website-Livegang. Kein universeller Restore wird versprochen.

## Abnahme

- Haupteinstiege und Unterseiten haben eindeutige, erreichbare Elternseiten;
  bestehende Direktlinks funktionieren weiter.
- Hilfe beschreibt Einstieg, täglichen Ablauf, Aktionen, Sichtbarkeit und
  tatsächlich verfügbare Rückwege; Rückkehr erhält einen ungespeicherten Entwurf.
- Eine Aufgabe ohne Kopie zeigt den Start der Bearbeitung mit erklärter Wirkung;
  nötige Einrichtung, fehlende Verbindung und Fehler bleiben sichtbar.
- Vorschau, Änderungen, Tests und Prüfstand erklären ihre Wirkung vor dem Klick.
  Ungespeicherte Änderungen blockieren Prüfungen mit verständlichem Grund.
- Vorheriger Inhalt nach erfolgreichem Speichern kann zunächst als Entwurf
  geladen werden. Erst ein weiterer Save schreibt; Konfliktschutz bleibt wirksam.
- Desktop und 390px: echte Navigation, Speichern, Rückweg, Test und Vorschau.
- Source Guard, gezielte Tests, TypeScript, Build und lokaler Gesamtcheck.

## Ergebnis

Lokal umgesetzt auf `local/studio-navigation-20261024`. Keine Backend-,
Abhängigkeits- oder Berechtigungsänderung. Das vorangehende Originalverzeichnis
und alle vorhandenen Kopien wurden erhalten; für den Browserlauf entstand eine
weitere eigene Testkopie zur bestehenden Testaufgabe.

| Prüfung | Selbst ausgeführtes Ergebnis |
| --- | --- |
| Fünf Haupteinstiege, Unterseiten und Direktlinks | PASS: Start setzt Projektfilter zurück; Team bündelt Personen/Gespräch/Wissen; Einrichtung bündelt PC/Projekt, Konten und weitere Werkzeuge. |
| Anleitung und Rückkehr | PASS: aus Aufgabe geöffnet, Vorschau-Reiter wiederhergestellt, ungespeicherter Text im Editor erhalten. Inhaltslinks auf Handybreite vorhanden. |
| Aufgabenstart | PASS: „Bearbeitung starten“ legte eine passende eigene Kopie an. Nötige Optionen bleiben aufklappbar. |
| Speichern und Rückweg | PASS: Text gespeichert; vorherige Fassung als Entwurf geladen; „Aktuellen Stand vergleichen“ zeigte weiterhin die neu gespeicherte Datei auf dem PC. Anschließendes Speichern stellte den alten Inhalt wieder her. |
| Diff und Tests | PASS: tatsächlicher Diff zeigte die neue Überschrift; eingerichteter node:test-Lauf bestand. |
| Vorschau | PASS: gebaut, Link in neuem Tab geöffnet, gerenderte Überschrift „Marco testet SCHMAQQ Studio“ gelesen. Ungespeicherter Entwurf blockiert Bau mit Erklärung. Datum und Zuordnung sichtbar. |
| Prüfstand | PASS: direkt aus Vorschau gestartet, lokaler Commit und erfolgreicher Test sichtbar, zweite Prüfung ausstehend. Kein Peer-Votum abgegeben. |
| Mobile Navigation | PASS: Menü, Hilfe, Einstellungen, bestehende Kontenansicht, Team-Unterseiten erreicht. Kein horizontaler Seitenüberlauf in gemessener Vorschau/Hilfe (375px Inhaltsbreite bei 390px Viewport). |
| Tastatur und Wiederaufnahme | PASS: Pfeil rechts wechselte Bearbeiten zu Vorschau, Ende zu Verlauf, Pos1 zurück; Wiederaufnahme über Start korrekt. Vorschau-Reiter über Neuladen erhalten. |
| Einladungsverwaltung | Bestehendes Formular unter Team sichtbar; kein Link erstellt und keine Einladung versendet. |

## Tests und tatsächliche Testanläufe

Zuerst 19 gezielte Tests PASS. Ein früher TypeScript/Build-Versuch fand einen
JSX-Klammerfehler während der Umsetzung; vor Browserabnahme korrigiert.
Lokaler Gesamtcheck: 172 Tests, 151 PASS, 0 FAIL, 21 ausdrücklich Linux-spezifische
Skips. Source Guard, TypeScript und Frontend-Build PASS, Exitcode 0 mit `--local`.
Git-Ausnahme galt nur im jeweiligen Testprozess; keine globale Konfiguration.
Privater Log: `.studio/navigation-verify-final-20261024.log`.

Im Browser wurden ein überflüssiger Block deaktivierter Startaktionen entfernt,
der Vorschau-Folgeschritt auf den eigenen Reiter gelegt und die direkte
Prüfstanderstellung aus der Vorschau ergänzt. Beim Prüfstand änderte dessen
Commit die Zuordnung einer bisherigen Vorschau ohne sichtbare Inhaltsänderung.
Die letzte Textkorrektur spricht deshalb von einem früheren Projektstand,
nicht pauschal von geänderten Dateien. Danach 8 gezielte Tests sowie
TypeScript und Build erneut PASS. Der finale Build wurde im Browser geladen.

Zwei kurze Browser-Warteaufrufe endeten vor dem asynchronen Dateiauftrag; die
anschließende aktuelle Ansicht zeigte dessen erfolgreichen Abschluss. Kein
fehlerfreier erster Durchlauf wird behauptet. Rohbilder und Testdaten bleiben
privat unter `.studio/`; nie als dauerhafte Produktquelle behandeln.

## Grenzen und nächster Schritt

- Der vorherige Owner-Test ist gescheitert. Diese technische/browserseitige
  Abnahme belegt noch keine selbständige oder intuitive Nutzung durch den Owner.
- Erstverbindung von PC und Projekt braucht weiter die bestehenden lokalen
  Befehle. Die neue Anleitung macht daraus keine automatische Einrichtung.
- Rückholen einer Dateifassung ist auf den geöffneten Editor begrenzt. Nach
  Neuladen oder Remount ist dieser Speicher weg. Historische Prüfstände lassen
  sich ansehen; ein vollständiger Projekt-Restore per Knopfdruck fehlt.
- Persönlicher Codex bleibt eine bestehende optionale Funktion. Projektfreigabe,
  Abo-Anmeldung und Auftragskontext werden nicht automatisch eingerichtet.
  Aufgabenbeschreibung und Gespräch werden nicht automatisch mitgesendet.
- Keine neue Einladung, Konten-/Authentifizierungsänderung, KI-Ausführung,
  Git-Übertragung, unabhängige Peer-Abnahme oder Veröffentlichung durchgeführt.
- Der isolierte lokale Testlauf bleibt für den Owner erreichbar. Laufende
  Prozesse und Profilpfade stehen ausschließlich im privaten Testverzeichnis.
- Nächste Abnahme: Owner beginnt eine neue kleine Aufgabe ohne Klickanweisungen,
  beschreibt die Folgen von Speichern/Prüfstand und nimmt die Arbeit später auf.

## Vorschlag für die Arbeitsbasis (nicht in den Vault geschrieben)

Datum: 24.10.2026. Quelle: dieser Bericht, Produktdiff und Git-Stand des lokalen
Branches. Belegte Erkenntnis: Funktionen konnten trotz technischer PASS beim
Owner keinen verständlichen Einstieg vermitteln. Deshalb Orientierung, sichtbare
Vorschau und Aktionseffekte zusammen umgesetzt; ein Dateirückweg darf nicht mit
vollständigem Projekt-Restore verwechselt werden. Tests/Browserlauf wie oben selbst
ausgeführt; historische Owner-Aussage nur aus dem Gespräch gelesen. Offen:
selbständige Bedienabnahme, technische Ersteinrichtung und gemeinsame KI-Kontexte.
Ablage im Vault unterbleibt wegen der hier geltenden Schreibgrenzen; Übernahme erst
nach Prüfung der Erkenntnisse.
