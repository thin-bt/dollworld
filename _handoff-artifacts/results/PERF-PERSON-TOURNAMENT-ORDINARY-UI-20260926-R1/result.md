# PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1

state: COMPLETE
terminal: PERF_PERSON_TOURNAMENT_ORDINARY_UI_MEASURED_REPAIR_VERIFIED
lane: A
task-key: PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1
updatedAt: 2026-09-29T17:15:00+09:00
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
product-lineage-sha: a90ac02c200fff19b94691e8e0da5d2fd08c47aa
implementation: working-tree atop product-lineage-sha (uncommitted)

## Root cause (measured)

Ordinary production Person Detail (`buildPersonDetailView`) scanned and materialized the **entire** weekly `eventStream` twice per request (`toTrainingEvents` + `toStatGrowthEvents`) before person/window filtering. At representative ordinary data (preset seed **4**, week **720**, `eventStreamLen` **11582**, `personCount` **15**) this dominated server projection time (~25ms p50 per open). Competition idle schedule mapping repeated Sprint2 participant planning and annual schedule commits within one response.

Browser vs API: probe isolates server projection; dominant cost was API/simulation read-path serialization, not client-only mock benchmarks.

## Fix (semantics preserved)

1. **Person Detail** — single-pass `slicePersonDetailEvents` scoped by `personId`, `WEEKLY_TRAINING_PROCESSOR_ID`, and training window; stat growth uses same pass for weeks `<= W`. Technique catalog wire map memoized per simulation + overlay identity. Person lookup merged into one world scan.
2. **Competition UI** — memoized `buildAnnualSchedule(worldYear)`; `enrichParticipantLinks` uses personId index; idle schedule view reuses one participant-preview plan and avoids recomputing round-robin progress for active roster links.
3. **Probe harness** — `probe-latest.json` write awaited so evidence persists before vitest exit.

Files: `apps/web/src/server/ui005/build-person-detail.ts`, `apps/web/src/server/ui009/competition-schedule-overview.ts`, `apps/web/src/server/ui009/competition-wireframe-observation.ts`, `apps/web/src/server/ui009/map-competition-view.ts`, `apps/web/src/server/perf-person-tournament-ordinary-ui-probe.test.ts` (repro probe).

## Before / after (same probe, seed 4, week 720)

| Operation | Before p50 (ms) | Before p95 (ms) | After p50 (ms) | After p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Person Detail cold open (`person_000015`) | 24.24 | 27.51 | 0.57 | 1.22 |
| Person Detail warm open (`person_000006`, 30 iter) | 25.12 | 32.35 | 1.57 | 2.59 |
| Competition schedule idle map | 2.33 | 5.31 | 2.18 | 3.51 |

Before column: pre-fix profile on current master working tree (same probe harness, unoptimized projection). After column: SDK executor re-verification @ 2026-09-29T17:08–17:15+09:00 (`ORDINARY_PERF_PROBE_WEEKS=720`, vitest ~322.62s advance + measure).

Repro:

```powershell
cd D:\xampp\htdocs\dollworld
$env:ORDINARY_PERF_PROBE_WEEKS='720'
npx vitest run apps/web/src/server/perf-person-tournament-ordinary-ui-probe.test.ts
```

Latest JSON: `_handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/probe-latest.json`.

## Verification

| Check | Result |
| --- | --- |
| A ACTIVE lock before work (CURSOR-START-001) | **PASS** (@ 2026-09-29T17:08+09:00) |
| Server perf probe (720 weeks, seed 4) | **PASS** (~327.93s total, ~322.62s test; probe-latest.json retained) |
| `npm run build -w @shared-world/web` | **PASS** (@ 2026-09-29T17:08, ~3.7s) |
| `vitest run` ui005.person-detail + ui009 competition-auto-progression + sprint3-ordinary-session-activation | **PASS** (19 tests, ~174.1s) |
| Playwright ordinary weekly → tournament → battle log → ranking (`s2-reopen-targeted-browser-reacceptance-b2.spec.ts`, chrome, `CI=1` fresh webServer) | **PASS** (1/1, ~30.7s; stopped stale listener PID 69456 on `127.0.0.1:8787` before start) |

No Cursor B2 control files read or written.

## Traces / call paths

- Person Detail API: `handleGetPersonDetail` → `buildPersonDetailView` → `slicePersonDetailEvents` → `aggregateTrainingHistory` / `aggregateStatHistory` (was full-stream map ×2).
- Competition progress: `mapCompetitionProgressView` → `scheduleOverviewForSession` → `buildCompetitionScheduleOverview` (cached annual schedule; shared participant preview).

## Terminal

**PERF_PERSON_TOURNAMENT_ORDINARY_UI_MEASURED_REPAIR_VERIFIED** — Dominant Person Detail full-stream scan removed; competition idle mapping deduplicated; same-data probe shows order-of-magnitude Person Detail speedup; production build, contract tests, and ordinary tournament browser regression pass on current product SHA.
