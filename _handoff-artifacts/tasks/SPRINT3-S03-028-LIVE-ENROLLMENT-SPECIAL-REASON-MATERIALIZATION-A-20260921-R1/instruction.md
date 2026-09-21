# SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
authority: GitHub `thin-bt/dollworld` `master`

## Gap

Canonical `materializeLiveEnrollmentQueueBoundaries()` currently writes `activeSpecialReasons: []` for every live enrollment boundary. Canonical `evaluateEnrollmentAssignment()` only permits a non-parent formal master while a qualified/accepted biological parent exists when `activeSpecialReasons.length > 0`. Therefore the specified `special reason -> alternate formal master` branch exists only in the pure evaluator and is unreachable from live-world materialization.

## Required work

1. Fresh-read protocol, A/B2 state, Sprint3 backlog/spec, and current master before editing.
2. Trace `EnrollmentSpecialReason` definitions/config/spec and identify the canonical live-world facts that can deterministically produce each currently supported special reason. Do not invent new game rules or hard-code undocumented thresholds.
3. Add the smallest production derivation/materialization needed so `materializeLiveEnrollmentQueueBoundaries()` supplies real `activeSpecialReasons` instead of unconditional `[]` when canonical source facts justify them.
4. If the existing domain does not yet contain sufficient source facts for any supported reason, do not fabricate them: publish concrete BLOCKED evidence naming the missing canonical state/schema and the minimum prerequisite task. If at least one reason is derivable, implement it now.
5. Add focused production-boundary tests proving: ordinary qualified-parent path remains parent-default; a derivable special reason makes an eligible accepted non-parent compete through the alternate pool; reject/defer/qualification filters still apply; deterministic ordering/replay is stable; no special reason is emitted without its source fact.
6. Do not modify B2-owned S03-027 backlog reconciliation work. Do not start Sprint4 or expand lineage/retirement schema beyond an already-canonical Sprint3 fact.
7. Run the narrow tests plus the feasible repository check gate. Publish product source/tests to canonical `master`, then publish terminal result under the exact result path below. READY requires canonical source/test publication and GitHub readback; local-only evidence is not READY.

## Result path

`_handoff-artifacts/results/SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1/result.md`

## Hygiene

Obey `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`. Never create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` and correct any root-level temp defect in the same run.
