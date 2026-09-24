# UI-BATTLE-SHARED-PRESENTATION-MASTER-GAP-20260925-R2

status: READY
owner: Role2 -> next free Cursor lane
sprint: cross-sprint UI / Sprint2 recovery
mode: IMPLEMENT_FIX_BROWSER_COMPARE_PUBLISH
control-authority: GitHub thin-bt/dollworld master

## Fresh evidence

- Canonical mock blueprint: `_handoff-artifacts/mocks/11-12_mock_battle_result_log_mock_v01.html`, blob `28880a65ea71e5452d0ae2859be938f262a69f89`.
- Current master `apps/web/src/client/presentation/` contains `BattleVersusStatus.tsx`, `CombatProfileComparison.tsx`, `CombatProfileSummary.tsx`, battle display/state helpers, etc., but no shared outcome/result/log presentation component that both mock-battle and tournament battle consume.
- Do not accept historical/local-WIP PASS as completion unless the implementation exists on current canonical master.

## Required implementation

1. Fresh-read current master mock-battle, tournament/competition battle/result, battle-log, presentation components and CSS before editing.
2. Reuse the 11-12 mock as the visual/layout blueprint. Preserve canonical battle semantics and existing API contracts; do not invent result fields, combat states, or endpoints to satisfy mock example values.
3. Extract/commonize the result/outcome presentation actually shared by mock battle and tournament battle. Reuse existing `BattleVersusStatus`, combat profile, display-label and battle-display/state helpers rather than duplicating them.
4. The shared presentation must cover the common visual hierarchy where data exists: matchup/outcome, participant status, decisive result/judgement summary, and log/result navigation/presentation. Surface-specific controls may remain outside the shared component.
5. Improve obvious hierarchy/density/responsive defects while commonizing. Avoid two separate near-identical battle result UIs.
6. Keep detailed developer/raw fields subordinate to the player-facing result/log presentation.
7. Add/update focused tests that prove both mock-battle and tournament paths consume the commonized presentation and that existing battle semantics are unchanged.
8. Run the web production build.
9. Start current-master production web and compare real browser output against the 11-12 mock for BOTH mock battle and tournament battle at desktop and narrow viewport. Exercise a real completed battle/result path, not static component rendering only.
10. Route material browser/mock differences as FIX_REQUIRED and fix them in the same task where safe.
11. Publish implementation and terminal evidence to canonical master. PASS requires the shared implementation to exist on master after publication, not only in local WIP.

## Completion evidence

Terminal result must identify:
- published commit SHA,
- shared component/helper paths and both consumers,
- focused test commands/results,
- production build command/result,
- desktop+narrow browser evidence for mock and tournament battle,
- material mock deviations and disposition,
- confirmation that no new product semantics/API were invented.

Do not overwrite a PREPARED lane. Dispatch only when A or B2 is genuinely free under the canonical Active+heartbeat rule.