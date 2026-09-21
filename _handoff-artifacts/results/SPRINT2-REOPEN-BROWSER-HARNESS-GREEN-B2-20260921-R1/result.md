# SPRINT2-REOPEN-BROWSER-HARNESS-GREEN-B2-20260921-R1

state: TERMINAL
terminal: SPRINT2_REOPEN_BROWSER_HARNESS_GREEN_B2_READY
verificationOutcome: PASS
resultClass: READY
lane: B2
updatedAt: 2026-09-21T21:27:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
binding-verification-head: ed123ca5763172184458db67af602efc6629f878
origin-master-at-pickup: 88e3013ff8cd1406c2aef8bb652e1e21b217e989
pickup: ACTIVE_IDLE / SDK_EXECUTOR
predecessor: SPRINT2-REOPEN-TARGETED-BROWSER-REACCEPTANCE-B2-20260921-R1
production-change: NO
documentation-change: NO
test-harness-change: YES — `tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts` (new canonical tree publication + ranking success assertion fix)
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust

## Summary

Published the Sprint2 reopen **targeted browser reacceptance** Playwright spec into the canonical `tests/e2e/` tree and corrected the sole harness false-negative from the predecessor pickup: removed `ranking-load-status[data-status=ready]` (success `RankingPage` renders table + year nav only). **Playwright Chrome gate exit=0** on one bounded run. Product behavior unchanged.

## Harness fix (test-only)

| Before | After |
|--------|-------|
| Assert `ranking-load-status` `data-status=ready` on `/ranking` | Assert `ranking-annual-ranking-table` + `ranking-ranking-year-nav` with load timeout (canonical success surface) |

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read inbox + instruction + predecessor result | 1 | **PASS** |
| B2 ACTIVE lock before work | 1 | **PASS** |
| Harness correction in canonical `tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts` | 1 | **PASS** |
| Playwright targeted spec (Chrome, ordinary flow) | 1 | **PASS** `exit=0` — 1 passed (42.4s wall) |
| Vitest `apps/web/src/client/ranking/ranking-page.test.tsx` | 1 | **PASS** — 1/1 |
| `@shared-world/web` typecheck | 1 | **PASS** |
| Same-case Playwright retry | — | **not run** (ladder closed after attempt1 PASS) |

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts --project=chrome
npx vitest run apps/web/src/client/ranking/ranking-page.test.tsx
npm run typecheck -w @shared-world/web
```

Evidence:

- Log: `_handoff-artifacts/control-tmp/s2-reopen-harness-green-evidence/playwright-targeted-chrome-attempt1.log`
- Playwright report: `output/playwright/playwright-report.json`

## Non-conflict guard

- Cursor A control files not read or edited.
- No product rewrites for harness greening.

## Terminal

**READY** — Corrected targeted Sprint2 browser gate is reproducibly green (Playwright exit=0) with canonical spec path `tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts` on local verification head **`ed123ca`** (uncommitted test publication pending PM/executor push to GitHub `master`).
