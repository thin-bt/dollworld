# UI-EVENTS-VALIDATION-MOCK-V01-20260924-R2

status: READY
role: Role2
scope: UI implementation
blueprint: `_handoff-artifacts/mocks/13-14_events_validation_mock_v01.html`
blueprint_blob_sha: `2333ac5811e22036215f3d31ed065bb91980454a`
authority: GitHub `thin-bt/dollworld` / `master`

## Objective
Implement the 13 Events / 14 System Validation visual hierarchy from the canonical HTML mock in the real current web UI without changing established UI-008 semantics or inventing API fields.

## Current-master facts to preserve
- `apps/web/src/client/events/EventsPage.tsx` already owns both `events` and `validation` views under `/events`, with independent loading/success/empty/error/stale state and cursor handling.
- Events already support personId, eventGroup, year/month/week filtering, current-world-year bounds, human event-card grouping, person-name resolution, boundary context across pages, reset-to-newest, stale/session recovery, and next-cursor paging.
- Validation currently filters the canonical status values `success` / `failure`; do NOT replace those with mock-only severity/category semantics unless the canonical API/spec is separately changed.
- Keep System Validation visibly developer-oriented. Do not promote diagnostics into ordinary game-history meaning.

## Implementation direction
1. Use the mock as the visual/layout blueprint: clear world-history heading, separated ordinary Events vs developer Validation navigation, compact filter toolbar, scan-friendly chronology/cards, restrained technical IDs/details, explicit healthy/empty/error/stale states, and narrow-screen stacking.
2. Preserve the richer real event filters even where the static mock simplifies them. Improve grouping/labels/spacing instead of deleting established behavior.
3. Preserve current human lifecycle grouping and cross-page suppression logic; this task is presentation work, not a rewrite of event semantics.
4. Validation presentation should make success/failure diagnostics easy to triage using only contract-backed fields. Technical/raw detail should be subordinate/disclosable where possible rather than dominating the page.
5. Reuse existing `presentation.css` conventions and existing presentation primitives. Avoid a parallel style system or duplicated page shell.
6. Keep `/events?tab=events` and `/events?tab=validation` navigation/back-forward behavior intact.
7. Do not add speculative severity/category filters, fake event types, fake counts, or unsupported historical semantics merely because sample content appears in the mock.

## Verification / completion gate
- Update/add focused UI tests for the preserved filter/query contracts and active-tab behavior where markup changes require it.
- Run focused events/UI tests and the web production build.
- Start current-master web app and compare real browser output against the blueprint at desktop and narrow viewport for both tabs.
- Check loading, populated, empty, API error, STALE_CURSOR/reload recovery states where fixtures/harness allow.
- Material visual/layout differences from the blueprint that are not required by canonical semantics are FIX_REQUIRED in this same task.
- Record implementation commit, tests/build commands, and browser-comparison evidence in `_handoff-artifacts/results/UI-EVENTS-VALIDATION-MOCK-V01-20260924-R2/result.md`.

## Non-goals
- No API/schema redesign.
- No changes to simulation/event-generation semantics.
- No invented product meaning to make the mock sample literal.
