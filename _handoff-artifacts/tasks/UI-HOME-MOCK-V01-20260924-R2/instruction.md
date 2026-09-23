# UI-HOME-MOCK-V01-20260924-R2

status: READY
owner-role: Role2
sprint: cross-sprint UI implementation
mode: IMPLEMENT_BROWSER_COMPARE_FIX
canonical-branch: master
visual-blueprint: `_handoff-artifacts/mocks/01_home_mock_v01.html`
blueprint-commit: `c3854189e69aa3d86ffa433975b5e50bbf6ff571`

## Goal
Implement the ordinary `/` home/simulation screen from the canonical mock, using current master semantics rather than inventing product behavior.

## Preserve
- Existing `SimulationPanel` lifecycle, session bootstrap, CSRF/revision handling, and accepted 1/4/48-week mutation semantics.
- Existing test IDs/contracts unless a focused test is deliberately updated for a visual-only structural reason.
- World date, elapsed weeks, person count, mutation feedback, reset, and developer diagnostics already supplied by current master.
- Common Shell navigation and ordinary-user route behavior.

## Improve to blueprint
- Treat world status and time controls as the primary two-panel home hierarchy.
- Keep 1-week progression visually primary; 4-week/1-year secondary; reset visually separated from normal progression.
- Add/retain clear ordinary-user observation paths to competition, ranking, people, and events without duplicating their page content.
- Keep developer/session/revision details secondary disclosure, not competing with gameplay observation.
- Match coherent spacing, readable density, and narrow responsive stacking from the mock. Do not copy illustrative mock numbers as hardcoded production data.

## Execution
1. Fresh-read the blueprint and current `Shell.tsx`, `SimulationPanel.tsx`, `SimulationPanelView.tsx`, relevant styles/tests.
2. Implement against real current APIs/contracts. Do not create a parallel home implementation.
3. Run focused home/shell tests and the web production build.
4. Start the current-master production app and compare `/` in a real browser against the blueprint at desktop and narrow widths.
5. Material hierarchy, spacing, overflow, navigation, state, or responsive differences are FIX_REQUIRED: correct them in the same task where feasible and repeat comparison.
6. Publish terminal result with exact implementation commit, tests/build evidence, browser dimensions/routes, and remaining intentional differences.

## Guardrails
No new game semantics, fake state, or mock-only data in production. Do not block on an explicit approval phrase when the implementation follows this established blueprint and existing semantics. Structural changes that alter product meaning must be surfaced rather than silently invented.