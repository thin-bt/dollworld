# UI-EVENTS-VALIDATION-MOCK-20260923-R2

state: READY
owner-role: Role2
sprint: Sprint2/Sprint3 UI recovery
mode: SOURCE_PRODUCT_REPAIR
priority: NEXT_SAFE_UI_WORK
authority: GitHub `thin-bt/dollworld` / `master`

## Purpose
Turn the established Events / System Validation UI direction into production UI rather than leaving it as passive mock/documentation work. Preserve canonical game semantics; this task is presentation/navigation repair, not a product-rule change.

## Scope
1. Locate the current production Events and System Validation surfaces and their existing data contracts before editing.
2. Events must read as chronological game history: strong date/week grouping, event-type and subject/person readability, compact scanning density, and explicit empty/loading/error states without inventing new event semantics.
3. System Validation must read as operator triage rather than normal game history: severity/status first, affected scope/identifier and concrete diagnostic detail next, with filters/actions only where the current product already supports them.
4. Keep normal Events and Validation visually related through the same app shell/tokens, but do not collapse them into one undifferentiated feed.
5. Preserve existing person-name resolution, lifecycle grouping, filters, cursor/pagination behavior, stale-cursor handling, and canonical IDs. Repair contradictory/duplicated presentation when it is purely visual/usability debt.
6. Responsive behavior is required: desktop and narrow browser widths must preserve readable labels and avoid horizontal clipping of primary controls/content.
7. Reuse shared components/tokens already present in the web app when doing so reduces duplication without changing behavior.

## Mock / blueprint rule
Create or materially revise reviewable HTML mock surfaces `13 events` and `14 system validation` from the real current UI + established wireframe direction, then use that exact revision as the implementation blueprint. Record the mock revision/path in the result. Do not wait for a separate approval phrase for safe visual/layout work consistent with existing intent.

## Verification
- production web build succeeds on current task branch/worktree;
- app starts;
- open Events and System Validation through the ordinary real UI/browser path;
- compare production browser output against the task mock at desktop and narrow widths;
- material hierarchy/layout/readability/navigation differences are FIX_REQUIRED and must be corrected before terminal PASS;
- preserve all existing canonical semantics/data behavior.

## Result contract
Publish `_handoff-artifacts/results/UI-EVENTS-VALIDATION-MOCK-20260923-R2/result.md` with changed files, mock revision/path, build/start evidence, browser routes and widths checked, semantic-preservation notes, remaining differences, and final PASS/FIX_REQUIRED classification.
