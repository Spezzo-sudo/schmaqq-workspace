# SCHMAQQ Workspace — Produktvision
_Status: Architekturvorschlag R1, 17.10.2026. Langfristige Absicht, kein Funktionsnachweis. Eine Freigabe erfolgt durch Review/Merge._

## Nordstern

**SCHMAQQ Workspace ist ein universeller digitaler Arbeitsraum, in dem Menschen und KI-Agenten gemeinsam an nachvollziehbaren Ergebnissen arbeiten.** Er soll ohne KI bereits nützlich sein: Projekte, Aufgaben, Austausch, Wissen, Dokumente, Entscheidungen, Freigaben. Agenten erweitern die Handlungsfähigkeit; sie ersetzen weder Verantwortung noch Zugriffsregeln.

SCHMAQQ **Studio** ist der erste spezialisierte Arbeitsbereich für Software und digitale Services: Quellcode, Git, Tests, Vorschau, Review und Veröffentlichungsfreigaben. Studio ist **nicht** der Oberbegriff für die Plattform.

Langfristig können Benutzer eigene Rechner oder zugelassene Cloud-Ressourcen für freiwillig freigegebene Ausführung einsetzen. Noch später kann ein sicheres, vergütetes Compute-Netzwerk entstehen, in dem Ressourcen angeboten und gebucht werden. Das ist ein **Entwicklungsziel**, keine aktuell verfügbare Peer-to-Peer-Plattform.

## Für wen und welches Problem?

- **Zunächst:** Zwei Personen, die mit eigenen Identitäten von unterschiedlichen Standorten aus an echten Projekten arbeiten und dabei eigene KI- und Rechenressourcen kontrollieren.
- **Danach:** Kleine Teams, Dienstleister und KMU, die Planung, Arbeit, Feedback, Dokumente, Agenten und Ergebnisse nicht in unverbundenen Werkzeugen verlieren möchten.
- **Langfristig:** Unterschiedliche Teams und freiwillige Compute-Anbieter, verbunden durch transparente Auftrags-, Rechte- und Abrechnungsregeln.

Das Kernproblem ist nicht „zu wenig Chat“. Es fehlt ein **gemeinsamer, dauerhafter Arbeitskontext**, in dem Auftrag, Ausführung, Resultat, Prüfung und Entscheidung zusammenbleiben.

## Produktversprechen

1. **Arbeit zuerst:** Eine Aufgabe kann manuell, automatisiert oder gemeinsam bearbeitet werden; KI ist optional.
2. **Ein gemeinsamer Kontext:** Diskussionen, Anforderungen, Entscheidungen, Dateien, Artefakte, Versionen und Reviews sind dem jeweiligen Projekt/Auftrag zugeordnet.
3. **Austauschbare Ausführende:** Menschen, Agenten, lokale Modelle und berechtigte Runner arbeiten über explizite Rollen und klar definierte Aufträge; kein Anbieter-Lock-in.
4. **Kontrolle bleibt sichtbar:** Wer etwas ausführt, mit welchen Rechten, auf welchen Daten und Ressourcen und mit welchem Ergebnis, muss nachvollziehbar sein.
5. **Eigentum und Zustimmung:** Private Daten und Rechenleistung werden nicht stillschweigend geteilt. Jede zusätzliche Nutzung verlangt eine konkrete Erlaubnis.
6. **Einfacher Einstieg:** Zunächst ein nützliches Zwei-Personen-Produkt; anspruchsvollere Betriebsmodelle erst nach erwiesener Notwendigkeit.

## Nutzererlebnisse als Zielbilder

### Mensch ↔ Mensch (erste Abnahme)
Eine Person erstellt Projekt und Aufgabe, ergänzt Dateien und Kommentare; die andere stellt Rückfragen, bearbeitet oder prüft ein Ergebnis. Historie, Zuordnung und Freigabe bleiben erhalten — ohne KI-Zwang.

### Mensch ↔ Agent ↔ Mensch (erste Erweiterung)
Ein Benutzer formuliert ein Ergebnisziel; ein zugelassener Agent arbeitet mit abgegrenzten Rechten. Er liefert Artefakte und Belege; ein Mensch entscheidet über Annahme, Veröffentlichung oder nächsten Schritt. Ein Agent kann optional einen anderen Agenten zur unabhängigen Prüfung beauftragen, ohne dadurch mehr Rechte zu erhalten.

