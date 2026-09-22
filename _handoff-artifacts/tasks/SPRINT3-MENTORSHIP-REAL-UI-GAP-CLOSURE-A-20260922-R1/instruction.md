# SPRINT3-MENTORSHIP-REAL-UI-GAP-CLOSURE-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Context

Sprint3 is binding `REOPENED_FIX_REQUIRED`: current-master production build/start/ordinary real-UI proof must be re-established before closure. B2 concurrently owns `SPRINT3-COMPLETED-OUTCOME-CANONICAL-PUBLICATION-RECOVERY-B2-20260922-R1` and may edit `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`; A must not touch that file or duplicate B2 runtime validation work.

The prior Sprint3 product work added person-detail formal-master/formal-disciple observability and browser evidence, but the reopened status requires current-master real-user UI verification and concrete product-gap closure rather than relying on historical evidence.

## Required execution

1. Fresh-read `GITHUB_CONTROL_PLANE.md`, A/B2 lane state, Sprint3 status, newest Sprint3 results/tasks, current master source, and relevant Sprint3 mentorship/person-detail UI tests before editing.
2. Claim A ACTIVE per executor contract.
3. Bind a fresh canonical `origin/master` SHA. Do not consume or wait on any ROLE3 inbox.
4. Audit the ordinary real user-facing person-detail mentorship flow on that SHA: a person with a formal master must show the master's player-facing display name and navigate to the correct person; a master with formal disciples must show player-facing disciple names and navigate correctly; absence states must be intelligible and must not expose raw person IDs as the visible label.
5. If any of those behaviors are missing/broken on current master, implement the smallest production fix in `apps/web/**` and focused tests. Do not edit B2-owned Sprint3 runtime-state validation paths. If all behaviors are already correct, do not manufacture a source change: produce fresh browser evidence that proves the complete ordinary flow on current master.
6. Run the relevant Person Detail unit tests, web typecheck, and a real Chrome Playwright flow through the ordinary application UI. Production build/start must be used where the repository acceptance harness supports it; do not substitute source inspection for browser proof.
7. If a production change is required, publish it to canonical GitHub master and verify readback. Record exact product SHA. If no production change is required, record exact tested canonical SHA and `NO_PRODUCT_DELTA_REQUIRED` with browser evidence.
8. Publish terminal result at `_handoff-artifacts/results/SPRINT3-MENTORSHIP-REAL-UI-GAP-CLOSURE-A-20260922-R1/result.md` with concrete evidence and any remaining blocker.
9. Do not alter Sprint2/Sprint3 status labels and do not claim formal CLOSED. Do not run a full root gate; a post-product/current-master release gate is separate control work.

## Non-conflict / hygiene

- B2 owns completed-history runtime validation/publication; do not touch its source path or control files.
- No broad stash/clean and no untracked-file removal.
- Any transient scratch/worktree must be under `_handoff-artifacts/control-tmp/`, never directly under `_handoff-artifacts/`.

## Acceptance

Terminal only with either (a) canonical product fix + GitHub readback + focused/browser verification, or (b) fresh current-master browser evidence proving the complete Sprint3 mentorship person-detail flow and an explicit `NO_PRODUCT_DELTA_REQUIRED` finding. Status-only output is not acceptance.
