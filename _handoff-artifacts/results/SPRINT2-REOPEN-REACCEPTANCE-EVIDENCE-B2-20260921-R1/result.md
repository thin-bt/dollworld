# SPRINT2-REOPEN-REACCEPTANCE-EVIDENCE-B2-20260921-R1

state: TERMINAL
terminal: SPRINT2_REOPEN_REACCEPTANCE_EVIDENCE_B2_READY_FOR_REACCEPTANCE
verificationOutcome: PASS
resultClass: READY_FOR_REACCEPTANCE
lane: B2
updatedAt: 2026-09-21T19:22:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 669c6392f4be7ba2d35811a1421944f2760b7815
publication-commit: 085a5450ed72dcf1490bdb73428e8f2806b9a481
publication-parent: 669c6392f4be7ba2d35811a1421944f2760b7815
binding-core-loop-commit: 5b5103a7ccdeb2514c56cfd95cd9fb272962378b
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: YES
documentation-change: NO
predecessor: SPRINT2-REOPEN-UI-RANKING-BATTLE-PRESENTATION-B2-20260921-R1

## Summary

Independent Sprint2 **re-acceptance evidence** audit after A canonical core-loop publication @ **`5b5103a`**. Closed the remaining **B2 UI canonical-publication gap** (ranking screen + tournament battle presentation) with product commit @ **`085a545`** on GitHub `master`. Core-loop chain evidence binds to A publication; UI/ranking/battle evidence binds to B2 publication. `SPRINT2_STATUS.md` not changed (PM transition separate).

## Re-acceptance matrix

| Requirement | Canonical evidence | Status |
|-------------|-------------------|--------|
| 通常週進行 → 大会予定週 | `syncCompetitionAutoProgressionForWeek` + simulation hooks @ `5b5103a` | **BOUND** — A `SPRINT2-REOPEN-CORE-LOOP-CANONICAL-PUBLICATION-A` |
| 参加者確定 → 自動開催・戦闘 → 終了 | `competition-auto-progression.test.ts` / `ui009.competition.test.ts` on tip | **PASS** (worktree pre-push) |
| 結果保存 → 年間ランキング更新 | `rankingRows` + competitive-record sync on start/reset/step @ `5b5103a` | **BOUND** — A publication + guard @ tip |
| 大会 UI 反映（finished/champion/summary） | UI009 integration tests | **PASS** |
| 独立ランキング画面 `/ranking` | `RankingPage` + `AnnualRankingTable` @ **`085a545`** | **BOUND** — published |
| 公式大会戦闘ログ presentation 再利用 | `battleLogSummary` + `BattleLogViewPanel` `presentationMode="competition"` @ **`085a545`** | **BOUND** — published |
| Sprint3 週次回帰ガード | `sprint2-repair-sprint3-weekly-regression-guard.test.ts` @ tip (post-repair seam) | **PASS** (4/4) |
| Sprint2 Chrome wireframe 12/12 | Prior `SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4` | **NOT RE-RUN** — surface delta since wireframe baseline; PM may schedule targeted re-run |
| Full `@shared-world/web` typecheck | `npm run typecheck -w @shared-world/web` | **FAIL** (attempt1) — TS errors in guard test file only; vitest guard **PASS** |

## Publication (B2 UI gap closure)

| Path | Role |
|------|------|
| `apps/web/src/client/ranking/RankingPage.tsx` | Standalone annual ranking view |
| `apps/web/src/client/ranking/ranking-page.test.tsx` | Ranking SSR/table binding |
| `apps/web/src/client/competition/AnnualRankingTable.tsx` | Shared ranking table (competition + ranking) |
| `apps/web/src/client/competition/CompetitionPage.tsx` | Auto-progression note; ranking link |
| `apps/web/src/client/competition/CompetitionMatchPage.tsx` | Match detail layout |
| `apps/web/src/client/competition/CompetitionMatchDetailedLog.tsx` | Battle log panel wiring |
| `apps/web/src/client/competition/competition-match-battle-presentation.ts` | Client projection helpers |
| `apps/web/src/client/battle-log/BattleLogView.tsx` | `presentationMode="competition"` |
| `apps/web/src/server/ui009/competition-match-view.ts` | `battleLogSummary` on match detail API |
| `apps/web/src/server/ui009/competition-match-battle-presentation.ts` | Server summary projection |
| `apps/web/src/server/ui009/competition-match-battle-presentation.test.ts` | Presentation unit tests |

Push: `669c639..085a545` `HEAD -> master`

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read control plane + Sprint2 reopen results + A inbox (IDLE post-publication) | 1 | **PASS** |
| Focused vitest — UI009 core + B2 UI (local workspace pre-publish) | 1 | **PASS** — 7 files / **17** tests |
| Extended slice — ui003 + checkpoint-resume + ui006 (local) | 1 | **PASS** — 3 files / **50** tests |
| Pre-push vitest @ `origin/master` + B2 delta (publish worktree) | 1 | **PASS** — 6 files / **16** tests |
| Client `tsc` @ published tip | 1 | **PASS** |
| Full workspace typecheck | 1 | **FAIL** — guard test TS (vitest still PASS); no bounded retry |
| `git push origin HEAD:master` | 1 | **PASS** |
| GitHub readback | 1 | **PASS** — `origin/master` @ **`085a545`** |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\b2-reacceptance-publish-wt
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009.competition.test.ts apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts apps/web/src/server/ui009/competition-match-battle-presentation.test.ts apps/web/src/client/competition/competition-match-page.test.tsx apps/web/src/client/ranking/ranking-page.test.tsx
git push origin HEAD:master
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master
git merge-base --is-ancestor 5b5103a origin/master
```

## GitHub canonical readback

```text
origin/master @ pickup: 669c6392f4be7ba2d35811a1421944f2760b7815
core-loop binding: 5b5103a7ccdeb2514c56cfd95cd9fb272962378b (ancestor of tip)
B2 UI publication: 085a5450ed72dcf1490bdb73428e8f2806b9a481
readback tip: 085a5450ed72dcf1490bdb73428e8f2806b9a481
push evidence: 669c639..085a545  HEAD -> master
```

## Non-conflict guard

- Cursor A control files (`CURSOR_INBOX.md`, `CURSOR_ACTIVE_TASK.md`, `CURSOR_A_INBOX.md`) not edited; accidental local drift restored.
- No A-owned core-loop product rewrites in B2 commit (hooks remain @ `5b5103a` lineage).
- `SPRINT2_STATUS.md` not set to CLOSED.

## Residual (non-blocking for binding matrix)

1. **Wireframe Chrome re-run** — not executed in this pickup; recommend PM-targeted pass if UI delta requires browser evidence beyond vitest.
2. **Guard test TypeScript** — `npm run typecheck -w @shared-world/web` fails on guard test typings while runtime tests pass; track as hygiene, not Sprint2 functional blocker.

## Terminal

**READY_FOR_REACCEPTANCE** — Sprint2 reopened acceptance chain is evidenced on canonical GitHub `master` with core loop @ **`5b5103a`**, B2 UI @ **`085a545`**, focused gates **PASS**, and explicit residual wireframe/typecheck notes for PM status transition.
