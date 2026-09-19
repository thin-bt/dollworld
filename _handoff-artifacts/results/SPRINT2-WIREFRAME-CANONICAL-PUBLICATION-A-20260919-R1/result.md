# SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1

state: READY
terminal: WIREFRAME_CANONICAL_PUBLICATION
lane: A
updatedAt: 2026-09-20T01:15:00+09:00
control-authority: GitHub
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-START-001
published-master-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
required-branch: master
predecessor: SPRINT2-FORMAL-COMPLETION-EVIDENCE-A-20260919-R1
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2
recovery: unpublished wireframe slice recovered from worktree and pushed to origin/master

## Summary

Recovered the Sprint2 wireframe product slice that prior `SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1` asserted but was absent from canonical `master` at `722c686…`. Published server/client projections, completion-guard `data-testid` surfaces (guards 01, 03–10), preserved guard-11 detailed battle-log ancestor `e1d5b3bb…`, and the canonical B2 Playwright harness `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts`. Fixed inverted disable logic on `competition-schedule-current-year` so year navigation matches guard-01.

## Published commit

| Field | Value |
|-------|--------|
| SHA | `92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a` |
| Message | Publish Sprint2 wireframe UI slice and B2 browser harness to master. |
| Remote | `origin/master` (pushed) |

## Completion-guard grep evidence (HEAD @ published SHA)

| Guard | testid / surface | Path on master |
|-------|------------------|----------------|
| 01 | `competition-schedule-year-nav` | `apps/web/src/client/competition/competition-schedule-matrix.tsx` |
| 03 | `competition-participant-comparison` | `apps/web/src/client/competition/CompetitionPage.tsx` |
| 04 | `competition-round-robin-pair-matrix` | `apps/web/src/client/competition/CompetitionPage.tsx` |
| 05 | `competition-knockout-bracket` | `CompetitionPage.tsx`, `map-competition-view.ts` |
| 07 | `competition-series-history` | `CompetitionPage.tsx` |
| 08 | `competition-ranking-year-nav`, `competition-annual-ranking-table` | `CompetitionPage.tsx` |
| 09 | `competition-promotion-results` | `CompetitionPage.tsx` |
| 10 | `competition-person-rank-history` | `CompetitionPage.tsx` |
| 11 | `competition-match-log-availability` | `CompetitionMatchDetailedLog.tsx` (ancestor `e1d5b3bb` preserved) |

Harness: `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` on master.

## Verification

| Check | When | Result |
|-------|------|--------|
| `npx tsc -p apps/web/tsconfig.build.json --noEmit` | 2026-09-20T00:53+09:00 | PASS |
| `npx tsc -p apps/web/tsconfig.client.json --noEmit` | 2026-09-20T00:53+09:00 | PASS |
| `npx vitest run apps/web/src/server/ui009` | 2026-09-20T00:54+09:00 | 31/31 PASS |
| `npm run build -w apps/web` | 2026-09-20T00:54+09:00 | PASS |
| Playwright `s2-wireframe-browser-acceptance-b2.spec.ts` (chrome, 12 guards, post year-nav fix) | 2026-09-20T01:13+09:00 | 12/12 PASS |

## Terminal

**READY** — Sprint2 wireframe slice and B2 browser harness are on canonical `master` at `92f2a09…`.
