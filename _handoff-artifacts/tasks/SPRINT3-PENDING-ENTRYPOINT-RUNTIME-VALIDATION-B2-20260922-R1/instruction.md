# Sprint3 pending entrypoint runtime validation

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
authority-ref: master
source-audit: _handoff-artifacts/audit/ROLE2-SPRINT3-PENDING-ENTRYPOINT-RUNTIME-VALIDATION-GAP-20260922-R2.md

## Objective
Implement the confirmed missing per-entry validation for `pendingEnrollmentBoundaries` and `pendingExplicitWeeklyTeachRecords` in `validateSprint3MentorshipEntrypointRuntimeState()`.

## Work
- Fresh-read current master, source audit, Sprint3 status, and producer/type definitions first.
- Add dedicated validators for pending `EnrollmentAssignmentRecord` and `ExplicitWeeklyTeachActionRecord` entries.
- Check required object fields, closed union values, nested records, IDs/weeks, numeric constraints, and closed object keys according to the current producer/type contracts.
- Preserve producer-valid ordering and round-trip semantics; do not change gameplay policy or producer behavior.
- Add focused regression tests for invalid union values, missing nested data, invalid numeric values, extra keys at closed boundaries, and valid producer round trips for both queues.
- Keep existing completed-history and mentorship-assignment validation green.
- Publish product changes to canonical master and verify GitHub readback.
- Run focused Sprint3 tests. Since this changes product bytes after the currently binding root gate, run a fresh applicable root gate if feasible; otherwise explicitly record the new product SHA as requiring a separate root-gate task. Do not assign Sprint3 CLOSED from focused tests alone.
- Publish terminal result at `_handoff-artifacts/results/SPRINT3-PENDING-ENTRYPOINT-RUNTIME-VALIDATION-B2-20260922-R1/result.md` and return B2 inbox to IDLE.

## Acceptance
Both pending queues are validated entry-by-entry before runtime state acceptance; invalid contract data is rejected by tests; producer-valid pending records remain semantically unchanged; product commit is on canonical master with readback evidence; release-gate follow-up is accurately recorded.
