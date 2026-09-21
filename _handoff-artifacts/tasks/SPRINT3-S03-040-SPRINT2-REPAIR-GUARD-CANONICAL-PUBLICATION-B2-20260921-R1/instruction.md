# SPRINT3-S03-040-SPRINT2-REPAIR-GUARD-CANONICAL-PUBLICATION-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-S03-039-SPRINT2-REPAIR-REGRESSION-GUARD-B2-20260921-R1

## Objective

Recover the canonical-publication gap left by S03-039. Its terminal result says the Sprint2-repair/Sprint3 weekly production-boundary regression guard passed locally, but fresh GitHub master does not contain `apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts`.

Publish the already-verified S03-039 test-only regression guard to GitHub canonical master without changing Sprint3 semantics or A-owned Sprint2 core-loop implementation. Reconcile against current master first; do not blindly apply a stale local commit if A's repair has changed the seam.

## Required execution

1. Fresh-read protocol, this instruction, S03-039 result, current master source, and current Sprint2/Sprint3 status.
2. Claim this exact B2 task ACTIVE using the executor protocol.
3. Reconcile the S03-039 guard against current canonical master. If the production seam now differs, minimally adapt the test while preserving the accepted assertions: ordinary weekly processing remains exactly-once across tournament and non-tournament progression, no duplicate Sprint3 outcomes, deterministic replay.
4. Ensure the guard file is present on canonical GitHub master and run the focused test with the current companion competition auto-progression test where feasible.
5. Publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-040-SPRINT2-REPAIR-GUARD-CANONICAL-PUBLICATION-B2-20260921-R1/result.md` with exact canonical commit/readback evidence. READY is forbidden if the test remains local-only.
6. Return B2 inbox to IDLE only after terminal publication/readback.

## Non-conflict / constraints

- Do not alter A-owned Sprint2 core-loop repair semantics except if a minimal test compatibility adjustment is required; product behavior changes belong to the Sprint2 repair lane.
- Do not change Sprint3 formal-close state while Sprint2 remains reopened.
- Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/`.
- Do not consume or wait for any ROLE3 inbox.

## Acceptance

- canonical master contains the regression guard (or an explicitly equivalent canonical test with evidence),
- focused verification passes against current master,
- result binds exact canonical commit and readback,
- no local-only READY claim.