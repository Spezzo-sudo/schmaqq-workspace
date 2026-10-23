# Arbeitsauftrag und Abnahme: Aufgabenorientierung, 23.10.2026

## Auftrag

Owner-GO im Chat nach dem freien UX-Rundgang: zuerst E1/E2 absichern, dann E3–E8
als zusammenhängenden Arbeitsweg vereinfachen. Keine Funktionen entfernen.
E9 (Einladungen) und E10 (Anmeldung) bleiben separate Themen.
Budget: vorhandene lokale Werkzeuge und Abo-Anmeldung; keine Zusatzkosten oder
neuen Agenten.

Schreibbereich: `app/` Aufgaben-, Entwicklungs-, Editor-, Prüfstands- und
Navigationskomponenten samt reinem Anzeigemodell; `studio/brand.css`; gezielte
Regressionen in `selfhost/`; Status, Übergabe und dieser Nachweis in `docs/`.
Keine Backend-Berechtigungs-, Auth-, Runner-, Veröffentlichungs- oder Schemaänderung.
Bestehende Audit-Dokumentation erhalten; keine fremden Arbeitsverzeichnisse ändern.
Kein Push, Merge, Deployment oder externer Dienstwechsel.

## Abnahmekriterien

- Aufgabenmodus bietet ausschliesslich eigene passende Arbeitskopien der Aufgabe.
  Ohne passende Kopie kein Editor und keine Ausführung in einer fremden Zuordnung.
- Historischer Prüfstand benennt geänderten bzw. unbekannten heutigen Dateistand.
  Freigabe bleibt an den tatsächlichen Prüfcommit gebunden.
- Ungespeicherter Entwurf verlangt oben wie an der Aktionsleiste zuerst Speichern.
- Titelklicks öffnen denselben Arbeitsplatz. Einrichtung führt zu Aufgaben;
  vollständige Entwicklung bleibt unter „Weitere Werkzeuge“ zugänglich.
- Prüfstand öffnen/schliessen erhält den Ausgangsreiter und den offenen Entwurf.
  Neuladen sowie Zurück/Vorwärts stellen den Aufgabenreiter wieder her.
- Ziel, Fortschritt, Begriffe und Zusatzaktionen bleiben erreichbar; der normale
  Arbeitsplatz priorisiert nächste Aktion, Datei und eine Speicher-/Prüfleiste.
- Sichtbare eigene Browserprüfung auf Desktop und 390 px; echter Vorschau-/Testweg,
  keine Produktivdaten. Lokaler Gesamtcheck vor Übergabe.

## Umsetzung

- E1: Auswahlliste, automatische Auswahl und ausführbare Aktionen im Aufgabenmodus
  verwenden nur passende eigene Kopien. Die Aufgabe des Erstellauftrags ist fest
  gebunden. Ein Kopienwechsel innerhalb derselben Aufgabe meldet seinen Kontext
  an die Kopfzeile. Die projektweiten Werkzeuge behalten ihre breitere Auswahl.
- E2: Der Prüfstandsdialog lädt über die bestehende angemeldete Schnittstelle den
  Dateinachweis seiner Kopie. Aktuelle und ältere Prüfstände werden einzeln
  verglichen; fehlende oder ungültige Zuordnung wird ausdrücklich als unbekannt
  bezeichnet. Eine ältere Freigabe bleibt gültige Historie ihres Prüfcommits.
- E3: Kopfzeile und Ergebnis kennen Entwurf und laufenden Auftrag. Ein Entwurf
  verlangt zuerst Speichern und bleibt beim Reiter-/Dialogwechsel erhalten.
- E4/E7: Aufgabentitel führen aus Aufgabenboard, Projektübersicht und Teamkarte
  in denselben Arbeitsplatz. Die Einrichtung führt zu Aufgaben. Die vollständige
  projektweite Ansicht bleibt als „Weitere Werkzeuge“ unter Einstellungen erhalten.
  Prüfstandslinks aus der Übersicht öffnen direkt die passende Aufgabe mit Dialog.
