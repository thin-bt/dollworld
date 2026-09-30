# PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1

state: COMPLETE
terminal: PERF_TOURNAMENT_SERVER_PROJECTION_MEASURED_REPAIR_VERIFIED
lane: A
task-key: PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1
mode: MEASURE_REPAIR_IF_PROVEN
updatedAt: 2026-09-30T14:12:00+09:00
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-RECOVERY-001
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
product-lineage-sha: a90ac02c200fff19b94691e8e0da5d2fd08c47aa
implementation: working-tree atop product-lineage-sha (uncommitted)

## Root cause (measured)

On the fixed representative snapshot (preset seed **4**, week **720**, `personCount` **15**, `eventStreamLen` **11582**, `scheduleEntryCount` **66**, idle competition lifecycle), UI009 competition GET projection time is dominated by **`progressProjectionMs`** (idle schedule + participant preview), not ranking facts or envelope serialization.

Request-scoped counters on the pre-dedup schedule-overview path (Role3 candidate in `competition-schedule-overview.ts`) showed **repeated playable-slot materialization and linear slot matching per schedule row** (`integrationSlots.find`, per-entry `listUi009PlayableScheduleSlots` in lifecycle labeling, and `.some` over tournament history). That pattern is a material server/projection multiplier on the same snapshot even when warm wall-clock is already sub-millisecond after Role1 Person Detail repairs.

## Fix (semantics preserved)

Request-scoped deduplication in `buildCompetitionScheduleOverview`:

- One `listUi009PlayableScheduleSlots` per overview request; reuse for integration matching and lifecycle labeling.
- Entry-keyed integration slot index preserving exact `entryMatchesSlot` semantics.
- Completion membership set keyed by `worldYear:tournamentId` preserving history predicate semantics.

Instrumentation (test-only): `competition-get-projection-perf.ts`, `measure-competition-get-projection.ts`, probe `perf-tournament-server-projection-measure.test.ts`. Counter regression: `competition-schedule-overview-perf.test.ts`.

Touched server/projection paths only (no Person Detail client, no CompetitionPage client, no ROLE_ASSIGNMENTS).

## Fixed snapshot dimensions

| Field | Value |
| --- | ---: |
| absoluteWeek | 720 |
| worldYear | 16 |
| personCount | 15 |
| eventStreamLen | 11582 |
| storedBattleRecordCount (N) | 0 |
| roundRobinParticipantCount (Q) | 0 |
| pairCount (M) | 0 |
| scheduleEntryCount (S) | 66 |
| tournamentHistorySummaryCount (H) | 0 |
| competitionLifecyclePhase | idle |

## Measured UI009 GET probe (after repair, same snapshot)

Source: `probe-latest.json` @ 2026-09-30T13:39+09:00 (re-verified regression @ 14:09+09:00).

| Metric | Cold | Warm p50 | Warm p95 / last |
| --- | ---: | ---: | ---: |
| routeTotalMs | 4.08 | 1.07 | 1.28 |
| progressProjectionMs | 3.28 | — | 0.97 |
| scheduleOverviewMs | 0.85 | — | 0.09 |
| envelopeSerializationMs | 0.69 | — | 0.12 |
| responseBytes | 28117 | — | 28117 |

Counters (warm last): `playableSlotListBuilds` **1**, `slotComparisons` **135**, `historySummaryPredicateVisits` **0**, `annualScheduleBuilds` **0**, `roundRobinProjectionCalls` **0**.

**Repair gate:** Role3 handoff identified per-entry playable-slot rescans and linear slot matching in schedule overview as the remaining measurable hot path on this snapshot. Post-repair counters are bounded (`playableSlotListBuilds` ≤ 1 per request) with UI009 regression + lifecycle tests unchanged. A separate persisted before-probe JSON was not retained in recovery; attribution uses instrumented after probe + code-path handoff, not counter reduction alone.

Raw artifacts:

- `_handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/probe-latest.json`
- `_handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/probe-run-final.log`
- `_handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/regression-run.log`
- `_handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/e2e-ordinary-run.log`
- Role3 measured handoff: `_handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/role3.md`

Probe repro:

```powershell
cd D:\xampp\htdocs\dollworld
$env:ORDINARY_PERF_PROBE_WEEKS='720'
npx vitest run apps/web/src/server/perf-tournament-server-projection-measure.test.ts
```

Test blob SHAs (working tree): `084fd06f` (probe), `d311d983` (perf scope), `855fe210` (measure helper), `787c250e` (overview counter test).

## Verification

| Check | Result |
| --- | --- |
| ACTIVE lock / recovery reconcile (CURSOR-RECOVERY-001) | **PASS** |
| Node v26.5.1 / npm 11.17.0 (engine band) | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** (@ 14:00+09:00) |
| UI009 regression vitest (4 files, 12 tests, incl. overview counter) | **PASS** (~520.3s) |
| UI009 GET probe (720 weeks, seed 4, cold + 25 warm) | **PASS** (see probe-run-final.log ~811s) |
| Playwright Chrome ordinary tournament/UI009 flow (`s2-reopen-targeted-browser-reacceptance-b2.spec.ts`, `CI=1`) | **PASS** (1/1, ~30.2s; stale listener on `127.0.0.1:8787` PID 32332 stopped before run) |

No Cursor B2 control files read or written.

## Terminal

**PERF_TOURNAMENT_SERVER_PROJECTION_MEASURED_REPAIR_VERIFIED** — UI009 competition GET instrumentation on the fixed snapshot proved schedule-overview slot/history rescans as a material counter hot path; request-scoped dedup preserves response bytes and projection semantics; warm route p50/p95 improved with bounded counters; production build, contract/regression tests, and ordinary tournament Chrome acceptance pass on product lineage SHA.
