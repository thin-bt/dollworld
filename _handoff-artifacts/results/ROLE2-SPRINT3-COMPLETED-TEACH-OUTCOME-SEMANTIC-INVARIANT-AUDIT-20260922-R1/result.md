# ROLE2 Sprint3 Completed Teach Outcome Semantic Invariant Audit — 2026-09-22 R1

result-class: SOURCE_GAP_CONFIRMED
role: Role2
sprint: Sprint3
priority: DEADLINE_CRITICAL
authority: GitHub `thin-bt/dollworld` / `master`
source-ref-observed: master

## Scope

Unique non-conflicting implementation-analysis slice: persisted `completedExplicitWeeklyTeachOutcomes` semantic invariants after the entry-level structural validation recovery. This does not overlap current A/B2 release-evidence ownership.

## Finding

`validateExplicitWeeklyTeachActionOutcome()` now validates the persisted outcome structurally: known `kind`, safe-integer `weeklyTeachSlotLimit`, validated disciple outcome entries, and reason strings. However it does not enforce the semantic relationship between `kind` and the payload.

The producer `evaluateExplicitWeeklyTeachAction()` has stronger invariants:

- `invalid_master_action` => `weeklyTeachSlotLimit: 0`, `discipleOutcomes: []`
- `master_not_pipeline_eligible` => `weeklyTeachSlotLimit: 0`, `discipleOutcomes: []`
- normal teach processing computes a slot limit and emits disciple outcomes under that processing path.

The persisted validator therefore accepts states that the canonical producer cannot create, e.g. `{ kind: "invalid_master_action", weeklyTeachSlotLimit: 9, discipleOutcomes: [{...accepted...}] }` or the equivalent for `master_not_pipeline_eligible`. Those impossible states become trusted typed completed-history after validation.

This is a trust-boundary semantic gap, not merely a typing concern.

## Canonical implementation instruction

When a lane is free, add semantic validation for persisted explicit-weekly-teach outcomes in `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` without weakening existing structural checks.

Minimum required closure:

1. For `invalid_master_action`, require `weeklyTeachSlotLimit === 0` and `discipleOutcomes.length === 0`.
2. For `master_not_pipeline_eligible`, require `weeklyTeachSlotLimit === 0` and `discipleOutcomes.length === 0`.
3. Confirm whether `feature_disabled` is still a producible persisted value under current processor behavior. If producer/config history can emit it, encode its producer invariant; if legacy compatibility requires it, document and test the accepted legacy shape rather than inventing semantics.
4. For `teach_week_completed`, preserve producer-valid outputs; do not impose a stronger rule than the evaluator actually guarantees without spec evidence.
5. Add regression tests proving impossible inactive-kind payloads are rejected and valid producer outputs still round-trip through `validateSprint3MentorshipEntrypointRuntimeState()`.
6. Run targeted Sprint3 runtime-state tests plus the applicable package/root verification gate before publication.

## Evidence

- `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`: structural validation exists for completed explicit teach outcomes but no kind/payload semantic guard was observed.
- `packages/simulation-core/src/sprint3/evaluate-explicit-weekly-teach.ts`: canonical producer emits zero slots and zero disciple outcomes for `invalid_master_action` and `master_not_pipeline_eligible`.
- `packages/simulation-core/src/sprint3/types.ts`: outcome type itself cannot express those cross-field invariants.

## Lane decision

Fresh canonical lane read showed A and B2 both `PREPARED` on deadline-critical release-evidence tasks. No lane was overwritten. This finding is ready for immediate dispatch when either lane returns IDLE.

## Disposition

SOURCE_GAP_CONFIRMED. Concrete implementation instruction is canonicalized here; no status-only result.