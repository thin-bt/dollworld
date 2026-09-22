# SPRINT3-S03-006-CURRENT-MASTER-PARENT-GUIDANCE-SPEC-SOURCE-AUDIT-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
authority: GitHub `thin-bt/dollworld` / `master`

## Objective
Audit S03-006 parent temporary guidance on current canonical master as a production spec-to-source closure task. Do not accept a pure helper/unit-test existence as proof. Trace the live weekly path from persisted family/parent relationship and child age/formal-master state through guidance eligibility/selection, weekly training/development application, and next-week persisted state.

## Required fresh reads
1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT3_STATUS.md`
3. `docs/SPRINT_3_BACKLOG.md` S03-006 and authoritative Sprint3 spec/config material
4. newest relevant S03-006 task/results and current production source/tests
5. fresh `origin/master` before changing anything

## Audit questions
- Is temporary parent guidance reachable from the ordinary live weekly runtime, not only a helper/test fixture?
- Is it restricted to the specified pre-formal-master/age boundary and stopped once a formal master exists or the age boundary is crossed?
- Does the live decision use persisted parent/family relationships rather than fixture/default IDs?
- Is guidance applied exactly once in the weekly development path and persisted into the next-week state?
- Are missing/dead/ineligible parent and formal-master-present boundaries deterministic and regression-covered?
- Is there any double application with normal mentorship/teaching or S03-005 disciple-count efficiency?

## Execution
If a concrete gap exists, implement the smallest non-conflicting production repair and focused regression in this same task where feasible. If implementation is already correct but a missing regression/evidence lock is found, add the smallest durable regression/evidence needed. Do not manufacture a code delta when source and regression already prove the contract; in that case publish a concrete no-gap evidence result with exact source/test paths and boundary findings.

Preserve all unrelated local work. Never use broad untracked stash/clean. Transient scratch belongs only under `_handoff-artifacts/control-tmp/`.

## Verification
Run focused tests for touched/inspected S03-006 paths. If product bytes change, run the applicable exact-lineage root `npm run check` and production web build before rebinding any Sprint3 live gate. Fresh-read product lineage before claiming a gate. Sprint3 remains `REOPENED_FIX_REQUIRED`; do not assign CLOSED.

## Terminal publication
Publish `_handoff-artifacts/results/SPRINT3-S03-006-CURRENT-MASTER-PARENT-GUIDANCE-SPEC-SOURCE-AUDIT-A-20260923-R1/result.md` with result class, exact commits/paths/tests, gap/no-gap findings, and any remaining ordinary-flow acceptance risk. Then return A canonical inbox to TERMINAL/IDLE per control-plane contract.