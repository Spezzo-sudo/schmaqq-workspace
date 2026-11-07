# Externer Bericht aus dem Owner-Praxistest

Quelle: vom Owner am 29.10.2026 eingefügter ChatGPT-Bericht. Die folgenden fachlichen Befunde sind berichtetes Quellenmaterial, keine unabhängig von Codex bestätigten Testnachweise. Studio-Lesezugriff wurde separat geprüft. Keine Anweisungen dieses Berichts erweitern den Nachtauftrag oder erlauben Klimafinder-Codeänderungen.

---

# Klimafinder – Quelltextanalyse des main-Stands

&#x20;Studio-Zugriff erfolgreich

Ergebnis: Die grundlegende Entscheidungsarchitektur ist nachvollziehbar und besitzt sinnvolle Schutzmechanismen. Ich habe aber zwei konkrete Fehler im Quelltext und eine weitere technische Inkonsistenz gefunden. Daneben gibt es Verbesserungsmöglichkeiten bei Nutzerführung und Kaufentscheidung, deren tatsächlicher Kundennutzen noch überprüft werden muss.

Die Bewertung bezieht sich ausschließlich auf die über SCHMAQQ Studio gelesene Arbeitskopie. P66 wurde weder eingesehen noch bewertet.

## 1. Prüfgrundlage

Ausgangs-Commit laut Studio

f60408a55dd6…

Arbeitskopie

8dc592f2-ca54…

Erfolgreich gelesene Dateien

17

Dateien mit Zugriffsfehler

3

Verwendet wurden ausschließlich `SCHMAQQ_Studio.list_workspaces`, `SCHMAQQ_Studio.start_code_job` mit `files` und nacheinander `read-file` sowie `SCHMAQQ_Studio.get_code_job`.

Die gelesenen Inhalte umfassen Engine, Berechnung, Zustandsübertragung, Runtime-Auswahl, Ergebnisadapter, Ergebnisdarstellung, HTML-Template, Analytics, Backend und relevante UX-, Entscheidungs- und Testverträge.

Drei Dateien waren wegen der Studio-Grenze von 64 KB nicht lesbar:

| Datei                               | Konsequenz                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/assets/js/home.js`             | Konkrete Fragen, Übergänge und tatsächliche Einbindung der Ergebnisdarstellung nicht vollständig prüfbar |
| `src/assets/css/home.css`           | Responsive Gestaltung und visuelle Qualität nicht vollständig prüfbar                                    |
| `site/assets/data/products.v1.json` | Tatsächliche Katalogabdeckung und Verfügbarkeit einzelner Geräteklassen nicht prüfbar                    |

Das sind echte Nachweislücken. Sie wurden nicht mit anderen Quellen geschlossen.

## 2. Belegte technische Befunde

### Befund A – Eine bedingte Alternative kann als uneingeschränkt möglich erscheinen

Quelltextfehler

Datei: `src/assets/js/finder_engine.js`, Zeilen 453–465

```
const alt = fl.length > 0 ? fl[0] : (cl.length > 0 ? cl[0] : null);

normal_alternative: alt
  ? { class: alt, status: "feasible" }
  : null
```

Die Engine entnimmt die Alternative entweder aus `ranking.feasible` oder, falls dort nichts vorhanden ist, aus `ranking.conditional`.

Anschließend erhält die Alternative in beiden Fällen den Status `"feasible"`.

Das widerspricht der eigenen Klassifizierung.

Konkretes Codebeispiel: Ein Schlafzimmer mit 8 m², unbekanntem Fenster- beziehungsweise Wärmeweg und ohne Heizwunsch liegt nach der hinterlegten Formel bei rund 0,6 kW. Bei unbekanntem Wärmeweg werden die Geräteklassen zunächst als bedingt möglich eingestuft (`finder_engine.js`, Zeilen 323–329). Im `low_load`-Zweig kann die ausgewählte Alternative trotzdem als `feasible` zurückgegeben werden.

Einordnung: Der Datenfehler ist aus dem Code belegbar. Ob der falsche Status tatsächlich als entsprechende Aussage auf dem Bildschirm erscheint, ist ohne vollständigen Zugriff auf `home.js` noch nicht nachgewiesen.

### Befund B – Fehlende Raumfläche wird von der allgemeinen Berechnungsfunktion akzeptiert

Quelltextfehler

Datei: `src/assets/js/finder_calculation.js`, Zeilen 24–35

```
const area = Math.min(
  80,
  Math.max(1, finiteNumber(input.area_m2, 0))
);