- E5: Dialog als Overlay ohne Remount des Editors und ohne Reiterwechsel.
  Reiter stehen in der URL; Neuladen und Zurück/Vorwärts stellen sie wieder her.
- E6/E8: Aufgabenziel, Metadaten, Fortschritt und Begriffe direkt aufklappbar,
  ebenso Hilfen und Vergleich-/Download-/Verwerfaktionen. Eine Speicherleiste.
  Dateiliste im Aufgabenmodus bei Bedarf; Ergebnisse stehen nach der Datei.

Die fachlichen Trennungen bleiben: Aufgabe, eigene Arbeitskopie, gespeicherte Datei,
Testnachweis, commitgebundene Teamprüfung und Veröffentlichung. Kein automatischer
Statuswechsel und kein automatisches Veröffentlichen. Keine Backendänderung.

## Selbst ausgeführte Prüfungen

Gezielt: 30 Tests bestanden (Auswahl, historische Prüfbindung, Reiterroute,
Entwurfsvorrang, Navigation, nächster Schritt und verständliche Begriffe).
Lokaler Gesamtcheck: 168 Tests, 147 bestanden, 0 Fehler, 21 explizite Linux-Skips;
Source Guard, TypeScript und Frontendbuild bestanden. Kein Linux-/Release-PASS.
Rohlog privat: `.studio/orientation-verify-final-20261023.log`.

Ein erster Gesamtcheck unter Sandboxrechten hing im vorhandenen Prozessabbruchtest;
nur sein verifizierter eigener Prozessbaum wurde beendet. Der native Versuch
stoppte zuerst an Gits Eigentümerprüfung. Danach lief der Check mit einer nur
prozessgebundenen `safe.directory`-Ausnahme für diesen Checkout durch. Keine globale
Git-Konfiguration geändert. Nach der letzten Korrektur eines weiteren Teameinstiegs
wurde der finale Stand nochmals vollständig geprüft.

Sichtbar selbst über die interaktive Browsersteuerung bedient, keine vorgegebene
Playwright-Ablaufdatei und keine API-Abkürzungen für die Bedienabnahme. Vorhandene
Marco-Sitzung und Geräteanmeldung im bereits isolierten Testbestand auf Loopback
4394/4395 wiederverwendet. Keine Credentials gelesen, keine neuen Konten/Registrierungen.
Desktop 1280x900 und Mobil 390x844. Beobachtet:

| Kriterium | Beobachtung | Ergebnis |
| --- | --- | --- |
| Andere Aufgabe ohne aktive eigene Kopie | Fremde Aufgaben-Kopie fehlt in der Auswahl; kein Editor, Prüfaktionen gesperrt | PASS |
| Einheitlicher Titelweg | Projektübersicht und Kanban öffnen dieselbe Aufgabenroute; Teamkarte ebenfalls | PASS |
| Ziel ohne Diskussion | Beschreibung, zuständige Person, Kopie, Fortschritt und Begriffe direkt aufklappbar | PASS |
| Ungespeichert | Kopfzeile sagt Speichern; nur Speicherknopf hervorgehoben; Tests/Vorschau/Prüfstand gesperrt | PASS |
| Dialog und Entwurf | Aus Nachweise historischen Dialog geöffnet, geschlossen, Nachweise bleibt; Entwurf beim Rückweg nach Bearbeiten noch vorhanden | PASS |
| Wiederaufnahme | Neuladen in Nachweise; Zurück/Vorwärts zwischen Bearbeiten und Nachweise korrekt | PASS |
| Historischer Stand | Warnung vor und nach Erstellung eines neueren Prüfstands; historischer Freigabetext ausdrücklich nur für seinen Prüfstand | PASS |
| Echter Arbeitsweg | Überschrift nur im Testklon gespeichert → Tests bestanden → Vorschau gebaut und geänderte Überschrift im neuen Tab gesehen → zurück → Prüfstand erstellt, dessen eigener Test bestanden | PASS |
| Neuer Prüfstand | Aktuelle Dateizuordnung bestätigt, zweite Prüfung ausdrücklich ausstehend, keine Eigenfreigabe angeboten | PASS |
| Einrichtung/Werkzeuge | „Zu den Aufgaben“ öffnet Board; projektweite Funktionen unter Weitere Werkzeuge noch erreichbar | PASS |
| Mobile Dichte | Textfeld am tatsächlichen Seitenanfang bei ca. 689 px statt zuvor ca. 1239 px; kein horizontaler Überlauf im geprüften Arbeitsplatz | PASS |

