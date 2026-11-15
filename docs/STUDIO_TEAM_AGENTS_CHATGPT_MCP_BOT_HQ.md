# SCHMAQQ Studio – gemeinsamer Projektraum mit KI-Agenten und ChatGPT-MCP

**Status:** Produkt- und Architekturzielbild zur Review; noch kein freigegebener Implementierungsauftrag.
**Erstellt:** 15.11.2026.
**Ausgangspunkt:** Gemeinsame Anforderungen aus der Diskussion zu Bot HQ und SCHMAQQ Studio. Die bisherigen Entscheidungen und der nachgewiesene Iststand bleiben in docs/PLAN.md, docs/PRODUCT_VISION.md und docs/STATUS.json massgeblich.
**Keine Produktionsänderung:** Dieses Dokument ist eine vorgeschlagene Ergänzung zur gemeinsamen Planung; es ersetzt weder bestehende Architekturentscheidungen noch berechtigt es zum automatischen Merge oder Deployment.

## 1. Nordstern und Priorität

**Vorrangiges Ziel:** Zwei reale Menschen – zunächst Marco und Markus – arbeiten ohne Medienbrüche zusammen an echten Projekten. Dazu können sie sich projektgebundene KI-Agenten als weitere Teammitglieder holen und ebenso aus dem normalen ChatGPT-Chat über MCP produktiv mitarbeiten. Die Zusammenarbeit muss auf dem Handy bedienbar sein.

Studio soll nicht einfach ein Agenten-Chat sein. Der **dauerhafte gemeinsame Projekt- und Auftragskontext** steht im Mittelpunkt: Gespräche, Aufgaben, Dateien, Entscheidungen, KI-Ausführung, Prüfstand, Freigabe und Abschluss hängen nachvollziehbar zusammen.

Die technische Basis wird **von Anfang an erweiterbar** für persönliche Rechner, gemeinsame VPS-Werkstätten und später zugelassene Cloud-Worker gebaut. Es wird **nicht** vorzeitig eine Multi-Cloud-, Microservice- oder öffentliche Compute-Plattform errichtet.

Wichtige Begriffsgrenze: **SCHMAQQ Workspace** ist der langfristig allgemeine Arbeitsraum; **SCHMAQQ Studio** sein erster spezialisierter Fachbereich für Softwareentwicklung. Ein Workspace-Projekt braucht nicht zwingend ein Git-Repository. Für Studio-Codeprojekte gilt weiter: **GitHub = Code; Studio = Arbeits- und Entscheidungsraum; Werkstatt = Ausführung.**

### Nicht verhandelbare Nutzeranforderungen

- Marco und Markus können im gleichen Projekt sprechen, Aufgaben teilen, unterschiedliche Arbeitsstände ansehen und einander prüfen – auch vom Handy.
- Jeder kann mit den **eigenen projektbezogenen Rechten** selbständig arbeiten; kein zentraler Super-Admin muss jedes Detail absegnen.
- Benutzer können im Projekt **benannte Agenten erzeugen („spawnen“)**, Modell und Rolle wählen, ihnen Aufgaben geben und mit ihnen sprechen.
- Ein koordinierender Projekt-Agent („Chef“/Koordinator) darf **innerhalb vorher gewährter Rechte** selbst weitere Agenten für einen Auftrag anlegen bzw. beauftragen.
- Agenten können **gezielt miteinander kommunizieren**, Aufgaben übergeben und Resultate prüfen; kein unkontrolliertes Endlosgespräch.
- Derselbe Projektkontext ist sowohl in Studio als auch über die **normale ChatGPT-Unterhaltung, ausdrücklich nicht nur ChatGPT Work**, per sicherer MCP-Verbindung nutzbar.
- Die eigenen KI-Zugänge, Kontingente und Daten bleiben voneinander getrennt. Gemeinsame Projektarbeit ist nicht gleichbedeutend mit dem Pooling persönlicher Abos.
- Jede Aktion hat einen menschlich verantwortlichen Auftraggeber, einen eindeutigen Projektbezug und überprüfbare Ergebnisse.

## 2. Gewünschtes Nutzungserlebnis (Klimafinder als erster Pilot)

### 2.1 Zwei Menschen, ein Projekt

Marco öffnet das Studio-Projekt Klimafinder, sieht Markus' letzte Arbeit und kann direkt im Gespräch Rückfragen stellen. Markus kann eine eigene Arbeitskopie bearbeiten, Tests starten und einen fassungsgebundenen Prüfstand liefern. Marco schaut sich genau diese Fassung an, kommentiert und fordert gegebenenfalls Änderungen an. Nach der Projektregel wird freigegeben und separat zusammengeführt. Die produktive Veröffentlichung bleibt ein eigener Vorgang.

**Auch ohne einen einzigen Agenten muss der Ablauf vollständig funktionieren.**

### 2.2 Agenten im Projektraum

Ein berechtigtes Mitglied wählt „Agent hinzufügen“. Angezeigt werden Name, Rolle/Zweck, auswählbares tatsächlich verfügbares Modell, zulässiger Kontozugang, Projekt-/Repository-Scope, Ausführungsort, Fähigkeiten, Budget und Status.

Beispiel: „Frontend-Entwickler“, „Prüfer“, „Recherche“ oder „Koordinator“. Eine Agentenidentität kann dauerhaft sichtbar bleiben, ohne dass fortlaufend Tokens verbraucht werden. Der konkrete **Lauf** eines Agenten ist hingegen endlich, protokolliert und budgetiert.

