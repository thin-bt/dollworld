# SPRINT2-REOPEN-CORE-LOOP-CANONICAL-PUBLICATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint2
mode: CANONICAL_PUBLICATION_RECOVERY
authority-ref: GitHub thin-bt/dollworld master @ b151a4638678c5aa3c5ff0170317048683dbf1ad
priority: DEADLINE_CRITICAL
predecessor-result: _handoff-artifacts/results/SPRINT2-REOPEN-CORE-LOOP-REPAIR-A-20260921-R1/result.md

## Objective

Publish the already verified Sprint2 ordinary tournament core-loop repair represented by local product commit `ed123ca5763172184458db67af602efc6629f878` onto current GitHub canonical `master`, without losing intervening canonical changes (including the S03-040 regression guard), then verify canonical readback.

The predecessor result explicitly says the product commit is local-only while GitHub master lacks the repair. This publication gap is a release blocker because Sprint2 remains `REOPENED_FIX_REQUIRED` and blocks Sprint3 formal close.

## Required execution

1. Fresh-read `GITHUB_CONTROL_PLANE.md`, `SPRINT2_STATUS.md`, current A/B2 lane state, this instruction, predecessor result, and fresh `origin/master`.
2. Claim lane A ACTIVE for this exact task-key before product/recovery work.
3. Reconcile/cherry-pick or reconstruct the bounded `ed123ca` production delta on top of fresh canonical master. Preserve all intervening canonical commits; do not force-push or rewrite history.
4. Ensure the S03-040 canonical guard file remains present and compatible.
5. Run at minimum:
   - `competition-auto-progression.test.ts` + `ui009.competition.test.ts`;
   - `sprint2-repair-sprint3-weekly-regression-guard.test.ts`;
   - the predecessor extended slice (`ui003.simulation`, `sprint2-checkpoint-resume`, `ui006.mock-battles`).
   Run broader/root check if feasible after the focused gates.
6. Publish the reconciled product commit to GitHub canonical `master` in this pickup where feasible.
7. Fresh-fetch/read back GitHub master and prove the production paths from `ed123ca` are now canonical and the S03-040 guard is retained.
8. Publish terminal result under `_handoff-artifacts/results/SPRINT2-REOPEN-CORE-LOOP-CANONICAL-PUBLICATION-A-20260921-R1/result.md`, with exact canonical commit SHA, tests/counts, changed paths, and any remaining blocker. Return lane A to IDLE only after terminal publication.

## Collision guard

- Do not modify B2 control state or consume any B2 task.
- Preserve canonical S03-040 guard and unrelated post-`ed123ca` master history.
- Do not change Sprint2/Sprint3 binding status to CLOSED in this task; this task closes the product-publication gap only. Re-acceptance remains a separate evidence/status transition.
- Transient scratch/worktrees must be under `_handoff-artifacts/control-tmp/`, never directly under `_handoff-artifacts/`.

## Terminal criterion

READY only if the repaired ordinary tournament progression is present on GitHub canonical master, required focused gates PASS, intervening canonical guard/history is retained, and GitHub readback proves the exact published SHA. Otherwise publish BLOCKED with concrete evidence; do not claim publication from local-only state.