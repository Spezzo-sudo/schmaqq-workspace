# KI-Assistenten mit SCHMAQQ Studio verbinden

Studio bietet einen MCP-Zugang unter **`https://studio.schmaqq.com/mcp`**. Jeder
Assistent mit MCP- und OAuth-Unterstützung kann ihn nutzen. Die Anmeldung läuft
immer über die Studio-Zustimmungsseite mit deinem eigenen Studio-Konto. Der Assistent
handelt danach mit deinen Rechten: nur deine Projekte, nur deine eigenen Ausführer
(PC oder Server-Worker), keine Veröffentlichung und kein Deployment.

Stand 29.10.2026. Lokal mit dem offiziellen MCP-SDK-Client nachgewiesen (beide
Registrierungswege). Die Verbindung aus echten ChatGPT-, Claude- oder Gemini-Konten
ist **noch nicht getestet**. Das ist der nächste Schritt, und er geht nur mit deinem Konto.

## Was der Assistent kann

| Werkzeug | Berechtigung | Zweck |
| --- | --- | --- |
| `list_projects`, `project_context` | Lesen | Projekte und Aufgabenkontext lesen |
| `list_executors` | Lesen | Eigene PCs/Server-Worker, Projektregel und aktuelle Empfehlung |
| `start_code_job` | Lesen + Code | Begrenzte Aufträge in einer eigenen Arbeitskopie; `device: "auto"` lässt Studio den Ausführer wählen |
| `get_code_job`, `cancel_code_job` | Lesen / Code | Ergebnis abfragen, eigenen Auftrag abbrechen |

## ChatGPT

Fest hinterlegter Client (kein Registrieren nötig):

- Server-URL: `https://studio.schmaqq.com/mcp`, Authentifizierung OAuth
- Client-ID: `schmaqq-chatgpt`, kein Client-Secret
- Rücksprung: `https://chatgpt.com/connector_platform_oauth_redirect` (in Studio hinterlegt)

Zeigt ChatGPT eine andere Rücksprungadresse an (`…/connector/oauth/…`), muss sie in
`STUDIO_PLUGIN_CLIENTS` ergänzt werden.

## Claude (claude.ai / Desktop)

Claude registriert sich selbst (Dynamic Client Registration oder Client-ID-Metadatendokument).
In Claude unter den Connector-Einstellungen einen **benutzerdefinierten Connector**
mit der URL `https://studio.schmaqq.com/mcp` hinzufügen und „Verbinden“ wählen.
Es erscheint die Studio-Zustimmungsseite mit dem Hinweis **„Nicht von SCHMAQQ hinterlegt“**
und dem Rücksprungziel `claude.ai`. Nur erlauben, wenn du die Verbindung gerade selbst
gestartet hast. Laut Anthropic nutzt Claude `https://claude.ai/api/mcp/auth_callback`
(künftig eventuell `claude.com`); beides ist ohne Studio-Konfiguration möglich.

Claude Code (Terminal): `claude mcp add --transport http schmaqq https://studio.schmaqq.com/mcp`,
danach in Claude Code `/mcp` zum Anmelden.

## Gemini CLI

```
gemini mcp add --transport http schmaqq https://studio.schmaqq.com/mcp
```

Beim ersten Zugriff erkennt Gemini CLI die Anmeldung automatisch, registriert sich und
öffnet den Browser; sonst `/mcp auth schmaqq`. Rücksprung ist eine lokale Adresse
(`http://localhost:<port>/oauth/callback`), die Studio für selbst registrierte Clients
erlaubt. Hinweis aus der Gemini-Dokumentation: Für manche Kontoarten wurde Gemini CLI
durch Antigravity CLI ersetzt. Die MCP-Adresse bleibt dieselbe.

## Andere MCP-Clients

Voraussetzungen: Streamable HTTP, OAuth 2.1 mit PKCE (S256) und entweder dynamische
Registrierung (`/oauth/register`) oder eine Client-ID-URL (Metadatendokument über HTTPS).
Erlaubte Rücksprünge: exakte HTTPS-Adressen oder lokale Loopback-Adressen. Discovery:
`/.well-known/oauth-protected-resource` und `/.well-known/oauth-authorization-server`.

## Verbindung trennen

Studio → **Team & eigene Verbindungen** → **Verbundene KI-Assistenten** → „Trennen“.
Der Zugriff endet sofort, auch für bereits ausgegebene Tokens.

## Betrieb

- `STUDIO_PLUGIN_CLIENTS`: fest hinterlegte Clients (JSON), z. B. ChatGPT.
- `STUDIO_PLUGIN_DYNAMIC_CLIENTS=1`: Selbstregistrierung und Client-ID-URLs erlauben.
  Begrenzungen: 30 Registrierungen pro Stunde, höchstens 500, unbenutzte verfallen nach
  7 Tagen; Metadaten nur von öffentlichen Adressen, ohne Weiterleitung, 5 s, 16 KiB.
