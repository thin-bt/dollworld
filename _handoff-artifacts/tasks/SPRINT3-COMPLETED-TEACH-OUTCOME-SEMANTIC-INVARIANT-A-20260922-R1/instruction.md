# SPRINT3-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master
source-finding: _handoff-artifacts/results/ROLE2-SPRINT3-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-AUDIT-20260922-R1/result.md

## Objective
Close the confirmed persisted `completedExplicitWeeklyTeachOutcomes` kind/payload semantic trust-boundary gap on current master. This is a product-source task, not status-only work.

## Required implementation
1. Fresh-read protocol, this instruction, Sprint3 status/backlog, source-finding result, and current producer/validator/tests before editing.
2. In `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`, preserve all existing structural validation and add producer-consistent semantic validation:
   - `invalid_master_action` requires `weeklyTeachSlotLimit === 0` and `discipleOutcomes.length === 0`.
   - `master_not_pipeline_eligible` requires `weeklyTeachSlotLimit === 0` and `discipleOutcomes.length === 0`.
   - Investigate `feature_disabled` against the current producer/config history. If currently producible, enforce the actual producer invariant. If retained only for legacy compatibility, document/test the accepted legacy shape; do not invent semantics.
   - Do not strengthen `teach_week_completed` beyond invariants actually guaranteed by `evaluateExplicitWeeklyTeachAction()` / authoritative spec.
3. Add focused regression tests proving impossible inactive-kind payloads are rejected and valid producer outputs still validate/round-trip through `validateSprint3MentorshipEntrypointRuntimeState()`.
4. Run targeted Sprint3 runtime-state tests and simulation-core typecheck. Run the applicable bounded verification required by current repository policy; do not weaken assertions, skip tests, raise timeout to hide failure, or reduce workload.
5. Publish product changes to canonical `master`, then fresh-read GitHub to verify the published bytes and record exact publication SHA.
6. Write terminal result to `_handoff-artifacts/results/SPRINT3-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-A-20260922-R1/result.md`, including changed paths, exact checks/results, feature_disabled disposition, publication SHA, and whether a post-product fresh root/release gate remains required.
7. Return A to IDLE only after terminal result is canonical.

## Non-conflict
- B2 is free at dispatch time but is not assigned this task; do not edit B2 control files.
- Do not self-assign formal Sprint3 `CLOSED`.
- Existing current-master build/start/ordinary-UI evidence remains evidence, but this new product delta must not be falsely claimed covered by older root-gate evidence.

## Hygiene
Do not create transient scratch directly under `_handoff-artifacts/`. Use `_handoff-artifacts/control-tmp/` only. If a root-level temp defect is found/created, correct it in the same run. Preserve `_handoff-artifacts/tools/**` and obey workspace-preservation rules.

## Terminal success
`SPRINT3_COMPLETED_TEACH_OUTCOME_SEMANTIC_INVARIANT_A_PASS` only if the semantic gap is closed on canonical master with focused verification and GitHub readback. Otherwise publish a precise BLOCKED/FAILED terminal result with evidence; no silent status-only completion.
