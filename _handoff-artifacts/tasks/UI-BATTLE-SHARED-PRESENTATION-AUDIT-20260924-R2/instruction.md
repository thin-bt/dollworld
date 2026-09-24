# UI-BATTLE-SHARED-PRESENTATION-AUDIT-20260924-R2

status: READY
owner: Role2
sprint: cross-sprint UI implementation
mode: IMPLEMENT_AND_BROWSER_COMPARE
canonical-branch: master

## Purpose
Close the remaining implementation gap between the reviewed 11/12 battle blueprint and current production UI. The mock is an implementation blueprint, not approval paperwork.

## Visual blueprint
- `_handoff-artifacts/mocks/11-12_mock_battle_result_log_mock_v01.html`
- Use the current canonical blob/revision from master when starting; do not copy it into another mock.
- Also compare tournament battle presentation against `_handoff-artifacts/mocks/02-05_tournament_schedule_detail_participants_results_mock_v01.html`.

## Fresh-read before editing
- `apps/web/src/client/mock-battle/MockBattleView.tsx`
- `apps/web/src/client/battle-log/BattleLogView.tsx`
- `apps/web/src/client/presentation/BattleVersusStatus.tsx`
- `apps/web/src/client/presentation/CombatProfileComparison.tsx`
- `apps/web/src/client/presentation.css`
- competition match/detail presentation that embeds `BattleLogViewPanel`

## Current-master gap to resolve
Current master already has useful shared primitives (`BattleVersusStatus`, `CombatProfileComparison`) and `BattleLogViewPanel` supports mock/competition modes. Preserve those semantics. However, result hierarchy is still assembled independently in `MockBattleViewPanel` and `BattleLogViewPanel`, so winner/outcome, end reason/judge/range, final state, and log transition can drift visually. The reviewed blueprint requires one coherent observer hierarchy for both mock and tournament battles.

## Required implementation
1. Extract/commonize the battle result presentation where it materially removes duplication. At minimum the winner/outcome + result facts + final versus state must have one shared production presentation contract usable by mock and competition contexts. Do not create a second tournament-only battle UI.
2. Preserve all canonical battle semantics and existing API/view contracts. No new game rule, result meaning, judge meaning, or range meaning may be invented.
3. Match the blueprint hierarchy:
   - winner/outcome first;
   - end reason / judge / initial-final range as immediately scannable result facts;
   - final participant durability/mental state directly below;
   - turn-by-turn combat timeline after the result summary;
   - technical IDs/hashes/raw diagnostics only in `DeveloperDetails`.
4. Keep mock-battle setup focused on participant comparison and execution. Loading/empty/error/same-person/replay states must remain explicit next to the relevant control.
5. Tournament battle must consume the same shared result/log presentation primitives and retain tournament context/navigation.
6. Responsive narrow layout must preserve actor/action/effect reading order and must not collapse result facts into unreadable dense text.
7. Update focused tests for the shared contract and both consumers. Preserve existing test IDs where practical; if a refactor requires changes, update tests intentionally rather than deleting coverage.

## Verification
- Run focused mock-battle, battle-log, competition tests affected by the refactor.
- Run the web production build.
- Start current production web app and compare real browser output with both canonical battle/tournament mocks at desktop and narrow widths.
- Verify mock battle and tournament battle show materially the same winner/result/final-state/timeline visual language.
- Any material difference is FIX_REQUIRED in this same task; do not stop at screenshot capture.

## Completion evidence
Publish `_handoff-artifacts/results/UI-BATTLE-SHARED-PRESENTATION-AUDIT-20260924-R2/result.md` with changed files, test/build commands and outcomes, browser routes/viewport evidence, mock revisions used, commonized components, and remaining differences (must be none material to mark DONE).

## Dispatch
Do not overwrite a PREPARED/ACTIVE A or B2 lane. This task is READY canonical work for the next free non-conflicting Cursor lane; PM/Role loops may dispatch it when lane-state contract allows.