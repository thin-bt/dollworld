# UI-PEOPLE-PERSON-09-10-MOCK-V01-20260924-R2

status: READY
owner-role: Role2
sprint: current UI workstream
mode: implementation
blueprint: `_handoff-artifacts/mocks/09-10_people_person_detail_mock_v01.html`
blueprint-blob: `2374aadcdaebfd0997a1b1ea58f1432cf42d4c8c`
authority: GitHub `thin-bt/dollworld` / `master`

## Goal
Bring the ordinary user-facing People list and Person detail surfaces into the supplied 09/10 mock direction without inventing new game semantics. Treat the mock as the visual/layout blueprint, not as authority for data that current accepted UI contracts do not expose.

## Current-master facts to preserve
- `PeopleViewerView` already supports name/state filters, sort key/order, paging/page size, loading/error/stale/empty/success states, and person navigation when used as the observation-facing people surface.
- Observation mode already groups the six base stats into a compact ability grid and carries life/career status badges; do not regress this into the developer viewer's wide raw-stat table.
- Person detail already has its own `PersonDetailPage` / `PersonDetailView` and UI-005 fetch/view contract. Improve the existing route/component rather than building a parallel detail implementation.
- Existing canonical display-label and ability-value presentation helpers are shared presentation contracts; reuse them instead of introducing screen-local labels/tiers.

## Implementation
1. Compare the real current `/people` and person-detail browser output with `09-10_people_person_detail_mock_v01.html` at desktop and narrow widths before editing.
2. Revise the existing People observation surface toward the mock's hierarchy: search/filter controls first, scan-friendly person identity/status, rank/age and compact ability reading, then secondary counts/actions. Keep paging and all current query semantics intact.
3. Revise the existing Person detail surface toward the mock's hierarchy: identity/current state first; base stats and aptitudes as coherent comparison groups; relationships/career/technique information only where present in the accepted UI-005 contract. Do not fabricate biography, record, lineage, title, tournament, or relationship facts solely because the mock visually suggests a slot.
4. Preserve loading, empty, error and stale/reload behavior. Developer identifiers and transport/debug metadata stay in `DeveloperDetails`, not in the primary player-facing hierarchy.
5. Commonize repeated person identity/status/ability presentation where this safely reduces divergence between People and Person detail. Do not fork a second ability color/tier system.
6. Keep existing route/navigation semantics and tests unless a test asserts obsolete layout rather than behavior.

## Verification / completion gate
- Run focused People/UI-004 and Person detail/UI-005 tests affected by the change.
- Run the web production build on current task HEAD.
- Start the real app and compare `/people` and at least one reachable person detail against the blueprint at desktop and narrow widths.
- Exercise filters/sort/paging/person navigation plus loading/empty/error/stale paths where test fixtures make them available.
- Record material mock-vs-browser differences. Fix material hierarchy, overflow, density, responsiveness, duplicated presentation, or navigation differences in the same task; do not mark complete merely because tests pass.
- Result evidence must identify the exact blueprint path/blob above and the implementation commit(s) used for browser comparison.

## Product-meaning guard
If matching the mock would require a new API field, derived game rule, new history/relationship semantic, or other product-meaning change not already accepted in canonical contracts, leave that element out and record the gap rather than inventing it. Safe visual/layout improvements should continue without waiting for an approval phrase.
