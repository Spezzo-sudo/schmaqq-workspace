# SCHMAQQ Studio R23 - bounded live preflight evidence (2026-10-19)

**Scope:** Authenticated, nonprivileged operator access to existing VPS; Production checks read-only. Testing was confined to existing developer worktree and disposable loopback fixtures. **No Production deployment, service restart, live database access, backup creation or provider mutation.**

## Exact inputs

- Repository: `Spezzo-sudo/schmaqq-workspace`.
- Live Studio expected prior source PR18: `a4dfdfefbc16b29222337e2488245157bc2cd10d`.
- R23 candidate SHA (stacked Draft PR #21): `aef64f85efeeb40f6c0f3a7dc43986a52a20f09f`.
- R23 original archive SHA256: `1a927d7eba4d5becf749401baaf2ab5f02cd8e004577258c9a3cd069331e6768`.
- Archive: `/home/dc-remote/schmaqq-studio-r23-local-20261019/.studio/releases/2026-10-19T19-42-54-083Z.tar.gz`.

## Observations from nonprivileged shell

| Gate | Actual evidence | Decision |
| --- | --- | --- |
| Identity | `uid=1001(dc-remote)`; service runs as `schmaqq-studio` | Restricted operator context |
| Production symlink | `/opt/schmaqq-studio/current` resolves to exact PR18 source above | PASS |
| Production service | `schmaqq-studio.service` active/running | PASS |
| HTTPS | `https://studio.schmaqq.com/healthz` HTTP 200, TLS verify result 0 | PASS, public health only |
| PR16 | `schmaqq-studio-pr16.service` active | PASS, health beyond service not retested |
| PR17 | `schmaqq-studio-pr17.service` active | PASS |
| R23 staging | `/opt/schmaqq-studio-pr17/runtime` resolves to exact R23 source above | PASS |
| PR17 public unauthenticated | HTTPS health 401, TLS verify result 0 (BasicAuth boundary) | Expected restricted response, NOT authenticated acceptance |
| Free disk | 27 GB available on / | PASS |
| Production manifest | 702/702 files readable, bytes/sha256 match, 0 failures | PASS |
| Staging R23 manifest | 703/703 files readable, bytes/sha256 match, 0 failures | PASS |
| R23 archive and source directory | Archive digest matches the Handoff exactly; 703/703 directory hashes and 703/703 tar contents pass, no extras beyond manifest | PASS |
| R23 staging vs verified local artifact | Manifest path/hash/size maps exactly equal | PASS |
| Code ancestry | PR18 is exact Git merge base of R23: ahead 3, behind 0 | PASS |
| Relevant diff | 14 files; `selfhost/store.mjs`, `selfhost/backup.mjs`, `selfhost/reviews.mjs` unchanged | PASS source-only, runtime config not inspected |
| R23 exact-head verification | Node 24.22.0 `node selfhost/verify.mjs`: source guard, 31/31 backend tests, TypeScript, Vite build, exit 0 | PASS isolated worktree |
| Synthetic migration/rollback | PR18 fixture account+task -> R23 retained login/task, SQLite integrity/FK clean -> PR18 restore with data PASS | PASS fixture ONLY |
| Isolation postcheck | Production remains PR18, PR16 and PR17 active, Production public health 200, no leftover fixture, source checkout clean | PASS |

**Root-access boundary:** `/var/lib/schmaqq-studio` is protected (0700 owned by `schmaqq-studio`); `dc-remote` has no traverse/read access. `sudo -n` is denied because `no_new_privileges` is active. No attempt was made to bypass this boundary. No live SQLite integrity/FK check or backup/restore was performed by this preflight.

**Archive SHA mismatch explanation:** Four time-stamped R23 archive builds exist. The earlier inspected 19:15 UTC archive had digest `35920bc4...`; the release handoff correctly references the later 19:42 UTC archive `1a927d7e...`. The final artifact is available, unchanged, and independently hash-verified.

## Privileged operator-required gates before a production switch

1. Fresh current-release SHA comparison under an exclusive deployment lock (expect PR18 exact SHA; mismatch => STOP).
2. Verify live Studio environment and data location **without printing secrets**; check configured origins, service ownership, startup permissions, effective schema/config, and live DB integrity/FK.
3. Take a **consistent full Production backup** with a real restore test under appropriate privileged service access, preserving sessions, members, devices, tasks, comments, workspaces, preview artifacts, and provider state. Ensure sensitive backup material stays root/service-owned.
4. Confirm no backward-incompatible changes to live persistent data and a rehearsed code/data/config rollback to PR18.
5. Obtain a separate, explicit scoped owner Production GO; the current read-only task and plugin permission settings do not authorize deployment.
6. Only then carry out strictly scoped Studio Production promotion and postchecks. Leave PR16, PR17, DNS, billing, Stripe, provider and runner configurations untouched.

## Conclusion

`R23_GIT_ANCESTRY=PASS`
`R23_EXACT_ARTIFACT=PASS`
`R23_STAGING_ARTIFACT=PASS`
`R23_NODE_VERIFY=PASS_31_OF_31`
`R23_SYNTHETIC_UPGRADE_ROLLBACK=PASS`
`PROD_RUNTIME_AND_HTTPS=PASS`
`LIVE_PRODUCTION_DB_INTEGRITY=NOT_RUN_PRIVILEGED`
`LIVE_PRODUCTION_BACKUP_RESTORE=NOT_RUN_PRIVILEGED`
`OWNER_PRODUCTION_GO=NOT_GRANTED_IN_THIS_RUN`
`PRODUCTION_CHANGED=NO`
`FINAL=PRECHECK_PARTIAL_PASS__WAIT_PRIVILEGED_DB_BACKUP_RESTORE_AND_OWNER_GO`

This is a sanitized engineering report, not an independent third-party signoff, and must not replace privileged runtime evidence.
