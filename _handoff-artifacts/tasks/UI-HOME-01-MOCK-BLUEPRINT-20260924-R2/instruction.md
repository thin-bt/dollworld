# UI-HOME-01-MOCK-BLUEPRINT-20260924-R2

status: READY
owner-role: Role2
sprint: cross-sprint UI
mode: IMPLEMENT_BROWSER_COMPARE
createdAt: 2026-09-24
control-authority: GitHub master

## Blueprint

Use `_handoff-artifacts/mocks/01_home_mock_v01.html` (current canonical blob `09b359bad3a808fa28e609e64859304cf4baf196`) as the visual/layout blueprint for the ordinary `/` home surface.

## Fresh current-master finding

`Shell` already mounts `SimulationPanel` on the ordinary home route, and `SimulationPanelView` already implements the mock's primary world-status/control hierarchy: current world date, elapsed weeks, person count, 1/4/48-week progression, reset, operation feedback, and developer details. The remaining visible blueprint gap is the mock's observer-navigation section (`世界を観察する`) linking the ordinary user directly to 大会 / ランキング / 人物 / イベント. Do not create a second simulation implementation or alter progression semantics.

## Required execution

1. Fresh-read canonical `01_home_mock_v01.html`, `Shell.tsx`, `SimulationPanelView.tsx`, and shared presentation CSS before editing.
2. Keep the accepted `SimulationPanel` mutation/session behavior and existing test IDs/contracts intact.
3. Bring the ordinary home presentation materially in line with the mock, including a compact `世界を観察する` navigation section after the hero/control area with ordinary links to `/competition`, `/ranking`, `/people`, and `/events` and concise explanatory text. Prefer shared presentation primitives/classes rather than a home-only styling fork.
4. Preserve developer/session diagnostics inside the existing developer-details disclosure; do not promote implementation metadata into the normal observer hierarchy.
5. Improve spacing, hierarchy, narrow-width wrapping, and button/link hit areas where the real implementation materially differs from the mock, without inventing new game state or metrics.
6. Add/update focused view tests for the observer navigation and retained controls. Run focused tests and the web production build.
7. Publish implementation to canonical master. Local-only completion is not PASS.
8. On the published SHA, compare ordinary `/` against the blueprint at desktop and narrow widths. Exercise at least one safe ordinary progression action and verify feedback remains readable and the observer links navigate to their existing real routes. Fix material differences in the same task.
9. Publish a canonical terminal result with exact published SHA, tests/build, browser widths/routes, and intentional deviations.

## PASS gate

PASS requires: canonical-master implementation; accepted simulation behavior preserved; observer navigation present and usable; focused tests PASS; web production build PASS; desktop+narrow ordinary-browser comparison complete; material differences fixed or justified by canonical semantics.

Do not mark PASS for documentation/mock-only work.