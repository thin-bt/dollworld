# SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1

state: READY
terminal: WIREFRAME_UI_BROWSER_CLOSURE
lane: A
updatedAt: 2026-09-19T20:05:00+09:00
control-authority: GitHub
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR / CURSOR-START-001
worktree-head: f9d80a94631876bb5654cf8d508a03d64b9be465
required-branch: master
predecessor: SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1
authority: `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` + task instruction (Sprint2 wireframe scope)

## Summary

Prior pickup published FIX_REQUIRED without landing implementation in git. This REDISPATCH restored the full Sprint2 wireframe slice: schedule year navigation, dense participant comparison, round-robin pair matrix, session-scoped series history + annual ranking history on finalize, promotion/rank-history commit on `promotion` finalize, knockout bracket observation, match-detail route, ranking route wiring, and browser completion guards.

## Wireframe completion-guard ledger

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Annual tournament schedule (year overview, world time, prev/current/next year) | READY | `competition-schedule-matrix.tsx` + `scheduleYear` query |
| 2 | Tournament detail | READY | `CompetitionPage` detail tabs |
| 3 | Participant dense comparison list | READY | `competition-participant-comparison` + `enrichParticipantLinks` |
| 4 | Round-robin standings + pair-result matrix | READY | `competition-round-robin-pair-matrix` |
| 5 | Knockout bracket / match results | READY | `competition-knockout-bracket` + knockout projection |
| 6 | Tournament result / winner / placements | READY | champion hero + finished CTA |
| 7 | Tournament series history / historical winners | READY | finalize `tournamentHistorySummaries` + `competition-series-history` (`buildSeriesKey`) |
| 8 | Annual ranking (year-select, appearances/wins, person nav) | READY | `competition-annual-ranking-table` + history store upsert; B2 guard-08 |
| 9 | Promotion result | READY | UI section + `commitPromotionWithRankHistory` on promotion finalize; empty state on F-rank ui009 path |
| 10 | Person rank history + source tournament nav | READY | UI section + bundles on promotion finalize; empty state on F-rank ui009 path |
| 11 | Match → battle detail + person detail nav | READY | history match links + `GET /api/s1_5/competition/matches/:matchId` + `CompetitionMatchPage` (log availability probe) |

## Implemented / touched

| Area | Paths |
|------|--------|
| Wireframe observation + finalize persistence | `competition-wireframe-observation.ts`, `competition-round-robin-finalize.ts`, `competition-store.ts` |
| Schedule year + ranking year GET | `competition-schedule-overview.ts`, `routes-competition.ts`, `map-competition-view.ts`, `types.ts` |
| Match detail API | `competition-match-view.ts`, `app.ts` |
| Client wireframe UI | `CompetitionPage.tsx`, `competition-schedule-matrix.tsx`, `fetch-ui009.ts`, `ui009-views.ts`, `CompetitionMatchPage.tsx`, `RankingPage.tsx`, `Shell.tsx`, `main.tsx`, `ui001-contracts.ts` |
| Knockout projection (preserved) | `competition-knockout-bracket-view.ts` |

## Verification

| Check | When | Result |
|-------|------|--------|
| `npx tsc -p apps/web/tsconfig.build.json --noEmit` | 2026-09-19T19:56+09:00 | PASS |
| `npx tsc -p apps/web/tsconfig.client.json --noEmit` | 2026-09-19T19:56+09:00 | PASS |
| `npx vitest run apps/web/src/server/ui009` | 2026-09-19T19:56+09:00 | 30/30 PASS |
| Playwright `s2-wireframe-ui-closure-a.spec.ts` (chrome, CI fresh server) | 2026-09-19T20:02+09:00 | 1/1 PASS |
| Playwright `s2-wireframe-browser-acceptance-b2.spec.ts` (chrome, 12 guards) | 2026-09-19T20:04+09:00 | 12/12 PASS |

## Residual notes (non-blocking)

- Full turn-by-turn battle log renderer on match page remains summary + availability count (wireframe navigation satisfied; deeper log UI is a follow-on slice).
- ui009 default F-rank path shows empty promotion/rank-history tables until a `promotion` tournament is finalized (domain-correct).

## Terminal

**READY** — Sprint2 wireframe completion guards implemented and browser-accepted (A + B2 gate specs).
