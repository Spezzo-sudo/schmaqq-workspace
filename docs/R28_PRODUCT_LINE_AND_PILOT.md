# R28 – Produktlinie: zuerst Marcos eigener Entwicklungsalltag

_Status: **Review-Entwurf**, 25.10.2026, nach Owner-Korrektur aktualisiert. Kein Deployment, keine neuen Modellzugänge, kein Merge und keine Runtime-Änderung._

## Ein Satz, der die Richtung vorgibt

**SCHMAQQ Workspace ist ein dauerhafter gemeinsamer Arbeitsraum für Menschen. SCHMAQQ Studio ist die Entwicklungszentrale darin, die persönliche Coding-Agenten kontrolliert einsetzen kann.**

**Aktuelle Reihenfolge vom Owner:** Marco entwickelt und testet zunächst **allein** mit seinem bestehenden Studio-Konto, dem eigenen Lenovo und seinem persönlichen ChatGPT-/Codex-Zugang. Markus lebt in Thailand, ist nicht laufend erreichbar und wird **erst dann eingeladen, wenn die Bedienung für Marco alleine ausreichend funktioniert.** Sein Einstieg ist ein späterer eigenständiger Meilenstein und **kein Blocker** für R28-0.

Das Mehrbenutzer-Ziel bleibt architektonisch erhalten: separate Menschenidentitäten, persönliche Runner, getrennte Codex-Anmeldungen, begrenzte Freigaben, identifizierbare Autoren und versionsgebundene Reviews. Das heutige Solo-Ergebnis darf aber nicht als echtes Peer-Review oder als bestandene Zwei-Personen-Abnahme ausgegeben werden.

Diese Festlegung konkretisiert [PRODUCT_VISION.md](PRODUCT_VISION.md), [AGENTS.md](../AGENTS.md), [WORKSPACE_ROOMS.md](WORKSPACE_ROOMS.md) und [INTEGRATION_BOUNDARIES.md](INTEGRATION_BOUNDARIES.md).

## Verbindlich entschieden

| Entscheidung | Konsequenz |
| --- | --- |
| **Ein Projektraum als Ausgangspunkt** | Projektziel, Aufgabe, Unterhaltung, Wissen und Ergebnisse bleiben im selben Arbeitszusammenhang |
| **Studio als Entwicklungszentrale** | Dateien, Git, Codezustand, Tests, Vorschau, Auftragshistorie und Review |
| **Codex zuerst, persönliche Anmeldung** | Vorhandener Runner und ChatGPT-Abo; kein API- oder Fremdmodell-Zwang und kein Teilen von Konten |
| **Privater Rechner als Ausführungsgrenze** | Keine stillschweigende Agentenausführung auf dem produktiven SCHMAQQ-Server |
| **Projektgedächtnis statt Chat-Dump** | Vorhandenes `AGENTS.md`, ausgewähltes Projektwissen und bestätigte Entscheidungen gezielt heranziehen |
| **SCHMAQQ-eigene Oberfläche** | Design der bestehenden Marke; keine kopierte IDE oder kopiertes Discord |
| **Menschliche Kontrolle** | Agenten erzeugen Arbeit, Menschen prüfen; Git-Push, Merge und Deployment bleiben ausdrücklich getrennt |

**Nicht aktiv implementieren:** Neue Anbieter und Harnesses, Paperclip, OpenClaw, Hermes Agent, DeepSeek Harness, OpenCode, Claude/Kimi, ACP/AG-UI, autonome Daueragenten, Full-IDE, Live-Cursor, Yjs und Multi-Tenant-SaaS. Sie bleiben im [Ideenspeicher](R28_IDEAS_PARKING_LOT.md) und können bei einem späteren, konkret belegten Bedarf verglichen werden.

## Ausgangslage R27

