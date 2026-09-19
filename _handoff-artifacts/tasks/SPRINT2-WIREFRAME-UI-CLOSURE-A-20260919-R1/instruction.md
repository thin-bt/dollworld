# SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1

state: PREPARED
sprint: Sprint2
lane: A
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-19T18:21:00+09:00
authority-correction: _handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md
predecessor-terminal: FIX_REQUIRED / WIREFRAME_UI_SLICE_SCHEDULE_PARTICIPANTS_MATRIX_HISTORY_RANKING_NAV
recovery: CONTINUE_SAME_TASK_PROMOTION_RANK_HISTORY_AND_BROWSER_CLOSURE

## Objective

Continue the actual Sprint2 wireframe closure from the latest terminal result. Preserve completed schedule/participant/matrix/history/ranking navigation work and close only the uniquely identified remaining Sprint2 gaps. Do not expand into Sprint3/4 or unrelated full-SPEC work.

## Required next implementation slice

1. Wire promotion result commit/projection on ui009 finalize when `tournamentKind === "promotion"`, using the existing domain promotion/rank-history mechanisms (`buildRankPromotionResult` / `commitPromotionWithRankHistory`) where applicable rather than inventing parallel state.
2. Persist/project person rank history from that finalize path, including source tournament/qualification navigation when canonical identifiers exist.
3. Surface promotion result and person rank history in the wireframe UI required by completion-guard items 9–10; add the person-detail rank-history panel when that is the canonical route for the data.
4. Finish item 11 detailed battle-log presentation if the current match page remains summary-only; preserve real match/person navigation.
5. Exercise annual-ranking history across additional simulated years so year selection/history is browser-proven rather than only structurally present.

## Verification / completion gate

- Add/extend browser assertions for promotion result, rank history/source navigation, detailed battle log, and multi-year ranking history.
- Re-run `tests/e2e/s2-wireframe-ui-closure-a.spec.ts` in Chrome and record terminal PASS evidence.
- Re-run mandatory Sprint2 regression browser specs affected by this slice.
- Re-run focused ui009 Vitest plus web client/build TypeScript checks.
- Publish the exact tested/published HEAD and working-tree status in the canonical result.

READY only when every Sprint2 wireframe completion-guard item from the original instruction is implemented/browser-accepted or explicitly user-deferred. Otherwise publish FIX_REQUIRED with the next concrete gap.

No Sprint3/4. Do not pause/disable. Do not wait on Drive/local mirrors.

## Output

Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1/result.md`.
