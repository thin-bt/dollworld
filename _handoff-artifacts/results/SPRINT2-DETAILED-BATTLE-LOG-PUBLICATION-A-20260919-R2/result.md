# SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R2

state: READY
terminal: DETAILED_BATTLE_LOG_PUBLICATION
lane: A
updatedAt: 2026-09-19T21:42:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: PUBLISHED
publication-commit: e1d5b3bb4e2ed50ee14114cfaa61adf69deadeaa
worktree-head: e1d5b3bb4e2ed50ee14114cfaa61adf69deadeaa
predecessor-task: SPRINT2-DETAILED-BATTLE-LOG-CLOSURE-A-20260919-R1
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR / CURSOR-START-001
production-change: YES (committed and pushed)

## Summary

Recovered the completed detailed-battle-log Sprint2 product slice from closure worktree (previously uncommitted modules + missing route wiring) and published to canonical `master` @ `e1d5b3b`. Match detail is served at `GET /api/s1_5/competition/matches/:matchId`, client route `/competition/matches/:matchId`, history links on `CompetitionPage`, and full retained log rendering via `CompetitionMatchDetailedLog` / `BattleLogViewPanel`.

## Published paths (git @ HEAD)

| Path | Role |
|------|------|
| `apps/web/src/server/ui009/competition-match-view.ts` | Match lookup + payload materialization |
| `apps/web/src/server/ui009/competition-match-log-projection.ts` | UI-007 log item + turn-order projection |
| `apps/web/src/server/ui009/routes-competition.ts` | `handleGetCompetitionMatch` |
| `apps/web/src/server/app.ts` | Route registration |
| `apps/web/src/server/no-domain-routes.test.ts` | Registered path list |
| `apps/web/src/server/ui009.competition.test.ts` | Integration GET match detail |
| `apps/web/src/server/ui009/competition-match-view.test.ts` | Unavailable/pruned unit test |
| `apps/web/src/client/competition/CompetitionMatchPage.tsx` | Match detail page |
| `apps/web/src/client/competition/CompetitionMatchDetailedLog.tsx` | Turn order + battle log panel |
| `apps/web/src/client/competition/competition-match-page.test.tsx` | Client log render tests |
| `apps/web/src/client/competition/fetch-ui009.ts` | `loadCompetitionMatch` |
| `apps/web/src/client/competition/ui009-views.ts` | Client match detail types |
| `apps/web/src/client/competition/CompetitionPage.tsx` | History → match links |
| `apps/web/src/client/main.tsx` | `/competition/matches/:matchId` parse |
| `apps/web/src/client/Shell.tsx` | Shell route + page mount |

Verified via `git cat-file -e HEAD:apps/web/src/server/ui009/competition-match-view.ts` and `git cat-file -e HEAD:apps/web/src/client/competition/CompetitionMatchPage.tsx`.

## Verification

| Check | When | Result |
|-------|------|--------|
| `npx tsc -p apps/web/tsconfig.build.json --noEmit` | 2026-09-19T21:37+09:00 | **PASS** |
| `npx tsc -p apps/web/tsconfig.client.json --noEmit` | 2026-09-19T21:37+09:00 | **PASS** |
| `npx vitest run apps/web/src/server/ui009` | 2026-09-19T21:38+09:00 | **31/31 PASS** |
| `npx vitest run apps/web/src/server/ui009.competition.test.ts` | 2026-09-19T21:38+09:00 | **3/3 PASS** |
| `npx vitest run apps/web/src/server/ui009/competition-match-view.test.ts apps/web/src/client/competition/competition-match-page.test.tsx` | 2026-09-19T21:38+09:00 | **3/3 PASS** |
| `npx vitest run apps/web/src/server/no-domain-routes.test.ts` | 2026-09-19T21:38+09:00 | **1/1 PASS** |
| `npm run build -w @shared-world/web` | 2026-09-19T21:38+09:00 | **PASS** |
| `git push origin master` | 2026-09-19T21:41+09:00 | **e1d5b3b** on `thin-bt/dollworld` |

## Terminal

**READY** — Detailed battle log product slice is on canonical master; focused checks pass.