- R27 wurde laut Betreiberbericht produktiv aktiviert; Release-Pointer, HTTPS-Asset und API-Authentifizierungsgrenzen wurden separat kontrolliert. Der alte Kandidatenstand in historischen R27-Statusabschnitten ist kein aktueller Produktionsbefund.
- Projektraum, Aufgaben/Kommentare, Wissen, Datei-Editor, persönliche Runner, Git-Arbeitskopien, Checks, Vorschau, abgeschlossener Git-Diff und ein Codex-Runnerpfad sind vorhanden.
- **Noch nicht durch echte Nutzung nachgewiesen:** Marcos Lenovo tatsächlich mit dem eigenen Projekt/Runner verbunden; seine persönliche Codex-Anmeldung in einem echten Studio-Job; durchgängige Bedienung mit Desktop und Handy.
- Bisherige isolierte Browserabnahmen verwendeten synthetische Konten und zum Teil synthetische Git-Ergebnisse. Sie belegen nicht Marcos persönlichen Workflow.
- Beim letzten Betreiberbericht war **ein reales Mitglied** registriert. Das ist für den Solo-Pilot ausreichend; Markus' Konto und Rechner sind aktuell bewusst **nicht erforderlich**.
- Historisches `H3_HISTORICAL_OWNER_MISMATCH`: **UNRESOLVED**, keine Änderung durch diesen Dokumentationsstand.

## Aktiver Meilenstein R28-0 – „Marco entwickelt allein im eigenen Studio“

**Genau ein bestehendes Projekt und eine kleine, ungefährliche Aufgabe.** Ziel ist ein praktisch wiederholbarer, belegter End-to-End-Durchlauf, nicht die nächste Funktionssammlung.

1. **Projekt öffnen:** Marco meldet sich unter `https://studio.schmaqq.com` mit dem bestehenden Owner-Konto an, wählt ein existierendes Projekt und formuliert eine klar prüfbare kleine Aufgabe. Kein Projektwechsel, keine Demo-Anhäufung und keine zweite Task-Verwaltung.
2. **Kontext begreifen:** Im Projektraum sind Ziel, relevante Design-/Projektregeln, aktuelle Aufgabe und nächster Schritt auffindbar. Fehlende Sichtbarkeit als tatsächlichen UX-Befund dokumentieren, nicht über Chat-Erklärungen kaschieren.
3. **Persönlichen Lenovo verbinden:** Vorhandenen Runnerstatus/Registrierung und lokale Projektfreigabe prüfen; bestehende Konfiguration respektieren. Falls der Rechner nicht erreichbar ist, einen verständlichen Setup-Schritt statt einer fingierten „online“-Anzeige anbieten.
4. **Codex persönlich aktivieren:** Auf **Marcos Lenovo** persönlichen `codex login status`, Projekt-`allowCodex` und verfügbare Abokapazität getrennt überprüfen. Kein API-Key-Zwang; Anmeldung und Modellkonto nicht auf den Studio-Server kopieren.
5. **Eine echte Änderung machen:** Studio erstellt/benutzt die eigene begrenzte Git-Arbeitskopie. Marco beauftragt Codex mit dem kleinen Task; reale Dateiänderung und Agentenereignisse bleiben an dieser Aufgabe. Kein direkter Schreibzugriff auf `main` oder Production.
6. **Prüfen und nachvollziehen:** Tatsächliche konfigurierte Tests und – falls vorhanden – Vorschau ausführen, einen Git-Prüfstand mit exaktem Commit und grün-rotem Diff erstellen, Ergebnisse **am gleichen Task** ansehen. Marco bewertet das Ergebnis als **Selbstprüfung**, nicht als unabhängige Fremdfreigabe.
7. **Handy & Wiederaufnahme:** Projekt nach Neuladen und später auf dem Samsung öffnen; Aufgabe, letzte Ausführung, reale Änderungen, Testergebnis, Git-Stand und nächster Schritt müssen nachvollziehbar bleiben. Fehler/Abbruch/Quota-/Offline-Status korrekt zeigen.
8. **Genau die wichtigste Hürde beheben:** Den ersten belegten Bedienfehler oder fehlenden Projektüberblick als **eigenen kleinen R28-Fix** mit Tests und Browsernachweis beheben. Kein allgemeines Redesign auf Verdacht.

