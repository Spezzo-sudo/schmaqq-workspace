# SCHMAQQ Workspace – R4 Deployment Candidate RC1

_Status: Prepared, not deployed. 17.10.2026._

## Immutable source identity
- Source repository: `Spezzo-sudo/schmaqq-workspace`.
- First complete merged main commit: `4a99b5e770af93147ef514b3548f250013e069af` (PR #1, #2, #3 merged).
- Runtime source before R4 docs/template merges tested at `51786459aa9aef83600581f9977309e7bdd77e2e`. No runtime source changes in the three merges, **but the final merged SHA must still pass the release test before activation**.
- This RC document does **not** approve any merge/release automatically; if new commits land on main, re-pin and retest.
- R4 systemd template changed in PR #3 to point to `/opt/schmaqq-studio/runtime/node/bin/node`, a **future** isolated Node >=24.15 path. Not installed.

## Existing evidence
- Linux check: 13/13 backend, TypeScript, Vite frontend build PASS.
- Two fixture members + runners: edit, Git worktrees, preview, SHA-bound mutual review PASS.
- Headless Chrome desktop 1440 x 900/mobile 390 x 844: login and navigation PASS; not manual UI approval.
- Release archive generated from historical source and independently unpacked: manifest SHA checks, HTTP assets, bootstrap/auth PASS.
- Fixture-only SQLite `VACUUM INTO` backup and fresh restore: DB integrity, foreign keys, member, project, task and document PASS.
- No claim that live service/backup from production or remote users has been tested.
- VPS test files all cleaned up; no daemon, no DNS, no proxy changes.

## Final RC gate – must all pass before owner GO
1. Verify main SHA, clean checkout, source guard, install/TypeScript/tests/build of exact candidate. Build only in disposable, unprivileged VPS workdir (initial max 3 GiB growth), isolated HOME/npm/TMP and Node24; then remove all build caches.
2. Build minimal tarball and check SHA256 manifest in the **unpacked** artifact, release smoke with isolated data, bootstrap and explicit no-access checks; restore fixture from backup. Calculate final release SHA256.
3. Confirm separate runtime path exists, pinned to verified official Node distribution without global Node changes, and systemd unit never references Node22.
4. Read-only dry-run of service user, owner and 0700 data permissions, dedicated `/opt/schmaqq-studio` and `/var/lib/schmaqq-studio` paths. Never overwrite existing folders without inventory.
5. Choose **two distinct verified HTTPS origins** (studio app and static preview). Validate DNS/TLS, Traefik routes, protected cookie behaviour and rollback on exact target host. No publicly exposed raw TCP ports.
6. Confirm backup location, off-server copy, retention and live restore in isolated instance. Fixture restore alone is not sufficient.
7. Owner separately authorizes production-facing Studio deployment and domain/router changes. Until then **do not start systemd, edit Traefik, Docker, DNS, or expose the Studio.**
8. Once owner GO granted: one owner account and one invited second account; test remote login from two independent clients, runner offline/online, edits, review, preview, negative authorization cases and post-start existing live sites.
9. Check original apps on schmaqq.com, preview.schmaqq.com, klimafinder.ch remain HTTP 200; monitor disk/RAM and roll back **only Studio-related** changes upon failure.

## Current release status
```text
RC_SOURCE_SHA=4a99b5e770af93147ef514b3548f250013e069af
RC_MAIN_MERGE=PASS
RC_SOURCE_LINUX_TEST=NEEDS_FINAL_SHA_RECHECK
RC_RELEASE_ARTIFACT=NOT_BUILT_FOR_FINAL_SHA
RC_RUNTIME_NODE24=NOT_INSTALLED
RC_TLS_ORIGINS=NOT_CONFIGURED
RC_LIVE_RESTORE=NOT_RUN
RC_OWNER_DEPLOYMENT_GO=NO
RC_PRODUCTION_CHANGE=NO
```

Prefer small, reversible modifications on the **existing** paid VPS. Do not provision a new server or cloud runner.
