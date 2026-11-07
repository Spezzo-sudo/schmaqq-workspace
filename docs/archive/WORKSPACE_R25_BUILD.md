# R25 / Workspace Rooms — implementation contract

Status: isolated engineering branch; no merge, deployment, provider or account changes.

## One completed slice
A phone user creates a project without a local path, sends a project message,
turns that message into a linked task/decision, a second member sees and claims
that task, both can discuss it, add references and inspect the resulting work.
The same room shows real runner/model availability, explicit shared local-AI
consent, a bounded context preview and an explicitly requested AI job. A result
is not published to the team until its owner chooses to share it. Existing code
editing, checks, preview and independent review remain accessible inside the
selected task. Disconnected integrations are labelled as such, not simulated.

## Buzz inspiration, not wholesale integration
Primary reference: https://github.com/block/buzz (README, Apache-2.0).
Adopt room-first collaboration, people/agents with visible provenance, linked
conversation/work/results, and explicit approvals. No Buzz source copied, no
Nostr/Rust/Redis/Postgres replacement, no signing or federation claim.
Codex reference: https://developers.openai.com/codex/app-server.
Existing supported local runner/Codex/Ollama paths remain; no token sharing,
subscription pooling, new model API or remote shell exposure.

## Data and safety
Reuse existing projects/messages/tasks/comments/documents/jobs and namespaced
workspace_meta records. No CREATE TABLE, migration, global permissions or real
runner registration. Same-origin JSON POST, authenticated single-team boundary,
input bounds, idempotent creates, source-linked conversion, optimistic metadata
revision, strict link schemes, private AI job visibility, explicit result sharing.
Do not claim organization/multi-tenant isolation that does not exist.

## Acceptance
- Existing full Linux verification remains green.
- New API tests: no-path creation, retries, conversion provenance, cross-project
  refusals, stale update, unsafe URLs, auth/origin, private AI results and sharing.
- Real Chromium desktop/mobile with two synthetic accounts: project -> room ->
  message -> task -> second-person claim/comment -> result; refresh/back/draft.
- Extracted immutable release: manifest, source and runtime smoke.
- Preserve production R24, PR38 branch and personal machines/profiles.

## Evidence boundaries
The local .workbrain.json workbasis is not available in the connected checkout.
Use its explicit AGENTS/docs/source boundaries instead; no drive-wide search.
No real provider inference or real Markus device test without those connections.
SMTP/recovery deployment remains a separate operator task, not silently solved.
