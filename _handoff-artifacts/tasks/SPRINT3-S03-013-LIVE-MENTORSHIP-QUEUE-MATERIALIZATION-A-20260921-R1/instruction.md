# SPRINT3-S03-013-LIVE-MENTORSHIP-QUEUE-MATERIALIZATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1

## Product gap

S03-012 made S03-003/004/007 processors reachable from the Sprint1 weekly production path, but its READY result explicitly leaves live-world materialization missing: `pendingEnrollmentBoundaries` and `pendingExplicitWeeklyTeachRecords` are consumed only when already supplied. Sprint3 cannot be treated as runtime-complete while normal world/weekly execution never creates those queue records.

This task is independent of B2-owned S03-009 original-technique runtime wiring. Do not touch original-technique lifecycle/runtime files or B2 control/task/result artifacts.

## Required work

1. Fresh-read `docs/SPEC.md` world step 4 / enrollment boundary, `docs/SPRINT_3_BACKLOG.md`, `docs/specs/15-sprint3-config-schema.md`, S03-012 result/source, weekly action/planner/runtime source, and current master.
2. Trace the authoritative live person/sidecar inputs available before `processSprint3EnrollmentIntakeBoundary` and `processExplicitWeeklyTeachWeek`.
3. Implement the smallest deterministic production materialization that creates enrollment-boundary records from eligible live persons at the canonical age/boundary and creates explicit weekly teach records from the authoritative weekly `teach` action/planner boundary when that action is selected.
4. Preserve S03-012 queue-fed APIs for replay/testability, but normal runtime must no longer require an external caller to prepopulate the queues for canonical live-world cases.
5. Use Sprint3Config and existing domain helpers; do not invent policy constants or broaden into Sprint4 retirement/inheritance.
6. Add regression tests proving: live enrollment candidate -> materialized boundary -> intake/enrollment persisted outcome; live explicit teach action -> materialized teach record -> persisted teach outcome; no duplicate materialization/reprocessing on replay/repeated weekly transition.
7. Run simulation-core build/typecheck and focused Sprint3 tests; run root `npm run check` when feasible and report unrelated pre-existing failures separately.
8. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-013-LIVE-MENTORSHIP-QUEUE-MATERIALIZATION-A-20260921-R1/result.md` with exact product commit SHA(s), call-chain evidence, tests, and READY/BLOCKED. READY is forbidden if canonical live runtime still requires manual queue prepopulation for either enrollment or explicit teach.
9. Return lane A to IDLE after terminal publication.

## Collision guard

- B2 owns `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1`; do not edit its original-technique runtime implementation scope.
- Do not edit Cursor B2 control/task/result artifacts.
- If current master already contains overlapping changes, rebase the bounded implementation on current master and preserve them rather than reverting.

## Completion rule

This is product completion work, not a status audit. Close the explicit S03-012 remaining runtime gap in the same execution where feasible.