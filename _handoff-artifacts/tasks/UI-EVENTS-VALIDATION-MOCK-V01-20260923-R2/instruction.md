# UI-EVENTS-VALIDATION-MOCK-V01-20260923-R2

status: READY
owner: Role2
workstream: UI 13 Events / 14 System Validation
visual-blueprint: `_handoff-artifacts/mocks/13-14_events_validation_mock_v01.html`
visual-blueprint-commit: `db4c890f89f3c6b021a6704d239d526a720ca3ca`
authority: current master + established UI wireframe/intent

## Objective
Implement the browser-reviewable Events and System Validation redesign against current master. The canonical mock above is the visual/layout blueprint, not approval paperwork. Preserve current product semantics and proactively fix obvious hierarchy, density, spacing, readability, responsive and navigation defects.

## Required presentation
### 13 Events
- Treat Events as readable world/game history rather than a developer diagnostics dump.
- Preserve existing event lifecycle grouping, resolved person names, filters, pagination/cursor behavior and current test/DTO contracts.
- Establish a clear scan hierarchy: date/week -> event kind/status -> primary subject/person -> concise event content -> secondary identifiers/details.
- Avoid duplicated labels and repeated raw identifiers when a resolved human-readable value exists; retain IDs only as secondary disclosure where useful.
- Keep filtering/navigation compact and usable at narrow widths.

### 14 System Validation
- Separate validation from normal game history visually and semantically; this surface is developer/operator triage.
- Preserve current validation categories, severity/status meaning, filtering, pagination and stale-cursor behavior.
- Establish clear triage order: severity/status -> issue summary -> affected entity/context -> actionable technical detail.
- Raw payload/debug data remains secondary disclosure, not the dominant first-read content.
- Empty/healthy/error/stale states must be visually distinguishable without inventing new validation semantics.

## Shared rules
- Reuse current shared shell/navigation/components where practical instead of introducing isolated page-only styling.
- Do not change canonical event/validation semantics, API/DTO contracts, cursor rules or test IDs merely to match the mock.
- If current source data cannot support a mock field, preserve semantics and omit/secondary-display it rather than fabricate data.
- Desktop and narrow layouts must remain readable; tables may become stacked records where necessary without changing information meaning.

## Verification
1. Focused tests for touched Events/Validation UI/contracts pass.
2. web typecheck and production build pass.
3. Start the real web app and browser-compare Events and System Validation against `_handoff-artifacts/mocks/13-14_events_validation_mock_v01.html` at blueprint commit `db4c890f89f3c6b021a6704d239d526a720ca3ca`.
4. Compare both desktop and narrow widths.
5. Material hierarchy/layout/readability/state-display divergence is FIX_REQUIRED and must be corrected before terminal PASS unless canonical semantics require the divergence; document only genuine semantic exceptions.
6. Terminal evidence must record exact tested product SHA, commands, routes, widths and exact mock revision/path used as blueprint in `_handoff-artifacts/results/UI-EVENTS-VALIDATION-MOCK-V01-20260923-R2/result.md`.

## Guardrails
Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules. Do not overwrite a busy Cursor lane; dispatch when a lane is genuinely free under canonical lane-state rules.

## Continuation
After browser comparison/fix, continue directly to the next safe unfinished screen in the 01-15 UI workstream; do not stop merely because this mock implementation passes.