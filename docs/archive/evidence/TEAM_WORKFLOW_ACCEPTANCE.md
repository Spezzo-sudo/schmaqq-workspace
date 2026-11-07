# Team workflow: local acceptance evidence

Date: 2026-10-26. Candidate branch: `feat/team-workflow-20261026`.
Resolve the precise source revision with Git. This is a local implementation and
acceptance record, not production approval. No production data or real provider
repository was changed. No personal credentials or runtime fixture files belong
in this record.

## Automated source verification

Final command: `node selfhost/verify.mjs --local`, Node 24.22.1 on Windows.

- 208 tests; 187 passed, 0 failed, 21 explicitly skipped for Linux/operator scope.
- Source Guard, TypeScript and Vite production build passed.
- The approximately 504 kB JavaScript bundle triggers Vite's nonfatal size warning.
- Verifier conclusion: localDevelopment PASS, linuxOperatorRecovery NOT_VERIFIED,
  fullVerification INCOMPLETE, releaseApproved false.
- The private local run log is `.studio/team-delivery-verified.log`; it is not a
  release artifact and must remain outside Git.

New integration coverage includes guarded completion through both new and legacy
APIs, independent version-bound general-result review, atomic task edits and stale
revision rejection, knowledge history/archive/restore, own-runner setup and canonical
repository checks, retained archived review diffs, stale takeover and job leases,
safe file creation and command parsing, and empty normal installation. Managed
project setup exercises real disposable Git clones. GitHub adapter tests exercise
exact provider identity, repository/base/head, dismissed reviews, changing task
contracts, expected merge SHA and confirmed completion against an isolated provider
double. They do not prove live GitHub account integration.

## Visible browser acceptance

Two synthetic user sessions represented Marco and Markus. Two actual runner
processes used separate Git clones and runner states on this one Windows PC.
The remote was an isolated local bare Git repository. The browser operated the
production-built candidate with an isolated SQLite database.

Observed complete flows:

1. General task: author records result; peer sees the review in Meine Arbeit,
   approves that result version; author completes. Reopening requires a new result.
2. Code task: prepare personal copy, read/edit/save a real source file, run checks,
   build static preview, share branch, inspect actual Git diff as peer, independently
   approve, merge with the peer's runner; confirmed integration completes the task.
3. Reopened code task: new file through the inline form, real save, dirty draft blocks
   submission, new tested submission and exact-version preview. After stopping the
   author's synthetic runner, the peer still reads the shared preview and approves
   and merges using the peer runner. Completion is confirmed.
4. Knowledge: create, edit, view older version, archive, find in archive, restore;
   search with no matches gives an explicit empty state.
5. Conversation: post a project idea and convert it to a task. Claim, record a
   blocking reason, explicitly take over as the other member with a reason. The
   existing block and source conversation survive. The final source reload and
   expanded conversation origin were checked again after restarting the candidate.
6. Mobile at 390 x 844: page width 390, task columns width 358 and zero overlap;
   Projektbereich selector reaches project conversation, tasks and knowledge.
   The task view fits the screen. Desktop project navigation also remains visible.

The run found and fixed unsupported native prompt dialogs and mobile navigation /
column layout problems; the affected flows were repeated successfully. No captured
browser errors were present in the fresh final-source browser tab. This statement
does not erase earlier development errors or claim exhaustive browser compatibility.

Screenshots and a compact machine-readable browser record were saved in the local
chat's user-facing output folder, separately from the source repository. Test server
ports and private fixture identities are deliberately not part of release configuration.

## Acceptance boundaries

- One physical Windows PC; actual second physical device and real member onboarding
  remain a human pilot.
- No real GitHub repository creation, provider review or merge was performed.
  Personal repository credentials and provider permissions require real-account
  acceptance; OAuth identity alone is insufficient.
- No genuine personal AI inference or private subscription access is claimed.
- Linux backup/restore, operator recovery and historical production acceptance
  remain open. Existing historical H3 issues are not resolved by this candidate.
- No simultaneous shared editor buffer, fork PR support or merge-queue support.
- No push, real repository merge or deployment is authorized by this record.

Operational details and user-visible behavior are described in `../TEAM_WORKFLOW.md`.
