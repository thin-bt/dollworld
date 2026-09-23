# UI-DEV-VIEWER-MOCK-V01-20260924-R2

status: READY
owner: Role2
workstream: UI 15 Dev Viewer
source-issue: #2
semantic-authority: existing DEV-VIEWER-002 contract/current master

## Objective
Complete screen 15 as direct UI work: inspect the current `/dev-viewer`, create/revise a browser-reviewable HTML mock from the established visual direction, then use that exact mock revision as the implementation blueprint. Do not wait for a user approval phrase and do not invent product/API semantics.

## Required presentation
- Preserve information order: Simulation controls -> People -> Mock Battle Candidates.
- Present year/week/state/uiRevision as a compact inspection/status summary rather than scattered diagnostics.
- Keep mutation controls operational and explicit: only contract-backed +1 week, +4 weeks, +1 year, reset; show in-flight/feedback/error state without introducing new actions.
- Keep People paging/count/range controls adjacent to its data; preserve server cursor paging and page sizes 5/10/25 rather than client slicing.
- Make Mock Battle Candidate loading/empty/error/data states visually distinct and easy to scan.
- Keep this visibly a developer/inspection surface: dense but readable, stable alignment, clear technical labels, secondary raw identifiers/details, and responsive behavior.
- Reuse current shared shell/components where practical; do not fork a parallel design system.

## Mock/handoff contract
1. Reuse any existing screen-15 mock/reference before creating a duplicate. If no current reviewable HTML mock exists, create `15_dev_viewer_mock_v01.html` in the established UI mock location.
2. Record the exact mock filename/revision/path in the terminal result and in any Cursor continuation instruction.
3. The mock is a visual/layout blueprint, not approval paperwork. Once coherent, proceed directly to safe implementation.
4. Preserve current API/DTO/test contracts and DEV-VIEWER-002 semantics. If a mock field is unsupported by current data, omit/secondary-display it rather than fabricate it.

## Verification
- Focused Dev Viewer tests pass.
- web typecheck and production build pass.
- Start the real app and compare `/dev-viewer` against the exact mock revision at desktop and narrow widths.
- Material hierarchy/layout/readability/state-display differences are FIX_REQUIRED and must be corrected before terminal PASS unless canonical semantics require the difference.
- Terminal evidence records exact tested product SHA, commands, route, widths, mock revision/path, and browser comparison under `_handoff-artifacts/results/UI-DEV-VIEWER-MOCK-V01-20260924-R2/result.md`.

## Guardrails
Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules. Do not overwrite a busy Cursor lane; dispatch only when a lane is genuinely free under canonical lane-state rules.

## Continuation
After screen 15 browser comparison/fix, continue directly to the next safe unfinished or materially divergent screen in the 01-15 UI workstream. Do not terminate at mock publication, build green, or review wait.