# SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: PRODUCT_SLICE_PUBLICATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT2-DETAILED-BATTLE-LOG-CLOSURE-A-20260919-R1
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1

## Why this task exists

The predecessor terminal result is READY but explicitly reports the completed detailed-battle-log product slice as modified/untracked working-tree files rather than published product files. GitHub master currently contains the control/result commit, so B2 cannot treat that READY result alone as evidence that the implementation is present on the canonical published head.

## Required execution

1. Fresh-read this GitHub canonical instruction and claim lane A ACTIVE before product/repository changes.
2. Recover the exact completed product slice from `SPRINT2-DETAILED-BATTLE-LOG-CLOSURE-A-20260919-R1`; do not redesign or expand scope.
3. Confirm the slice still passes the predecessor focused checks: web build/client TypeScript, `apps/web/src/server/ui009`, `ui009.competition.test.ts`, and the focused competition match-view/page tests. Fix only regressions necessary to publish this Sprint2 slice.
4. Publish the completed product slice to `thin-bt/dollworld` `master` so the canonical GitHub head actually contains the detailed battle-log implementation. Do not publish unrelated dirty work.
5. Verify the published master head contains the intended product paths and record the exact published commit SHA plus verification results.
6. Publish terminal evidence to `_handoff-artifacts/results/SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R1/result.md`, then return lane A to IDLE only after terminal publication.
7. Keep Sprint2 scope only. Do not start Sprint3/4. Do not pause/disable because Drive/local mirrors are absent.

## Terminal criteria

READY only when the detailed-battle-log product slice is present on canonical GitHub master and the required focused verification passes. Otherwise publish FIX_REQUIRED with the exact blocking implementation/evidence gap and keep it actionable.