Die Agenten stehen im selben Projektraum wie die Menschen. Nachrichten können alle, einzelne Personen oder gezielt per Erwähnung einen Agenten adressieren. Es darf nicht jede Chatnachricht automatisch alle Agenten aktivieren.

### 2.3 Koordinator beauftragt weitere Agenten

Beispielanfrage: „Chef, erstell einen Entwickler für die Finder-Oberfläche und lass einen Prüfer das Resultat anschauen. Nichts zusammenführen und nichts live schalten.“

Erwartetes Verhalten:
1. Der Koordinator prüft die Projektberechtigung, den erteilten Auftrag sowie Modell-/Budget-/Agentengrenzen.
2. Er nutzt vorhandene passende Agenten oder erzeugt abgegrenzte Agenteninstanzen; eine zusätzliche kostenpflichtige Ausführung unter fremdem Konto wird nicht stillschweigend ausgelöst.
3. Der Entwickler arbeitet auf einem getrennten Branch/Worktree und meldet Artefakte, Tests und Vorschau.
4. Der Prüfer bekommt einen knappen, überprüfbaren Auftrag und den exakten Ergebnisstand; er darf bei Bedarf eine Korrektur anfordern.
5. Alle Übergaben sind im Projekt sichtbar; die verantwortliche Person kann unterbrechen oder entscheiden.
6. Weder Koordinator noch Entwickler dürfen ihren eigenen Rechtescope ausweiten.

### 2.4 Normales ChatGPT als gleichberechtigter Arbeitszugang

Aus einem gewöhnlichen ChatGPT-Chat, der ausdrücklich mit Klimafinder verbunden wurde, soll ein berechtigter Benutzer:
- relevanten Projekt- und Aufgabenstand abfragen;
- neue Nachrichten, Rückfragen, Notizen, Aufgaben und Ergebnisse **in Studio** hinterlegen;
- relevante Änderungen seit dem letzten Abruf abfragen;
- einen begrenzten Arbeitsauftrag starten und dessen Status verfolgen;
- eine Projekt-Agenten-Ausführung beauftragen, soweit die persönlichen Rechte reichen;
- eine Vorschau bzw. einen unveränderlichen Prüfstand erhalten und Rückmeldungen zuordnen.

Beispiel: „Prüfe die letzte Finder-Änderung von Markus, schreibe deine Befunde in die Aufgabe und lass mich die Vorschau öffnen.“ Das Ergebnis muss auch für Markus in Studio sichtbar sein.

**Wichtige Grenze:** Eine ChatGPT-Projektbezeichnung ist kein sicherer technischer Projektbeleg. Solange ChatGPT die tatsächliche Projektidentität nicht verifiziert an MCP übergibt, wird die Studio-Projektverknüpfung ausdrücklich eingerichtet und bei jedem Schreibaufruf mit Projekt-ID geprüft. Kein globaler „aktiver Projektraum“, keine alleinige Zuordnung anhand gleicher Namen.

ChatGPT-MCP ist ein Aufrufweg, kein autonomer Hintergrundempfänger für sämtliche Projektereignisse. Ein späterer ereignisbasierter Agentendienst in Studio bleibt eine eigene Funktion.

## 3. Architekturprinzip: eine führende Projektwelt

**Studio besitzt die kanonischen Projekte, Aufgaben, Mitgliedschaften, Freigaben, Nachrichten, Entscheidungen, Ausführungsreferenzen und Artefaktverweise.** Keine zweite „Bot-HQ-Aufgabenwelt“, keine zweite parallele Review-Wahrheit.

Vier voneinander getrennte Identitäten:
1. **Mensch/Akteur:** Wer darf etwas beauftragen, entscheiden und sehen?
2. **Agent:** Welche Identität, Rolle, Fähigkeit und delegierten Grenzen hat das ausführende KI-Teammitglied?
3. **Modell-/Kontozugang:** Wem gehören Authentifizierung, Abo/API-Budget und Nutzungsgrenzen?
4. **Ausführer/Worker:** Welcher konkrete lokale oder entfernte Prozess erledigt den Job?

Ein **Job** verweist mindestens auf Projekt, Aufgabe, beauftragenden Menschen, optionalen Agenten, spezifischen Modellzugang, Runner, erlaubte Fähigkeiten, Lauf-ID, Kosten-/Zeitgrenzen und Idempotenzschlüssel. Das **Artefakt** verweist auf Herkunft, Version/Commit/Hash, Tests und den zu prüfenden Stand.

Agenten-Chat und externe ChatGPT-Nachrichten erzeugen **dieselben** Studio-Ereignisse wie Aktionen in der Studio-Oberfläche; alle laufen durch dieselben serverseitigen Berechtigungsregeln.

### Systemgrenzen

- **Control Plane (Studio):** Benutzer, Projekte, Rollen, Aufgaben, Konversation, Wissen, Zustandsmaschine, Freigaben, Agentendefinitionen, Budgets, Audit.
- **Execution Plane:** austauschbare Adapter für Hermes, Codex, Claude Code, API-Modelle und definierte Code-/Browser-/Shell-Worker.
- **Data Plane:** versionierte Dokumente, Nachrichten, Entscheidungen, Auftragsübergaben, Arbeitskopien, Prüfergebnisse und Artefakte.
- **Integrationsgrenze:** ChatGPT-MCP, weitere MCP-Clients und ggf. Browseransicht; keine direkten Umgehungen der Control Plane.

