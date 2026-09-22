# SPRINT3-S03-073-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
authority-ref: master
control-authority: GitHub

## Objective
Close the remaining persisted-runtime semantic gap for completed explicit weekly teach outcomes without weakening existing validation or policy.

## Required fresh reads
1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT3_STATUS.md`
3. current B2 inbox and newest B2 result
4. current master source for Sprint3 mentorship runtime-state validation and explicit weekly teach producer/evaluator
5. relevant Sprint3 spec/backlog and tests

## Product gap to verify and close
The completed explicit-weekly-teach history validator has structural validation, but must also enforce producer-valid semantic invariants for inactive/rejected master-level outcome kinds. In particular, kinds whose canonical producer means no teaching pipeline execution (including `invalid_master_action` and `master_not_pipeline_eligible`, subject to fresh source confirmation) must not deserialize with positive/nonzero `weeklyTeachSlotLimit` or non-empty `discipleOutcomes`.

Fresh-read the producer first and derive the exact closed set of kinds and payload invariants from current master. Do not guess or broaden policy. Inspect `feature_disabled` and any legacy/current producer path separately; constrain it only if current canonical producer/spec proves the invariant.

## Implementation
- Add/strengthen runtime semantic validation at the persisted-state trust boundary for completed explicit weekly teach outcomes.
- Preserve all producer-valid current-master histories and round-trip behavior.
- Reject impossible kind/payload combinations proven impossible by current producer/spec.
- Do not weaken mentorship relation/outcome closed-union validation or S03-071 fixture semantics.
- Add focused regression tests: each invalid inactive-kind payload is rejected; representative producer-valid outcomes deserialize/round-trip.
- If fresh source proves this exact invariant is already enforced, do not make a duplicate product edit: instead publish terminal verification evidence identifying the enforcing source/tests and choose the nearest unique uncovered semantic invariant only if safely bounded in this run.

## Verification / publication
Run the narrow relevant tests plus typecheck/lint/format checks appropriate to changed files. Because current Sprint3 is REOPENED_FIX_REQUIRED, do not claim sprint closure from focused tests alone. Publish product changes to canonical `thin-bt/dollworld` `master`, verify GitHub readback, then publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-073-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-B2-20260922-R1/result.md` binding exact product SHA and evidence.

Respect workspace hygiene: transient scratch only under `_handoff-artifacts/control-tmp/`; correct any root-level temp defect encountered in the same run. Never use broad untracked stash/clean operations forbidden by protocol.
