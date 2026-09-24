# UI-CROSS-SCREEN-NAV-DENSITY-AUDIT-20260924-R2

Status: READY
Owner: Role2 / next safe Cursor UI lane
Scope: UI implementation only; preserve canonical game semantics and existing API contracts.

## Purpose
With 01-15 review mocks present, perform the next safe product pass across the implemented UI rather than creating another isolated mock. Use the existing mock set as visual/layout blueprints and remove cross-screen inconsistencies that are obvious only when the product is traversed as one application.

## Inputs
- `_handoff-artifacts/mocks/` existing 01-15 HTML mocks. Reuse them; do not duplicate.
- Current `master` UI implementation and existing shared components.
- Existing accepted UI/API contracts and canonical game semantics.

## Direct execution
1. Fresh-read current master before editing. Inventory the actual routes/surfaces corresponding to 01-15 and note which are implemented, intentionally absent, or blocked by missing canonical data. Do not invent missing product semantics to make a mock look complete.
2. Traverse implemented surfaces as one observer workflow: Home -> tournament schedule/detail/participants/results -> ranking/history where available -> people/person detail -> mock battle/result log -> events/validation/dev viewer where available.
3. Compare each implemented surface against its existing mock at desktop and narrow widths. Fix material presentation drift that is safe and semantic-neutral, especially:
   - contradictory or duplicated navigation;
   - inconsistent page titles, section hierarchy, spacing, card/table density, control sizing and responsive stacking;
   - repeated battle/person/ranking presentation that should use an existing shared component;
   - narrow-width clipping, unreadable dense tables, weak primary/secondary action hierarchy;
   - loading/empty/error/stale states whose layout visibly collapses compared with the normal state.
4. Prefer common components/tokens when two or more screens express the same presentation. Do not fork a tournament-only and mock-only battle visual when the existing battle presentation can be shared.
5. Do not add fabricated fields, history reasons, severity/category values, winner metadata, or new APIs solely because a mock contains illustrative content. If canonical data cannot support a mock element, omit/disable it cleanly and record that as intentional semantic preservation.
6. Run focused tests for touched components/routes and the production build. Fix regressions in the same task.
7. Browser-review every touched route at desktop and narrow widths against the exact existing mock used as blueprint. Material differences are FIX_REQUIRED in this task, not a later approval wait.
8. Publish the completed implementation to canonical master under the existing control-plane rules. Local/WIP-only success is not terminal.

## PASS evidence
- Exact mock path(s) and blob/revision used for each touched screen.
- Published master commit SHA containing the implementation.
- Focused test results and production build result.
- Desktop + narrow browser comparison evidence for every touched route.
- Explicit list of any mock-only element intentionally not implemented because canonical data/semantics do not support it.
- Confirmation that shared presentation was reused/commonized where applicable and no duplicate parallel UI was introduced.

## Guardrails
Follow existing canonical protocols/blocker rules. Do not commit unrelated work, do not change product meaning, and do not wait for an explicit user approval phrase for semantic-neutral visual corrections already established by the supplied mocks/wireframes.