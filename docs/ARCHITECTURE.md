# SCHMAQQ Workspace — Zielarchitektur und Bestand
_Status: R1-Vorschlag zur Review, 17.10.2026. „Ist“ bezieht sich auf den geprüften Repository-Quellstand, **nicht** auf einen bewiesenen Cloud- oder Produktivbetrieb._

## 1. Leitentscheidung

Ein **modularer Monolith mit expliziten Verträgen** ist zunächst die richtige Wahl: eine Web-Anwendung mit klar getrennten Domänen und externen, kontrollierten Ausführern. Kein vorschneller Microservice- oder Git-Server-Bau. Die Module sollen später ohne vollständige Neuimplementierung in getrennte Deployments überführbar sein.

Logische Ebenen:
- **Control Plane:** Benutzer/Teams, Projekte, Tasks, Agenten, Rechte, Auftragsplanung, Freigaben, Policies, Nutzungsbuchung.
- **Execution Plane:** persönliche Runner und später isolierte Cloud-/Community-Worker, die Jobs ausführen.
- **Data Plane:** Dokumente, Artefakte, Repository-Referenzen, Logs, Modelleingaben und Backups mit klaren Eigentümern und Zugriffskontrollen.

Diese Ebenen sind **fachliche Grenzen, keine Aufforderung**, heute drei Server zu betreiben.

## 2. Im Repository tatsächlich vorhanden

| Baustein | Source | Einordnung |
| --- | --- | --- |
| Browser-Einstieg / Login | `studio/main.tsx` | React/Vite für selbst gehostetes Studio |
| Team-/Projekt-/Task-Oberfläche | `app/workspace.tsx` | Vorhandene Team- und Kollaborationsoberfläche |
| Entwicklung / Editor / Review | `app/development.tsx`, `app/source-editor.tsx`, `app/code-review.tsx` | Entwicklerspezifische Abläufe |
| API und Sitzungen | `selfhost/server.mjs` | Node-HTTP, Authentifizierung, Job-Steuerung |
| Datenschema | `selfhost/store.mjs` | SQLite WAL, Mitglieder, Projekte, Jobs, Geräte, Reviews, AI-Freigaben |
| Git-Runner | `selfhost/runner.mjs` | Eigene Worktrees, Git-/Test-/Codex-Aktionen auf konfiguriertem Gerät |
| OIDC | `selfhost/oidc.mjs` | OIDC-Fluss vorhanden; echter Client nicht eingerichtet |
| Lokale KI | `selfhost/local-ai.mjs`, `selfhost/ai-routes.mjs` | Explizit freigegebene Ollama-Modelle, lokal/Team begrenzt |
| Builds und Nachweise | `selfhost/verify.mjs`, `selfhost/*.test.mjs` | Source-Guard, Tests, TypeScript, Studio-Build |
| Deployment-Vorlagen | `selfhost/deploy/` | Noch keine praktische VPS-Abnahme |
| Historischer Starter | `app/api/`, `db/`, `build/` | Separater Sites/Cloudflare-Pfad; **nicht** die self-hosted API |

`npm run dev` startet den alten Starterpfad; für das tatsächliche Studio `studio:*` verwenden. Der jetzige Server hat kein organisationsbasiertes Multi-Tenant-Modell: Mitglieder teilen die kleine Studio-Datenwelt. Eigene Runner sind nicht automatisch sicher für fremde Auftraggeber.

Nachweise und offene Grenzen bleiben in [STATUS.json](STATUS.json) maßgeblich. Keine produktive Verfügbarkeit aus einem lokalen Test ableiten.

## 3. Zielmodule und Verantwortlichkeiten