Für den Zwei-Personen-Piloten genügt ein **modularer Monolith** mit klaren Verträgen plus abgegrenzten Runnern. Keine Pflicht zu Orgo, Kubernetes, einer festen Gateway-Zahl oder einer neuen Datenbank.

## 4. Bot HQ als technische Referenz – bewusst selektive Übernahme

**Referenzprojekt:** https://github.com/nickvasilescu/bot-hq (MIT-lizenzierter Originalcode mit ausdrücklich ausgeschlossenen Drittanbieter-Grafiken/Logos).
**Architektur:** https://github.com/nickvasilescu/bot-hq/blob/main/docs/ARCHITECTURE.md
**Einschränkungen:** https://github.com/nickvasilescu/bot-hq#status-and-limits

Bot HQ baut eine agentenzentrierte Oberfläche: Hermes übernimmt Agentenloop, Modell, Kontext/Memory und Werkzeuge; ein Node/Hono/SQLite-Backend ergänzt Chat, Events, Freigaben und Agentenverwaltung. Der Server spricht Hermes über /v1/responses an und stellt eigene MCP-Werkzeuge unter /mcp/<bot> bereit. Orgo liefert einen gemeinsam genutzten Rechner mit mehreren Bildschirmen. Zusätzliche Bots erhalten eigene Hermes-Homes/Gateways; Bot-zu-Bot-Kommunikation läuft unter anderem über send_to_bot.

**Wiederverwendungskandidaten (Code vor Nachbau prüfen):**
- **Fortschritt/Live-Arbeit:** eingeklappte Arbeitsschritte, Tool-Ereignisse, „arbeitet / wartet auf dich“, Dauer, Abbruch, Ergebnis. Früh im Studio-Auftragskontext portieren.
- **Streaming und Ereignisrevisionen:** stabile Reihenfolge, Sequenz-/Revisions-Upserts, Reconnect ohne doppelte Chatzeilen.
- **Agentenidentität und Einstellungen:** Rolle, Modell, Fähigkeiten, Persönliches Gedächtnis – jedoch neu am Studio-Projekt verankern.
- **Agent-zu-Agent-Übergaben und Gruppengespräch:** Zielbild übernehmen; Studio-Auftragszuordnung und Limits davor schalten.
- **Freigabekarten/Fragen:** gute UX wiederverwenden; Entscheidungen **nicht** durch Bot HQs eigene Policy-Datenbank autorisieren.
- **Hermes-Adapter:** als mögliche Engine nutzen, nicht als vorgeschriebene Instanz für jeden Bot.
- **Desktop/Viewer/Übernahme:** optionale Fähigkeit für browserorientierte Agenten. Für Code, Tests und Analyse ist kein voller Bildschirm nötig.
- **App-Integrationen/Voice/Routinen:** bei nachgewiesenem Nutzen später und mit eigenen Sicherheitsgrenzen.

**Nicht unbesehen übernehmen:**
- Bot-HQ-eigene Benutzer-, Aufgaben-, Routinen-, Approval- und Bibliothekswahrheit neben der von Studio.
- Freigaben nur für Composio-Schreibwerkzeuge: Browser/Shell und Hermes-Risikoabfragen haben dokumentierte Lücken.
- Geteilten Orgo-Rechner mit gegenseitig erreichbaren Dateibereichen als echte Mandantenisolation betrachten.
- Kopieren von Auth-Dateien/API-Keys von einem primären Agenten in neue Agents.
- Ein vier-Bot-Limit oder volle Desktops als Architekturvoraussetzung.
- Fremde Marken-/Artwork-Assets unter der Annahme, sie seien durch MIT gedeckt.
- Namens- und Herkunftsreste („Grokbot“) sowie Sicherheitsannahmen aus einem experimentellen Projekt.

**Sicherheitsgate vor Wiederverwendung:** Quellcode prüfen, HTML-/URL-Einbettung, Auth/OAuth, MCP-Werkzeugpolitik, Secrets, VNC-/Browser-Control, Shell, Stop/Retry, Tests, Drittanbieterhinweise. Kein unüberprüfter Import des kompletten Produkts.

## 5. Rechte und Freigaben – Freiheit ohne Super-Master

**Berechtigung ist zwingend. Zusätzliche Freigabe ist projektabhängig.**

Jeder Zugriff wird mit der **persönlichen Studio-Identität** des Menschen plus Projektmitgliedschaft und konkreter Ressource geprüft. Agenten erben nicht sämtliche Rechte des Users, sondern erhalten einen ausdrücklichen, engeren Delegationsrahmen. Der MCP-Client hat keine Plattform-Root-Identität und keine versteckten globalen GitHub-Rechte.

### 5.1 Projektrollen

Als Ausgangspunkt vorhandene Rollen verwenden: Admin, Entwickler, Prüfer, Betrachter. Nach späterer Mandantentrennung einen **Plattformbetreiber** gesondert vom **Projektadmin** führen. Plattformbetreiber sind nicht automatisch fachliche Prüfer aller Kundenprojekte.

**Ziel für neue Projekte:** nur explizit Berechtigte; keine automatische Entwickler-/Prüferrolle für sämtliche Studio-Mitglieder. Der jetzige Default wird bewusst migriert und getestet, nicht stillschweigend umgedeutet.

### 5.2 Beispiel-Aktionsmatrix

