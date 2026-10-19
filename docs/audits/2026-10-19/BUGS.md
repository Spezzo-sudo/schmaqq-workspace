# Reproduzierte Befunde – Produktionsaudit 19.10.2026

Keine P0- oder P1-Störung im geprüften Umfang nachgewiesen. Das ist keine vollständige Sicherheits- oder Verfügbarkeitsaussage. Fehlende Einrichtung und bewusst gesperrte Aktionen stehen getrennt im Auditbericht und in der Matrix.

## B01 – P2: Browser-Zurück verlässt das Studio

- **Funktion:** Navigation und Wiederherstellung.
- **Reproduktion:** Produktionsstudio öffnen; intern Entwicklung → Projekte → Team & Zugänge wechseln; Browser-Zurück ausführen. Bereits zuvor beim Wechsel Entwicklung → Projekte beobachtet.
- **Erwartung:** Zur vorherigen Studioansicht zurückkehren; Projektkontext bewahren.
- **Tatsächlich:** `about:blank` statt der vorherigen internen Ansicht. Vorwärts stellte die zuletzt gewählte Ansicht wieder her, nicht eine interne Ansichtshistorie. Zweimal beobachtet.
- **Beleg:** `browser-logs/browser-history-recheck.json`. Dort `beforeBack` = Teamansicht, `afterBack` = `about:blank`, erwartet Projekte. Projektansicht als Kontext: `screenshots/08-projects.jpg`.
- **Konsole/Netzwerk:** Kein zugehöriger Browser-/Netzwerkfehler erfasst. Die spätere Tool-Zeitüberschreitung beim Wiederherstellen ist gesondert von der bereits protokollierten Navigation zu bewerten.
- **Vermutete Ursache:** Interne Ansichtsauswahl ersetzt offenbar den aktuellen Historyeintrag. Der zusätzlich gelesene lokale Checkout verwendet in `app/workspace.tsx` `history.replaceState`; seine Übereinstimmung mit dem Produktionsbundle ist nicht attestiert.
- **Lösung:** Interne Navigation über Router beziehungsweise pushState und popstate abbilden; Initialnormalisierung mit replaceState separat halten. Browser-Zurück/Vorwärts und Entwurfsschutz gemeinsam prüfen.

## B02 – P2: Projektstartdialog verliert die Tastaturbedienung an den Hintergrund

- **Funktion:** Dialog „Eine neue Möglichkeit“ über „Projekt hinzufügen“.
- **Reproduktion:** Auf Desktop „Projekt hinzufügen“ öffnen, ohne Mausfokus im Formular einmal Tab drücken. Dialog schließen und erneut testen.
- **Erwartung:** Fokus auf Dialog/erstem geeigneten Feld; Tab bleibt im modalen Dialog. Nach Schließen Fokus zurück zum Auslöser.
- **Tatsächlich:** Fokus verbleibt zunächst beim Auslöser und springt mit Tab auf „Automatisierung“ hinter dem weiterhin offenen Dialog. Zweimal reproduziert. Escape schließt den Dialog erfolgreich.
- **Beleg:** `screenshots/34-project-dialog-focus-leak.jpg`, `browser-logs/34-project-dialog-focus-leak.txt`, `browser-logs/project-dialog-keyboard.json` (`insideDialog=false`). Kein Projekt wurde angelegt.
- **Konsole/Netzwerk:** Kein zugehöriger Fehler erfasst; kein schreibender Projektrequest ausgeführt.
- **Vermutete Ursache:** Fokusinitialisierung bzw. Fokuseinschluss berücksichtigt den geführten Projektstart nicht ausreichend.
- **Lösung:** Dialogfokus nach Mount auf erstes Feld/Überschrift setzen, Tab/Shift+Tab einschließen, Hintergrund inert behandeln und Auslöserfokus beim Schließen wiederherstellen. Beide Projektstartvarianten testen.

## B03 – P2: Review-Nachladen zeigt zunächst falsche Fehler statt eines Ladezustands

