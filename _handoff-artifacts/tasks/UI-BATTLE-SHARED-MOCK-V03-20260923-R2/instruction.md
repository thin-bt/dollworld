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
7. Proactively correct obvious hierarchy, density, spacing, readability, responsive, duplicated-presentation and weak-navigation defects in the touched shared battle UI when the correction follows the established wireframe/intent and does not change product meaning.
8. Tournament/match history and result surfaces must retain a usable route into battle detail/detailed log wherever current canonical data exposes the match identity.

## Verification
- Focused tests for touched UI/contracts.
- web typecheck and production build.
- Start the real web app and browser-compare current implementation against mock v03 for `/mock-battle`, `/mock-battle/result`, and at least one tournament battle detail/result path.
- Verify both desktop and narrow responsive presentation for the shared combatant block and chronological log.
- Any material hierarchy/layout/state-display divergence is FIX_REQUIRED and must be corrected before terminal PASS, unless canonical semantics require the divergence; document such intentional semantic differences explicitly.
- Terminal evidence must record exact tested product SHA, commands, browser routes, and the mock revision used as blueprint under `_handoff-artifacts/results/UI-BATTLE-SHARED-MOCK-V03-20260923-R2/result.md`.

## Guardrails
- No new product semantics.
- No battle DTO/schema changes unless an existing required field is currently inaccessible; if encountered, stop that semantic change and report it separately while continuing safe presentation work.
- Preserve current test IDs/contracts unless a focused update is necessary for the shared component refactor.
- Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules.

## Continuation
Do not stop after component extraction, mock completion, publication trouble, or build green. Complete browser comparison/fix, then continue to the next safe screen in the 01-15 UI workstream.