| Aktion | Mindestberechtigung | Zusätzliche Freigabe |
| --- | --- | --- |
| Projekt/Aufgabe lesen | Projektbezogenes Lesen | Nein |
| Projektgespräch, Kommentar, Aufgabe | Entsprechende Schreib-/Mitgliedsrolle | Normalerweise nein |
| Agent anlegen/beauftragen | Projekt-Recht + delegierter Modell-/Budgetumfang | Nur bei Scope-/Budgeterweiterung |
| Code in einer **eigenen** Arbeitskopie bearbeiten | Projektentwickler + Repository-/Runner-Scope | Normalerweise nein |
| Tests, Vorschau, lokalen Prüfstand erstellen | Entwickler + freigegebene Werkzeuge | Normalerweise nein |
| PR erstellen | Entwickler + GitHub-Repo-Recht | Nach Projektregel |
| Reviewentscheidung | Prüferrecht + freigegebener unveränderlicher Stand | Prüfer ist selbst entscheidungsberechtigt |
| Zusammenführen | Merge-Recht und bestandene Projekt-/GitHub-Prüfregel | Wählbar, standardmässig zweite Person |
| Live-Deployment | Explizites Release-Recht + autorisierter Zielstand | Eigenständige ausdrückliche Freigabe; kein Nebeneffekt eines PR-Merges |
| Mitglieder/Rechte/Sicherheitsregeln ändern | Projektadministration | Niemals per impliziter Agentendelegation |

Konfigurierbare Projektreview-Regel: zunächst **zweite Person**; vorhandene Option **Admin darf alleine prüfen** bewusst nutzbar, wenn Projektinhaber sie einstellt; weitere Regeln erst nach einem konkreten Bedarf. **Nicht** jede Dateiänderung erfordert eine Adminfreigabe.

Der heutige produktive Studio-Liveprozess verlangt eine explizite Owner-Zustimmung („Ja, live“). Diese Regel bleibt für bestehende SCHMAQQ-Produktion bis zu einem **separat beschlossenen** Release-Rollenmodell gültig. Keine pauschale Abschaffung der Livefreigabe durch dieses Dokument.

### 5.3 MCP-Grenzen

Ein Studio-MCP-Grant soll mindestens auf **Person + Verbindung + Projekt(e) + erlaubte Operationen + optional Repository/Branch/Pfad + Laufzeit** begrenzt sein. „Lesen“, „Projektmitarbeit“, „Code in eigener Arbeitskopie“, „PR erstellen“, „Review“ und „Release“ sind getrennte Fähigkeiten; besonders kritische Rechte sind nicht automatisch als MCP-Werkzeuge verfügbar.

Das GitHub-App-Installationstoken darf nur für das im konkreten Projekt zugelassene Repository und den berechtigten Vorgang verwendet werden. UI-Häkchen allein sind keine Sicherheitsgrenze. Backend, Runner und GitHub müssen dieselben Grenzen durchsetzen. **Ein Browser-/Shell-Agent darf diese Grenzen nicht durch vorhandene Anmeldesitzungen umgehen.**

## 6. ChatGPT-MCP – Ausbau der bestehenden Anbindung

### 6.1 Bestand, nicht verwechseln mit Ziel

Die aktuelle Anbindung stellt bereits u. a. list_projects, project_context, list_tasks, list_executors, list_workspaces, start_code_job, get_code_job und cancel_code_job bereit. Der gegenwärtige Write-Scope ist auf bestimmte Operationen eigener Runner/Arbeitskopien begrenzt; direkter GitHub-Push und Deployment sind darin nicht enthalten. OAuth-Scopes unterscheiden heute u. a. studio:read und studio:code.

**Fehlend für das beschriebene Nutzererlebnis:** direkte Projektkommunikation, sichere Aufgabenanlage/-zuweisung und Ergebnisablage, Ereignisse seit Revision, Agentenverwaltung, Rollen-/Grant-UI und nachvollziehbarer Review aus dem normalen Chat. Diese Funktionen sind **Ziel**, nicht bereits geliefert.

Die bisher aufgetretene Erzeugung vieler identischer Aufgaben durch den ChatGPT-Connector ist vor einem Ausbau ursächlich zu untersuchen.

### 6.2 Gewünschte MCP-Funktionen (Namen als Vertragsvorschläge)

- **project_summary / project_changes:** kurzer verifizierter Kontext; Änderungen seit letzter Revision mit stabilen IDs, optional konkreter Aufgabe.
- **list_tasks / task_context:** bestehende Aufgaben nach Scope finden, Kriterien, Status, relevante Artefakte und offene Entscheidungen.
- **post_project_message / post_task_comment:** im richtigen Projektraum schreiben, mit Herkunft „ChatGPT / Benutzer / Verbindung“ und stabiler Nachricht-ID.
- **create_or_update_task:** mit idempotenter Anfrage-ID, Projektmitgliedschaft und explizitem Auftragstyp; kein automatisches Anlegen bei jedem Abruf.
- **record_result:** versioniertes Dokument, Fundstelle, Diff/Prüfbeleg oder Statusmeldung in der konkreten Aufgabe ablegen.
- **list_agents / create_agent / assign_agent_task:** innerhalb explizit gewährter Projekt-, Modell-, Zeit- und Kostenrechte.
- **start_job / job_status / cancel_job:** bestehende zentrale Studio-Auftragssteuerung verwenden; nicht einen zweiten Hintergrund-Scheduler erstellen.
- **review_result:** prüfbare Commit-/Artefaktreferenz und eigene Prüfberechtigung erfordern; separater Weg für Merge/Release.

