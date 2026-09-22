# SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260923-R1

state: TERMINAL
terminal: SPRINT2_F02_MULTI_TOURNAMENT_YEARLY_PROGRESSION_A_PASS
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
task-key: SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260923-R1
updatedAt: 2026-09-23T01:08:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 9d952a565456010c608d52c477771019bd784270
local-worktree-head-at-pickup: 9da74a532325605a95882613f6d71aca118a990f
publication-commit: (pending — local product delta uncommitted on pickup HEAD)
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-BACKLOG-CURRENT-GATE-RECONCILIATION-A-20260923-R1
production-change: YES
documentation-change: NO
sprint2-control-state: REOPENED_FIX_REQUIRED (unchanged — formal CLOSED not assigned)

## Summary

Closed binding Sprint2 **F-02**: ordinary `simulation/step` weekly progression now processes **every due unprocessed** F-rank integration schedule slot in chronological order (not only the first slot), re-initializes competition state per slot with history carry-forward, and marks completed schedule rows **終了** instead of leaving past weeks at **開催予定**. Automatic tournament resolution on week advancement preserved; simulation start/reset does not auto-finish competitions. Sprint3 weekly regression guard and ordinary-session activation tests remain green.

## Product repair (F-02 scope)

| Invariant | Mechanism |
|-----------|-----------|
| Multi-slot weekly processing | `listUi009DueUnprocessedScheduleSlots` + loop in `syncCompetitionAutoProgressionForWeek` |
| Chronological due slots incl. prior years with history | Year range `minYear..worldYear` from tournament history + slot sort by `absoluteWeek` |
| Single-instance store escape | `ensureStoreReadyForSlot` / `initializeCompetitionStateForTournament` per lifecycle identity |
| Schedule UI truth | `competition-schedule-overview` + wireframe observation bind completed integration slots |
| Ranking / annual history | Engine finalize + history store; `rankingYear` query after multi-tournament finalize |

## Changed paths (product — local uncommitted @ `9da74a5`)

| Path | Role |
|------|------|
| `apps/web/src/server/ui009/competition-schedule-slot.ts` | Multi-slot listing, due/completed guards, cross-year due enumeration |
| `apps/web/src/server/ui009/competition-auto-progression.ts` | Per-slot init + `runCompetitionThroughFinish` loop |
| `apps/web/src/server/ui009/competition-auto-progression.test.ts` | Value/chronology tests (multi-tournament, annual history, year crossing) |
| `apps/web/src/server/ui009/competition-engine.ts` | Tournament init/history carry-forward |
| `apps/web/src/server/ui009/competition-engine-schedule-config.ts` | Second F-rank month offset (≥2 tournaments/year) |
| `apps/web/src/server/ui009/competition-schedule-overview.ts` | Completed slot lifecycle labels |
| `apps/web/src/server/ui009/competition-participant-preview.ts` | Planning/session alignment |
| `apps/web/src/server/ui009/competition-wireframe-observation.ts` | Annual ranking / series history projection |
| `apps/web/src/server/ui009/map-competition-view.ts` | View mapping |
| `apps/web/src/server/ui009/types.ts` | Types |
| `apps/web/src/server/routes-simulation.ts` | Remove start-path auto-finish |
| `apps/web/src/server/ui004/project-person.ts` | Minor projection helper |
| `apps/web/src/client/competition/CompetitionPage.tsx` | UI binding |
| `apps/web/src/client/competition/ui009-views.ts` | View types |

**Co-located worktree delta (not F-02 core):** `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` — parallel Sprint3 runtime work; regression guard below still PASS.

## Verification

| Check | Result |
|-------|--------|
| A inbox PREPARED + instruction fresh-read | **PASS** |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| Fresh-read `GITHUB_CONTROL_PLANE.md` + `SPRINT2_STATUS.md` | **PASS** |
| `npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts` | **PASS (8/8)** |
| `npx vitest run apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts` | **PASS (5/5)** |
| `npm run typecheck --workspace @shared-world/web` | **PASS** |
| `npm run build --workspace @shared-world/web` | **PASS** |
| Full root `npm run check` | **not run** — focused F-02 + Sprint3 weekly guard scope |
| Playwright multi-week browser acceptance | **not run** — deterministic API/integration tests cover invariants |

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts
npx vitest run apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts
npm run typecheck --workspace @shared-world/web
npm run build --workspace @shared-world/web
```

## Remaining split (non-blocking for F-02)

- **F-04 / planning projection:** `resolveUi009PlanningSession` may still project participant planning to `UI009_COMPETITION_PLANNING_WORLD_YEAR` (21) when roster is small — participant-selection path unchanged; narrow in follow-up if product requires.
- **GitHub product publish:** Local product delta not yet committed/pushed; separate publication gate required before binding a new product SHA on `origin/master`.
- **Sprint2 formal CLOSED:** Not assigned — wireframe/product gaps and PM control authority per `SPRINT2_STATUS.md`.

## Non-conflict guard

- No Cursor B2 inbox/active read or write.
- No collision with `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`.

## Terminal

**SPRINT2_F02_MULTI_TOURNAMENT_YEARLY_PROGRESSION_A_PASS** — F-02 multi-tournament yearly progression invariants satisfied on local product delta @ **`9da74a5`** with focused evidence above.
