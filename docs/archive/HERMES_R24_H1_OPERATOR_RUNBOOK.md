# HERMES – R24-H1 Studio Production Preflight + Local Backup/Restore

**Owner-authorized scope:** inspect Production **read-only**, create a **new**
protected **local backup**, copy it into a disposable protected
restore directory and test it. **Do not** modify live database
tables, environments, systemd, Traefik, Docker, network, credentials,
providers or the running Studio release. **NO MERGE / NO DEPLOY.**

The owner has specifically deferred **offsite** backup configuration.
Do not enable offsite transfers or export confidential data.

## 0. Identity and exactly pinned source

Obtain the **HEAD commit SHA of R24-H1 Draft PR** from GitHub and use
that **exact immutable Git object**. Confirm it descends from R24-G2
`a414e69e53f17c25ebb69911c24d9d992481d154`. Inspect the
final diff of `selfhost/deploy/r24-local-backup.mjs` and its test
file before any privileged execution.

Do **not** execute code as root directly from the writable
`/home/dc-remote/` worktree.

Instead use an exclusively root-owned temporary staging directory
with permissions 0755 (scripts/read-only, no secrets in it),
populated from `git archive <PINNED_SHA>` for exactly:

- `selfhost/deploy/r24-local-backup.mjs`
- `selfhost/deploy/schema-preflight.mjs`
- `selfhost/deploy/schema-migration.mjs`
- `selfhost/deploy/schema-baseline.v0.json`
- `selfhost/backup.mjs`
- `selfhost/store.mjs`

Refuse symlinks, untracked files, changed source tree, a mismatched
expected SHA, insecure ownership or an executable from another branch.
Run the JS using the existing verified
`/opt/schmaqq-studio/runtime/node/bin/node` **as the actual
`schmaqq-studio` service user**, not root. Use a clean environment
without inherited credentials, `NODE_OPTIONS`, untrusted
`NODE_PATH` or custom preload modules.

Temporary staging can be placed in a protected root-owned
`/var/tmp/schmaqq-r24h1-tools-*` directory. The live
`/opt/schmaqq-studio/current` link **must remain unchanged**.

## 1. Operator read-only preflight

Check and report only *sanitized results*, not private SQL rows,
emails, names, cookie hashes, environment contents or raw SQL
definitions:

- Running source release + manifest provenance and live
  `/healthz` (HTTPS 200/TLS valid).
- Studio service identity, `StateDirectory`, `EnvironmentFile`
  *path/permissions only*, Node version and app listen ports.
- Data store expected under `/var/lib/schmaqq-studio`, owned by
  `schmaqq-studio`, directory mode 0700.
- Available disk space and inode budget. Abort before snapshot if
  insufficient for **at least twice** the existing SQLite size,
  plus the new local backup and protected recovery configuration.
- Confirm there are no additional persistent state files or directories
  not covered by the fixed allowlist in H1. Do **not** skip
  unrecognised state just to obtain PASS.

Run as `schmaqq-studio` against the **existing live file**:

    /opt/schmaqq-studio/runtime/node/bin/node \
      <ROOT_OWNED_STAGING>/selfhost/deploy/schema-preflight.mjs \
      --db /var/lib/schmaqq-studio/studio.sqlite

Then run the **read-only** migration plan:

    /opt/schmaqq-studio/runtime/node/bin/node \
      <ROOT_OWNED_STAGING>/selfhost/deploy/schema-migration.mjs \
      --db /var/lib/schmaqq-studio/studio.sqlite

**Do not call the synthetic migration executor on Production.**
No `PRAGMA user_version=1`, no manual schema changes, no
`openStore()` against the live database.

If schema or integrity is BLOCKED, do not attempt a migration,
service restart or deployment. Creating a consistent backup may
still be appropriate; it must report the release gate as BLOCKED.

## 2. Explicitly authorized local backup + physical restore

Only after verifying the staged code and available protected disk
space, run **as schmaqq-studio**, not as root:

    /opt/schmaqq-studio/runtime/node/bin/node \
      <ROOT_OWNED_STAGING>/selfhost/deploy/r24-local-backup.mjs \
      --data-dir /var/lib/schmaqq-studio

This tool writes a uniquely named private directory under the real
`/var/lib/schmaqq-studio/backups/r24-h1-*`. It does not overwrite
prior backups.

