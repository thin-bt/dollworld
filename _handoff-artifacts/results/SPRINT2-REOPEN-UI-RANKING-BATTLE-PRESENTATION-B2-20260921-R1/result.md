# SPRINT2-REOPEN-UI-RANKING-BATTLE-PRESENTATION-B2-20260921-R1

state: TERMINAL
terminal: SPRINT2_REOPEN_UI_RANKING_BATTLE_PRESENTATION_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-21T17:10:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: YES
documentation-change: NO

## Summary

Implemented standalone **Ranking** (`/ranking`) as a real annual-ranking view backed by existing `GET /api/s1_5/competition` data (year switch, enriched columns, person links). Official tournament match pages now project **battle-log presentation summary** from retained detailed logs and render through shared `BattleLogViewPanel` (versus banner, combat log UX) instead of a minimal table-only layout. Competition footer documents **week-based auto progression** while retaining `competition-step-cta` as a secondary manual aid (non-conflict with A-owned lifecycle engine).

## Product changes

| Area | Change |
|------|--------|
| Ranking | `RankingPage` loads competition ranking rows; `AnnualRankingTable` shared with competition detail |
| Battle presentation | `battleLogSummary` on match detail API; `CompetitionMatchDetailedLog` + `presentationMode="competition"` on battle log panel |
| Manual step UX | Auto-progression note + de-emphasized manual step hint; CTA preserved for wireframe/idempotency |

## Verification (bounded)

| Gate | Result | Evidence |
|------|--------|----------|
| Focused vitest (ui009 + competition + ranking + battle-log) | **PASS** | 15 files / 45 tests |
| `@shared-world/web` typecheck | **PASS** | `tsc` build/client/test configs |
| Playwright Chrome 7/7 wireframe | **NOT RUN** | Out of bounded B2 slice; prior Sprint2 wireframe suite unchanged surface for competition test ids |

## Non-conflict

No tournament schedule/participant/battle engine progression reimplementation. Consumes existing UI009 contracts and runtime/API only.

## Remaining gap (explicit)

Full Sprint2 Chrome wireframe reacceptance not executed in this pickup. A parallel task **SPRINT2-REOPEN-CORE-LOOP-REPAIR-A** still owns ordinary weekly auto lifecycle wiring; B2 UI assumes existing `syncCompetitionAutoProgressionForWeek` behavior.
