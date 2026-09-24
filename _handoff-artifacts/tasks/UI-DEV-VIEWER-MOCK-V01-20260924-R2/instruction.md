# UI-DEV-VIEWER-MOCK-V01-20260924-R2

status: READY
owner: Role2
workstream: UI 15 Dev Viewer
source-issue: #2
semantic-authority: existing DEV-VIEWER-002 contract/current master
visual-blueprint: `_handoff-artifacts/mocks/15_dev_viewer_mock_v01.html`
visual-blueprint-created-commit: `f861b592b40e94cc89e6a297a4f6472924f37c74`
visual-blueprint-current-blob: `1ab1337b9f45f1afa3e1b98698eebc85ee4b78da`

## Objective
Complete screen 15 as direct UI work using the published browser-reviewable HTML mock as the layout/hierarchy blueprint. Do not wait for a user approval phrase and do not invent product/API semantics.

## Current-master authority correction
Fresh-read current `apps/web/src/client/dev-viewer/DevViewer.tsx` before editing. It explicitly defines this as a developer-only UI-002/UI-003/UI-004 surface and explicitly excludes UI-005 PersonDetail and UI-006 mock-battle POST/replay/latest. Those exclusions are binding semantics, not missing features. The mock's candidate section is inspection-only. Do not expose UI-005/UI-006 actions merely to make the mock richer.

## Required presentation
- Preserve information order: Simulation controls -> People -> Mock Battle Candidates.
- Present year/week/state/uiRevision as a compact inspection/status summary rather than scattered diagnostics.
- Keep mutation controls operational and explicit: only contract-backed +1 week, +4 weeks, +1 year, reset; show in-flight/feedback/error state without introducing new actions.
- Keep People paging/count/range controls adjacent to its data; preserve server cursor paging and page sizes 5/10/25 rather than client slicing.
- Make Mock Battle Candidate loading/empty/error/data states visually distinct and easy to scan.
- Keep session gate, API/session errors, and post-mutation refresh behavior intact. Session/transport/raw identifiers should be secondary disclosure where practical, not the primary visual hierarchy.
- Render the UI-005/UI-006 exclusions as concise developer notes when needed; never turn them into fake controls or new API use.
- Keep this visibly a developer/inspection surface: dense but readable, stable alignment, clear technical labels, secondary raw identifiers/details, and responsive behavior.
- Reuse current shared shell/components/presentation CSS where practical; do not fork a parallel design system.

## Mock/handoff contract
1. Visual/layout blueprint is `_handoff-artifacts/mocks/15_dev_viewer_mock_v01.html`; bind implementation evidence to the current blob above (and retain introduction commit provenance).
2. Record mock path/revision in terminal result and any continuation instruction.
3. The mock is implementation blueprint, not approval paperwork. Proceed directly to safe implementation.
4. Preserve current API/DTO/test contracts and DEV-VIEWER-002 semantics. If a mock field is unsupported by current data, omit or secondary-display it rather than fabricate it.
5. Sample names/values inside the mock are presentation placeholders only; production must render contract-backed live values.
6. Do not change game/product semantics, API contracts, or simulation behavior for visual convenience.

## Verification
- Focused Dev Viewer tests pass, including session gating, simulation mutation refresh, People paging, and candidate loading/empty/error/data states where existing tests cover them.
- web typecheck and production build pass.
- Start the real production app and compare the actual dev-viewer route against the exact mock revision at desktop and narrow widths. Fresh-read routing first; do not guess the route from historical prose.
- Material hierarchy/layout/readability/overflow/responsive/state-display differences are FIX_REQUIRED and must be corrected before terminal PASS unless canonical semantics require the difference; document intentional semantic deviations.
- Confirm ordinary non-dev game routes are unaffected.
- Terminal evidence records exact tested product SHA, commands, actual route, widths, mock revision/path, and browser comparison under `_handoff-artifacts/results/UI-DEV-VIEWER-MOCK-V01-20260924-R2/result.md`.

## Guardrails
Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules. Do not overwrite a busy Cursor lane; dispatch only when a lane is genuinely free under canonical lane-state rules.

## Continuation
After screen 15 browser comparison/fix, continue directly to the next safe unfinished or materially divergent screen in the 01-15 UI workstream. Do not terminate at mock publication, build green, or review wait.
