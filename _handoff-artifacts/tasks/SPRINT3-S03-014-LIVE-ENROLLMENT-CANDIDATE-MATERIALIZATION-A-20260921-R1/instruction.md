# SPRINT3-S03-014-LIVE-ENROLLMENT-CANDIDATE-MATERIALIZATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Product gap

Canonical S03-013 `materializeLiveEnrollmentQueueBoundaries` currently builds `masterCandidates` from `livingParentsForChild(...)` only. This makes the S03-003 evaluator's explicit non-parent `formal_master_assigned` path unreachable from the live world: when parents are not qualified/accepted, no alternate qualified master is ever materialized. The same adapter also hardcodes `intakeAcceptance = "accept"` rather than deriving the S03-004 intake decision, so live enrollment does not actually honor the implemented autonomous intake contract.

This is a bounded live-runtime integration defect, not a request to redesign the pure S03-003/S03-004 evaluators.

## Required work

1. Fresh-read canonical master and S03-003/S03-004/S03-013 source/tests before editing.
2. Claim lane A ACTIVE for this exact task-key.
3. Extend live enrollment candidate materialization so the candidate pool can include eligible non-parent formal masters from live world state, while preserving the default-parent preference in `evaluateEnrollmentAssignment`.
4. Do not hardcode every candidate as intake `accept`. Feed each candidate through the existing S03-004 intake decision contract using deterministic live inputs available in the weekly/runtime state. If required live inputs are genuinely absent from canonical state, implement the smallest explicit adapter/state boundary rather than inventing hidden values; document any still-unavailable statistic as a blocker instead of fabricating it.
5. Preserve deterministic ordering and replay behavior. Do not touch B2-owned S03-009/S03-011 work.
6. Add focused regression tests proving at minimum: (a) qualified parent remains preferred by default; (b) when no qualified/accepted parent exists, a qualified accepted non-parent can become `formal_master_assigned`; (c) reject/defer intake candidates are not selected; (d) deterministic candidate ordering/replay remains stable.
7. Run simulation-core build and focused Sprint3 tests; run root `npm run check` if feasible without colliding with unrelated in-flight work.
8. Publish product source/tests to GitHub canonical `master`, then publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-014-LIVE-ENROLLMENT-CANDIDATE-MATERIALIZATION-A-20260921-R1/result.md` with actual master/product SHA and verification evidence. Return A to IDLE only after terminal publication.

## Non-goals / collision guard

- Do not modify B2 control/task/result artifacts.
- Do not implement S03-009 original-technique weekly runtime wiring or S03-011 battle first-use hooks.
- Do not weaken S03-003 parent-default semantics.
- Do not mark READY from an uncommitted/local-only diff.
