# SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260922-R1

terminal: READY
lane: A
task-key: SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260922-R1
updatedAt: 2026-09-22T22:28:00+09:00
worktree-head: 9da74a532325605a95882613f6d71aca118a990f

## Summary

Repaired Sprint2 F-02 multi-tournament yearly progression for UI009 ordinary week simulation:

- Removed single-first-F-slot limitation: integration schedule now enumerates all F-rank normal slots chronologically; weekly auto-progression processes every due/unprocessed slot in order.
- After a tournament finishes, the next due slot initializes with carried-forward tournament history, annual ranking history store, and earnings ledger; each slot is completed at most once (history-guarded).
- Simulation start/reset no longer auto-finish competitions; tournament resolution remains on ordinary `simulation/step` only (user intent alignment).
- Schedule overview marks integration-completed tournaments as `終了` instead of leaving past weeks at `開催予定` when history/completion store proves completion.
- Persisted competition `worldYear` now follows the canonical simulation world year (not the UI009 planning projection year).

## Evidence

| Check | Result |
|-------|--------|
| `npm run build --workspace @shared-world/web` | PASS |
| `npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts` | PASS (7/7) |

Key assertions added/updated: successive F-rank tournaments via week steps only; no `開催予定` on completed integration slots; ranking snapshots change across tournaments; annual ranking history/options after multi-tournament finalize.

## Remaining split (non-blocking for F-02 core)

- **F-04 / planning projection:** `resolveUi009PlanningSession` may still project participant planning to `UI009_COMPETITION_PLANNING_WORLD_YEAR` (21) when the accepted roster is too small. Participant selection path is unchanged; follow-up task should remove or narrow this projection now that multi-slot execution uses explicit schedule world years.

## Files touched (product)

- `apps/web/src/server/ui009/competition-schedule-slot.ts`
- `apps/web/src/server/ui009/competition-auto-progression.ts`
- `apps/web/src/server/ui009/competition-auto-progression.test.ts`
- `apps/web/src/server/ui009/competition-participant-preview.ts`
- `apps/web/src/server/ui009/competition-engine.ts`
- `apps/web/src/server/ui009/competition-engine-schedule-config.ts`
- `apps/web/src/server/ui009/competition-schedule-overview.ts`
- `apps/web/src/server/ui009/competition-wireframe-observation.ts`
- `apps/web/src/server/ui009/map-competition-view.ts`
- `apps/web/src/server/routes-simulation.ts`
