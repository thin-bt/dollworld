# UI-BATTLE-11-12-MOCK-V01-20260924-R2

status: READY
owner: Cursor execution lane
sprint: Sprint 2 UI recovery
mode: implementation + browser comparison

## Authority / visual blueprint
- canonical master
- `_handoff-artifacts/mocks/11-12_mock_battle_result_log_mock_v01.html`
- blueprint commit: `d9926fa5cf406fd2c8f870fecbce763ba3a30202`

## Goal
Implement the 11 Mock Battle and 12 Battle Result / Detailed Log presentation using the canonical mock as the visual/layout blueprint, while preserving current game semantics and existing API contracts. This is not a documentation-only task.

## Existing implementation to evolve, not duplicate
- `apps/web/src/client/mock-battle/MockBattlePage.tsx`
- `apps/web/src/client/mock-battle/MockBattleView.tsx`
- `apps/web/src/client/battle-log/BattleLogPage.tsx`
- `apps/web/src/client/battle-log/BattleLogView.tsx`
- `apps/web/src/client/presentation/BattleVersusStatus.tsx`
- `apps/web/src/client/presentation/CombatProfileComparison.tsx`
- competition battle presentation under `apps/web/src/client/competition/`

## Required implementation
1. Keep mock battle explicitly isolated from canonical world/tournament/ranking mutation.
2. Make participant selection and pre-fight comparison the primary hierarchy: two fighters, readable identity/status, aptitudes/base stats/techniques, validation beside the controls.
3. Keep run / replay-same-seed / latest-result behavior and current loading/empty/error states.
4. Make the result immediately readable: winner/outcome first, then end reason/judge/range and final participant resources.
5. Rework detailed log into a turn-oriented human-readable timeline. Preserve all contract-backed action information; requested/resolved differences and diagnostics may remain secondary where they are developer-facing.
6. IDs, seeds, hashes, raw JSON and similar diagnostics belong in `DeveloperDetails`, not the main observer hierarchy.
7. COMMONIZATION IS REQUIRED: mock result/log and tournament match result/log must use the same battle presentation primitives for winner/outcome, versus/final state, and turn timeline where semantics are identical. Do not create a second tournament-only visual implementation. Surrounding navigation/context may differ.
8. Preserve current competition `presentationMode` behavior and match identity semantics. Do not invent product rules.
9. Responsive behavior must remain usable at narrow/mobile width; do not rely on horizontal desktop-only comparison tables.
10. Preserve or update focused tests for current behavior and shared rendering.

## Verification / completion gate
- run focused web tests covering mock battle, battle log and competition battle presentation;
- run the current production web build;
- start the real app and compare `/mock-battle` and `/mock-battle/result` against the blueprint at desktop and narrow viewport;
- also inspect a real tournament match result/log and confirm the shared battle presentation is materially consistent with the mock battle presentation;
- if implementation materially differs from the blueprint without a semantic/contract reason, treat it as FIX_REQUIRED and correct it in this same task before terminal result;
- record changed files, commands, browser paths/viewports and comparison findings in the canonical result.

## Non-goals
- no battle-engine rule changes;
- no new product semantics;
- no separate mock-vs-tournament battle visual systems;
- no waiting for an additional user approval phrase when the implementation follows this existing intent and blueprint.
