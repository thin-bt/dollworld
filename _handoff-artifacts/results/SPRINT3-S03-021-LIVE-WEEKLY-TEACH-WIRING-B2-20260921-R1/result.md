# SPRINT3-S03-021-LIVE-WEEKLY-TEACH-WIRING-B2-20260921-R1

state: TERMINAL
terminal: SPRINT3_S03_021_LIVE_WEEKLY_TEACH_WIRING_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-21T10:51:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-verify: f4bcbd3ac2cfcb1d7e458ad68b1ea8c16dab66f6
publication-commit: 23b1cd19635bd1de5df74517001f563e38776b09
local-worktree-head-at-verify: 23b1cd19635bd1de5df74517001f563e38776b09
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: YES
predecessor: SPRINT3-S03-019-FORMAT-GATE-RECOVERY-B2-20260921-R1
parallel-with: SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1 (A lane; no B2 edits to loss paths)

## Summary

Closed the S03-007/S03-013 runtime gap for **live explicit weekly `teach`**: production weekly step now **materializes disciple requests** from live mentorship + sidecar + catalog, **evaluates** via existing `processExplicitWeeklyTeachWeek` / `evaluateExplicitWeeklyTeachAction`, and **persists accepted outcomes** onto `worldState` person `sprint1State.techniqueStates` for next-week visibility. Replay/idempotence preserved via existing completed-outcome guards and slice-only application of newly completed entries per week.

Non-conflict: did not edit Cursor A control files or claim S03-022 teaching-selection runtime ownership (parallel A WIP kept out of this commit).

## Production call chain (canonical @ `23b1cd1`)

| Step | Symbol / path |
|------|----------------|
| Weekly step | `runSprint1WeeklyStep` → `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` |
| Materialize queue + disciple requests | `materializeLiveExplicitWeeklyTeachQueueRecords` → `deriveLiveExplicitWeeklyTeachDiscipleRequests` |
| Evaluate + runtime outcomes | `processExplicitWeeklyTeachWeek` → `evaluateExplicitWeeklyTeachAction` |
| World persistence | `applyExplicitWeeklyTeachOutcomesToWorldState` |

## Changed product files

- `packages/simulation-core/src/sprint3/derive-live-explicit-weekly-teach-disciple-requests.ts` (new)
- `packages/simulation-core/src/sprint3/apply-explicit-weekly-teach-outcomes-to-world-state.ts` (new)
- `packages/simulation-core/src/sprint3/materialize-live-mentorship-entrypoint-queues.ts`
- `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts`
- `packages/simulation-core/src/index.ts`
- `packages/simulation-core/src/sprint3/live-explicit-weekly-teach-wiring.test.ts` (new)

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| `@shared-world/simulation-core` `npm run build` | 1 | **PASS** |
| Focused vitest (LWT + WT + LMQ + MER + S03-020 loss wiring regression) | 1 | **PASS** — **33/33** |
| Root `npm run check` | 1 | **NOT COMPLETED** — parallel lane A WIP intermittently reintroduced non-B2 `sprint3`/`sprint1` files into the worktree during execution; bounded closure uses simulation-core build + focused set above |

```powershell
cd D:\xampp\htdocs\dollworld\packages\simulation-core
npm run build
cd D:\xampp\htdocs\dollworld
npx vitest run packages/simulation-core/src/sprint3/live-explicit-weekly-teach-wiring.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts packages/simulation-core/src/sprint3/live-mentorship-queue-materialization.test.ts packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts packages/simulation-core/src/sprint3/live-original-technique-loss-wiring.test.ts
```

## Terminal

**READY** — Live explicit weekly teach production wiring published @ **`23b1cd1`**. B2 returns to IDLE pending executor GitHub inbox consume.