| Modul / Grenze | Verantwortung | Gegenwart -> Entwicklung |
| --- | --- | --- |
| Identity & Membership | Person, Organisation/Workspace, Mitgliedschaft, Rollen, Sitzungen | Einzel-Studio -> getrennte Tenants + Anbieter-SSO |
| Collaboration | Projekte, Tasks, Chat, Dokumente, Entscheidungen, Review | Vorhanden -> generisch für alle Arbeitsarten |
| Work Orchestration | Typisierte Jobs, Status/Lease, Freigabe, Retry-Policy, Abbruch | Gerätgebundene Jobs -> unabhängige Job-Verträge |
| Agent Adapters | Provider-/Modellfähigkeit, Aufruf, Toolrechte, Kosten, Identität | Codex/Ollama-Ansätze -> offene Adapter |
| Execution Registry | Geräte, Fähigkeiten, Einwilligungen, Verfügbarkeit, Grenzen | Persönliche Runner -> zertifizierte Worker |
| Artifact & Knowledge | Versionen, Referenzen, Provenienz, Zugriffslevel, Exporte | Dokumente/Diffs/Previews -> einheitliche Artefaktverweise |
| Metering & Policy | Budget, Verbrauch, Limits, Betriebsereignisse | Späterer Ausbau; noch keine Abrechnung |
| SCHMAQQ Integration | Öffentliche Navigation, SSO, Produktkontext | Nur definierte künftige Verträge, kein Runtime-Coupling |

Module müssen ihre Datenverantwortung besitzen. Cross-Modul-Zugriff langfristig über interne Verträge, nicht durch beliebige direkte DB-Zugriffe jedes Adapters.

## 4. Arbeit als zusammenhängender Ablauf

`Workspace -> Projekt -> Auftrag -> Aktivität/Ausführung -> Artefakt -> Review/Entscheidung -> Abschluss`

- **Akteur:** Mensch oder benannter Agent; Agenten besitzen eine **eigene** Identität, Handlungsgrenzen und einen menschlich verantwortlichen Auftraggeber.
- **Job:** einzelne, möglicherweise wiederholbare Ausführung mit Status und genauer Zuordnung zu Task, Initiator, Exekutor, Budget und Freigabe.
- **Artefakt:** referenziertes Ergebnis mit Herkunft, Version/Hash und klassifiziertem Zugriff. Review bezieht sich auf einen unveränderlichen Stand.
- **Gespräch und Entscheidungen:** bleiben am Auftrag statt in einem flüchtigen KI-Chat.
- **Git:** Studio benutzt echte Repos, Branches/Worktrees, Tests und PRs; andere Workspace-Bereiche benötigen keine Git-Repositories.

**Vorgeschlagener Job-Vertrag v0 (noch nicht implementiert):**
- `jobId`, `workspaceId`, `projectId`, `taskId`, `requestedByActorId`, optional `agentId`;
- `kind`, `inputArtifactRefs`, `dataClass`, `requiredCapabilities`, `executorConstraints`;
- `authorizationRef`, `maxCost`, `maxDuration`, `resourceCaps`, `idempotencyKey`;
- Ergebnis: `status`, `executionId`, `startedAt/endedAt`, `outputArtifactRefs`, `usage`, `reviewEvidence`, `errorClass`.

Der Vertrag beschreibt Absichten. Eine Schema-/API-Änderung braucht eigenes ADR, Migrationsplan und Tests.

## 5. Identität, Rollen und Admin

**Authentifizierung ist nicht Autorisierung.** Eigener Studio-Login und später föderierte Identitäten dürfen auf dieselbe intern stabile Person zeigen, jedoch erst nach gesicherter Kontoverknüpfung. Niemals E-Mail allein als dauerhaft eindeutige Identität behandeln; Provider-Identitäten über Issuer + Subject binden.

Vorgeschlagene feinere Rollen:
- Plattformbetreiber: globale Betriebsfunktionen, streng getrennt vom normalen Produkt.
- Workspace Owner/Admin: Mitglieder, Rollen, Ressourcen, Sicherheits- und Abrechnungsgrenzen seines Workspaces.
- Mitglied: projektabhängige Arbeit und Einladungen entsprechend Rechten.
- Gast/Reviewer: begrenzter Scope.
- Agent-/Runner-Identität: zweckgebundene, widerrufbare Berechtigungen, keine Mensch-Session.

