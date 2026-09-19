# SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1

state: FIX_REQUIRED
terminal: SPEC_WIDE_UI_SLICE1_KNOCKOUT_RANKING_MATCH_NAV
lane: A
updatedAt: 2026-09-19T17:18:00+09:00
control-authority: GitHub
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR / CURSOR-START-001
worktree-head: 3e30c5ad97e5255e843e44bd93105d34b4772980
required-branch: master
authority-note: `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` not present locally; bound scope from `docs/SPEC.md` §6 / 第2段階 and task instruction.

## Summary

Fresh spec-wide ledger against `docs/SPEC.md` §6 and 第2段階 shows most major observation surfaces remain **MISSING** or **PARTIAL** beyond the accepted round-robin competition slice. This pickup implemented **slice 1**: knockout bracket observation projection + UI, independent `/ranking` route (rank-group / win-rate / leader), competition history → match detail navigation (`/competition/matches/:matchId` + GET API), and Chrome Playwright acceptance for ranking route load. Full Sprint2 UI closure is **not** READY.

## Requirements ledger (SPEC §6 + 第2段階)

| Surface / requirement | Route / API | Status | Evidence |
|------------------------|-------------|--------|----------|
| ホーム／マイ家系 | `/` SimulationPanel | PARTIAL | Home week advance; no dedicated my-lineage digest |
| 世界ニュース | `/events` | PARTIAL | Events list; not full Major/Historic news product |
| ランキング（共通ランク別・年間・勝率等） | `/ranking` | PARTIAL | Rank groups + win rate + leader; no streak/generational compare |
| 人物詳細 | `/people/:id` | READY | Existing PersonDetailPage |
| 家系図 | — | MISSING | No route/component |
| 師弟系譜 | — | MISSING | No route/component |
| 大会・記録（履歴・王者） | `/competition` | PARTIAL | Schedule + RR matrix; no series history / 歴代王者 store |
| 検索・フォロー | — | MISSING | No search/follow UI |
| 総当たり順位表 | `/competition` | READY | round-robin matrix/history |
| トーナメント表 | `/competition` | PARTIAL | Knockout bracket table when format is knockout/group_knockout |
| 対戦概要・詳細戦闘ログ | `/competition/matches/:id` | PARTIAL | Match summary + log availability count; no full log renderer |
| 人物・大会・試合ナビ | links | PARTIAL | People links; new match detail links from history/bracket |
| 管理者手動進行・シミュ状況 | `/` | READY | SimulationPanel step |
| 限定戦王者 / 総合王者投影 | — | MISSING | Domain/UI projection not wired to standalone ranking |
| 連勝・世代別比較 | — | MISSING | No durable projection in web API |

## Implemented files (this pickup)

| Path | Change |
|------|--------|
| `apps/web/src/server/ui009/competition-knockout-bracket-view.ts` | Knockout bracket read projection |
| `apps/web/src/server/ui009/competition-knockout-bracket-view.test.ts` | Unit test |
| `apps/web/src/server/ui009/competition-match-view.ts` | Match detail lookup + materialization probe |
| `apps/web/src/server/ui009/routes-competition.ts` | `GET /api/s1_5/competition/matches/:matchId` |
| `apps/web/src/server/ui009/map-competition-view.ts` | `knockoutBracket`, `bracketFormatKind` on competition view |
| `apps/web/src/server/ui009/types.ts` | Wire types extended |
| `apps/web/src/server/app.ts` | Route registration |
| `apps/web/src/server/no-domain-routes.test.ts` | Registered path list |
| `apps/web/src/client/ranking/RankingPage.tsx` | Independent ranking UI |
| `apps/web/src/client/competition/CompetitionMatchPage.tsx` | Match detail page |
| `apps/web/src/client/competition/CompetitionPage.tsx` | Knockout table + history match links |
| `apps/web/src/client/competition/fetch-ui009.ts` | `loadCompetitionMatch` |
| `apps/web/src/client/competition/ui009-views.ts` | Client view types |
| `apps/web/src/client/Shell.tsx` | Menu + routes |
| `apps/web/src/client/main.tsx` | `/ranking`, `/competition/matches/:matchId` |
| `apps/web/src/shared/ui001-contracts.ts` | Menu item ランキング |
| `tests/e2e/s2-spec-wide-ui-closure-a.spec.ts` | Browser acceptance (A-owned) |

## Verification

| Check | When | Result |
|-------|------|--------|
| `npx tsc -p apps/web/tsconfig.client.json --noEmit` | 2026-09-19T17:15+09:00 | PASS |
| `npx tsc -p apps/web/tsconfig.build.json` | 2026-09-19T17:17+09:00 | PASS |
| ui009 vitest (knockout view, lifecycle, bracket, routes) | 2026-09-19T17:15+09:00 | 6/6 PASS |
| sprint2 acceptance + competition engine vitest | 2026-09-19T17:15+09:00 | 25/25 PASS |
| Playwright `s2-spec-wide-ui-closure-a.spec.ts` (chrome) | 2026-09-19T17:18+09:00 | 1/1 PASS |

## Remaining gaps (next executable slice)

1. **Full detailed battle log UI** for tournament matches (reuse materialized log; not mock-battle-only path).
2. **World-level ranking API** decoupled from active competition session (project from world sprint2 stores when idle).
3. **家系図 / 師弟系譜 / 検索・フォロー** routes and browser-safe projections per §6.
4. **Tournament series history / 歴代王者** (G-UI-S2-01/02); requires domain projection, not display-name grouping.
5. **Streak / generational comparison** — blocked on upstream facts; do not fake.
6. Expand Playwright to cover knockout bracket visibility on single-elimination schedule and match-detail navigation after stepping a tournament.

## Next action

Continue `SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1` slice 2: tournament match detailed-log page + world ranking GET + lineage/search surfaces, with browser tests per new surface. Terminal remains **FIX_REQUIRED** until ledger has no MISSING/PARTIAL items without approved deferral.
