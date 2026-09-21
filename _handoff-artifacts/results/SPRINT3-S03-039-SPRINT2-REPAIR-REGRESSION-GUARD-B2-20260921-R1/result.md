# SPRINT3-S03-039-SPRINT2-REPAIR-REGRESSION-GUARD-B2-20260921-R1

state: TERMINAL
terminal: SPRINT3_SPRINT2_REPAIR_REGRESSION_GUARD_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-21T18:06:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
local-worktree-sha: 8713032f26a88b1ce16618f395ed178f4128ad30
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: NO
test-change: YES
documentation-change: NO

## Summary

Added a narrow **production-boundary integration regression guard** at the ordinary `POST /simulation/step` seam where Sprint1 weekly processing (including Sprint3 mentorship/teaching/OTL runtime inside `runSprint1WeeklyStep`) is followed by UI009 `syncCompetitionAutoProgressionForWeek` and competitive-record projection. Tests bind Sprint3 config on the live web session runtime (test-only) and assert OTL weekly runtime advances exactly once per step on both non-tournament and tournament weeks, with deterministic replay and bounded post-tournament outcome growth.

## Regression risk addressed

| Risk | Guard |
|------|--------|
| Sprint3 weekly processors skipped when tournament auto-finish runs on the same step | OTL runtime fingerprint must change and event stream must grow after a single step on tournament week |
| Double-run / duplicate weekly Sprint3 outcomes after auto progression | Post-tournament step allows at most +1 enrollment/explicit-teach completed counters |
| Ordering drift / nondeterminism across replay | Two identical seeded runs produce identical weekly observation vectors |
| Non-tournament weeks altered by tournament repair | Ordinary week (not tournament week nor week immediately before) still advances Sprint3 OTL runtime once |

## Call order (verified target)

1. `runSprint1WeeklyStep` — Sprint3 enrollment materialization, weekly training adapter, teaching selection, explicit teach, OTL lifecycle (when bound)
2. `syncCompetitionAutoProgressionForWeek` — UI009 tournament auto progression (Sprint2 repair surface)
3. `applyCompetitionCompetitiveRecordsToWorldRuntime` — competitive record projection

## Changed paths

| Path | Role |
|------|------|
| `apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts` | New regression guard (4 cases) |

## Verification (bounded)

| Gate | Result | Evidence |
|------|--------|----------|
| `sprint2-repair-sprint3-weekly-regression-guard.test.ts` | **PASS** | 4/4 |
| `competition-auto-progression.test.ts` (companion Sprint2 auto-progression) | **PASS** | 5/5 (same vitest invocation) |

Command:

`npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts`

## Non-conflict

No edits to A-owned core-loop implementation (`routes-simulation` progression wiring unchanged). No Sprint3 semantic or formal-close state changes. Test-only Sprint3 binding on session runtime after `simulation/start`.

## GitHub master publication

Local worktree SHA recorded above. Executor consumes GitHub Inbox to publish/readback for canonical master evidence per control plane.
