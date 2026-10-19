# R23 Production Release Handoff - PR18 baseline reconciliation

Date: 2026-10-19. **DOCUMENTATION ONLY / NO DEPLOYMENT AUTHORIZATION.**
Repository: `Spezzo-sudo/schmaqq-workspace`.

## Why the former run stopped

Original handoff expected current Production source `4a0092be2d04a4b66aa1d200cf7c9f9c53c4c47d`; privileged operator observed `a4dfdfefbc16b29222337e2488245157bc2cd10d` (PR18) and stopped before any Production mutation. Operator report: service active, healthz 200, database integrity OK, zero FK failures, PR16 and PR17 unchanged, no deployment, no backup run, temporary candidate removed. These are **operator-reported observations**, not a new independent live audit.

## Corrected source relationship (GitHub independently checked)

- Observed Production PR18 source, **expected only if freshly re-confirmed**: `a4dfdfefbc16b29222337e2488245157bc2cd10d`.
- Proposed R23 source: `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`.
- GitHub compare `a4dfdfef...aef64f85...`: **ahead 3; behind 0; merge base exactly PR18**, 14 changed files. No source-history rebase required.
- R23 is the *stacked* Draft PR #21, not a direct change from `main`. PR #20 records audit findings; PR #19 concerns the separate PR17 pilot lane.
- Operator-reported candidate artifact integrity: archive SHA256 PASS, 703/703 manifest entries and 703/703 manifest hashes PASS. **Exact archive SHA256 digest and filesystem path were not supplied in the blockage report**: operator must obtain/verify them afresh rather than guess.
- R23 local acceptance documentation reports 31 backend tests, TypeScript/build/source guard PASS, 9 Chromium browser checks PASS, extracted release smoke PASS, under isolated conditions. **Not a new Production acceptance or independent runtime verification.**
- R23 GitHub PR inspection is optional, read-only and disabled until dedicated project repository mapping and minimal read-only token are separately authorized. No CI/review/merge gate is thereby bypassed.

## Required revalidated PRECHECK (read-only, fail closed)

1. Privileged operator must independently re-read current Production release symlink and exact source SHA immediately before any action. It **must equal** `a4dfdfefbc16b29222337e2488245157bc2cd10d`; otherwise **STOP: STALE_HANDOFF** and reconcile again.
2. Confirm service status, current HTTPS/auth/healthz, current data/DB integrity/FK checks, storage capacity, release ownership/perms and PR16/PR17 status. No secrets or personal data in evidence.
3. Inspect the exact R23 artifact's trusted provenance, full digest, 703-entry manifest and all file hashes, plus reproducible extracted-runtime smoke. Do not substitute Git SHA for archive SHA256.
4. Confirm runtime config compatibility with PR18 and assess additive schema/change impact, including SQLite WAL/SHM and backup/restore expectations. Identify DB migrations, old-release reversibility and any new operational configuration before authorizing a switch.
5. Obtain independent review of PR #21 current exact head and relevant negative regression checks, including B01 history/draft preservation and fail-closed GitHub PR status. Resolve any branch drift; this handoff's fixed candidate SHA is not permission to deploy a newer head.

## Separate owner GO - NOT GRANTED BY THIS DOCUMENT

Only after precheck passes: request explicit owner authorization naming exact artifact/source, target **SCHMAQQ Studio Production only**, and approved maintenance/rollback scope. A previous deployment authorization does not extend to R23. No merge, other service, DNS, Stripe, account, invitations, runners, provider registration or market activation is included.

## Operator execution after owner GO only

1. Serialize deployment; refuse concurrent promotions. Take new protected, consistent **Production SQLite online backup** including a separately tested restore, verify integrity and foreign keys, document count/scope without sensitive row data. Retain the known-good PR18 release and rollback artifacts.
2. Verify current-release SHA *again under deployment lock*; abort on mismatch. Promote **exact** verified R23 artifact without modifying persistent data outside an explicitly approved migration path. Keep environment and secrets out of the release.
3. Restart/switch **only Studio Production** using existing approved service topology. Probe /healthz and HTTPS authentication, retained owner session, tasks/comments, file editor and saved drafts, Git reviews, preview and current runner state. Perform no synthetic real-user account creations/jobs.
4. If any gate fails, stop progression, restore **code and compatible data/config state** per rehearsed plan; do not assume code-only rollback can undo a database schema or data mutation. Recheck Production/PR16/PR17.
5. Publish sanitized evidence: current-before/after source, artifact SHA256, manifest verification, backup and restore outcome, auth/health, DB integrity/FK, PR16/PR17 unchanged, test results and final GO/NO-GO; redact credentials and private URLs/tokens as needed.

## Current decision

`R23_HANDOFF_SOURCE_RECONCILED=PASS` (GitHub ancestry only).
`R23_LIVE_PRECHECK=NOT_RUN`.
`R23_BACKUP_RESTORE=NOT_RUN`.
`R23_OWNER_PRODUCTION_GO=NOT_GRANTED`.
`R23_DEPLOYED=NO`.
`FINAL=PREPARED_ONLY_BLOCKED_PENDING_GATES`.

Source references: GitHub Draft PR #21, Audit Draft PR #20, `docs/R23_LOCAL_ACCEPTANCE.md` at R23 candidate source, and user-supplied privileged operator blocked-run report. This documentation intentionally does **not** mutate an active handoff or downgrade its stale-current safety guard.