**Admin muss auffindbar sein** für Berechtigte (z. B. „Einstellungen → Administration“), aber jede Aktion braucht serverseitige Rollen-/Mandantenprüfung, CSRF-/Session-Schutz, Audit und sicheren Widerruf. Ein unsichtbarer Button ist keine Sicherheitsgrenze.

Aktueller Code bietet Einzel-Studio-Rollen und Zugangsmechanismen, aber **keine** allgemeine Mandanten-/Kundenisolation und keinen gemeinsamen SCHMAQQ-SSO-Betrieb. Eine spätere offene Registrierung darf vor diesen Kontrollen nicht aktiviert werden.

## 6. Compute und KI — zwei verschiedene Konzepte

**Agent:** plant/verwendet Tools/erzeugt Entscheidungen innerhalb eines Auftrags. **Compute-Worker:** führt einen technisch beschriebenen Job aus. Ein Agent kann über einen Worker laufen; ein Worker ist nicht automatisch ein Agent.

- Kurzfristig: persönliche Runner; freigegebene Projektpfade, konkrete Testbefehle und eigene Codex-Konten. Persönliche ChatGPT-/Codex-Sitzungen bleiben auf dem eigenen Gerät.
- Mittelfristig: Provider-Adapter (z. B. Hosted API, lokale Modelle, Codex), Capability-Abfrage, modell-/toolbezogene Freigabe, nutzungsbezogene Limits. Keine Annahme, dass Provider-Abos übertragbar oder weiterverkaufbar sind.
- Langfristig: heterogene CPU/GPU-Nodes mit capability descriptors (OS/Architektur, Speicher, VRAM, Modell, Laufzeit, Isolation, Region), attestierbarem Job-Resultat, Opt-in, Quotas, Preiseinheit und Widerruf.

Die bestehende Ollama-Route arbeitet bewusst nur über Loopback auf eigenen Geräten. Das ist **keine** belastbare Sandbox für beliebige Fremdaufträge.

## 7. Sicherheitsgrenzen / Bedrohungsmodell

Ein öffentliches Netzwerk ist ohne zusätzliche Architektur **nicht freigabefähig**. Unvertrauenswürdige Prompts, Pakete, Dateien, Projekte und fremde Worker dürfen keine gleichwertige Vertrauensstellung wie ein eigener PC erhalten.

Mindestanforderungen vor dem ersten fremden Compute-Job:
1. **Verifizierte Identitäten und explizite Zustimmung:** Anbieter erlaubt genaue Jobklassen/Projekte, Limits und Laufzeit, jederzeit widerrufbar.
2. **Starke Ausführungsisolation:** separate Nutzer-/Container-/VM-Sandbox je Sicherheitsniveau, kein Host-FS, keine ungeprüften Docker-Sockets, minimierte Netzwerk-Egress-Rechte.
3. **Datenklassifikation und Geheimnisverwaltung:** öffentliche/teilbare/sensible Daten trennen; keine persönlichen Provider-Cookies, Tokens, Quellcodes oder Kundendaten ohne passende Freigabe verschieben.
4. **Ressourcenschutz:** CPU/GPU/RAM/Disk/Netzwerk-/Zeit-Limits, Kill-Switch, Kostenobergrenze, Warteschlange und Missbrauchserkennung.
5. **Verifizierbare Ergebnisse:** Artefakthashes, Belege, Wiederholbarkeit soweit möglich, Review gegen betrügerische oder fehlerhafte Executor-Reports.
6. **Sichere Vorschau:** andere Origin, keine injizierten Sessions; Browser- und Dateiinhalte als untrusted behandeln.
7. **Audit, Reporting und Reaktion:** zurechenbare Aktionen, begrenzte Log-Daten, Datenschutz, Melde-/Sperrverfahren; kein ungeprüftes Speichern von Prompts/Secrets.
8. **Nachvollziehbare Abrechnung:** gemessene Ressourcen, transparente Preis-/Gebühren-/Refund-Regeln; Streitfallprozess, keine ungeprüften Auszahlungsversprechen.