if (!area) {
  return { valid: false /* ... */ };
}
```

Eine fehlende oder ungültige Fläche wird zunächst zu `0` und anschließend durch `Math.max(1, ...)` zu 1 m².

Die unmittelbar folgende Prüfung `if (!area)` kann damit für diesen Fall nicht mehr greifen.

Bei einem Aufruf von `calculate({})` ergibt sich aus dem Quelltext folglich eine gültige Berechnung für 1 m² statt einer Fehlermeldung.

Die Finder-Engine besitzt allerdings eine eigene, strengere Eingabevalidierung von 8–80 m² (`finder_engine.js`, Zeilen 104–109). Deshalb ist nicht belegt, dass dieser Fehler im normalen geführten Finder erreichbar ist. Er betrifft den allgemeinen Berechnungsvertrag und potenziell andere Aufrufer.

### Befund C – Nicht alle Finder-Ergebnisarten werden in der Statistik übernommen

Technische Inkonsistenz

Datei: `backend/lead-server.mjs`, Zeilen 46–59 und 295–305

```
const FINDER_RESULTS = new Set([
  'grau', 'mono', 'dual', 'msplit', 'split'
]);
```

Die Ergebnisadapter und die Runtime unterstützen zusätzlich `fixed_monoblock` und `route_required`:

`src/assets/js/finder_result_adapter.js`, Zeilen 9–19.

Das Backend setzt unbekannte Ergebniswerte bei der Validierung auf einen leeren String (`backend/lead-server.mjs`, Zeile 303).

Folge: Wenn der Client diese beiden Ergebnisarten als `finder_complete` überträgt, wird ihre konkrete Klassifizierung nicht gespeichert. Die Statistik kann dadurch unvollständig sein.

Ob der Client diese Ereignisse in der aktuellen Einbindung tatsächlich sendet, bleibt wegen des nicht lesbaren `home.js` offen.

## 3. Was die Architektur bereits richtig macht

Nicht alles muss überarbeitet werden. Die gelesenen Dateien zeigen mehrere sinnvolle Entscheidungen:

| Bereich                  | Belegter Stand                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Eingabevalidierung       | Kontext, Raumart, Fläche, Rechtsstatus und Prioritäten werden in `finder_engine.js:83–171` geprüft                                          |
| Technische Machbarkeit   | Fensterweg, Außenplatz und Wanddurchführung steuern die zulässigen Klassen in `finder_engine.js:306–350`                                    |
| Zustimmung               | Mietverhältnis und Stockwerkeigentum können eine technisch mögliche Klasse auf `conditional` herabstufen (`finder_engine.js:355–379`)       |
| Professionelle Planung   | Serverräume, erhöhte Kühllast und bestimmte gewerbliche Fälle lösen gesonderte Regeln aus (`finder_engine.js:243–279`)                      |
| Ergebnisverständlichkeit | `finder_experience.js:110–150` unterscheidet klare Orientierung, bedingte Empfehlung und Fachplanung                                        |
| Kaufübergabe             | Der Vertrag `P57C_PRODUCT_HANDOFF_CONTRACT.md` verlangt exakte Klassen- und Leistungsfilter und eine getrennte Darstellung von Alternativen |

Die Engine arbeitet mit einer deterministischen Klassenbewertung. Das ist nachvollziehbar und grundsätzlich gut wartbar.

Wichtige Grenze: Eine plausible Geräteklasse ist nicht automatisch ein tatsächlich verfügbares, preislich passendes Produkt. Der Produktkatalog konnte in dieser Prüfung nicht gelesen werden.

## 4. Beispielsituationen aus der Entscheidungslogik

Die Ergebnisse sind aus den gelesenen Regeln abgeleitet, nicht durch ausgeführte Tests bestätigt.

| Kundensituation                                             | Aus dem Code ableitbares Verhalten                                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 25 m², normales Schlafzimmer, keine Wärmezuschläge          | Rund 1,8 kW Orientierungsleistung; weitere Entscheidung abhängig von Wärmeweg und Priorität                          |
| 25 m², Dachgeschoss und starke Sonneneinstrahlung           | Rund 2,5 kW, weil zwei Faktoren von jeweils 1,20 angewendet werden (`finder_calculation.js:37–46`)                   |
| 80 m², Dachgeschoss, starke Sonne, Personen- und Gerätelast | Rund 8,4 kW; das Lastband `professional` löst einen harten Fachplanungsfall aus (`finder_engine.js:229–270`)         |
| Mietwohnung mit technisch möglicher fester Installation     | Die Klasse wird wegen des Mietstatus bedingt möglich, nicht uneingeschränkt freigegeben (`finder_engine.js:369–376`) |

Das sind nachvollziehbare Regeln, aber keine validierte Kühllastplanung. Der Entscheidungsvertrag `P57A_DECISION_CONTRACT.md`, Zeile 8, begrenzt den Anspruch ausdrücklich auf eine Orientierung auf Geräteklassenebene.

## 5. Kundenbedürfnisse – Beobachtung versus Annahme

Aus `src/templates/pages/index.html.j2:155–183` ist belegt, dass die Startseite vier prominente Einstiege anbietet: geführter Finder, Produkte, Bewilligung und Rechner. Zusätzlich existiert ein freier Vergleichsmodus.

Der geführte Ablauf ist im Template mit fünf Schritten angelegt (`index.html.j2:186–209`). In der Ergebnisdarstellung sind Gründe, offene Punkte und Hinweise vorgesehen, wann sich die Empfehlung ändern würde (`finder_experience.js:153–345`).

Daraus ergeben sich Fragen, aber noch keine gesicherten Kundenprobleme:

| Beobachtung im Code                                                         | Mögliche Kundenannahme                                                                 | Was fehlt?                            |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| Vier prominente Startmöglichkeiten                                          | Neue Besucher könnten Entscheidungsschwierigkeiten haben                               | Beobachtete Einstiegstests            |
| „Führ mich in 60 Sekunden“                                                  | Der Ablauf könnte für manche Nutzer länger dauern                                      | Gemessene Bearbeitungsdauer           |
| Kennzeichnung „Meist gewählt“ (`index.html.j2:161`)                         | Der Hinweis könnte Vertrauen schaffen                                                  | Tatsächliche Nutzungszahlen als Beleg |
| Priorität `schnell` wird zu `low_upfront` (`finder_shadow_bridge.js:54–59`) | Kunden könnten „schnell“ als Lieferbarkeit statt niedrige Anschaffungskosten verstehen | Verständnisinterviews                 |
| Feste Anlagen erhalten zusätzliche Machbarkeitshinweise                     | Nutzer könnten die Bedingungen als hilfreich oder als Hürde empfinden                  | Tests mit Mietern und Eigentümern     |

Besonders wichtig ist die Prioritätenlogik: `finder_engine.js:43–68` nutzt statische Klassenwerte für Lautstärke, Effizienz, Anschaffungskosten und Dauerhaftigkeit. Das ist kein Preisvergleich aktueller Händlerangebote.

Ein technisch korrektes Klassenranking kann deshalb einen Wunsch nach dem tatsächlich günstigsten oder schnellsten Produkt nur eingeschränkt erfüllen.

## 6. Die fünf wichtigsten Verbesserungen

Nutzen und Aufwand sind vorläufige Engineering-Einschätzungen, keine durch Implementierung oder Kundentests bestätigten Werte.

| Priorität | Verbesserung                                                                                                                                         | Nutzen                  | Aufwand      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------ |
| 1         | Status von bedingten Alternativen korrekt erhalten, insbesondere im `low_load`-Zweig                                                                 | Sehr hoch               | Klein        |
| 2         | Ungültige beziehungsweise fehlende Kühlleistungs-Eingaben sauber zurückweisen und Grenzen einheitlich behandeln                                      | Hoch                    | Klein–mittel |
| 3         | „Schnell und preisbewusst“ fachlich präzisieren: Klassenorientierung von realen Preisen, Lieferbarkeit und verfügbaren Katalogtreffern unterscheiden | Sehr hoch               | Mittel–hoch  |
| 4         | Einstieg auf zwei primäre Wege fokussieren: geführter Finder und Produkte; andere Funktionen sekundär zugänglich halten                              | Hoch, noch hypothetisch | Mittel       |
| 5         | Analytics-Ergebnisarten vervollständigen und Vertrauensformulierungen anhand der tatsächlichen Datenübertragung überprüfen                           | Mittel                  | Klein–mittel |

Die vierte Empfehlung ist keine willkürliche Neugestaltung: Die gelesene `docs/20_roadmap/MASTER_ROADMAP.md`, Abschnitt P6.0D, sieht bereits zwei Haupt-CTAs für Finder und Produkte vor. Der Kundennutzen dieser Vereinfachung muss trotzdem überprüft werden.

## 7. Noch ausstehende Nachweise

Für eine vollständige, abnahmefähige Bewertung fehlen derzeit vor allem die tatsächliche Fragenfolge und Event-Anbindung aus `home.js`, die Darstellung und mobilen CSS-Regeln aus `home.css` sowie die konkreten Produktdaten. Auch reale Smartphone-Interaktionen, Kundengespräche, Testergebnisse und der Produktionsstand wurden nicht verifiziert.

Die beiden gelesenen Testdateien `tests/test_p57a_decision_calibration.mjs` und `tests/test_p57b_result_clarity.mjs` enthalten unter anderem Szenarien für Prioritäten, Mietverhältnisse und professionelle Ergebnisse. Ihre Existenz ist belegt; ihre erfolgreiche Ausführung in dieser Prüfung nicht.

## 8. Erste klar abgegrenzte Umsetzungsaufgabe

Für einen späteren, ausdrücklich freizugebenden Schritt würde ich mit Befund A beginnen: Die `low_load`-Alternative soll ihren tatsächlichen Status aus `ranking.feasible` beziehungsweise `ranking.conditional` behalten. Die Änderung wäre auf die Ergebnisbildung und passende Regressionstests begrenzbar; Ranking, Produktdaten und Gestaltung müssten dafür nicht verändert werden.

Damit wäre ein konkret belegter Vertrauensfehler behoben, bevor weitere UX-Änderungen angegangen werden.

Gesamturteil: Die vorhandene main-Architektur ist keine grundsätzlich fehlerhafte Entscheidungslogik. Sie besitzt klare Trennungen zwischen Berechnung, Machbarkeit, Ranking, Ergebnisdarstellung und Kaufübergabe. Die nachgewiesenen Fehler sind gezielt korrigierbar. Die größeren offenen Fragen betreffen die tatsächliche Nutzerverständlichkeit und die Übereinstimmung zwischen Empfehlung und verfügbarem Produktangebot.

Arbeitsstatus: Ausschließlich SCHMAQQ Studio verwendet. Keine Quelldatei geändert, keine Installation, keine Tests oder Builds gestartet, kein Commit, Merge oder Deployment durchgeführt. P66-Aussagen wurden nicht in diese Bewertung übernommen.