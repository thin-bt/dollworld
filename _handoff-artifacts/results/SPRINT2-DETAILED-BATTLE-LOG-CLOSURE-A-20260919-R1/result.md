# SPRINT2-DETAILED-BATTLE-LOG-CLOSURE-A-20260919-R1

state: READY
terminal: DETAILED_BATTLE_LOG_CLOSURE
lane: A
updatedAt: 2026-09-19T20:47:00+09:00
control-authority: GitHub
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
worktree-head: 37c1acf330e93c3190b2403f99b86fc23d3f69cd
required-branch: master
predecessor: SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1

## Summary

Closed the Sprint2 match-detail gap: retained detailed battle logs are materialized from the canonical competition payload store, projected through UI-007 action-log item mapping, exposed on `GET /api/s1_5/competition/matches/:matchId`, and rendered on `CompetitionMatchPage` with turn-order table plus full combat timeline (reuse of `BattleLogViewPanel`). Pruned / missing / non-retained cases show explicit unavailable copy.

## Implemented / touched

| Area | Paths |
|------|--------|
| Match detail projection + API | `competition-match-log-projection.ts`, `competition-match-view.ts`, `routes-competition.ts`, `app.ts` |
| Client match route + UI | `CompetitionMatchPage.tsx`, `CompetitionMatchDetailedLog.tsx`, `fetch-ui009.ts`, `ui009-views.ts`, `main.tsx`, `Shell.tsx`, `CompetitionPage.tsx` (history → match links) |
| Tests | `competition-match-view.test.ts`, `competition-match-page.test.tsx`, `ui009.competition.test.ts`, `no-domain-routes.test.ts` |

## Verification

| Check | When | Result |
|-------|------|--------|
| `npx tsc -p apps/web/tsconfig.build.json --noEmit` | 2026-09-19T20:46+09:00 | PASS |
| `npx tsc -p apps/web/tsconfig.client.json --noEmit` | 2026-09-19T20:46+09:00 | PASS |
| `npx vitest run apps/web/src/server/ui009` | 2026-09-19T20:45+09:00 | 31/31 PASS |
| `npx vitest run apps/web/src/server/ui009.competition.test.ts` | 2026-09-19T20:46+09:00 | 3/3 PASS (includes match-detail GET with logItems) |
| `npx vitest run apps/web/src/server/ui009/competition-match-view.test.ts apps/web/src/client/competition/competition-match-page.test.tsx` | 2026-09-19T20:45+09:00 | 3/3 PASS |

## Working tree (product slice)

```
 M apps/web/src/client/Shell.tsx
 M apps/web/src/client/competition/CompetitionPage.tsx
 M apps/web/src/client/competition/fetch-ui009.ts
 M apps/web/src/client/competition/ui009-views.ts
 M apps/web/src/client/main.tsx
 M apps/web/src/server/app.ts
 M apps/web/src/server/no-domain-routes.test.ts
 M apps/web/src/server/ui009.competition.test.ts
 M apps/web/src/server/ui009/routes-competition.ts
?? apps/web/src/client/competition/CompetitionMatchDetailedLog.tsx
?? apps/web/src/client/competition/CompetitionMatchPage.tsx
?? apps/web/src/client/competition/competition-match-page.test.tsx
?? apps/web/src/server/ui009/competition-match-log-projection.ts
?? apps/web/src/server/ui009/competition-match-view.test.ts
?? apps/web/src/server/ui009/competition-match-view.ts
```

## Terminal

**READY** — Detailed retained battle-log content is presented from canonical stored payloads; unavailable/expired (pruned / not retained / missing payload) is handled on API and UI.
