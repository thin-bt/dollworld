# SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Product gap

Sprint3 backlog marks S03-003/004/007 as implemented, but their acceptance surfaces are primarily pure evaluators. Fresh-read canonical source must verify that the actual weekly/world runtime invokes the enrollment/intake/explicit-teach decisions rather than only exporting tested helpers. This is independent of B2-owned S03-009 original-technique runtime wiring and must not touch S03-009/S03-011 files.

## Required work

1. Fresh-read `docs/SPEC_PREPARATION_PLAN.md`, `docs/SPRINT_3_BACKLOG.md`, Sprint3 source, weekly/world processors, and current master.
2. Trace production call sites for `evaluateEnrollmentAssignment`, `evaluateMasterIntakeDecision`, and `evaluateExplicitWeeklyTeachAction` from runtime entrypoint to persisted world/runtime state.
3. If a bounded missing runtime connection exists, implement the smallest deterministic wiring plus regression tests in this task. Do not invent new policy constants; use Sprint3Config.
4. If wiring is intentionally deferred by an explicit canonical specification, do not manufacture code: publish exact spec/source evidence and identify the first actually missing executable Sprint3 runtime boundary.
5. Do not edit B2 control/task/result artifacts or S03-009-owned original-technique weekly runtime files. Do not publish S03-011 first-use MatchId work.
6. Run the narrow package tests/typecheck for changed code and root `npm run check` when feasible.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1/result.md` with product commit SHA(s), exact call-chain evidence, tests, and READY/BLOCKED. READY is forbidden for helper-only evidence when required runtime persistence is still absent.
8. Return lane A to IDLE after terminal publication.

## Completion rule

This is product-gap work, not a status audit. Complete a bounded missing runtime integration where feasible in the same execution; otherwise terminalize BLOCKED with the exact canonical dependency that prevents source completion.