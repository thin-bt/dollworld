# SPRINT2-A-R14-FIX-INTEGRITY-AUDIT-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: FIX_INTEGRITY_AUDIT
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-B2-ACCEPTANCE-UNBLOCK-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: NO_B2_CONTROL_OR_PLAYWRIGHT_EDITS_WHILE_B2_REACCEPTANCE_IS_RUNNING

## Objective

Do not leave A idle while Sprint2 is unfinished. Independently harden and verify the A-side product fix produced by the acceptance-unblock task, without touching B2-owned browser/control surfaces while B2 performs the mandatory 7/7 verdict.

## Required work

1. Fresh-read the predecessor READY result and inspect the current host worktree diff for the product fix in `competition-participant-preview.ts`, `map-competition-view.ts`, and associated A-owned unit tests.
2. Verify the diff is minimal and internally coherent: accepted F-slot integration remains round-robin (<=4 entrants), terminal lifecycle cannot expose false finished at projected 0/0, and future-reserve knockout behavior is not accidentally promoted or deleted.
3. Add or strengthen A-owned focused unit/regression coverage only if a concrete uncovered edge is found. Do not edit Playwright specs, B2 inbox/control, or B2 result files while B2 is running.
4. Run bounded relevant vitest/typecheck/lint verification for touched A-owned surfaces. Do not run the B2 full browser suite.
5. Inspect for unintended collateral dirty changes around the predecessor fix and report exact paths; do not revert unrelated user/other-lane work.
6. No commit, stash, apply, alternate worktree/repo, Sprint3/4, or future-reserve implementation.
7. If B2 publishes FIX_REQUIRED during this task and the blocker is A-owned/non-conflicting, consume it and fix the smallest proven product slice before terminal output. If B2 is still running, finish this audit without interfering.

## Terminal output

Publish `_handoff-artifacts/results/SPRINT2-A-R14-FIX-INTEGRITY-AUDIT-20260919-R1/result.md`.
READY requires concrete diff evidence plus bounded verification; status-only is not READY.