### Team ↔ lokale/private Ressourcen (weiterer Ausbau)
Ein Benutzer verbindet einen persönlichen Runner und erlaubt bestimmte Projekte, Modelle und Auftragsarten. Der Rechner kann offline gehen; dann wird die Ausführung nicht vorgetäuscht.

### Nutzer ↔ freiwilliges Compute-Angebot (späte Phase)
Ein Anbieter stellt eine eingegrenzte Ressource **opt-in** bereit. Ein Auftraggeber akzeptiert vorab Preis, Datenklassifikation und Sicherheitsbedingungen; die Plattform vermittelt nach Fähigkeiten, Grenzen und Verfügbarkeit. Vergütung folgt erst nach nachvollziehbarer, verifizierbarer Leistungsabrechnung. **Nie ungeprüften fremden Code auf privaten Geräten ausführen.**

## Produktstruktur und Begriffe

- **Workspace:** Identitäts- und Kollaborationskontext; künftig organisations-/teambezogen.
- **Projekt:** Ziele, Personen, Aufgaben und gemeinsame Artefakte.
- **Auftrag/Task:** Beschreibung, Zuständigkeit, Status, erlaubte Fähigkeiten, Belege und Abnahme.
- **Akteur:** Mensch oder Agent mit eigener Identität und begrenzten Rollen.
- **Ausführer/Runner:** Prozess/Gerät, das einen explizit zugelassenen Job tatsächlich ausführt. Kein Synonym für Agent.
- **Artefakt:** Datei, Vorschau, Code-Änderung, Dokument, Analyse oder prüfbares Resultat.
- **Studio:** Fachoberfläche für Entwicklungsprojekte; weitere Fachoberflächen können später folgen.
- **Compute-Angebot:** Separate, freiwillige Bereitstellung messbarer Ressourcen. Noch nicht Teil des MVP.

Ein Git-Repository ist **optional für einen Workspace**, aber essenziell für viele Studio-Projekte. Wir sollen keinen Git-Zwang in allgemeine Projektplanung oder Wissensarbeit einführen.

## Geschäftsmodell — offenhalten, nicht vorwegnehmen

Mögliche spätere Angebote: persönlicher kostenloser Einstieg, kostenpflichtige Team-/Administrationsfunktionen, verwaltete Ausführung, verbrauchsabhängige Compute-Nutzung, Vermittlungsgebühr für opt-in Compute und professionelle SCHMAQQ-Services. Das sind **Hypothesen**, keine Preise oder Umsatzprognosen.

Früh nötig sind saubere Kosten-/Verbrauchszuordnung, Budgetgrenzen, Abbruch, Identität und Auditierbarkeit. **Persönliche KI-Abos, Login-Cookies und bestehende Provider-Kontingente dürfen nicht ohne vertragliche Berechtigung gepoolt oder weiterverkauft werden.**

## Was wir bewusst nicht versprechen

- Kein aktueller Betrieb als öffentlicher, mandantenfähiger Dienst.
- Keine sofortige P2P-Compute-Börse, Blockchain, Tokenökonomie oder Garantie fremder Hardware.
- Keine automatische Ausführung oder Freigabe in Produktionsumgebungen.
- Keine garantierte Unterstützung sämtlicher KI-Provider, Betriebssysteme oder Modellformate.
- Keine Übernahme der Kundenidentität/Backends der SCHMAQQ-Hauptseite durch blosse Verlinkung.

## Erfolg statt Feature-Anzahl

**Erstes Erfolgskriterium:** Zwei reale Personen können in einem browserbasierten Workspace ein Projekt über Aufgaben, Diskussion, echte Ausführung, Artefakt und unabhängige Freigabe bis zum Abschluss führen, ohne Daten-, Rechte- oder Versionsverwechslung.

**Später:** Gleiches Arbeitsmodell funktioniert mit einem weiteren KI-Provider/Runner, für mehrere voneinander isolierte Teams und unter transparenter, überprüfbarer Ressourcennutzung.

## Verbindliche Querverweise

- Technisches Zielbild: [ARCHITECTURE.md](ARCHITECTURE.md)
- Priorisierte Nachweise: [ROADMAP.md](archive/ROADMAP.md)
- Bestehende Funktionen und offene Evidence: [STATUS.json](STATUS.json)
- Technische Übergabe: [HANDOFF.md](archive/HANDOFF.md)
- Integrationsgrenzen: [INTEGRATION_BOUNDARIES.md](archive/INTEGRATION_BOUNDARIES.md)
