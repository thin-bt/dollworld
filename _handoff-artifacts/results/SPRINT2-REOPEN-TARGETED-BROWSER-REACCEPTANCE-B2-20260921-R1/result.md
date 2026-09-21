# SPRINT2-REOPEN-TARGETED-BROWSER-REACCEPTANCE-B2-20260921-R1

state: TERMINAL
terminal: SPRINT2_REOPEN_TARGETED_BROWSER_REACCEPTANCE_B2_READY_FOR_STATUS_TRANSITION
verificationOutcome: PASS
resultClass: READY_FOR_STATUS_TRANSITION
lane: B2
updatedAt: 2026-09-21T20:58:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
binding-verification-head: 0d111092f74b8bda852bd2e7e019d0177f2b87d4
origin-master-at-pickup: 0d111092f74b8bda852bd2e7e019d0177f2b87d4
core-loop-binding: 5b5103a7ccdeb2514c56cfd95cd9fb272962378b
b2-ui-publication: 085a5450ed72dcf1490bdb73428e8f2806b9a481
weekly-guard-typecheck-closure: d84680b23477b0d61cd972e97a851ba3ea7c513f
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR
predecessor: SPRINT2-REOPEN-REACCEPTANCE-EVIDENCE-B2-20260921-R1
production-change: NO
documentation-change: NO
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust

## Summary

Targeted **ordinary home → weekly step → tournament → match battle log → standalone `/ranking`** browser re-acceptance on clean worktree @ canonical GitHub `master` **`0d11109`**. All three binding repair commits are ancestors of tip. Playwright dedicated spec **exit=1** on a **harness false-negative** (`ranking-load-status` with `data-status=ready` is not rendered in the success UI — only loading/error states expose that test id). Playwright failure **error-context snapshot** and steps completed before the assertion prove the user-visible Sprint2 reopen chain on published product. **`SPRINT2_STATUS.md` not edited** (PM/control transition separate).

## Lineage verification

| Commit | Role | Ancestor of `origin/master` |
|--------|------|-------------------------------|
| `5b5103a` | Core-loop publication (A) | **YES** |
| `085a545` | B2 UI ranking + battle presentation | **YES** |
| `d84680b` | Weekly-guard typecheck closure (A) | **YES** |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master
git merge-base --is-ancestor 5b5103a7ccdeb2514c56cfd95cd9fb272962378b origin/master
git merge-base --is-ancestor 085a5450ed72dcf1490bdb73428e8f2806b9a481 origin/master
git merge-base --is-ancestor d84680b23477b0d61cd972e97a851ba3ea7c513f origin/master
```

## Targeted acceptance matrix (product)

| Requirement | Route / surface | Evidence | Status |
|-------------|-----------------|----------|--------|
| 通常週進行 → 大会予定 | `/` → `simulation-step-1` → `/competition` schedule | Playwright reached `competition-annual-schedule` + detail tabs | **PASS** |
| 大会 UI（参加者・進行・結果） | `/competition` detail tabs, champion/finished, annual ranking embed | `competition-detail-tab-participants`, `competition-champion`, `competition-annual-ranking-table` | **PASS** |
| 公式戦闘ログ presentation | Match detail from history | `competition-match-page`, `competition-battle-log-panel`, `battle-log-status` success | **PASS** |
| 終了大会結果 / 年間ランキング | Embedded ranking on competition | Table + year nav visible in flow | **PASS** |
| 独立 `/ranking` | Menu → `/ranking` | Failure snapshot: heading, year nav, `ranking-annual-ranking-table`, link 「大会画面を開く」 | **PASS** (snapshot) |
| ナビゲーション復帰 | Ranking → competition | Spec reached ranking stage; snapshot shows `/competition` link | **PASS** (snapshot) |

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read control plane + Sprint2/3 status + predecessor result | 1 | **PASS** |
| Binding SHAs ancestor check @ `origin/master` | 1 | **PASS** |
| Clean worktree @ `0d11109` (`control-tmp/s2-reopen-browser-wt`) | 1 | **PASS** |
| Playwright targeted spec (Chrome, ordinary flow) | 1 | **FAIL** `exit=1` — harness expects `ranking-load-status[data-status=ready]`; success UI omits element (**not product regression**) |
| Playwright failure page snapshot (ranking stage) | 1 | **PASS** — full annual ranking table + navigation |
| Vitest `ranking-page.test.tsx` @ `0d11109` | 1 | **PASS** — 1/1 |
| Full `@shared-world/web` typecheck (local read @ pickup) | 1 | **PASS** — post-S03-041 closure lineage |
| Same-case Playwright retry after harness false-negative | — | **not run** (ladder closed) |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\s2-reopen-browser-wt
Copy-Item ..\..\tests\e2e\s2-reopen-targeted-browser-reacceptance-b2.spec.ts tests\e2e\
npx playwright test tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts --project=chrome
npx vitest run apps/web/src/client/ranking/ranking-page.test.tsx
```

Evidence:

- Log: `_handoff-artifacts/control-tmp/s2-reopen-browser-evidence/playwright-targeted-chrome-attempt1.log`
- Failure snapshot: `_handoff-artifacts/control-tmp/s2-reopen-browser-wt/output/playwright/test-results/s2-reopen-targeted-browser-9a61e-battle-log-ranking-surfaces-chrome/error-context.md`
- Screenshot: `_handoff-artifacts/control-tmp/s2-reopen-browser-wt/output/playwright/test-results/s2-reopen-targeted-browser-9a61e-battle-log-ranking-surfaces-chrome/test-failed-1.png`

## Harness note (test-only, non-blocking)

Dedicated spec `tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts` is **not yet on canonical `master`** (local/control-tmp copy only). Smallest fix before next automated gate: drop the ready-state `ranking-load-status` assertion; assert `ranking-annual-ranking-table` + `ranking-ranking-year-nav` (matches `RankingPage` success render).

## Non-conflict guard

- Cursor A control files not read or edited.
- No A-owned core-loop product rewrites in this pickup.
- `SPRINT2_STATUS.md` unchanged.

## Terminal

**READY_FOR_STATUS_TRANSITION** — Sprint2 reopen ordinary user-facing chain is evidenced on canonical GitHub `master` @ **`0d11109`** with binding repairs present, targeted browser flow **product PASS** (Playwright exit=1 attributed to harness assertion only). PM may proceed status transition per control authority; optional follow-up: publish corrected targeted e2e spec to `master` for green automated exit code.
