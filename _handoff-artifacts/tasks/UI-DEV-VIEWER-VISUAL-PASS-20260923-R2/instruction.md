# UI-DEV-VIEWER-VISUAL-PASS-20260923-R2

status: READY
owner: Role2
workstream: UI 15 Dev Viewer
authority: current master + established Dev Viewer semantics + current shared UI direction

## Objective
Complete the 15 Dev Viewer visual pass as browser-reviewable UI and then implement it on current master. This is not an approval-paperwork task: use the existing Dev Viewer behavior as semantic authority, improve obvious hierarchy/density/readability/responsive/navigation defects, and carry the coherent design directly into production implementation.

## Required workflow
1. Fresh-read the current `/dev-viewer` implementation and its focused tests/contracts before designing.
2. Reuse existing UI mocks/shared shell/components and the visual language established by the current 01-14 workstream; do not invent an isolated developer-console design system.
3. Produce/update a browser-reviewable HTML mock for screen 15 and record its exact revision/path as the visual blueprint before production implementation.
4. Implement the visual pass against current master without changing product semantics or API/DTO contracts.
5. Browser-compare production `/dev-viewer` against that exact mock at desktop and narrow widths; material differences are FIX_REQUIRED and must be corrected in the same task where safe.

## Established semantic constraints
- Preserve existing simulation controls and their meanings, including current +1 week / +4 weeks / +1 year / reset behavior where present in current master.
- Preserve current People and Mock Battle candidate inspection behavior, paging/selection semantics, and existing test IDs/contracts.
- Keep developer/debug detail available but secondary to the primary operator workflow.
- Prefer a clear workflow hierarchy: simulation state and progression controls -> people inspection -> mock battle candidate inspection -> secondary diagnostics/details.
- Do not fabricate state, candidates, metrics, or actions that current source cannot provide.

## Design judgment expected
- Remove duplicated presentation and weak labels where human-readable current data exists.
- Improve spacing, grouping, scan hierarchy and dense developer tables/forms without hiding necessary information.
- Make action groups visually distinct from read-only state.
- At narrow widths, stack control groups/records rather than forcing unreadable horizontal layouts.
- Reuse shared person/combat presentation where appropriate rather than creating another parallel representation.

## Verification
- Focused Dev Viewer tests/contracts pass.
- web typecheck and production build pass.
- Start the real app and verify `/dev-viewer` through the ordinary browser route.
- Compare desktop and narrow output against the exact mock revision used as blueprint.
- Terminal result must record exact product SHA, mock revision/path, commands, browser route/widths, differences found and fixes applied under `_handoff-artifacts/results/UI-DEV-VIEWER-VISUAL-PASS-20260923-R2/result.md`.

## Guardrails
Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules. Do not overwrite a busy Cursor lane. Do not change canonical game semantics merely to improve the mock.

## Continuation
After Dev Viewer passes browser comparison, continue to cross-screen consistency/commonization and any remaining safe 01-15 visual divergence rather than idling.