Internally it creates an online **VACUUM INTO** SQLite snapshot,
includes the committed WAL frames and the optional private
`setup-link.txt`, restores those files into a disposable protected
directory, verifies hashes, SQL integrity and relational integrity,
and invokes **R24 `openStore()` on the restored copy ONLY**.
The original database is never opened for write by this process.

The snapshot and the detailed operator-private JSON report **must**
stay protected on the VPS, mode 0700 directory / 0600 files.
The disposable restore copy must be gone after the test.

A `releaseSchemaGate=BLOCKED` code must never be rewritten to PASS.
A successful physical restore is **not** a migration.

Do not paste full database paths, SQL table data, member
counts, bootstrap URLs, credentials, snapshot file contents or
private operator JSON into a public comment. The SHA256 of the new
backup and a boolean result may be reported without contents.

## 3. Root-exclusive configuration/recovery kit

The Studio StateDirectory snapshot **does not** include the
systemd EnvironmentFile or release binaries. These are required
for real disaster recovery. In a **separate newly created root-only
private local recovery directory** (mode 0700) store, read-only
from their sources:

- `/etc/schmaqq-studio.env` including exact bytes,
  in a backup file with mode 0600; **never display or print contents**.
- The active `schmaqq-studio.service` unit file and
  related non-secret unit/override metadata.
- A pinned copy of the **currently deployed R23 release artifact**
  (including source manifest) and its runtime version/provenance.
- **Sanitized only**: active Traefik router mapping, relevant
  Docker route-container metadata, and any external volumes/
  ACME/certificate material required for complete recovery.
  If those cannot be securely inventoried/copied, report
  `ROOT_CONFIG_KIT=BLOCKED`; do not improvise privileged access or
  export TLS/private keys.

For all copied privileged files: verify owner-only storage, compare
SHA256 of source and backup, do not print raw environment values
or secrets. Leave existing Traefik, routing, unit, Node binary,
Production symlink and provider accounts unchanged.

The operator must explicitly state the scope that is actually
restorable. A **full-VPS/host-recovery claim is not supported**
unless it has its own separate verified restore plan.

## 4. End-of-run gates and evidence

Health check again: `https://studio.schmaqq.com/healthz` returns
HTTP 200 and TLS verified; Studio, PR16 and PR17 remain active.
No temporary debug listeners, runners or restore files remain.
Do not run actual Production user logins.

Return **only** this sanitized outcome:

    SOURCE_SHA=<actual pinned candidate>
    PRODUCTION_SHA=<unchanged live R23>
    NODE_VERSION=<exact>
    SCHEMA_PREFLIGHT=PASS|BLOCKED
    SCHEMA_USER_VERSION=0|OTHER|UNKNOWN
    SQLITE_INTEGRITY=PASS|BLOCKED
    FOREIGN_KEYS=PASS|BLOCKED
    MIGRATION_PLAN=READY|BLOCKED|CURRENT
    STUDIO_STATE_INVENTORY=COMPLETE|BLOCKED
    WAL_CONSISTENT_LOCAL_SNAPSHOT=PASS|BLOCKED
    BOOTSTRAP_STATE_COVERED=YES|NOT_PRESENT|BLOCKED
    PHYSICAL_RESTORE=PASS|BLOCKED
    R24_OPENSTORE_RESTORE=PASS|BLOCKED
    ROOT_CONFIG_KIT=PASS|BLOCKED
    BACKUP_PRIVATE_PERMISSIONS=PASS|BLOCKED
    BACKUP_SHA256=<only when successful>
    R24_SCHEMA_GATE=PASS|BLOCKED
    POST_HEALTH=PASS|FAIL
    PRODUCTION_DB_WRITES=NO
    PRODUCTION_RUNTIME_CHANGED=NO
    PRODUCTION_RESTARTS=NO
    MIGRATION_APPLIED=NO
    DEPLOYMENT=NOT_PERFORMED
    SECRETS_EXPORTED=NO

If anything is unverified, use **BLOCKED**, not an assumption.
Do not merge R24 or enable `STUDIO_TRUSTED_PROXY_IPS`.
GitHub Actions remains separately blocked by billing; do not
equate local tests or this backup with a green CI run.

**This audit/backup does not authorize Production deployment.**
