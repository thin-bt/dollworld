# ROLE1 S03-010 live release-gate invalidation

result: FIX_REQUIRED
role: Role1
sprint: Sprint3
scope: release/evidence control
observed-master-tip: cf7d2e1fa302e4d30913370e7e98f41c853deaab
observed-product-lineage: 3c82d3a69188cb706b37f76044ca442332eebfb2
previous-binding-product: bb4ed45ca53a2c0e64eeb0649f19b98afbf48fdf

## Finding

The binding `SPRINT3_STATUS.md` still names S03-006 product `bb4ed45` / 1975/1975 / web build PASS as the live release gate. Current canonical master now contains later S03-010 product changes. GitHub compare `bb4ed45...3c82d3a` is ahead by 19 commits and includes product changes in `packages/simulation-core/src/index.ts`, `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts`, new `packages/simulation-core/src/sprint3/process-weekly-generated-technique-registration-from-otl-week.ts`, and new weekly auto-registration tests.

Therefore the `bb4ed45` gate is historical only for current product bytes. It must not be used to close Sprint3 or assert current-product release acceptance.

## Required acceptance before rebinding

1. Complete the already-dispatched `SPRINT3-S03-010-WEEKLY-AUTO-REGISTRATION-INTEGRATION-A-20260923-R1` task.
2. Establish a fresh pristine root `npm run check` PASS on the exact resulting product lineage.
3. Establish production web build PASS on that same product lineage.
4. Preserve ordinary-browser acceptance as a separate requirement; focused weekly registration tests are not browser/playability evidence.
5. Only after terminal evidence exists may `SPRINT3_STATUS.md` replace the historical `bb4ed45` binding.

## Lane safety

Cursor A is already PREPARED for S03-010 integration and Cursor B2 is already PREPARED for current-screen browser evidence, so Role1 did not overwrite either lane.

Sprint3 remains `REOPENED_FIX_REQUIRED`.