Die tatsächlich exponierten Funktionen sind je nach Grant zu filtern und **bei jedem Aufruf** nochmals serverseitig zu autorisieren.

### 6.3 Integrität und Deduplikation

- Jede Mutation hat eine **dauerhafte idempotencyKey/requestId** im Scope der authentifizierten Person, Verbindung und konkreten Aktion.
- Bei Wiederholung exakt gleiche Antwort oder sichtbarer Konflikt statt zweiter Aufgabe, auch nach Netzwerkverlust, App-Neustart und erneuter ChatGPT-Anfrage.
- Falsches Projekt oder fremdes Repo ergibt 403/404, keine stillschweigende Ausführung mit Plattformrechten.
- ChatGPT-Projekt und Studio-Projekt werden **explizit** gekoppelt; keine Abhängigkeit von flüchtigem aktiven Chat, Namen oder nicht garantierten ChatGPT-Projekt-Metadaten.
- Ein Projektkontext ist **Referenzdatenmaterial**, keine Berechtigung und keine ungeprüfte Systemanweisung.
- Status einer laufenden Aufgabe ist nicht „erfolgreich“, bevor der Worker ein Ergebnis geliefert und die erforderlichen Prüfungen bestanden hat.

### 6.4 Mobil zuerst

Lesen, Nachrichten, Aufgaben, Modellwahl, Agentenstatus, Vorschau, Kommentieren und Freigabe sind auf dem Handy nutzbar. Externe ChatGPT-MCP-Verfügbarkeit und Autorisierung auf konkreten Mobilclients sind **real zu testen**, nicht aus einem erfolgreichen Desktop-Test abzuleiten. Der Studio-Projektraum bleibt der zuverlässige mobile Fallback.

## 7. Agenten, Engines, Anbieter und Konten

**Hermes ist eine optionale Engine.** Bot HQ nutzt für jeden Bot Hermes und Orgo; SCHMAQQ soll auch direkte Codex-/Claude-Code-/API-Adapter unterstützen, ohne zwei parallele Projektsteuerungen aufzubauen.

Jede Agentendefinition hat: ID, Projekt, sichtbaren Namen, Rolle, Zweck, Kontextprofil, Capability-Liste, erlaubte Modellwahl, maximalen Delegationsumfang und optionalen Standard-Runner. **Jeder Lauf** hat zusätzlich beauftragende Person, konkreten Zugang, Budget, Limits, Dauer, Status und Nachweise.

**Persönliche Abos niemals stillschweigend zusammenlegen:**
- OpenAI/ChatGPT: nur die jeweils aktuell offiziell unterstützten ChatGPT-/Codex-/Sign-in-Wege und Nutzungsgrenzen verwenden. Nicht aus einer Studio-Anmeldung ein API-/Aborecht ableiten.
- Anthropic: unverändertes Claude Code bzw. offiziell erlaubte SDK-/API-Zugänge getrennt prüfen; keine Weitergabe von Auth-Caches an andere Personen oder Bots.
- Google/Gemini: passende offizielle API-/Teamzugänge als Integrationsweg; privates Consumer-Abo nicht als frei nutzbares Studio-Kontingent voraussetzen.
- Weitere Anbieter: analog durch einen Capability-/Terms-/Abrechnungscheck vor Freischaltung.

Ein gemeinsamer **Team-Agent**, den beide unabhängig beauftragen können, benötigt einen dafür **vertraglich geeigneten gemeinsamen Zugang/Budgettopf** oder mehrere personengebundene Ausführungen. Die freie Beauftragung durch Markus darf nicht automatisch Marcos persönliches Kontingent verbrauchen. Zugänge, Schlüssel, Anmeldetokens und Secrets verbleiben in getrennten autorisierten Umgebungen; keine Kopie vom „Primäragenten“ in neue Agenten.

In der UI die *tatsächlich verfügbaren* Modelle, Zugangsart, Kosten-/Limitinformation und Ausführungsort anzeigen. Unsupported bleibt sichtbar als „nicht verfügbar/noch zu prüfen“ statt vorgetäuscht zu funktionieren.

## 8. Kontext und Wissensmanagement – technische Pflicht, kein Nachtrag

**Drei getrennte Ebenen:**
1. **Verbindliches Projektwissen:** Ziele, Entscheidungen, Architektur, Definition of Done, Artefakte, Versionsbelege, Referenzen; gemeinsamer Data Store mit Projekt-ACL.
2. **Auftragskontext:** konkrete Frage, betroffene Dateien/Artefakte/Commits, relevante letzte Schritte, Status, Risiken und Abnahmekriterien.
3. **Private Agentenerinnerung:** Stil, Rolle, ggf. persönliche Notizen innerhalb erlaubter Grenzen; ist nie automatisch Projektwahrheit.

**Prinzip:** Nicht jedes Mal gesamte Projektgeschichte, Agentenliste, Skills und Teamchat an ein Modell übertragen.

