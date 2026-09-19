# SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R2

state: PREPARED
sprint: Sprint2
lane: A
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-19T20:02:00+09:00
predecessor: SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1
predecessor-terminal: FIX_REQUIRED / WIREFRAME_UI_SLICE_SCHEDULE_PARTICIPANTS_MATRIX_HISTORY_RANKING_NAV
recovery: FRESH_TASK_KEY_AFTER_R1_ALREADY_CONSUMED

## Objective
Close the remaining Sprint2 wireframe gaps from R1. Preserve all READY R1 surfaces.

## Required implementation
1. Implement promotion-result commit/projection on ui009 promotion finalize using canonical domain promotion/rank-history mechanisms.
2. Persist/project person rank history and source tournament/qualification navigation.
3. Surface promotion result and person rank history in required UI/person detail.
4. Finish full battle detailed-log rendering on tournament match detail; retain person navigation.
5. Prove annual-ranking multi-year history/year switching using additional simulated years.

## Verification
Run focused ui009 tests, web build/client TypeScript checks, Sprint2 wireframe Chrome acceptance, and affected regression browser specs. Publish exact tested HEAD and working-tree status.

READY only when all Sprint2 wireframe completion-guard items are implemented/browser-accepted or explicitly user-deferred. Otherwise publish FIX_REQUIRED with exact executable next gap.

No Sprint3/4. Drive/local mirror absence is non-terminal.

## Output
Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R2/result.md`.