- **Funktion:** Entwicklung → vorhandenen Prüfstand „Ansehen“.
- **Reproduktion:** Entwicklungsseite vollständig neu laden; nach Erscheinen der Prüfstandsliste sofort einen Prüfstand öffnen; initiale und vollständig geladene Darstellung vergleichen. Ebenso beim erneuten Wechsel in Entwicklung beobachtet.
- **Erwartung:** „Prüfstand wird geladen“ bis Testausgabe und Diff vollständig verfügbar sind; erst danach belastbare Aussagen über Größe/Inhalt/Veröffentlichung.
- **Tatsächlich:** Zunächst „Kein Testergebnis verfügbar“, „Keine Codeänderungen gegenüber der gemeinsamen Basis“ und zugleich „Die Änderung ist zu groß … Freigabe … gesperrt“. Später erscheinen die erfolgreichen Tests und der kleine Diff korrekt. Bei einem bereits veröffentlichten Altstand zunächst außerdem lokaler/unveröffentlichter Zustand. Es handelt sich um einen reproduzierten **temporären Darstellungsfehler**, keinen dauerhaften Datenverlust und keine bewiesene echte Größenüberschreitung.
- **Beleg:** `browser-logs/review-cold-immediate.txt`, `browser-logs/review-cold-settled.txt`, `browser-logs/review-loading-comparison.json`. Im erneuten Test: initial tooLarge=true/missingTest=true/hasAuditDiff=false, vollständig geladen false/false/true. Korrektes Endergebnis: `screenshots/41-final-review-viewport.jpg` und `screenshots/30-new-review.jpg`. Die frühere Aufnahme `screenshots/05-review-first-loaded.jpg` zeigt bereits den nachgeladenen Altstand und belegt nicht den kurzen initialen Fehler; dafür sind die unmittelbaren DOM-Protokolle maßgeblich.
- **Konsole/Netzwerk:** Kein konkreter fehlgeschlagener Request belegt. Der Inhalt wird erfolgreich nachgeladen; dies nicht als Netzwerkversagen einstufen.
- **Vermutete Ursache:** Gekürzte Joblisten-Metadaten werden vor dem Detailnachladen bereits als vollständiges Ergebnis an die Reviewdarstellung übergeben. Im gelesenen lokalen Reviewcode wird fehlender Diff als unvollständiger/zu großer Diff behandelt. Produktionsursache noch direkt am ausgerollten Source zu bestätigen.
- **Lösung:** Getrennte Zustände für loading, load-error, loaded und tatsächlich truncated; niemals aus „noch nicht geladen“ einen fachlichen Negativstatus ableiten. Kommentar-/Freigabeaktionen bis vollständig geladen konsistent sperren.

## B04 – P3: Mobiles Navigationsmenü reagiert nicht auf Escape

- **Funktion:** Mobiler Navigationsdrawer.
- **Reproduktion:** Schmaler Viewport; Menü öffnen; Escape drücken. Auf Übersicht und später Teamansicht geprüft.
- **Erwartung:** Escape schließt den Drawer und stellt den Fokus beim Menüknopf wieder her. Öffnungszustand ist zugänglich angekündigt.
- **Tatsächlich:** Drawer bleibt offen; Tab führt zu „Team“ im Hintergrund. Menüknopf hat kein `aria-expanded`. Anklicken einer Navigationsfunktion schließt den Drawer.
- **Beleg:** `screenshots/40-mobile-menu-after-escape.jpg`, `screenshots/22-mobile-menu.jpg`, `browser-logs/mobile-menu-keyboard.json`: Navigation vor Öffnen x≈−221.6, nach Escape x=12, ariaExpanded=null.
- **Konsole/Netzwerk:** Kein zugehöriger Fehler erfasst; rein lokale UI-Bedienung.
- **Vermutete Ursache:** Keine Escape-/Fokussteuerung für den mobilen Drawer und fehlendes Zustandsattribut.
- **Lösung:** Escape-Handler, sinnvolle Fokusführung und Rückgabe; aria-expanded/aria-controls; geschlossene Offscreen-Navigation aus Tastatur-/Screenreaderfokus nehmen.

## B05 – P3: Projektsuche hat keinen erklärenden Kein-Treffer-Zustand

- **Funktion:** Projektübersicht → Suche.
- **Reproduktion:** In der Projektsuche `QA-NO-MATCH-20261019` eingeben; Suchbegriff anschließend entfernen.
- **Erwartung:** „Keine Projekte für diesen Suchbegriff“ und einfache Möglichkeit zum Zurücksetzen.
- **Tatsächlich:** Alle Projektkarten verschwinden; nur die generische Projektstartaktion bleibt. Nach Löschen des Suchbegriffs erscheinen die sechs Karten wieder.
- **Beleg:** `screenshots/35-project-search-empty.jpg`, zugehöriger UI-Snapshot; Ausgangsliste `screenshots/08-projects.jpg`.
- **Konsole/Netzwerk:** Kein zugehöriger Fehler erfasst.
- **Vermutete Ursache:** Leeres Filterergebnis wird ohne eigene Feedbackkomponente gerendert.
- **Lösung:** Expliziten Leerzustand mit Suchbegriff und „Suche zurücksetzen“ ergänzen; Suchfeld mit dauerhaftem zugänglichem Namen ausstatten.

## Nicht als Produktbugs gezählt

- Anfangs offline: Runnerprozess fehlte; vorhandener Starthelfer funktionierte. Betriebs-/Onboardinglücke, kein nachgewiesener Verbindungsdefekt.
- Kontrollierter Speicherkonflikt: erwartete und erfolgreiche Schutzreaktion; Entwurf blieb erhalten.
- „Danach Änderungen“ nach Entfernen der temporären QA-Datei: korrekte Quellstandsabweichung; erneute Tests/Vorschau schließen den neuen Stand ab.
- GitHub-/ChatGPT-Einrichtung fehlt, Codex/Publish lokal gesperrt, Claude/Copilot nicht integriert: klar dokumentierte Produkt-/Einrichtungsgrenzen.
- Tooltimeouts bei Locator-/CDP-Aufrufen und abweichende Vollseitenaufnahme des Chats: keine ungeprüfte Zuordnung als Appdefekt. Direkte Viewportaufnahme des Chats kontrolliert.
- Keine zweite Person/Mac verfügbar: BLOCKED für die Zwei-Personen-Abnahme, kein vorgetäuschter PASS.