Für unabhängige Kunden zusätzlich zwingend: Tenant-isolierte Daten- und Objektzugriffe in **jeder** API, Tests gegen horizontalen Zugriff, Backups/Restore je Sicherheitsbereich und abgestimmte Aufbewahrungsregeln.

## 8. Datenmodell und Evolutionspfad

Heute: SQLite WAL in `selfhost/store.mjs`, Tabellen u. a. `members`, `projects`, `tasks`, `messages`, `documents`, `devices`, `jobs`, `code_reviews`, `ai_resources` und `ai_grants`. Geeignet als kleiner lokaler Pilot, **nicht automatisch** als grosses öffentliches Mandantensystem.

Planungsziel:
- eindeutige `workspace_id`/`tenant_id` und geprüfte Scope-Zuordnung für alle Besitzerobjekte;
- revisionssichere Artefakt-/Entscheidungsreferenzen, getrennte Schlüssel und Backups;
- verschlüsselte Speicherung und klare Retention-Policies für sensible Daten;
- später PostgreSQL oder andere skalierbare Persistenz **erst bei begründetem Bedarf**;
- keine ungeprüfte Schema-Migration neben einem produktiven System.

Persönliche Runner-Konfigurationen, Code-Credentials, lokale Models und auth caches bleiben **ausserhalb** der Plattformdaten und aus GitHub.

## 9. Betrieb und Integration

- `Spezzo-sudo/schmaqq-workspace`: Source of Truth für Studio/Workspace. Eigene Builds, Releases, Backups und Deploy-Freigaben.
- `Spezzo-sudo/NetzKontor`: bestehende SCHMAQQ-Plattform (historischer Repo-Name); eigene Produktions- und Betriebsgrenzen. Eventuelle Umbenennung separat prüfen.
- Eine öffentliche Website kann zum Studio verlinken; **separates Repository verhindert keine gemeinsame Marke oder spätere SSO**.
- `studio.schmaqq.com` ist derzeit nur ein **Namensvorschlag**. Domains, Cookies, Callback-URLs und TLS müssen änderbar konfiguriert werden.
- Zentraler Login später über expliziten Identity-Provider/SSO-Vertrag; keine geteilten Datenbanktabellen und kein stilles Übernehmen der Plattform-Sitzung.
- Review Control und weitere Dienste haben stabile interne Service-IDs; die Subdomain `bewertung.schmaqq.com` kann später separat migriert werden.
- Integrations-/Änderungsregeln siehe [INTEGRATION_BOUNDARIES.md](INTEGRATION_BOUNDARIES.md).

Ein GitHub-Push ist kein Deployment. Ein grüner Build ist keine visuelle UX-Abnahme. VPS-Aktionen benötigen gesonderte Freigabe und echten Preflight.

## 10. Verifikation und Evolutionsregeln

- Ist-Zustand ändern nur nach überprüfter Source/Evidence; `docs/STATUS.json` bleibt Tatsachenstatus.
- Neue Features auf Branch, GitHub-PR und reproduzierbare Tests, keine doppelten Implementierungen.
- Grössere Architekturänderungen benötigen ein ADR mit Alternativen, Migrationsweg und Sicherheitsbetrachtung.
- Keine vorschnelle Einbettung fremder Modell-Abos oder Remote-Ausführung in den Produktkern.
- Externe Pilotnutzer erst nach getesteter Identität, Tenant-Scope, Backup/Restore und Zugriffskontrolle.
- Bestehende, lokal bestandene Tests sind kein Linux-/VPS-/Browser-Nachweis.

**Entscheidungsvorschläge:** [ADR-0001](DECISIONS/0001-modular-core.md), [ADR-0002](DECISIONS/0002-execution-and-providers.md), [ADR-0003](DECISIONS/0003-identity-and-federation.md). Meilensteine: [ROADMAP.md](ROADMAP.md).