**Abnahme R28-0:** Ein echter Mensch (Marco), ein eigener freigegebener Runner, ein tatsächlich gestarteter persönlicher Codex-Auftrag, eine nachweisbare Git-Änderung samt Tests/Prüfstand und eine erfolgreiche Wiederaufnahme am Handy. Kann ein Schritt noch nicht ausgeführt werden, bleibt der Zustand **PARTIAL/BLOCKED mit konkretem Grund**, nicht künstlich PASS.

Ein Mensch kann sein eigenes Ergebnis technisch prüfen; unabhängiger Peer-Review wird ausdrücklich **nicht** behauptet. Eine spätere Freigabe durch Markus bleibt getrennt.

## Danach, aber ohne auf Markus warten zu müssen

**R28-1 – Projektzentrale nur nach realer UX-Evidenz.** Die minimal tatsächlich fehlenden Überblicksfunktionen ergänzen: Projektziel, aktueller Task, Zustände „Person im Raum“ / „Runner erreichbar“ / „Agent arbeitet“, letzte bestätigte Änderung, Checks, Diff und nächster Schritt. Keine Komplett-IDE. Präsenz nicht aus Runner-Heartbeats ableiten.

**R28-2 – selektives Projektgedächtnis.** `AGENTS.md` als bestehende Coding-Regelquelle, eine kurze Projektübersicht, bestätigte Entscheidungen mit Quellen und den relevanten Task-/Dateiausschnitt zusammenführen. Keine doppelten `CLAUDE.md`-/`AGENTS.md`-Regelsammlungen, kein Auslesen privater ChatGPT-Chats, keine automatische dauerhafte Speicherung ungeprüfter Agentenaussagen. Kontext sichtbar und begrenzt, ohne garantierte Token-Ersparnis zu behaupten.

**Später R28-Team – Markus' Einstieg nach Marcos Entscheidung.** Markus registriert sich mit eigenem Konto und verbindet seinen eigenen Runner/Codex. Beide arbeiten mit getrennten Kopien, gleichen geteilten Projektzielen und echter gegenseitiger Prüfung. Der bereits existierende Berechtigungs- und Zweipersonen-Testpfad darf bis dahin nicht vereinfacht oder kaputtoptimiert werden. Erst dieser spätere Test belegt die Zusammenarbeit zwischen zwei echten Menschen.

## Explizite technische und organisatorische Grenzen

- Solo-Milestone benötigt weder Markus noch eine zweite persönliche Codex-Subscription.
- Kein vorgetäuschtes Live-Editing, kein öffentliches Terminal auf dem VPS, kein anderer fremder Runner, keine automatisch gestarteten Daueragenten.
- Kein „Tests grün“, wenn seitdem Dateien geändert wurden; keine Freigabe ohne vollständigen Diff und exakte Revision.
- Keine Preis-/Tokenversprechen: Persönliche ChatGPT-/Codex-Nutzung hat die jeweiligen Limits.
- Keine unbeaufsichtigten Änderungen an Production, bestehenden GitHub-PRs, Nutzerpasswörtern oder Runnerprofilen.
- Quelle und Rückverfolgung der tatsächlichen Ausführung statt Erfolg durch synthetische Fixtures behaupten.
- Aktuell ein privates Team; spätere Mandantenisolation oder vertragsübergreifende Abonutzung nicht voraussetzen.

## Ein einzelner aktiver Arbeitsauftrag

**R28-0: Marcos erster realer Codex- und Git-Durchlauf im bestehenden SCHMAQQ Studio – bis zur nachvollziehbaren Selbstprüfung auf Desktop und Smartphone.**

Die Umsetzung bekommt **nur dann** eine neue Codeänderung, wenn der Solo-Durchlauf eine reproduzierbare Lücke zeigt. Fehlende Agenten- oder Produktfunktionen werden als bewusste Befunde erfasst und nach Nutzen priorisiert, nicht ungeprüft zusammengebaut.

Fortsetzung: [ROADMAP.md](ROADMAP.md) · [STATUS.json](STATUS.json) · [HANDOFF.md](HANDOFF.md) · [Ideenspeicher](R28_IDEAS_PARKING_LOT.md).

_Dieses Dokument hält die Owner-Reihenfolge dauerhaft fest, autorisiert aber keinen Deployment-, Account-, Git-Merge- oder Provider-Schritt._