- Kurzer, möglichst stabiler und cachefähiger Agenten-Grundkontext. Zeit- und Statuswerte getrennt nachladen.
- Projektzusammenfassung und Auftragsdaten **bedarfsgerecht** laden; relevante Dokumentpassagen per Referenz, keine unselektierte Vollübertragung.
- Fakten mit Quelle/Version und letztem bestätigtem Stand markieren; „agent sagt“ ist kein Beschluss.
- Nach längeren Läufen kompakte, überprüfbare Übergabe speichern: Ergebnis, geänderte Dateien/Commit, Tests, offene Fragen, nächste Aktion, Kosten.
- Agent-zu-Agent-Nachrichten standardmässig **strukturierte Kurzaufträge mit Referenzen** statt ganze Transkripte.
- Token-/Zeit-/Kostenlimit sowie maximale Delegationstiefe/Anzahl gleichzeitig aktiver Agenten je Lauf; benutzerseitiger Stop.
- Verlauf bleibt für Nachvollziehbarkeit zugänglich, wird aber nicht blind als Modellkontext wieder eingespielt.
- Kontextgrenzen sind **nicht identisch** mit Ratelimits oder Abo-Nutzungsgrenzen; letzteres separat anzeigen/berücksichtigen.
- Dokumente, Webinhalte und Agentenantworten als **unvertrauenswürdige Daten** behandeln, nicht als neue Systemberechtigungen.

## 9. Agentenkommunikation und gemeinsame Live-Anzeige

Menschen und Agenten teilen einen **projektbezogenen Ereignisstrom** mit klaren Sendern, Empfängern, Auftrags- und Laufreferenzen. Das UI zeigt bei jedem aktiven Lauf: geplant / arbeitet / wartet auf Freigabe / Fehler / fertig / gestoppt. Schritte können eingeklappt werden; entscheidungsrelevante Details sind ohne Log-Dschungel sichtbar.

Agent-zu-Agent-Übergaben sind:
- bewusst adressiert, nicht automatische Reaktion auf jede Nachricht;
- an dieselbe Aufgabe oder einen expliziten Unterauftrag geknüpft;
- ohne zusätzliche Rollen-/Repo-/Budgetrechte;
- mit eindeutiger Zustellung, Deduplikation, Stop und endlicher Tiefe;
- bei Rückfrage an Menschen pausiert, nicht stillschweigend anderweitig eskaliert.

Ein „Agent ist sichtbar im Raum“ ist **keine** Aussage, dass ein eigener Dauerprozess oder ein Modellkontext ständig geladen ist. Aktivität ist an Jobs gebunden.

## 10. Lokal, VPS und Cloud: gleiches Arbeitsmodell

**Jetzt:** Ein gemeinsamer Studio-Datenstand und eine von Marco/Markus nutzbare, unsichtbare Werkstatt auf VPS ist die bevorzugte Alltagserfahrung; persönliche Runner bleiben erlaubt und werden im Studio als offline/online korrekt angezeigt.

**Technische Entkopplung:** Auftrag und Ergebnis sind unabhängig davon, ob die Arbeit auf demselben VPS, auf dem persönlichen Rechner oder einem später zugelassenen Cloud-Worker erfolgt. Runner melden Fähigkeiten, Standort, Isolation, Verfügbarkeit und Grenzen.

- Quellcodeänderungen in separaten Branches/Worktrees und begrenzten Ausführungsumgebungen.
- Browsercomputer, VNC/Screen-Takeover und Sprache sind **optionale Fähigkeiten**, keine Voraussetzung für alle Agenten.
- Keine fremden/nicht geprüften Repositories oder Shelljobs auf persönlichen Geräten mit privaten Zugangsdaten.
- Kein unbeschränktes Shell-/Browser-Zugriffsrecht auf Produktionsserver.
- Preview an exakten Stand gebunden; parallele Reviews dürfen einander nicht unbemerkt überschreiben.
- Ein fehlender oder ausgefallener Runner bedeutet „nicht verfügbar/unterbrochen“, nie vorgetäuschten Erfolg.
- Anfangs SQLite/Modular-Monolith beibehalten, spätere Datenbank-/Compute-Skalierung aus realen Anforderungen ableiten.
- Vor unabhängigen Kundenteams müssen vollständige Mandantenisolation, Projekt-ACL, Betriebs-/Backup-/Restore-Regeln sowie getrennte Daten-/Compute-Berechtigungen nachgewiesen werden.

## 11. Sicherheits- und Qualitätsgates

**Verpflichtende Prüfblöcke vor produktiver Aktivierung neuer Rechte:**
1. Projektrollen korrekt serverseitig erzwingen; Projekt A darf Daten, Repo, Worker und Agenten von Projekt B nicht lesen/bearbeiten.
2. Persönliche OAuth-/Modell-/GitHub-/Runner-Zugänge korrekt separieren; kein Root-Hermes als allgemeiner Agent und kein ererbter Primär-Auth-Cache.
3. Browser-/Shell-Aktionen dürfen Approval-/Repo-/Dateiscope nicht umgehen; kritische Fähigkeiten technisch vorenthalten, nicht nur UI-seitig nachfragen.
4. Zeit-, Kosten- und Rechteumfang einer Agentendelegation sind begrenzt und widerrufbar.
5. Alle Mutationen idempotent, nachvollziehbar und rückmeldbar – speziell nach Verbindungsabbruch und Retry.
6. Review auf **unveränderlichen Artefakt-/Commitstand**; geänderter Stand erzwingt neue Prüfung.
7. Sichere Vorschau mit eigener Origin; keine fremden Sessions oder Secrets.
8. Tests für schädliche Eingaben, Rechteentzug, Prompt-Injection-Versuche, Race Conditions, Konflikte, wiederholte Toolaufrufe, Runner-Ausfall.
9. Bot-HQ-Code vor Import hinsichtlich Auth, HTML-Einbettung, Screens/VNC, MCP und Drittanbieter-Assets prüfen.
10. Dokumentieren, was Code/Tests belegen und was tatsächlich auf VPS sowie Handy beobachtet wurde.

