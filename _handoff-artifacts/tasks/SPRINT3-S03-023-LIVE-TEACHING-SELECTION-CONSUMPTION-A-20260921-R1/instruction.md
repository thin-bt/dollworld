# SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1

state: PREPARED
lane: A
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
sprint: Sprint3
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1
parallel-with: SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1

## Objective

Close or prove the remaining consumption gap after S03-022: canonical master now persists `techniqueTeachingSelectionRuntime`, but the weekly call chain still invokes `materializeLiveExplicitWeeklyTeachQueueRecords` after that persistence step. Verify from source/tests whether materialization actually consumes the persisted ranked selection snapshot, rather than independently re-evaluating selection from live inputs. If it does not consume the persisted result, implement the smallest deterministic wiring so explicit-teach request materialization uses the current persisted selection for the same master/disciple/week and only falls back/re-evaluates according to the existing S03-008 trigger contract.

## Fresh-read evidence

At master after S03-022, `runSprint1WeeklyStep` calls `processTechniqueTeachingSelectionWeek`, stores `working.techniqueTeachingSelectionRuntime`, then calls `materializeLiveExplicitWeeklyTeachQueueRecords`. S03-022 terminal result explicitly notes: `B2 materialization may still evaluate selection at request-build time; A adds deterministic persisted selection state ... ahead of teach queue materialization.` This task must resolve that uncertainty with canonical source evidence and, if confirmed, close it.

## Required work

1. Fresh-read protocol, A/B2 lane state, S03-022 result, current master, and relevant Sprint3 source/tests before edits.
2. Trace `materializeLiveExplicitWeeklyTeachQueueRecords` and its helpers to prove whether the newly persisted `techniqueTeachingSelectionRuntime` is consumed.
3. If already consumed correctly, add/strengthen an integration test proving same-week persisted ranked selection drives the explicit-teach queue and publish READY verification evidence; do not make semantic changes merely to create work.
4. If not consumed, wire the persisted selection into materialization with the smallest type-safe API change. Preserve existing S03-007 explicit teach and S03-008 selection/re-evaluation semantics; do not invent thresholds or ranking rules.
5. Cover at minimum: selected technique identity reaches queued explicit teach; no stale prior-week snapshot use; reevaluation-due path remains deterministic; replay/idempotence does not duplicate teach outcomes.
6. Run focused tests plus simulation-core typecheck and root `npm run check` when feasible.
7. Commit/push product/test changes to canonical master and verify GitHub readback. Publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1/result.md`.

## Non-conflict boundary

B2 owns `SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1`. Do not edit B2 control files or overwrite B2 persistence-regression semantics. Fetch/rebase current master before publication. No Sprint4 work.

## Terminal acceptance

READY requires canonical source/test evidence that persisted S03-022 selection is the selection consumed by live explicit-teach materialization (or equivalent proof that no independent divergent selection remains), focused regression PASS, and canonical GitHub readback. BLOCKED must name the exact unresolved source/ownership dependency and the next executable slice.