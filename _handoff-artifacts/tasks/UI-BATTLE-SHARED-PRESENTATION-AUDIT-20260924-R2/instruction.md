# UI-BATTLE-SHARED-PRESENTATION-AUDIT-20260924-R2

status: READY
owner: Role2
sprint: cross-sprint UI implementation
mode: IMPLEMENT_PUBLISH_AND_BROWSER_COMPARE
canonical-branch: master

## Purpose
Close the remaining implementation/publication gap between the reviewed 11/12 battle blueprint and current production UI. The mock is an implementation blueprint, not approval paperwork.

## Visual blueprint
- `_handoff-artifacts/mocks/11-12_mock_battle_result_log_mock_v01.html`
- Use the current canonical blob/revision from master when starting; do not copy it into another mock.
- Also compare tournament battle presentation against `_handoff-artifacts/mocks/02-05_tournament_schedule_detail_participants_results_mock_v01.html`.

## Binding current-master correction (2026-09-24 Role2)
A prior task, `UI-BATTLE-SHARED-MOCK-V03-20260923-R2`, has terminal PASS evidence for a local WIP product (`9da74a532325605a95882613f6d71aca118a990f`) and explicitly says publication was pending. That result named new production files including `apps/web/src/client/presentation/SharedBattleOutcomePresentation.tsx` and `BattleChronologicalLog.tsx`.

Fresh canonical master read on 2026-09-24 shows `apps/web/src/client/presentation/SharedBattleOutcomePresentation.tsx` is **not present on master**. Therefore the prior local-WIP PASS must not be treated as current-master implementation completion. This task is the publication/reimplementation recovery for that exact UI gap.

Do not merely write another audit. If the prior WIP bytes are still safely present in the executor workspace and can be reconciled against current master without overwriting newer product work, reuse/rebase the proven implementation. Otherwise implement the same shared presentation contract afresh from current master and the canonical mocks. In either case, terminal PASS requires the production changes to be published to canonical master and then verified on that published lineage.

## Fresh-read before editing
- `apps/web/src/client/mock-battle/MockBattleView.tsx`
- `apps/web/src/client/battle-log/BattleLogView.tsx`
- `apps/web/src/client/presentation/BattleVersusStatus.tsx`
- `apps/web/src/client/presentation/CombatProfileComparison.tsx`
- `apps/web/src/client/presentation.css`
- competition match/detail presentation that embeds `BattleLogViewPanel`
- `_handoff-artifacts/results/UI-BATTLE-SHARED-MOCK-V03-20260923-R2/result.md`

## Current-master gap to resolve
Current master has useful shared primitives (`BattleVersusStatus`, `CombatProfileComparison`) and `BattleLogViewPanel` supports mock/competition modes, but the previously tested shared outcome/log refactor was not published. Winner/outcome, end reason/judge/range, final state, and log transition therefore remain vulnerable to separate assembly/drift on canonical master.

## Required implementation
1. Extract/commonize the battle result presentation where it materially removes duplication. At minimum winner/outcome + result facts + final versus state must have one shared production presentation contract usable by mock and competition contexts. Do not create a second tournament-only battle UI.
2. Preserve all canonical battle semantics and existing API/view contracts. No new game rule, result meaning, judge meaning, or range meaning may be invented.
3. Match the blueprint hierarchy: winner/outcome first; end reason / judge / initial-final range as immediately scannable result facts; final participant durability/mental state directly below; turn-by-turn combat timeline after the result summary; technical IDs/hashes/raw diagnostics only in `DeveloperDetails`.
4. Keep mock-battle setup focused on participant comparison and execution. Loading/empty/error/same-person/replay states must remain explicit next to the relevant control.
5. Tournament battle must consume the same shared result/log presentation primitives and retain tournament context/navigation.
6. Responsive narrow layout must preserve actor/action/effect reading order and must not collapse result facts into unreadable dense text.
7. Update focused tests for the shared contract and both consumers. Preserve existing test IDs where practical; if a refactor requires changes, update tests intentionally rather than deleting coverage.
8. Publish the production implementation to canonical `master`; a local-only PASS is not terminal completion.

## Verification
- Run focused mock-battle, battle-log, competition tests affected by the refactor.
- Run web typecheck and production build.
- After publication, fresh-read/checkout the published master lineage, start the production web app, and compare real browser output with both canonical battle/tournament mocks at desktop and narrow widths.
- Verify mock battle and tournament battle show materially the same winner/result/final-state/timeline visual language.
- Verify the shared production component files are actually present on canonical master after publication.
- Any material difference or publication mismatch is FIX_REQUIRED in this same task; do not stop at screenshot capture or local green tests.

## Completion evidence
Publish `_handoff-artifacts/results/UI-BATTLE-SHARED-PRESENTATION-AUDIT-20260924-R2/result.md` with published product SHA, changed files, test/build commands and outcomes, browser routes/viewport evidence, mock revisions used, commonized components, and remaining differences (must be none material to mark DONE). Explicitly distinguish local WIP SHA from canonical published SHA.

## Dispatch
Do not overwrite a PREPARED/ACTIVE A or B2 lane. This task is READY canonical work for the next free non-conflicting Cursor lane; PM/Role loops may dispatch it when lane-state contract allows.