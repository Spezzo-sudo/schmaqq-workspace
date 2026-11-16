# Architekturentscheidung: Hermes als Studio-Agentenmotor (Pilot R1)

Status: **beschlossenes Umsetzungsziel, nicht implementiert** · 16.11.2026 · Bezug: [Issue #86](https://github.com/Spezzo-sudo/schmaqq-workspace/issues/86).

## Trennung

**Betriebs-Hermes:** der bestehende `hermes.service` (Root, Telegram) bleibt nur für freigegebene Serverwartung. Er darf keine Studio-Personendaten oder -Modellaufträge ausführen und wird nicht neu konfiguriert.

**Studio-Hermes:** pro menschlichem Studio-Mitglied **ein eigener Linux-Dienstbenutzer mit eigenem `HERMES_HOME`**, nicht pro Projekt oder Avatar. Der Benutzerprozess teilt niemals Tokens, persönliche Sessions, Memory oder Dateiverzeichnisse mit anderen Benutzern. Für den ersten Pilot zwei Benutzer `schmaqq-hermes-a` und `schmaqq-hermes-b`.

**Agentenprofile:** Leitwolf, Mara, Herr Grau, Eule usw. bleiben Projekt-Datensätze in Studio. Profilmerkmale, Kontexte, Rechte und individuelle Gesprächshistorie werden erst pro Auftrag vom Studio-Server geprüft und geliefert. Kein Agent ist ein weiterer Root-/System-Prozess.

## Minimaler Nachrichtenfluss

1. Mensch schreibt in Studio eine Nachricht **explizit an einen freigegebenen Agenten**. Vor dem ersten kostenpflichtigen Modellaufruf zeigt Studio den tatsächlichen Modellzugang und holt einmalig die erforderliche Zustimmung ein. Ohne persönlichen Modellzugang kein Queue-Start.
2. Studio validiert eingeloggten Benutzer, Projektrolle, Agentenbesitz bzw. Freigabe, Kontextquellen, Nachrichtenreferenz und den gewählten Modellzugang. Die Queue liegt in der **isolierten Staging-SQLite** als eigene `agent_runs`-Tabelle, nicht in einem geteilten `Hermes memory`-Verzeichnis.
3. Idempotenz: `UNIQUE(owner, source_message, agent)`; maximal **eine aktive Ausführung pro Mensch**, explizite feste Nutzungsgrenzen und Laufzeitlimits. Zustände: `queued / running / cancelling / completed / failed / cancelled`. Prozess darf nie für einen anderen Menschen claimen.
4. Pro Mensch ein **kleiner dauerhaft laufender Poller** unter eigenem gehärtetem systemd-Konto, der über localhost einen ausschließlich ihm zugeordneten Job mit einem personengebundenen, rotierbaren Dienstcredential claimt. Das ist keine öffentliche Hermes-API und benötigt keinen Root-Aufruf durch Studio.
5. Poller startet **Hermes Agent in Einmalaufruf** für den Job; der Modellprozess lebt nur für diese Aufgabe, mit Abbruch, Laufzeit-/RAM-Grenzen und getrenntem `HERMES_HOME`. 12 Avatare erzeugen nicht 12 Prozesse.
6. Hermes erhält Rolle/Anweisungen nur für den beauftragten Agenten und exakt den erlaubten Projektausschnitt; Werkzeuge über **einen eng gefilterten Studio-MCP-Server** (anfangs nur `read_project_context` und `get_task`). Keine Terminal-, Dateieditor-, Web-, Delegations- oder GitHub-Werkzeuge. Die Server-Antworten müssen denselben Mandanten-/Projekt-Scope prüfen.
7. Das Studio-Backend übernimmt die Antwort über einen signierten worker-spezifischen Ergebnis-Endpoint. **Nur dieses Backend** darf `origin=verified-run` mit `runId`, `agentId`, `model` setzen. Von Menschen selbst geschriebene Agenten-Rollenspiele bleiben `human-authored`. Ergebnis und Status erscheinen im Chat mit Abbrechen.
8. Agenten-Hand-offs bleiben zunächst **deaktiviert**. Nach Einzeltest nur begrenzte Runden und expliziter Stop/Timeout. Schreibwerkzeuge später nur mit serverseitig gespeicherten Freigabekarten und Idempotenz je Handlung.

## Sicherheitsinvarianten

- Die installierte Hermes-Version **v0.20.5** setzt bei `hermes -z` `HERMES_YOLO_MODE=1`; **kein Vertrauen in interaktive Hermes-Freigaben**. Tool-Allowlist und serverseitige Rechteprüfung sind zwingend.
- Kein geteilter `/root/.hermes`, `/etc/hermes`-Secrets, `~/.codex/auth.json` oder Browser-Session-Export. `HERMES_MANAGED_DIR` muss auf einen dedizierten root-eigenen Konfigurations-Scope zeigen; jede HERMES_HOME ist 0700.
- systemd-Sandbox pro Benutzer: `NoNewPrivileges=yes`, `CapabilityBoundingSet=`, `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes`, `MemoryMax=512M` als Startwert, `TasksMax`, temporärer Prozess und `IPAddressDeny=any` mit **nur explizitem lokalen HTTPS-Egress-Proxy**. Bestehende Produktions-Worker-Proxy-Regeln nicht für Hermes öffnen; eine dedizierte Egress-Freigabe ist separat zu prüfen.
- Dienstcredential per systemd LoadCredential oder gleichwertiger per OS-Konto lesbarer Secret-Store. Authentisierung ist **nicht** der Benutzername im JSON; jeden Queue-Claim serverseitig an die konkrete Person binden. Externe Nutzer können die Worker-Endpoints nicht erreichen.
- Kein autonomes Starten durch ein Agentenprofil, durch ungelesene Chatnachrichten oder von einem anderen Agenten. Initial nur ausdrücklich vom Menschen gestartete Agentenläufe. Missbrauchsschutz auch bei Wiederholungen/Refresh und Quota-Fehlern.
- Inhalt aus Chat/Repository ist nicht vertrauenswürdig; kann die Freigaben nicht umgehen. Technisch erzwingen, nicht nur im Systemprompt behaupten.
- Job- und Credential-Logs enthalten keine Tokens, keine geheimen Inhalte und keine kompletten fremden Chats. Fehlerberichte an den Nutzer mit knappen strukturierten Gründen.

## Freigabe- und Testreihenfolge

**A – Servervorbereitung:** geprüfte [Preflight-Operator-Vorlagen](README.md) mit Root-Operator einmalig installieren, systemd-Sandbox pro Person prüfen; noch keine Agentenlaufzeit/kein OpenAI-Login.

**B – Backend-Vertrag:** Queue, Identität/Agenten-Bindung, read-only MCP, signierte und idempotente Ergebnis- und Abbruchmeldungen samt Tests auf isoliertem R4-Branch. Keine Änderung an `main`.

**C – persönliches OAuth:** jeder Nutzer startet seine **eigene** Hermes-Codex-Geräteanmeldung und autorisiert selbst. Token darf nie im Chat, GitHub, Worker oder allgemeinen Hermes-Service erscheinen. Account-/Modell-Berechtigung erst durch echten Test belegen.

**D – ein Modelllauf:** Auftrag an Mara -> queued -> running -> echtes Hermes-Inference-Ergebnis -> `verified-run`-Chatnachricht. Test fehlende Auth, falscher Besitzer, falsches Projekt, Wiederholung, Abbruch, Zeitüberschreitung, Neustart, Netzwerkfehler, RAM-Peak.

**E – zweiter Benutzer:** Konto B mit eigenem Token und eigener Sandbox; keine überkreuzten Chats, Run-Claims, Auth-Daten oder Nutzungskontingente. Mobilbrowser 390 px und Desktop, Screenshots erst nach echtem Test.

**F – getrennte Freigaben:** nur mit `merge` nach `main`; produktiver Livegang nur nach ausdrücklich `JA LIVE`. Staging/Pilot ist keine Produktionsfreigabe.

Falls der Hermes-Codex-Zugang praktisch nicht funktioniert oder die Sicherheit nicht belegbar ist: **Codex direkt** als Motor wählen, ohne bestehenden Studio-Messenger oder Queue-Vertrag neu zu bauen.
