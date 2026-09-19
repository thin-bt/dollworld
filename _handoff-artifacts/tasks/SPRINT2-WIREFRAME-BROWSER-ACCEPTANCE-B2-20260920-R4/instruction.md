# SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4

state: PREPARED
sprint: Sprint2
lane: B2
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-20T04:01:34+09:00
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
supersedes-unpicked: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R3
paired-a-task: SPRINT2-FORMAL-COMPLETION-GATE-A-20260920-R2
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: PM_FAILOVER_FRESH_TASK_KEY_AFTER_R3_PREPARED_NO_TERMINAL

## Objective

Produce the missing canonical browser terminal required to close overdue Sprint2. R3 remained PREPARED without a canonical terminal result. This fresh key must be picked up immediately. Do not edit production files and do not start Sprint3/4.

## Required work

1. Fresh-read GitHub canonical protocol/instruction, claim this exact task ACTIVE, fresh-sync canonical master, and verify required product SHA is ancestor of exact clean HEAD.
2. Run the full canonical Sprint2 wireframe Chrome harness `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` without weakening, skipping, or replacing assertions.
3. Cover all 12 completion guards: annual schedule/year switching/current time; tournament detail; dense participant comparison; round-robin standings/pair matrix; knockout bracket/results; winner/placements; tournament history/historical winners; earnings-based annual ranking current/history; promotion result; person rank history; tournament match -> real battle detail/detailed log; person-detail navigation.
4. READY requires 12/12 required browser guards passing on one exact clean published master HEAD. Otherwise publish FIX_REQUIRED with exact failing assertions and evidence.
5. Publish the terminal to GitHub canonical result path before returning the lane to IDLE. Drive/local mirrors are bootstrap compatibility only and never substitute for this result.

## Output

Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4/result.md` with exact HEAD, clean-tree status, exact command, pass count, and terminal state READY or FIX_REQUIRED.
