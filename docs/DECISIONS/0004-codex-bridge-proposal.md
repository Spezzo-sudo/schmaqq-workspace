# ADR-0004 (Entwurf): Codex Bridge über Studio statt Modell-Proxy in Claude Code

**Status:** PROPOSED – nicht beschlossen, nicht implementiert, keine Kontoverbindung.
**Datum:** 08.11.2026
**Voraussetzungen:** `docs/PLAN.md` Etappen 0/3/4, `docs/ARCHITECTURE.md`, `docs/STUDIO_NEXT_PHASE.md`.
**Scope:** nur `schmaqq-workspace`; kein Zugriff auf das Marketing-Repository.

## 1. Entscheidungsvorschlag

Der Studio-Kern verwaltet Projekte, Aufträge, Nutzerrechte, unabhängige Arbeitskopien, Prüfung und Freigaben. Der KI-Ausführer wird als **austauschbarer Adapter** hinter den bestehenden Job-Vertrag gesetzt. Als erster Kandidat wird **unveränderter offizieller Codex CLI/SDK** mit persönlicher, separat zugelassener Anmeldung getestet. Claude Code und ChatGPT nutzen als *Eingang* denselben Studio-MCP-Connector; ein «Claude-Code-Subagent mit Codex-Modell» ist damit fachlich ein externer Codex-Job, kein natives Claude-Subagent-Modell.

```text
Marco / Markus (Studio Handy)
  |          ChatGPT MCP / optional Claude Code MCP
  v                       |
SCHMAQQ Studio (auth, tasks, scope, reviews, dedup)
  v
Job-Queue / eigener Worktree / Besitzerzuordnung
  v
Isolierter Codex-Adapter (offizieller Client; persönliche Berechtigung)
  v
Änderung + Tests + Vorschau -> Review -> separate Freigabe
```

Die bestehenden `/mcp`-Werkzeuge (`project_context`, `start_code_job`, `get_code_job`, `cancel_code_job`) bleiben Einstiegspunkt. Nicht parallel eine zweite Chat-/Task-Datenbank schaffen.

## 2. Wichtige Unterscheidungen

1. **Inbound:** ChatGPT oder Claude Code erhält mit OAuth/PKCE Zugriff auf Studio-MCP. Dies *verleiht Studio keinen Zugang* zu Codex oder zu einem ChatGPT-Modell.
2. **Outbound:** Studio startet Codex im Namen des Auftraggebers. Benötigt eigene, dafür freigegebene Auth, klare Nutzungs- und Datenrechte und nachweisbare Provider-Zugriffe.
3. **Nutzungsarten unterscheiden:** ChatGPT-/Codex-Planlimits, Work-Produktoberfläche, Sign in with ChatGPT-Planfreigabe und separat berechnete OpenAI-API sind keine austauschbaren Kontingente.
4. **Business ist nicht automatisch freigegeben:** Die OpenAI-Dokumentation für ChatGPT-Plan-Nutzung in eigenen Open-Source-/lokalen Anwendungen nennt Plus/Pro und verweist für bezahlte oder remote gehostete Apps auf einen gesonderten Interessenten-/Zulassungsweg. SCHMAQQ Studio ist eine private, remote gehostete Webanwendung. **Keine Freigabe oder Business-Entitlement aus Dokumentationsbeispielen ableiten.**
5. OpenAI beschreibt separate **API-Guthaben für berechtigte Business-Standard-Sitze**, unter Voraussetzungen und ggf. Freischaltung. Das ist ein anderer Pfad als Planlimits. Keine Billing-/Provider-Änderung ohne zusätzliche Owner-Entscheidung und harte Kostenobergrenze.
6. Keine Cookie-Übernahme, kein Scraping, kein Transport von Login-Sessions zwischen Nutzern, kein gemeinsames Abo für Marco und Markus.

## 3. Integrationsoptionen

| Option | Nutzen | Risiko / Freigabe |
|---|---|---|
| A. Offizieller Codex CLI/SDK mit persönlichem ChatGPT-Login | Kleiner erster Spike; kann evtl. bestehendes Codex-Kontingent nutzen | **Nur** bei bestätigter Unterstützung auf dem isolierten Gerät/Server und für diesen Workspace; Tokenisolation prüfen |
| B. Codex App Server für ein echtes Studio-Agentenerlebnis | Streams, Threads, Freigaben, Abbruch, Wiederaufnahme | Mehr Integrations- und Auth-Arbeit; erst nach A und bestätigten Produktrechten |
| C. Offizielle OpenAI API mit eigenem Schlüssel | Einfachere Server-Automatisierung; sauberer Kostenpfad | Separates Billing; zunächst **nicht** aktivieren. Ggf. Business-API-Guthaben prüfen, aber ohne automatische Mehrkosten |
| D. Sign in with ChatGPT Plan Usage für eigene/remote App | Potenziell nutzerbezogene Plan-Nutzung | Für SCHMAQQs heutige Hosting-/Lizenzform und Business-Sitze **nicht als berechtigt nachgewiesen**; nur mit passender Zulassung |
| E. Claude Code ruft Studio-MCP auf | Thin plugin, vorhandene Rechte und Review | Braucht eigenes Claude-Konto/Client-Zugriff; Claude-Code-Nutzung ist zusätzlich, kein kostenloser Modelltausch |

**Empfehlung:** erst A als **nichtproduktiven, isolierten Berechtigungs- und Auth-Test**, bei Positivnachweis C/B/D neu entscheiden. Zielarchitektur auf dem Job-Vertrag, nicht auf einer besonderen Abo-Abkürzung aufbauen.

