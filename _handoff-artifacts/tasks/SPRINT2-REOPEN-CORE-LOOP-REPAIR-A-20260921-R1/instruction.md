# SPRINT2-REOPEN-CORE-LOOP-REPAIR-A-20260921-R1

state: READY_FOR_PICKUP
lane: A
sprint: Sprint2
mode: PRODUCT_IMPLEMENTATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
binding-status: _handoff-artifacts/control/SPRINT2_STATUS.md

## Objective
Repair the reopened Sprint2 ordinary user-facing competition loop. This task owns the production progression chain, not ranking-page or battle-presentation styling.

Required accepted chain:
`週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`

## Required work
1. Fresh-read SPRINT2_STATUS.md, accepted Sprint2 source/backlog/results, current master production code, and existing tests.
2. Trace the normal weekly user operation from the real UI/runtime entrypoint through tournament scheduling, participant selection, staging, battle execution, completion, result persistence, and ranking-state update.
3. Remove dependence on test-only/manual competition stepping for ordinary progression. Do not merely hide manual buttons; wire the real lifecycle.
4. Establish participant population/visibility in ordinary play using existing accepted rules.
5. Preserve deterministic/replay contracts and existing Sprint3 work.
6. Add focused production-path tests proving the full chain through persisted result/ranking state. Run the strongest practical root gate.
7. Publish implementation to canonical master and write terminal result to `_handoff-artifacts/results/SPRINT2-REOPEN-CORE-LOOP-REPAIR-A-20260921-R1/result.md`.

## Non-conflict
Do not own standalone Ranking screen implementation or tournament battle presentation reuse; B2 handles those independently.

## Terminal
READY only with production-path evidence for the ordinary weekly loop through ranking-state update. Otherwise FIX_REQUIRED/BLOCKED with exact remaining product gap.
