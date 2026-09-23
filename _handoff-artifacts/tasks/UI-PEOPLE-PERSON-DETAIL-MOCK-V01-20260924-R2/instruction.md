# UI-PEOPLE-PERSON-DETAIL-MOCK-V01-20260924-R2

status: READY
owner: Role2
workstream: UI 09 people / 10 person detail
visual-blueprint: `_handoff-artifacts/mocks/09-10_people_person_detail_mock_v01.html`
blueprint-commit: `12491e775b4b8d55f78de6f4a198af8bdcb7da98`
authority-ref: `master`

## Objective
Implement the established human-observer hierarchy for ordinary `/people` and `/people/:personId` using the canonical mock above. Preserve accepted UI-004/UI-005 semantics and contracts; this is a presentation/navigation improvement, not a schema redesign.

## Required implementation
1. People list: make search/filter/sort/page controls compact and clearly secondary to person comparison. Keep existing name/state/sort/page-size behavior and current stale/error handling.
2. People rows/cards: prioritize display name, age/life/career state, current rank where contract-backed, and the six BaseStat values in a consistent scan line/grid. Keep person-detail navigation obvious. Do not expose raw personId as primary user content.
3. Person detail: preserve reading hierarchy back navigation -> identity/current rank -> current condition -> base stats/aptitudes -> mentorship -> learned techniques/training/stat history -> developer diagnostics.
4. Related formal masters/disciples remain navigable person links using current name resolution. Preserve qualified-master semantics.
5. Existing UI-004/UI-005 data fields, test IDs, paging rules, loading/empty/error/stale semantics and API contracts remain authoritative. Developer IDs/revisions/raw diagnostics stay secondary disclosure.
6. Responsive: desktop comparison must scan horizontally; narrow layout may stack but labels and person navigation must remain readable. No vertically oriented ordinary text.
7. Reuse current presentation helpers (`display-labels`, ability-value presentation, person-display-label, technique presentation, DeveloperDetails) rather than introducing parallel display semantics.

## Verification
- Focused people/person-detail tests updated and passing.
- web typecheck and production build pass on current master.
- Start real production web app and browser-compare `/people` and at least one `/people/:personId` against the canonical mock at desktop and narrow widths.
- Material hierarchy/layout/readability differences from the mock are FIX_REQUIRED unless an accepted contract requires them; correct before terminal PASS.
- Terminal result records exact product SHA, mock path + blueprint commit, commands, browser routes/widths, and any intentional semantic divergence under `_handoff-artifacts/results/UI-PEOPLE-PERSON-DETAIL-MOCK-V01-20260924-R2/result.md`.

## Guardrails
- No new product semantics or invented fields.
- Do not weaken existing paging/stale/error contracts.
- Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules.

## Continuation
Do not stop at styling or test green. Complete real browser comparison/fix, then continue to the next safe 01-15 UI workstream item.