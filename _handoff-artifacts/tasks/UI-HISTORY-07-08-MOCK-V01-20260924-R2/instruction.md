# UI-HISTORY-07-08-MOCK-V01-20260924-R2

status: READY
owner: Cursor lane A/B2 next free non-conflicting lane
sprint: UI current product work
mode: implementation
source: Role2 direct-execution UI loop

## Purpose
Implement the supplied 07/08 history visual direction without inventing game semantics. The current master Shell has no dedicated rank-history or tournament-history route, so this task MUST first reuse existing accepted data/contracts and determine the smallest safe route/presentation integration. Do not manufacture historical fields merely because the mock contains illustrative copy.

## Blueprint
- `_handoff-artifacts/mocks/07-08_rank_tournament_history_mock_v01.html`
- exact blueprint blob: `5bce056297844207f899206843ab7b45c15209ea`

## Fresh current-master fact
`apps/web/src/client/Shell.tsx` currently exposes home, people/person-detail, mock battle/result, competition/match, ranking, and events routes only. There is no dedicated 07/08 route in Shell. Treat this as an implementation gap, not permission to invent a new backend contract.

## Required implementation
1. Inspect existing competition/ranking/event/person data contracts and server endpoints before changing routes.
2. Implement the smallest coherent browser-reviewable history surface supported by existing canonical data. Prefer composition/derivation from existing accepted competition and ranking records over new persistence/API semantics.
3. Preserve the mock's information hierarchy where supported: history navigation, compact filters, chronological rank/promotion presentation, tournament archive rows, and links back into existing competition/match/person surfaces.
4. Any illustrative mock datum that cannot be derived from current accepted contracts (for example a claimed promotion reason or winner field if absent) must be omitted or replaced with an existing canonical field; do not fake it.
5. Reuse existing presentation primitives/styles. Do not create a visually separate mini-app.
6. Add responsive behavior matching the blueprint intent: desktop scan density and narrow-screen readable stacking.
7. Add/adjust focused tests for route parsing/rendering and supported history derivation.
8. Run focused tests and the web production build.
9. Start the current-master app and compare the real browser output against the blueprint at desktop and narrow widths. Material hierarchy/layout/readability differences are FIX_REQUIRED in this same task.
10. Record exact files changed, tests/build commands, browser evidence, and any intentionally omitted mock-only fields in the terminal result.

## Structural guard
If implementing 07/08 would require a new product meaning, persistence model, or backend contract not already established by canonical specs/source, do not silently freeze that choice. Implement only the safe derivable subset and record the exact structural gap for PM/Role2 follow-up.

## Completion
TERMINAL only after implementation + tests + production build + real-browser comparison are complete, or after a concrete structural blocker is proven from current canonical contracts. A mock-only review or status report is not completion.
