# Studio Linux CI — R2-A

## Scope

The workflow `.github/workflows/studio-linux.yml` verifies the actual self-hosted Studio path on GitHub-hosted **Ubuntu 24.04** with **Node 24.15.0**, and runs an isolated collaboration smoke flow. It is intentionally separate from the legacy Sites/Cloudflare starter.

This check does **not** deploy anything. It does not authenticate with OpenAI, run personal Codex jobs, contact the Hostinger VPS or modify the existing SCHMAQQ website. It uses synthetic local test accounts, a temporary bare Git repository, two locally launched runners and loopback-only Studio/demo origins.

## Triggers and permissions

- New and updated pull requests targeting `main` and pushes to `main`.
- Read-only repository permission (`contents: read`), checkout credentials are not persisted.
- No user secrets, build artifacts, model caches or database files are uploaded.
- A 20-minute timeout and concurrency cancellation prevent uncontrolled repeated test consumption.

## Checks

1. Checkout repository without persisted GitHub credentials.
2. Set up Node 24.15.0 on Ubuntu 24.04; record Node/npm/Git/Python versions.
3. `npm ci --no-audit --no-fund` using tracked package lock.
4. `npm run studio:verify` (source guard, backend contracts, TypeScript, Vite frontend build).
5. Start `selfhost/demo.mjs` on 127.0.0.1:4320/4321 and wait for its health endpoint.
6. Run `node selfhost/demo-smoke.mjs`: two independent sessions, worktrees, source editing, tests, preview and second-person approval against isolated fixture repositories.

## Interpreting results

A green workflow proves **this repository's source can be checked and the fixture flow executed on this Linux CI host**. It does **not** prove visible browser usability, two actual remote users, live provider sign-in, live Codex, persistent VPS operation, Cloud Browser acceptance or safety for external compute providers.

If CI fails:
- Inspect the specific failed step and job logs.
- Do not reinterpret an unexecuted/pending run as green.
- Fix only a reproducible failure in a new commit/PR. Do not remove tests or widen permissions merely to obtain a pass.
- Update `docs/STATUS.json` **only** after actual evidence is available, referencing the workflow run and environment (without embedding secrets).

## Local equivalent

On a Linux checkout with Node >=24.15.0, Git, Python 3 and npm:

```sh
npm ci --no-audit --no-fund
npm run studio:verify
```

For the demo flow, separately run `node selfhost/demo.mjs`; from a second terminal run `node selfhost/demo-smoke.mjs`. The demo writes private fixture data under ignored `.studio/`; do not upload it. Stop the demo after verification.

**Next gate:** real rendered Browser acceptance on desktop and mobile, followed by cross-device two-person pilot and separate VPS preflight. No deploy or merge is implied by CI success.

## First observed GitHub Actions run — 17 October 2026

- Workflow: [run #1](https://github.com/Spezzo-sudo/schmaqq-workspace/actions/runs/39014844042), PR #2, head `bb706a9d049bd1b9d9a65acc96c80cd37c1136e9`.
- Result: **failure**, completed. One job `Node 24 / Linux / Studio`, job ID `117344722493`.
- Evidence limitation: the jobs API returned `steps: []`, no runner name, and the job-log download responded `BlobNotFound` (HTTP 404). The wrapper for job steps also returned an empty list.
- Therefore **no npm install, test, type-check, build or demo result is currently proven by this run**. This is not proof of an application test failure either.
- Suspected possibilities (not confirmed): runner provisioning/Actions startup, permissions/organization policy, or another infrastructure-level pre-step failure. Do **not** assume one of these without further evidence.
- Next diagnostic: inspect the linked run's GitHub UI and any platform-level run annotation/message or contact GitHub support; confirm account/repository Actions availability. Once a runner starts and logs are available, address any actual failing step. No bypasses or blind changes to test gates.
