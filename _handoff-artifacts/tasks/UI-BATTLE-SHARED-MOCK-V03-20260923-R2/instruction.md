# UI-BATTLE-SHARED-MOCK-V03-20260923-R2

status: READY
owner: Role2
source-issue: #1
visual-blueprint: `11-12_mock_battle_result_log_mock_v03.html`

## Objective
Implement the established battle visual hierarchy from mock v03 into current master without changing battle semantics. This is implementation work, not another mock-only review pass.

## Required implementation
1. Refactor the existing `/mock-battle`, `/mock-battle/result`, and tournament battle detail/result presentation onto shared reusable battle UI components.
2. Preserve the blueprint reading order: participant comparison -> execution/context -> result summary -> final participant state -> detailed chronological log.
3. Reuse current `BattleVersusStatus`, `CombatProfileComparison`, battle display/state helpers and existing DTO/test contracts where applicable. Do not create a tournament-only duplicate presentation.
4. Tournament pages may add only their contextual wrapper (tournament/rank/type/round/match identity, back/history navigation) around the shared battle presentation.
5. Keep log chronology horizontally readable. Present turn/action order, action/technique, range, hit/evade/guard/success, damage/state change, and judgment/end reason when the current source provides them. Developer/replay data remains secondary disclosure.
6. Responsive two-combatant presentation may collapse to one column, but chronology and labels must remain readable.

## Verification
- Focused tests for touched UI/contracts.
- web typecheck and production build.
- Browser compare current implementation against mock v03 for `/mock-battle`, `/mock-battle/result`, and a tournament battle detail/result path.
- Any material hierarchy/layout divergence is FIX_REQUIRED and must be corrected before terminal PASS.

## Guardrails
- No new product semantics.
- No battle DTO/schema changes unless an existing required field is currently inaccessible; if encountered, stop that semantic change and report it separately.
- Preserve current test IDs/contracts unless a focused update is necessary for the shared component refactor.
- Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules.
