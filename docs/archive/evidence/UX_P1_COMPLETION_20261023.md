# UX-P1: Abschluss der vier Übergangsprobleme

Datum: 23.10.2026. Branch: `local/studio-a0-terms-20261023`.
Ausgangspunkt: vier uncommittete Dateien auf dem C3-Stand. Diese Änderungen
wurden erhalten, geprüft und im vorliegenden Paket vervollständigt.
Den zugehörigen Commit über Git bestimmen; kein Release oder Dienstwechsel.

## Ergebnis

| Fall | Änderung | Selbst ausgeführter Nachweis |
| --- | --- | --- |
| P1-1 | Ein erfolgreicher Prüfstand/Veröffentlichungsjob liefert auch den darin tatsächlich ausgeführten Testnachweis mit `via: review`. Bestehender Dateirevisionsabgleich bleibt erhalten. | Echter Runner: Prüfstand führt Test aus, gleicher Nachweis als letzter Test, keine erneute Testaufforderung. Spätere Dateiänderung entwertet ihn. Regressionen für abweichende Revision, fehlgeschlagenen späteren Prüfstand und spätere fehlgeschlagene Tests. |
| P1-2 | Entwicklungsansicht meldet ihre Vorschaufähigkeit an den Aufgabenarbeitsplatz; Kopfzeile und Ergebnis verwenden dieselbe Grundlage. | Nach echtem Test empfehlen beide Stellen die Vorschau. Echter Build zeigt die geänderte Überschrift. |
| P1-3 | Aktuelle Änderungswünsche erscheinen mit Verfasser und Text bei der Aufgabe. Direkter Knopf öffnet genau den Prüfstand. | Zweite Rolle fordert Änderung an; erste Rolle sieht Text und öffnet denselben Prüfstand. Spätere Freigabe entfernt den überholten Hinweis. Unit-Test für Commitbindung, Eigenstimmen, Kommentare und überholte Entscheidungen. |
| P1-4 | Startseite zeigt aktuelle wartende Prüfstände anderer Personen mit direktem Prüfen-Knopf. | Zweite Rolle findet und öffnet den Prüfstand bei Desktop- und Mobilbreite. Freigegebene, geänderte, nicht belegte, archivierte und eigene Stände werden nicht als wartende aktuelle Fremdprüfung angeboten. |

## Ausführung und Evidence

- Lokaler Gesamtcheck selbst ausgeführt: `node selfhost/verify.mjs --local`
  (entspricht `studio:verify:local`), Exit 0. Source Guard PASS; 164 Backendtests,
  143 PASS, 0 FAIL, 21 explizite Linux-Skips; TypeScript und Frontend-Build PASS.
- Sichtbarer Edge mit zwei getrennten Browserkontexten, Desktop 1280 und Mobil
  390px. Echte Arbeitskopie, Dateiänderung, Test, statischer Build und Git-Prüfstand.
  Neun protokollierte Schritte PASS, keine Browserausnahmen, kein horizontaler
  Überlauf. Relevante Screenshots zusätzlich angesehen.
- Selbstfreigabe wird weiterhin mit 403 abgewiesen; Rückmeldungen ohne Anmeldung
  mit 401. Die vorhandene angemeldete Leseschnittstelle wird wiederverwendet;
  keine Änderung an Authentifizierung, Backendberechtigungen oder Datenbankschema.
- Bestehende synthetische Konten und eine vorhandene Geräteanmeldung in einer
  neuen privaten Kopie wiederverwendet. Keine neuen Konten/Registrierungen,
  keine persönlichen Profile, Modelljobs oder externen Git-Schreibzugriffe.
- Ursprung ist der frühere isolierte Alltagstest. Kopierte DB samt WAL nur bei
  unverändertem Quellhash übernommen; ursprüngliche Dateien abschliessend erneut
  gehasht und unverändert. Neue Git-Kopie und Runnerzustand liegen nur im Testziel.
- Privater Rohbeleg: `.studio/ux-p1-20261023/result.json`, `verify-local.log`,
  `attempt-1.json` und Desktop-/Mobil-Screenshots. Nicht in Git aufnehmen.
- Eigene Testprozesse beendet; auf 4394/4395 bleibt kein Listener.

## Versuche und Grenzen

Der erste Browserversuch wurde von einer mitkopierten alten Dateibereichsreservierung
korrekt abgewiesen. Ausschliesslich in der neuen Testkopie wurden historische
Arbeitskopien archiviert. Der fortgesetzte zweite Lauf bestand; kein fehlerfreier
Einzellauf behauptet. Ein TypeScript-Nullfall wurde vor Browserabnahme und finalem
Gesamtcheck korrigiert. Der Gesamtcheck erhielt nur im Prozess eine Git-Besitzerausnahme
für den exakten Kandidatenpfad; keine globale Git-Konfiguration geändert.

Dies ist eine technische Zwei-Rollen-Abnahme durch einen Engineering-Agenten,
keine unabhängige menschliche Prüfung und noch keine selbstständige UX-Abnahme
durch den Owner. Insbesondere bleiben die Dichte der mobilen Kopfzeile und die
ältere vollständige Entwicklungsansicht weitere UX-Themen. Kein neuer Linux-
Release-/Recovery-Nachweis, keine Production-Aussage oder Deploymentfreigabe.

## Nächster Schritt und Wissensbasis

Owner erhält nur ein Aufgabenziel und führt den Ablauf ohne Klickanweisungen aus.
Erst danach die selbstständige Bedienbarkeit bewerten. Bis dahin kein weiterer
Funktionsausbau. Dieser Bericht ist auch ein Vorschlag zur geprüften Übernahme in
die externe Arbeitsbasis; dort wurde mangels Schreibrecht nichts abgelegt.
