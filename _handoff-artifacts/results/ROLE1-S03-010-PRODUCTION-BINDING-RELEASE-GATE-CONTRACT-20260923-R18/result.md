# ROLE1 S03-010 production-binding release-gate contract

result: PRECONDITION_FIXED
role: Role1
sprint: Sprint3
scope: release/evidence control
observed-at: 2026-09-23T14:51:13+09:00

## Fresh canonical state

- `SPRINT3_STATUS.md` remains `REOPENED_FIX_REQUIRED` and its `bb4ed45` / 1975/1975 / web-build PASS binding is historical for later product bytes.
- Cursor A is PREPARED for `SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1`.
- Cursor B2 remains PREPARED for its independent current-screen browser-evidence task and must not be overwritten.
- The A instruction establishes that S03-010 processor integration is not sufficient by itself: ordinary production web sessions must bind the canonical balance-1.0.0 generated-technique registration/materialization configuration.

## Release-gate contract for the active A task

If A changes product bytes while activating the production binding, terminal PASS is release-usable only when all of the following bind the exact published product lineage:

1. ordinary production Sprint3 config enables `generatedTechniqueRegistrationEnabled` and valid generated-technique materialization configuration;
2. production-bound weekly OTL success registers the generated technique without external test seeding and replay/idempotent rerun does not duplicate it;
3. focused regressions PASS;
4. fresh pristine root `npm run check` PASS;
5. production web build PASS;
6. canonical publication/readback identifies the exact product SHA carrying the binding change.

The existing `bb4ed45` gate and any pre-activation S03-010 processor-only gate must remain historical and must not be rebound as current-product release acceptance after a product-changing activation commit.

## UI/playability boundary

The checks above establish product-lineage release integrity, not ordinary-browser acceptance. Browser evidence for the actual ordinary user-facing weekly OTL -> generated-technique availability flow remains a distinct closure requirement. Focused or server-side production-binding tests must not be relabeled as browser/playability evidence.

## Lane decision

No new dispatch was made because A and B2 are both already PREPARED with non-conflicting executable ownership. Their canonical inboxes were left unchanged.

Sprint3 remains `REOPENED_FIX_REQUIRED`; this result does not assign `CLOSED`.
