# SPRINT3-S03-013-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Fresh source-gap finding

Canonical result `_handoff-artifacts/results/SPRINT3-S03-013-LIVE-MENTORSHIP-QUEUE-MATERIALIZATION-A-20260921-R1/result.md` declares READY and lists production changes, but explicitly says the product change is only a working tree on top of `6e515b3e...` and is not committed. Fresh canonical master read confirms `packages/simulation-core/src/sprint3/materialize-live-mentorship-entrypoint-queues.ts` is absent (404). Therefore S03-013 is not actually published to canonical master and its READY disposition is not sufficient for Sprint3 closure.

## Required execution

1. Fresh-read canonical master and the S03-013 result before changing anything.
2. Claim this exact task ACTIVE in `CURSOR_A_INBOX.md`.
3. Recover the already-implemented S03-013 product diff from the lane A working tree if still present. Do not redesign the slice unless recovery is impossible.
4. Reconcile it onto current `origin/master` without overwriting B2 S03-009 or other concurrent work.
5. Ensure the production files named by the S03-013 result are actually present in canonical master after publication:
   - `packages/simulation-core/src/sprint3/materialize-live-mentorship-entrypoint-queues.ts`
   - `packages/simulation-core/src/sprint3/live-mentorship-queue-materialization.test.ts`
   - wiring in `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts`
   - required constants/export updates.
6. Run simulation-core build and the focused S03-013/S03-012/S03-003/S03-004/S03-007 regression set documented by the prior result. Run broader checks where feasible, but do not hide unrelated failures.
7. Commit and push the recovered product change to canonical `master`. A terminal READY is allowed only after a fresh GitHub/master read proves the product files are present at the published commit.
8. Publish terminal evidence to `_handoff-artifacts/results/SPRINT3-S03-013-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1/result.md`, including product commit SHA, verification commands/results, and canonical readback evidence; then return lane A to IDLE.

## Boundaries

- This is publication/reconciliation of S03-013 only, not a new feature slice.
- Do not consume or modify B2 S03-009 ownership/artifacts.
- Do not mark READY merely because tests pass locally; canonical master publication is the acceptance condition.
- If the prior working-tree diff is gone, reconstruct only from the prior S03-013 result and current Sprint3 source/contracts, then verify equivalence and publish.