Die Höhenmessung gilt für den beobachteten Bearbeitungszustand mit eingeklappten
Details und ohne Aufgabenstatus-Vorschlagsbox; kein pauschaler Wert für alle
Aufgabentitel oder aufklappbaren Inhalte. Die spätere neue Vorschau wurde im
eigenen mobilen Tab ebenfalls sichtbar geprüft. Screenshots privat unter
`.studio/orientation-01-...png` bis `orientation-...png`; nicht nach GitHub übernehmen.

Der Test hat die Überschrift im isolierten Testklon geändert und einen neuen
lokalen Prüfcommit dort erzeugt. Die ursprünglichen persönlichen Projektdaten
und das andere Repository wurden nicht bearbeitet. Kein Push, Merge oder Deployment.
Am Ende null wartende/laufende Aufträge festgestellt; die eigenen Prozesse
(Server 24192, Runner 24132) anhand ihrer Befehlszeilen geprüft und beendet.
Keine Listener auf den Testports übrig; eigene Tabs geschlossen, temporäre
Grössenvorgabe zurückgesetzt. Auch Escape schloss den Dialog mit Fokus zurück
auf „Prüfstand öffnen“ im weiterhin aktiven Nachweisreiter.

## Grenzen und nächster Schritt

Dies ist eine selbst ausgeführte technische und sichtbare Bedienprüfung, keine
unabhängige menschliche Abnahme. Die zweite Rolle wurde in diesem Rundgang nicht
erneut angemeldet; vorhandene Berechtigungsregressionen liefen im Gesamtcheck.
Keine neue Peer-Freigabe, Veröffentlichung oder Zusammenführung vorgenommen.

E9 bleibt separat (Einladungen liegen weiterhin bei den Zusatzwerkzeugen; nur der
Verweis wurde an deren neuen Namen angepasst). E10 bleibt separat (Passwort-
Wiederherstellung/Anmeldeführung). Ersteinrichtung und Kopienanlage benötigen
weiter technische Projektangaben. Linux-/Betriebsfreigabe bleibt ausserhalb dieses
lokalen UX-Auftrags.

Als Nächstes eine kleine Aufgabe durch den Owner ohne Klickanweisungen bearbeiten
lassen: selbst finden → Datei öffnen/ändern/speichern → Test → Vorschau → Prüfstand
→ später wieder aufnehmen. Abbruch/Orientierungsfragen als UX-Befunde festhalten.
Kein Deployment-GO aus diesem Bericht ableiten.

## Vorschlag für die Arbeitsbasis

Datierte neue Erkenntnis: Aufgabenbindung und durchgehende Rückwege sind eigene
Abnahmekriterien zusätzlich zu bestandenen Funktionsprüfungen. Quelle ist dieser
Bericht samt exaktem zugehörigen lokalen Git-Diff/Commit (mit Git ermitteln).
Selbst ausgeführte Tests und gelesene historische Befunde sind oben getrennt.
Offen bleiben Owner-Test ohne Hilfestellung, technische Ersteinrichtung, E9/E10
und Betriebsfreigabe. Die externe Arbeitsbasis wurde mangels Schreibrecht nicht
beschrieben; diesen Vorschlag erst nach Prüfung nach `vault/05_Eingang/` übernehmen.
