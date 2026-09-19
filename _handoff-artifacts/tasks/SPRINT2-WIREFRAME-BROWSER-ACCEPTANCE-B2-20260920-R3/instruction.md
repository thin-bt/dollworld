# SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R3

state: PREPARED
sprint: Sprint2
lane: B2
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-20T03:02:52+09:00
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
supersedes-unpicked: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2
paired-a-task: SPRINT2-FORMAL-COMPLETION-GATE-A-20260920-R2
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: PM_FAILOVER_FRESH_TASK_KEY_AFTER_PREPARED_NO_TERMINAL

## Objective

Produce the terminal browser acceptance required to close overdue Sprint2. The prior R2 has no canonical terminal result, so this fresh key must be picked up. Do not edit production files and do not start Sprint3/4.

## Required work

1. Fresh-sync canonical master; verify required product SHA is ancestor of exact clean HEAD.
2. Run the full canonical Sprint2 wireframe Chrome harness without weakening, skipping, or replacing assertions.
3. Cover annual schedule/year switching/current time, tournament detail, dense participant comparison, round-robin standings/pair matrix, knockout bracket/results, winner/placements, tournament history/historical winners, earnings-based annual ranking current/history, promotion result, person rank history, tournament match -> real battle detail/detailed log, and person-detail navigation.
4. Preserve reduced legacy browser tests as regression evidence only; they are not the completion gate.
5. READY requires all required assertions passing on one exact clean published master HEAD. Otherwise publish FIX_REQUIRED with exact failing assertions and evidence.

## Output

Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R3/result.md` with exact HEAD, clean-tree status, command, and pass count.
