# UI-EVENTS-VALIDATION-MOCK-20260923-R2

state: READY
owner-role: Role2
sprint: Sprint2/Sprint3 UI recovery
mode: SOURCE_PRODUCT_REPAIR
priority: NEXT_SAFE_UI_WORK
authority: GitHub `thin-bt/dollworld` / `master`
visual-blueprint: `_handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/13-14_events_validation_mock_v01.html`

## Purpose
Turn Events / System Validation into production UI using the browser-reviewable mock v01 above as the exact visual/layout blueprint. Preserve canonical game semantics; this task is presentation/navigation repair, not a product-rule change.

## Scope
1. Start from current `apps/web/src/client/events/EventListView.tsx`, `ValidationListView.tsx`, `EventsPage.tsx` and existing contracts before editing.
2. Events must read as chronological game history: strong world-date/week grouping, event-type and subject/person readability, compact scanning density, and explicit empty/loading/error states.
3. System Validation must read as operator triage rather than normal game history: failure/success status first, validation occurrence and issue count next, then current `issue.path` + `issue.message`; do not invent severity or actions not present in current data.
4. Keep Events and Validation visually related through the same app shell/tokens, but do not collapse them into one undifferentiated feed.
5. Preserve existing person-name resolution, lifecycle grouping, filters, cursor/pagination behavior, stale-cursor handling, canonical IDs/test IDs and DeveloperDetails behavior.
6. Responsive behavior is required: desktop and narrow browser widths must preserve readable labels and avoid horizontal clipping of primary controls/content. On narrow widths, filter controls and event/validation rows may stack vertically.
7. Reuse shared components/tokens already present in the web app when doing so reduces duplication without changing behavior.
8. The mock uses illustrative names/content only. Production data and canonical labels remain authoritative; copy the hierarchy/layout, not the sample facts.

## Verification
- production web build succeeds;
- app starts;
- open Events and System Validation through the ordinary real UI/browser path;
- compare production browser output against `13-14_events_validation_mock_v01.html` at desktop and narrow widths;
- material hierarchy/layout/readability/navigation differences are FIX_REQUIRED and must be corrected before terminal PASS;
- preserve all existing canonical semantics/data behavior and focused event/validation tests.

## Result contract
Publish `_handoff-artifacts/results/UI-EVENTS-VALIDATION-MOCK-20260923-R2/result.md` with changed files, exact mock revision/path, build/start evidence, browser routes and widths checked, semantic-preservation notes, remaining differences, and final PASS/FIX_REQUIRED classification.

## Dispatch
Do not overwrite another PREPARED/ACTIVE A or B2 task. When a lane becomes genuinely free under the canonical lane-state rules, dispatch this task immediately and verify inbox readback.