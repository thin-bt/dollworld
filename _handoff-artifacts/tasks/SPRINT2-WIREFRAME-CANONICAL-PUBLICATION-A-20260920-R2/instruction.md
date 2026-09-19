# SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260920-R2

state: PREPARED
priority: IMMEDIATE
lane: A
sprint: Sprint2
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
supersedes: SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R3
recovery: PM_FRESH_KEY_AFTER_PREPARED_WITH_IDLE_NO_PICKUP

## Objective
Immediately recover and publish the missing Sprint2 wireframe implementation and canonical browser harness. No Sprint3/4.

## Required work
1. Fresh-fetch origin/master; GitHub canonical state is authority.
2. Reconcile and preserve any valid unpublished wireframe work.
3. Implement/publish all remaining completion-guard gaps: schedule year navigation; dense participant comparison; round-robin pair matrix; knockout bracket/results; historical tournament editions/winners; earnings-based annual ranking year/history/table; promotion result; person rank history; person/tournament/battle navigation.
4. Add backing finalize/projection/server logic wherever required; never reconstruct canonical facts in browser.
5. Publish/maintain tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts covering the full Sprint2 wireframe gate.
6. Run focused TypeScript/build/unit regression.
7. Commit and push product+harness to master; record exact published SHA and path evidence per guard row.
8. Publish terminal result at _handoff-artifacts/results/SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260920-R2/result.md. READY only if the implementation is actually on canonical master; otherwise FIX_REQUIRED with the first executable blocker.
9. Return A to IDLE only after terminal publication. Never pause/disable absent explicit user PAUSE/STOP.

## Acceptance
Canonical master contains every Sprint2 wireframe product surface needed by B2 R3; no required row is MISSING merely because code was not published; browser harness is canonical; focused regression evidence is recorded.
