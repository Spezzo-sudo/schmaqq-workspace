# Live-Browserabnahme des persönlichen Pilotablaufs

## Auftrag und Testgrenze

Owner bat um einen klaren Arbeitsvorgang und dessen eigenständige Prüfung durch
Browsersteuerung. Verwendet wurde die bereits persönlich autorisierte eigene
Playwright-Browsersitzung am Windows-PC, Live-Studio mit aktivem persönlichen
Runner und ausschließlich das genehmigte synthetische Pilotprojekt.
Kein separater Cloud-Browser und kein zweiter menschlicher Teilnehmer.

Alle Produktaktionen in dieser Prüfung wurden über sichtbare UI-Bedienelemente
ausgelöst, ohne API-Workaround. Ein anschließender lesender Git-Abgleich ergänzt
den Nachweis. Keine Änderung am Studio-Produktcode, Server oder an NetzKontor.

## Tatsächlich durchlaufener Vorgang

| Schritt | Ergebnis |
| --- | --- |
| Studio-Pilottest und Marcos Aufgabe öffnen | Vorhandene Zuständigkeit und Arbeitskopie sichtbar |
| Anforderung als klar gekennzeichneten Automationskommentar eingeben | Entwurf über Wissen → Übersicht erhalten; Kommentar gesendet |
| Eigene Arbeitskopie aus der Aufgabe öffnen | Bestehende Kopie verwendet; keine neue Registrierung/Kopie |
| Dateien laden und `site/index.html` öffnen | Echte Runner-Dateiliste und Inhalt im Editor |
| Überschrift ändern, zwischen Projekt und Entwicklung navigieren | Ungespeicherter Datei-Entwurf erhalten |
| Speichern | Runner bestätigt Speicherung; Originaltext gezielt ersetzt |
| Änderungen öffnen | Reales Diff zeigt exakt die gespeicherte Überschrift |
| Tests starten | Konfigurierter Prüfablauf erfolgreich |
| Vorschau bauen und über UI-Link öffnen | Neue Überschrift sichtbar auf separater HTTPS-Origin; Start-/Services-Navigation funktioniert |
| Zur Teamprüfung | Lokaler Commit, erneute 2/2 Tests, Diff und ausstehende zweite Prüfung sichtbar |
| Aufgabe auf „Zur Prüfung“ setzen und Seite neu laden | Kommentar dauerhaft gespeichert, Taskstatus und Review-Verknüpfung erhalten |
| Prüfstand aus der Aufgabe wieder öffnen | Derselbe vollständige Commit angezeigt; eigene Freigabe nicht angeboten |
| Darstellung bei 1440, 1024 und 390 px | Keine horizontale Seitenüberschreitung; Review auch bei 390 px lesbar, Code-Diff intern horizontal scrollbar |

Geänderte Überschrift:

- vorher: „Gemeinsam digitale Ideen entwickeln.“
- nachher: „Gemeinsam digitale Services entwickeln.“

Lokaler Prüfcommit: `237dc034c204548bd18ea1f58743d0022a8f8338`.
Nachträglicher lesender Git-Abgleich: ausschließlich `site/index.html` geändert,
Arbeitskopie sauber, Remote-main weiter beim initialen Seed und keine
veröffentlichten Studio-Branches. Keine KI-Ausführung, kein Push oder Merge.

## Bedienung und Grenzen

Kein neuer blockierender Produktfehler im geprüften persönlichen Ablauf.
Eine anfänglich mehrdeutige Browserlocator-Auswahl traf sowohl die Teamkarte als
auch den Aufgabentitel; Locator auf die Aufgabenkarte eingegrenzt. Das war ein
Automationsfehler, keine doppelte oder fehlgeschlagene Produktaktion.

Für den Nutzer muss die Unterscheidung klar bleiben:

- „Auftrag abgeschlossen“ bestätigt nur die jeweilige Runnerausführung.
- „Zur Teamprüfung“ erstellt einen lokalen Commit und führt Tests aus.
- „Zweite Prüfung ausstehend“ bedeutet, dass das Arbeitsergebnis noch nicht
  unabhängig freigegeben ist. Taskstatus bewusst auf „Zur Prüfung“ setzen.
- Entwürfe bleiben beim Navigieren im selben Tab erhalten. Dauerhaft gespeichert
  ist ein Kommentar erst nach Senden und eine Datei erst nach Speichern.
- Git-Veröffentlichung und Übernahme sind zusätzliche Schritte; beide bleiben
  im aktuellen lokalen Pilotprofil gesperrt.

Screenshots und bereinigtes Testresultat liegen lokal ignoriert unter
`.studio/p3-pilot/browser-audit/`. Keine Token-/Capability-URLs veröffentlicht.

Diese Prüfung belegt einen vom Agenten gesteuerten realen Browserablauf mit
einem Konto. Markus' Mac, seine persönliche Anmeldung, gleichzeitige echte
Zusammenarbeit und unabhängige Freigabe sind weiterhin nicht abgenommen.
Ein Cloud-Browser allein ersetzt keinen eingeschalteten Ausführungsrunner.
