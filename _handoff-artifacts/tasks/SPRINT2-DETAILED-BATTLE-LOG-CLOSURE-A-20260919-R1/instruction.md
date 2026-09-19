# SPRINT2-DETAILED-BATTLE-LOG-CLOSURE-A-20260919-R1

state: PREPARED
sprint: Sprint2
lane: A
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-19T20:24:40+09:00
predecessor: SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1
non-overlap: PRODUCT_IMPLEMENTATION_ONLY

## Objective
Close the remaining Sprint2 wireframe gap recorded by the predecessor result: match detail currently shows summary and log availability count rather than the detailed retained battle log required by the predecessor instruction.

## Work
- Read current master and existing battle/detailed-log contracts first.
- Use the existing canonical retained detailed-log data; do not create parallel persistence.
- Extend the existing match-detail projection/API only where necessary.
- Render detailed retained battle-log entries on CompetitionMatchPage, including turn/order and the existing canonical event details.
- Render a correct unavailable/expired state when detailed logs are not retained.
- Preserve summary and existing match/person navigation.
- Add focused coverage for projection/API/UI behavior.

## Gate
Run focused ui009/server tests and web client/build TypeScript checks. Publish the exact tested HEAD and working-tree status. READY only when detailed battle-log content is presented from canonical retained data and the unavailable/expired case is handled; otherwise publish FIX_REQUIRED with the exact remaining gap.

No Sprint3/4. Do not modify B2 control. Do not pause/disable for Drive/local mirror absence.

## Output
Publish `_handoff-artifacts/results/SPRINT2-DETAILED-BATTLE-LOG-CLOSURE-A-20260919-R1/result.md`.
