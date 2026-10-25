# R28 – Ideenspeicher: Nicht verloren, aber bewusst nicht gleichzeitig bauen

_Status: Sammlung der bisherigen SCHMAQQ-Produktdiskussion, 25.10.2026; keine Auswahl-, Beschaffungs- oder Implementierungsfreigabe._

## Verwendung

Die Ideen bleiben hier referenzierbar. Erst wenn der reale Zwei-Personen-Pilot eine konkrete Lücke belegt, wird **eine** Option gegen den bestehenden SCHMAQQ-Code geprüft.

**Entscheidungsfilter (immer in dieser Reihenfolge):**
1. Welche echte Benutzerhürde löst die Option für Marco und Markus?
2. Ist die Funktion nicht bereits in R27 vorhanden oder mit wenig Code erreichbar?
3. Welche neuen Konten, Datenrechte, Risiken, Ressourcen und laufenden Kosten entstehen?
4. Können wir sie austauschbar und isoliert testen, ohne das Projekt-/Aufgabenmodell zu ersetzen?
5. Ist ein tatsächlicher Zwei-Personen-Browsertest mit Git- und Fehlernachweis möglich?

Namen, Lizenzmodelle, APIs und Versionsstände aus der Ideenphase sind **keine unabhängig geprüfte Integrationszusage**. Vor produktiver Nutzung aktuelle Upstream-Dokumentation, Lizenz, Authentifizierung, Stabilität und Security separat prüfen.

## Behalten – als mögliche Produktfunktionen

| Idee | Möglicher Nutzen für SCHMAQQ | Frühestens / klare Grenze |
| --- | --- | --- |
| **Discord-artige Projekträume** | Menschen sehen gemeinsame Projekte, sprechen direkt und können Agenten gezielt einbeziehen | R28-1 nur nach realem Pilot. Kein Discord-Nachbau, keine unendliche Channel-Hierarchie |
| **Präsenz und Aktivitätsstream** | Person im Raum, erreichbarer Rechner und laufender Agent werden sauber getrennt | R28-1, keine erfundenen Online-Zustände aus Gerätedaten |
| **Projekt-Explorer / Entwicklungszentrale** | Dateien, Aufgaben, Codezustand, Tests, Vorschau und Git-Review in einer Ansicht | R28-1 inkrementell; bestehender Editor und Git-Pfad bleiben |
| **Dauerhaftes Projektgedächtnis** | Ziele, `AGENTS.md`, Entscheidungen und relevante Quellen pro Projekt statt vollen Chatverläufen | R28-2, bestätigte Quellen, begrenzter Kontext, private Inhalte ausgeschlossen |
| **@Codex im Raum** | Mensch beauftragt einen Agenten direkt aus einer Aufgabe und sieht nachvollziehbare Ergebnisse | Erst nach echtem persönlichem Codex-End-to-End-Pilot |
| **Agenten-Sitzungsverlauf** | Aktionen, Toolaufrufe, Approvals, Stop/Resume, Fehler und Artefakte nachvollziehen | Vorhandenen Codex-Runner vertiefen, ohne freies Webterminal |
| **Mehrere Coding-Agenten** | Anbieterunabhängigkeit und passende Modelle je Aufgabe | Später: erst zwei unabhängig geprüfte Adapter, kein paralleler Big-Bang |
| **Gleichzeitige Dateibearbeitung (z. B. Yjs)** | Echte Mehrpersonen-Cursor und Konfliktbehandlung | Nur bei belegtem Bedarf; R27-Git-Diff ist kein Live-Editing |
| **Wiederkehrende Aufgaben / Heartbeats** | Agenten nehmen freigegebene Arbeit bei Ereignissen auf | Erst mit Rechten, Kostenkontrolle und manuellem Abbruch; kein unbeaufsichtigter Root-Betrieb |

## Technische Referenzen – anschauen, nicht zusammen installieren

| Vorbild / Ansatz | Was wir daraus lernen könnten | Was wir jetzt ausdrücklich nicht tun |
| --- | --- | --- |
| **OpenAI Codex CLI / App Server** | Vorhandene Codex-Integration ausbauen, strukturierte Ausführung und Sitzungen | Kein zweiter ungeprüfter Codex-Stack neben dem Runner |
| **DeepSeek Harness** | Austauschbare Agenten-/Tool-Komponenten, Pluginstruktur | Kein Harness-Kernwechsel ohne isolierten Anbieter-/Sicherheitstest |
| **OpenCode** | Ein möglicher Multi-Provider-Agenten-Server und API-Schnittstelle | Kein zweiter paralleler Task-/Session-Manager |
| **Claude Code / Claude Agent SDK** | Alternative Coding-Agentenlaufzeit | Keine Anbieterregistrierung oder zusätzlichen Modellkosten im ersten Pilot |
| **Kimi Code CLI** | Weitere Agentenoption, potenziell ACP | Keine Unterstützung auf Verdacht; Version und Protokoll vorab prüfen |
| **Pi Agent / OpenHands** | Schlanke bzw. umfassendere Agenten-Runtime-Architekturen | Keine zusätzliche IDE-/Cloud-Infrastruktur vor belegtem Bedarf |
| **Paperclip** | Agenten-Orchestrierung, Auftragszusammenhang, Freigaben und Kostenbeobachtung | Kein virtuelles Firmenorganigramm, keine doppelte Aufgabenverwaltung |
| **OpenClaw** | Dauerhafte Agenten-Workspace-/Session-Konzepte und Kommunikationskanäle | Keine allmächtigen, unkontrollierten persönlichen Agenten im Team |
| **Hermes Agent** | Skills, Wiederaufnahme und persistenter Arbeitskontext | Nicht mit dem internen Deploy-Operator „Hermes“ verwechseln; keine zusätzliche Agentenplattform installieren |
| **ACP / AG-UI / MCP** | Austauschbare Integrationsprotokolle und sichtbare Agentenereignisse | Keine Protokollvielfalt ohne klaren, getesteten Vertrag |
| **Monaco, code-server, VS Code** | Bessere Text-/Code-Navigation und Editor-Ergonomie | Kein kompletter IDE-Klon als neue SCHMAQQ-Startseite |
| **GitHub App / Webhooks / CI** | Belegbare Git-Übergänge, Ereignisse, stabile Pull Requests | Keine weitreichenden Repo-Rechte oder zweite CI ohne getrennte Abnahme |

## Leitplanken gegen Funktionsvermischung

**Workspace-Server:** Identitäten, Räume, Aufgaben, bestätigtes Wissen, Freigaben, neutrale Agenten-/Job-Metadaten.

**Privater Runner:** Ausführung, Git-Arbeitskopie, lokale Codex-Anmeldung, freigegebene Werkzeugrechte, keine blind akzeptierten Fremdaufträge.

**Git:** Code, Branches, Commits; GitHub bei autorisierter Veröffentlichung und PR. `Tests bestanden` bezieht sich nur auf den exakt geprüften Stand.

**Projektwissen:** Nutzerbestätigte Ziele/Entscheidungen und referenzierte Dateien. Keine automatische dauerhafte Übernahme ungeprüfter Agentenaussagen oder privater Provider-Chats.

**Menschen:** Letzte Verantwortung für sensible Rechte, öffentliche Veröffentlichung, Merge und Live-Deployment.

## Wiederaufnahme

Für jede neue Idee wird zuerst [R28_PRODUCT_LINE_AND_PILOT.md](R28_PRODUCT_LINE_AND_PILOT.md) gelesen. Falls sie den ersten echten Pilot nicht messbar voranbringt, bleibt sie hier geparkt – nicht vergessen, nur später.
