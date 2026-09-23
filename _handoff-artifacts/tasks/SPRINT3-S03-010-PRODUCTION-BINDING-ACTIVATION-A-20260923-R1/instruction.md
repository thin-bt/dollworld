# SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
repository: thin-bt/dollworld
branch: master

## Why this task exists

Fresh canonical S03-010 result proves weekly OTL success -> generated-technique registration only when `generatedTechniqueRegistrationEnabled` is enabled, and explicitly records that the ordinary web production binding remains on the balance-0.8.0/OTL configuration without that flag. Therefore the just-closed processor wiring is not live-reachable from the ordinary production web session.

Current source confirms `apps/web/src/server/production-sprint3-run-session-binding.ts` still builds accepted production config from `createSprint3Balance080ConfigInput()` and manually enables OTL, while `createSprint3Balance100ConfigInput()` is the canonical S03-010 pack that enables `generatedTechniqueRegistrationEnabled` and supplies `generatedTechniqueMaterialization`.

This is a product gap, not documentation-only drift.

## Required execution

1. Fresh-read `origin/master`, this instruction, `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, `SPRINT3_STATUS.md`, `docs/SPRINT_3_BACKLOG.md`, and the S03-010 terminal result before editing.
2. Claim lane A ACTIVE using the normal executor contract. Do not touch B2.
3. Trace the production web Sprint3 session binding and config validation/runtime initialization required by balance 1.0.0.
4. Make the smallest canonical source change that makes accepted ordinary production Sprint3 sessions use the S03-010 generated-technique-registration/materialization configuration. Prefer the canonical balance helper rather than duplicating config literals. Preserve all already accepted S03-001..009 feature gates and semantics.
5. Verify runtime state initialization/persistence needed by generated technique catalog overlay. If balance-1.0.0 binding exposes a missing runtime-state initialization or validation gap, repair it in this same task.
6. Add/adjust regression coverage proving at minimum:
   - accepted production Sprint3 config enables `generatedTechniqueRegistrationEnabled`;
   - generated-technique materialization config is present/valid;
   - ordinary production-bound weekly OTL success can register the generated technique without external test seeding;
   - no duplicate registration on replay/idempotent rerun;
   - existing production Sprint3 features remain enabled.
7. Run focused tests first. If product bytes change, run fresh exact-lineage pristine root `npm run check` and production web build. Do not reuse the `3c82d3a` gate for changed product bytes.
8. Publish product + regressions to canonical `master`, then fresh-read exact published SHA and evidence.
9. Reconcile `_handoff-artifacts/control/SPRINT3_STATUS.md` and `docs/SPRINT_3_BACKLOG.md` only with evidence actually established by this task. Keep Sprint3 `REOPENED_FIX_REQUIRED` unless formal closure is separately assigned.
10. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1/result.md`, then return A inbox to IDLE.

## Non-conflict / hygiene

- Do not edit or consume `ROLE3_INBOX.md`.
- Do not touch Cursor B2 control/task state.
- Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/`.
- Preserve `_handoff-artifacts/tools/**` and `_handoff-artifacts/specs/**`.

## Acceptance

PASS requires ordinary production web Sprint3 binding to make S03-010 auto-registration live-reachable, regression evidence for that production-bound path, canonical publication, and a fresh exact-lineage release gate for any changed product bytes.