## 12. Priorisierte Umsetzung – klein anfangen, Kernerlebnis früh liefern

**Vorbedingung / Bestand prüfen:** docs/WORKLIST.md und docs/STATUS.json gegen Live-VPS prüfen. Bekannte Connector-Duplikate ursächlich klären, Rollen-/GitHub-/Worker-Grenzen abnehmen. Keine ungeprüften Produktivänderungen.

**Phase A – Zwei-Personen-Kollaboration stabil:** Klimafinder mit Marco/Markus, Projektaufgaben, Nachrichten, echte Arbeitskopien, Ergebnisse, gemeinsame Vorschau, gegenseitiges Review. Parallelität und Offline-Fälle testen. Verantwortliche dürfen arbeiten, ohne für jeden Zwischenschritt einen Plattformadmin zu benötigen.

**Phase B – Normaler ChatGPT-Chat als Projektzugang:** Persönlich autorisierte, **projektgebundene** MCP-Verbindung; sicher lesen, Nachricht/Aufgabe/Ergebnis schreiben, Veränderungen nachlesen, begrenzten Auftrag starten. Idempotenz-/ACL-Tests als Eintrittskriterium. Auf dem Handy real abnehmen.

**Phase C – Projekt-Agenten im ersten brauchbaren Piloten:** Agent manuell anlegen, Modell aus tatsächlich verfügbaren Zugängen wählen, eine Aufgabe beauftragen, Arbeit live sehen, Ergebnis mit Quellen/Tests in Studio. Der Agent ist im Projekt sichtbar, aber seine Ausführung bleibt begrenzt. Hier gezielt Bot-HQ-Fortschritts-/Ereignis-UX portieren.

**Phase D – Koordinator und Agent-zu-Agent:** Ein Koordinator darf im beschränkten Auftrag einen zweiten Agenten für Review delegieren. Nachrichten und Übergaben sind sichtbar, terminieren zuverlässig, schützen Budget und Rechte. Keine freie agentische Repo-Publikation.

**Später:** weitere Provider, optionale Desktopübernahme, Voice, Ereignisroutinen, parallele Cloud-Worker, getestete mehrere Mandanten. Keine dieser Erweiterungen ist Voraussetzung, um zwei Menschen und erste Projekt-Agenten sinnvoll zusammenarbeiten zu lassen.

**Wichtig:** Phase B/C sind keine unverbindlichen Fernziele, sondern ausdrücklich Teil des gewünschten frühen Teamprodukts. Die Reihenfolge kann in kleinen unabhängigen PRs überlappen; ein erfolgreicher Test pro Funktion zählt mehr als eine grosse Architektur-Umschreibung.

## 13. Konkrete Abnahmeszenarien

- **Zweierbetrieb:** Marco erstellt Klimafinder-Auftrag, Markus bearbeitet, Marco kommentiert den exakt angezeigten Stand, Markus korrigiert, die definierte Prüferrolle stimmt zu, GitHub-PR entsteht – ohne Dokumentationskopieren.
- **ChatGPT-Normalchat:** Aus dem verknüpften ChatGPT-Projekt wird derselbe Studio-Auftrag gelesen; ein Befund wird mit nachvollziehbarem Absender als Kommentar gespeichert; Markus sieht ihn im Studio. Keine Work-Pflicht.
- **Falscher Projektscope:** Ein MCP-Grant für Klimafinder kann weder Probeprojekt noch andere Repositories bearbeiten; auch nicht durch manipulierte Projekt-IDs und einen direkt angesprochenen Worker.
- **Kein Super-Master-Zwang:** Entwickler ändert in seiner Arbeitskopie, testet, erstellt Vorschau und legt zur Review vor, ohne jedes Mal einen Owner um Erlaubnis zu bitten.
- **Review nach Projektregel:** Standardmässig zweite Person. Eine ausdrücklich konfigurierte Ausnahme erlaubt einem berechtigten Projektadmin Eigenprüfung; der erforderliche Auditbeleg bleibt erhalten.
- **Release-Sperre:** Agent, MCP, Entwickler oder PR-Merge kann keine aktuelle SCHMAQQ-Produktion ohne gesonderte ausdrückliche Owner-Livefreigabe verändern.
- **Zwei KI-Konten:** Auftrag von Markus nutzt nicht Marcos persönliches Kontingent; ein automatischer kontenübergreifender Agentenwechsel wird blockiert oder fordert eine neue autorisierte Ausführung.
- **Agent spawnen:** Berechtigter Benutzer startet einen Agenten; die Grenzen und der Modellzugang sind sichtbar. Koordinator erzeugt einen beschränkten Prüfer-Unterauftrag.
- **Agentenloop:** Begrenztes Bot-zu-Bot-Review endet zuverlässig; Stop und Kostenlimit werden erzwungen.
- **Kontext:** Lange Projektgeschichte wird nicht blind vollständig an jeden Agenten übertragen. Erforderliche Entscheidungen sind über Quellen/Referenzen wieder auffindbar.
- **Doppelaufruf:** Zweimal dieselbe ChatGPT-Mutation (auch nach Abbruch/Retry) legt exakt einen Auftrag/eine Nachricht an.
- **Runner-Fall:** Ein offline Rechner und eine nicht verfügbare VPS-Werkstatt werden als solche angezeigt; keine erfundenen Erfolgs-/Testberichte.
- **Parallele Arbeiten:** Zwei Arbeitskopien und deren konkrete Prüfstände bleiben voneinander unterscheidbar; Kommentare beziehen sich weiterhin auf den richtigen Stand.
- **Mobile Abnahme:** Die obigen Kernschritte auf einem echten Smartphone, nicht nur im Desktop-Responsive-Modus, durchspielen.