## 4. Minimaler Job-Vertrag (Entwurf, KEIN neues API-Schema)

```json
{
  "jobId": "<server-generated>",
  "taskId": "<existing-task-id>",
  "initiatorMemberId": "<authenticated-member>",
  "executor": "codex",
  "projectId": "<allowed-project>",
  "worktreeId": "<owned-and-isolated-copy>",
  "requestId": "<client-operation-id>",
  "idempotencyKey": "<server-bound-key>",
  "permission": {
    "kind": "code-change",
    "approvedBy": "<initiator>"
  },
  "limits": {
    "maxDurationSeconds": 900,
    "concurrencyPerMember": 1
  },
  "result": {
    "status": "queued|running|succeeded|failed|cancelled|unknown",
    "commit": null,
    "artifactRefs": [],
    "reviewRequired": true
  }
}
```

Die Zahlen und Felder sind Diskussionswerte, kein implementierter Vertrag. Der Client erzeugt keine autoritative Besitzer- oder Freigabe-ID. Das Backend bindet jeden Auftrag an die authentifizierte Studio-Person und an die vorgegebene Projekt-/Geräte-Policy.

## 5. Vorbedingungen (No-Go bei Nichterfüllung)

- **Duplikatfehler behoben:** Fehlerklasse «hunderte gleiche Aufgaben» aus `docs/PLAN.md` Etappe 0 Punkt 6. Idempotenz bei Retry, Timeouts, Disconnects und parallelen Aufrufen auf Backendseite nachgewiesen. Unbekannter Ausgang → Status erfragen, nicht blind erneut starten.
- **Recht und Berechtigung nachgewiesen:** Business-/Plan-/Server-Zugriff per tatsächlich verwendeter offizieller Client-Version, OpenAI-Einstellungen und falls nötig Provider-Zustimmung dokumentiert. Kein «geht bestimmt».
- **Tokenisolation:** pro Person eigene geschützte Auth; nicht in Git, Datenbank-Dumps, Aufgabeninhalten, Logs, Child-Sandbox, Browser-Speicher oder URL. Bei Toolausführung prüfen, ob ein Codex-Prozess Zugang zu sensiblen Tokens bekommt; least privilege ist Pflicht.
- **Isolation:** zwei Nutzer dürfen weder denselben Codex-Auth-Cache noch Arbeitskopie, Testprozesse, Dateien oder laufende Jobs sehen. Der bestehende Worker-Sandbox-Status ist separat auf dem aktuellen VPS zu prüfen.
- **Netzwerk:** nur nach bewusstem Egress-Review für offizielle erforderliche Endpunkte; keine globale Freigabe des Internets.
- **Budget/Stop:** explizite Limits, kein Fallback auf kostenpflichtigen API-Key und kein automatischer Wiederanlauf nach Quota-/Auth-Fehlern.
- **Freigaben:** AI-Job kann keinen Merge, keine «Ist live»-Bestätigung, keinen Production-Deploy auslösen.
- **Provenienz:** Aufgabe ↔ Initiator ↔ Worktree ↔ Executor ↔ Commit/Artefakt ↔ Tests ↔ Review bleibt nachvollziehbar.

## 6. Testmatrix für AI-01 und AI-02

1. Nutzer A hat Zugriff, Nutzer B nicht: B bekommt ohne Ausführung ein 403.
2. Zwei Nutzer mit je eigener Anmeldung: keine gemeinsame Token-/Arbeitskopie, getrennte Logs und Usage.
3. Wiederholung desselben `requestId` (gleichzeitig, nach Timeout, nach Neustart) liefert dasselbe Job-Ergebnis; kein doppelter Spawn.
4. Falscher Retry-Key mit geänderten Parametern erzeugt Konflikt, nicht stilles Wiederverwenden.
5. Token abgelaufen / Zustimmung widerrufen / Modell nicht verfügbar / Quote voll: sicherer STOP, verständliche Rückmeldung, kein kostenpflichtiger Ersatz.
6. Abbruch stoppt Prozess und Nachkommen; Zwischenartefakte bleiben nachvollziehbar, aber nicht freigegeben.
7. Erfolg liefert nachvollziehbare Code-Änderung, echte Tests und eigene Vorschau; menschliche Review-Pflicht bleibt erhalten.
8. Rollen, Rechte, Filesystem und Netzisolation bleiben unter fehlerhaften/feindlichen Projektinhalten erhalten.

## 7. Offiziell zu prüfende Quellen

- Codex Auth / CLI: https://learn.chatgpt.com/docs/auth
- Codex SDK: https://learn.chatgpt.com/docs/codex-sdk
- Codex App Server: https://learn.chatgpt.com/docs/app-server
- OpenAI «Codex as a platform»: https://developers.openai.com/blog/codex-as-a-platform
- Sign in with ChatGPT – Übersicht und Teilnahmegrenzen: https://developers.openai.com/siwc/quickstart
- SIWC für Open Source und Self-hosted VMs: https://developers.openai.com/siwc/token-sharing-open-source
- Business-/Pro-API-Guthaben (separater Weg): https://developers.openai.com/api/docs/guides/chatgpt-api-credits
- Offizielle MCP-Authentifizierung: https://developers.openai.com/plugins/build/auth

## 8. Ergebnis dieser ADR

Es wird **nur die Entscheidung vorbereitet**. Keine Dependency, keine OAuth-Registrierung, kein Secret, keine Provider- oder VPS-Änderung. Wenn AI-01 negativ ausfällt, bleibt Studio ohne KI voll nutzbar; alternative Provider werden nur gesondert geprüft. Erst Owner-Review kann diese ADR auf «accepted» stellen.
