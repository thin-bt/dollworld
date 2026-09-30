# Role3 scoped evidence — PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1

assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: tournament server/projection
state: MEASURED_REPAIR_VERIFIED
shared-gate: FIX_REQUIRED
executor-task: PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1
executor-terminal: PERF_TOURNAMENT_SERVER_PROJECTION_MEASURED_REPAIR_VERIFIED
executor-result: _handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/result.md
product-lineage-sha: a90ac02c200fff19b94691e8e0da5d2fd08c47aa

## Consumed capable-lane evidence

Cursor A completed the exact Role3 tournament server/projection measurement handoff on the fixed representative snapshot (seed 4, week 720, personCount 15, eventStreamLen 11582, scheduleEntryCount 66). The measured UI009 GET hot path was progress projection / schedule overview. The request-scoped repair deduplicated playable-slot materialization and replaced repeated per-entry linear matching/history scans with semantically equivalent indexed request-scoped lookups.

After-repair fixed-snapshot measurements:
- cold routeTotalMs: 4.08
- warm routeTotalMs p50/p95: 1.07 / 1.28
- cold progressProjectionMs: 3.28
- warm last progressProjectionMs: 0.97
- cold/warm-last scheduleOverviewMs: 0.85 / 0.09
- cold/warm-last envelopeSerializationMs: 0.69 / 0.12
- responseBytes: 28117
- warm-last playableSlotListBuilds: 1
- warm-last slotComparisons: 135
- historySummaryPredicateVisits: 0
- annualScheduleBuilds: 0
- roundRobinProjectionCalls: 0

Raw evidence remains owned by the executor task:
- _handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/probe-latest.json
- _handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/probe-run-final.log
- _handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/regression-run.log
- _handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/e2e-ordinary-run.log

Verification consumed from executor result:
- production web build PASS
- UI009 regression vitest: 4 files / 12 tests PASS
- fixed snapshot UI009 GET probe: cold + 25 warm PASS
- real Chrome ordinary tournament/UI009 flow PASS (1/1)

The executor explicitly records that a separate persisted before-probe JSON was not retained in recovery. Therefore this Role3 evidence accepts the measured/counter-bounded repair and real-browser regression, but does not invent a before/after timing table that the executor did not retain.

## Boundary / next action

Role3 server/projection handoff is satisfied. Do not redispatch this same task or repeat static source inspection. Do not modify Role1 Person Detail or Role2 CompetitionPage client evidence/source from this lane.

This does not close the shared P0 or Sprint. Role1 still requires its dedicated 80-sample browser/network acceptance, Role2 still requires its dedicated CompetitionPage capable-runner measurements, and full Sprint close still requires binding current-master build/start/real-browser acceptance plus user approval.