## 14. Bewusst offene Entscheidungen / keine stillschweigenden Zusagen

- Welche Anbieter und **welche konkreten Abotypen** erlauben zum Zeitpunkt der Implementierung persönliche bzw. gemeinsam betriebene Agenten auf einem lokalen Host/VPS? Offizielle Bedingungen je Provider und Modus prüfen.
- Wie genau werden ChatGPT-Projektkontext und Studio-Projekt technisch verbunden, wenn ChatGPT keine verifizierte Projekt-ID an den Plugin-Server übergibt?
- Wie wird das bestehende Studio-Owner-Admin-Verhalten vor Fremdteams auf echte projektbezogene Rollen umgestellt?
- Ab welcher Aktion verlangt die projektbezogene GitHub-Policy PR, Zweitprüfung oder gesonderte Zustimmung? Vorhandenes GitHub Branch Protection/CI bleibt eine zusätzliche, unabhängige Schranke.
- Welche Bot-HQ-Quellmodule erfüllen nach Tests unsere Sicherheits-, Copyright- und Wartbarkeitsanforderungen? Eine Übernahme ist noch nicht beschlossen.
- Welche Auftrags- und Budgetgrenzen sind für den ersten Pilot praktikabel? Eine kleine Standardkonfiguration statt unbegrenzter Agenten.
- Wie werden persönliche Modellzugänge auf einer gemeinsamen VPS-Werkstatt technisch getrennt, ohne Providerbedingungen oder private Login-Caches zu verletzen?
- Welche Ereignisse müssen im Studio-Projektstrom landen und welche bleiben private Chat-/Agenteninteraktionen?

## 15. Quellen und Abgleich

**SCHMAQQ – massgebliche vorhandene Grundlagen**
- [Produktvision](PRODUCT_VISION.md) – übergeordneter Workspace-Nordstern.
- [Studio-Plan](PLAN.md) – priorisierte Owner-Entscheidungen; neuer Entwurf ersetzt keine bestehenden Release-Gates.
- [Arbeitsliste](WORKLIST.md) und [belegter Iststand](STATUS.json) – Implementierungsstatus.
- [Architektur](ARCHITECTURE.md) – Control/Execution/Data, Mensch/Agent/Runner-Trennung.
- [Projektrollen](../selfhost/project-roles.mjs) – Admin/Developer/Reviewer/Viewer und Review-Varianten.
- [MCP-Werkzeuge](../selfhost/studio-mcp.mjs), [MCP/OAuth-Routen](../selfhost/studio-plugin-http.mjs) – derzeitige persönliche ChatGPT-Anbindung und Umfang.
- [AGENTS.md](../AGENTS.md) – Arbeit nur auf Branches; kein automatisches Merge/Deployment.

**Bot HQ – externe technische Referenz, kein SCHMAQQ-Entscheidungsdokument**
- https://github.com/nickvasilescu/bot-hq
- https://github.com/nickvasilescu/bot-hq/blob/main/docs/ARCHITECTURE.md
- https://github.com/nickvasilescu/bot-hq/blob/main/server/src/agent/prompt.ts – Aufbau zusätzlicher Agentenanweisungen/Prompt-Caching.
- https://github.com/nickvasilescu/bot-hq/blob/main/server/src/agent/loop.ts – Agententurns, Queue, Ereignisse, Freigaben und Bot-Kommunikation.
- https://github.com/nickvasilescu/bot-hq/blob/main/server/src/engine.ts – Hermes-Engine, Auth-/Kontextumgebungen und deren Risiken.
- https://github.com/nickvasilescu/bot-hq/blob/main/server/src/vnc.ts – Bildschirm-Relay, Watch/Control.
- https://github.com/nickvasilescu/bot-hq/blob/main/THIRD_PARTY_NOTICES.md – fremde Assets/Rechte.

**Anbieterbedingungen vor Umsetzung erneut prüfen:** offizielle OpenAI-Dokumentation zu ChatGPT-/Codex-Verbindungen, Anthropic Claude Code/Agent SDK, Google Gemini/Antigravity. Keine zukünftige Vertragskonformität aus diesem Konzept ableiten.

---

**Zusammenfassung:** Erst eine echte gemeinsame Studio-Arbeitsumgebung für Marco und Markus. **Gleichzeitig früh projektgebundene KI-Agenten und ChatGPT-Normalchat-MCP** als gleichwertige Arbeitszugänge. Bot HQ ist eine hochwertige Quelle für Agenten-UX, Hermes-Integration und Agentenkommunikation – nicht eine zweite Autoritäts-, Daten- oder Sicherheitsplattform. Skalierbarkeit entsteht durch Projektgrenzen, getrennte Zugänge und austauschbare lokale/VPS-/Cloud-Ausführung. Berechtigungen sind zwingend, menschliche Prüfungen projektbezogen konfigurierbar, Livegang separat geschützt.