# UI-BATTLE-SHARED-PRESENTATION-CANONICAL-RECOVERY-20260924-R2

status: READY
owner: Role2 -> next safe Cursor lane
sprint: Sprint2 UI recovery
mode: IMPLEMENT_PUBLISH_BROWSER_COMPARE
canonical-authority: GitHub thin-bt/dollworld master

## Why this task exists
Fresh canonical code search on 2026-09-24 still finds no `SharedBattleOutcomePresentation` on `master`. The reviewable battle blueprint already exists at `_handoff-artifacts/mocks/11-12_mock_battle_result_log_mock_v01.html` (blob `28880a65ea71e5452d0ae2859be938f262a69f89`). Do not treat local/WIP/terminal prose as implementation if the shared presentation is absent from canonical master.

## Required work
1. Fresh-read current master battle UI before editing. Reuse existing battle/status/log components rather than introducing a parallel mock-only UI.
2. Implement a shared battle outcome/result presentation used by both mock battle and tournament/competition battle result surfaces. The shared presentation must cover the common visual hierarchy represented by the blueprint: winner/result emphasis, termination/judgement/range metadata when available from accepted contracts, final combatant state, and transition into the turn/log timeline.
3. Preserve canonical game semantics. Do not invent result fields, API contracts, battle states, or tournament semantics merely because the HTML mock contains illustrative data. Render only values derivable from accepted current contracts; omit unavailable optional rows cleanly.
4. Remove duplicated presentation assembly where safe so mock and tournament battle do not drift. Keep context-specific controls outside the shared primitive when their behavior differs.
5. Keep desktop and narrow layouts readable: outcome first, combatant state scannable, metadata secondary, detailed log/timeline dense but not visually dominant over the result.
6. Add/update focused tests proving both consumers use the common result presentation and retain their context-specific behavior.
7. Run focused tests and the web production build on the resulting current-master candidate.
8. Publish the implementation to canonical `master`; PASS is not allowed for an unpublished local/WIP state.
9. After publication, start the published current-master web app and compare real browser output against `_handoff-artifacts/mocks/11-12_mock_battle_result_log_mock_v01.html` for BOTH mock battle and tournament battle at desktop and narrow viewport. Fix material hierarchy/spacing/readability/commonization differences in the same task where they do not alter product meaning.
10. Publish a terminal result under `_handoff-artifacts/results/UI-BATTLE-SHARED-PRESENTATION-CANONICAL-RECOVERY-20260924-R2/result.md` including published commit SHA, files changed, tests/build commands and results, browser routes/viewports checked, and any intentionally retained blueprint differences with semantic reason.

## PASS gate
PASS requires all of the following on canonical master: shared result presentation exists in source; both mock and tournament battle consume it (or an equivalently single shared primitive if naming differs); focused tests pass; production build passes; published app starts; desktop+narrow browser comparison for both battle contexts is completed; no material blueprint mismatch remains unless explicitly justified by canonical semantics.

## Guardrails
Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`. Preserve workspace assets and existing accepted behavior. Do not broaden into battle-engine changes. Do not wait for a new user approval phrase for visual/commonization fixes already established by the blueprint and current intent.