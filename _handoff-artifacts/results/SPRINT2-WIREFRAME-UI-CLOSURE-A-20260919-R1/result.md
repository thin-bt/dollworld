# SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1

state: FIX_REQUIRED
terminal: WIREFRAME_UI_SLICE_SCHEDULE_PARTICIPANTS_MATRIX_HISTORY_RANKING_NAV
lane: A
updatedAt: 2026-09-19T18:05:00+09:00
control-authority: GitHub
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR / CURSOR-START-001
worktree-head: 3e30c5ad97e5255e843e44bd93105d34b4772980
required-branch: master
predecessor: SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1
authority: `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` + task instruction (Sprint2 wireframe scope, not full SPEC expansion)

## Summary

PM failover scope **Sprint2 wireframe** implemented as a bounded UI009 observation slice: annual schedule year navigation, dense participant comparison, round-robin pair matrix, durable tournament series history + annual ranking year catalog on finalize, ranking route/year UX, and match-detail display names. Predecessor knockout bracket + `/ranking` + match routes preserved. Terminal remains **FIX_REQUIRED** until promotion/rank-history commit surfaces and full wireframe browser matrix (incl. long-run Playwright evidence) are closed or user-deferred.

## Wireframe completion-guard ledger

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Annual tournament schedule (year overview, world time, prev/current/next year) | READY | `competition-schedule-matrix.tsx` year nav; `buildCompetitionScheduleOverview` view-year clamp |
| 2 | Tournament detail | READY | Existing `CompetitionPage` detail tabs |
| 3 | Participant dense comparison list | READY | `competition-participant-comparison` columns rank/age/official record |
| 4 | Round-robin standings + pair-result matrix | READY | `competition-round-robin-pair-matrix` |
| 5 | Knockout bracket / match results | READY | Predecessor knockout section retained |
| 6 | Tournament result / winner / placements | READY | Champion hero + finalize path unchanged |
| 7 | Tournament series history / historical winners | READY (session-scoped) | `tournamentHistorySummaries` on finalize; `competition-series-history` UI; **seriesKey** via `buildSeriesKey` (not display-name grouping) |
| 8 | Annual ranking (year-select, appearances/wins, person nav) | PARTIAL | Year options + appearances on competition/ranking tables; history store upsert on finalize; **multi-year history** needs additional simulated years |
| 9 | Promotion result | MISSING | Store field + UI section when non-empty; **no commit path** on ui009 F-rank RR finalize |
| 10 | Person rank history + source tournament nav | MISSING | Projection read path stubbed; **no durable bundles** committed on ui009 finalize |
| 11 | Match → battle detail + person detail nav | PARTIAL | Match page display names + log availability; **full detailed-log renderer** still summary-only |

## Implemented / touched (this pickup)

| Area | Paths |
|------|--------|
| Wireframe observation projection | `apps/web/src/server/ui009/competition-wireframe-observation.ts`, `competition-schedule-overview-labels.ts` |
| Schedule year + participant enrichment | `competition-schedule-overview.ts`, `map-competition-view.ts`, `types.ts`, `competition-store.ts` |
| Finalize history + ranking store | `competition-round-robin-finalize.ts` |
| GET query `scheduleYear` / `rankingYear` | `routes-competition.ts` |
| Match detail names | `competition-match-view.ts`, `CompetitionMatchPage.tsx` |
| Client wireframe UI | `CompetitionPage.tsx`, `competition-schedule-matrix.tsx`, `RankingPage.tsx`, `fetch-ui009.ts`, `ui009-views.ts` |
| Browser acceptance (A-owned) | `tests/e2e/s2-wireframe-ui-closure-a.spec.ts` |
| Predecessor preserved | knockout bracket, `/ranking`, `/competition/matches/:matchId` (prior uncommitted slice) |

## Verification

| Check | When | Result |
|-------|------|--------|
| `npx tsc -p apps/web/tsconfig.build.json --noEmit` | 2026-09-19T17:40+09:00 | PASS |
| `npx tsc -p apps/web/tsconfig.client.json --noEmit` | 2026-09-19T17:40+09:00 | PASS |
| `npx vitest run apps/web/src/server/ui009` | 2026-09-19T17:40+09:00 | 30/30 PASS |
| Playwright `s2-wireframe-ui-closure-a.spec.ts` (chrome) | 2026-09-19T18:00+09:00 | **IN PROGRESS / prior run failed** (schedule heading during year switch; spec updated with ui009 bootstrap + multi-step RR) |

## Remaining next action

1. Wire **promotion result** + **person rank history** commit/projection on ui009 finalize when `tournamentKind === "promotion"` (domain `buildRankPromotionResult` / `commitPromotionWithRankHistory`), with browser assertions.
2. Re-run and record PASS for `tests/e2e/s2-wireframe-ui-closure-a.spec.ts` and mandatory regression specs after local build.
3. Optional: person-detail rank-history panel (item 10 cross-route).

## Terminal

**FIX_REQUIRED** — wireframe items 9–10 and item 8 multi-year history remain open; not READY per instruction completion rule.
