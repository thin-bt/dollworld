# SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1

state: PREPARED
sprint: Sprint2
owner: Cursor A
priority: IMMEDIATE
control-authority: GitHub
createdAt: 2026-09-19T08:00:25+09:00

## Objective
Close the remaining Sprint2 publication/integrity gate identified by the post-contract completion audit and lint closure. Do not wait for B2. Do not touch B2 control or Playwright acceptance surfaces.

## Required work
1. Fresh-read GitHub canonical Sprint2 completion audit, lint closure result, current master HEAD, and actual local worktree status/diff.
2. Reconcile the dirty Sprint2 production/test slice against GitHub master. Identify every modified/untracked Sprint2 file required for the accepted implementation and exclude unrelated changes.
3. Run the focused Sprint2 unit/lint verification again on the exact reconciled slice.
4. If repository policy and current worktree permit publication without absorbing unrelated work, publish/commit the complete accepted Sprint2 slice to master with evidence. If direct publication is prohibited or unsafe, do NOT discard/stash/overwrite unrelated changes; instead publish a terminal FIX_REQUIRED result with the exact file-level blocker and a task-ready safe publication plan.
5. Verify the resulting GitHub HEAD/worktree binding. No Sprint3/4.
6. Publish terminal result to `_handoff-artifacts/results/SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1/result.md`.

## Non-overlap
B2 owns mandatory Chrome acceptance. Do not edit `_handoff-artifacts/control/CURSOR_B2_INBOX.md`, B2 result/control files, Playwright specs, or browser acceptance artifacts while B2 runs.
