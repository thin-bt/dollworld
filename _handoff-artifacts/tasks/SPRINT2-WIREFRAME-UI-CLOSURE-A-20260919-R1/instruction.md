# SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1

state: PREPARED
sprint: Sprint2
lane: A
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-19T17:25:00+09:00
authority-correction: _handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md
predecessor: SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1
recovery: PM_FAILOVER_CORRECT_SCOPE_TO_SPRINT2_WIREFRAME

## Objective

Finish the actual Sprint2 UI wireframe. Preserve useful predecessor work (knockout/ranking/match navigation), but stop unrelated full-SPEC expansion.

## Required wireframe/gap-map coverage

1. annual tournament schedule
   - year overview, current time, rank/category-by-week readability
   - previous/current/next year switching
2. tournament detail
3. participant list
   - dense comparison list; person, rank, age and available comparison facts from canonical projection
4. round-robin standings and actual pair-result matrix
5. knockout bracket / match results
6. tournament result / winner / placements
7. tournament series history / historical winners
8. annual ranking
   - earnings-based per user decision
   - year-selectable current/history
   - position/person/current competitive rank/appearances/wins/official W-L where canonical facts support
   - person-detail navigation
9. promotion result
10. person rank history with source tournament/qualification navigation where available
11. tournament match -> battle detail navigation and person detail navigation

## Known mismatches to verify/fix first

- Current schedule renderer is a single 48-week horizontal table and lacks prev/current/next-year controls; reconcile to wireframe readability/interaction.
- Current participant table only shows name + detail link; wireframe requires dense comparison information.
- Existing annual ranking embedded in competition detail is not sufficient if it lacks year selection/history, appearances/wins, and person navigation.
- Round-robin UI must expose pair-result matrix semantics, not merely W/L totals + separate history.
- Tournament series history/historical winners must be implemented from stable history identity/projection; never group by display name.
- Promotion result and person rank-history presentation must be visible where the wireframe requires.
- Full battle detail navigation must resolve real tournament match detail/log data.
- Preserve new predecessor knockout bracket and ranking route if correct; rebind them to this wireframe scope.

## Verification

Add/extend browser acceptance so every completion-guard item is reached and asserted from the real UI. Existing reduced Chrome 7/7 alone is not sufficient.

No Sprint3/4.

## Output

Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1/result.md`.

READY only when every Sprint2 wireframe completion-guard item is implemented/browser-accepted or explicitly user-deferred.
