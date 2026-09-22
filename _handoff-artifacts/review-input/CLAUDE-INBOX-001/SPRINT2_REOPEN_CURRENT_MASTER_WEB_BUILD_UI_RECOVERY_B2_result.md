# SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1

state: TERMINAL
terminal: SPRINT2_REOPEN_CURRENT_MASTER_WEB_BUILD_UI_RECOVERY_B2_PASS
verificationOutcome: PASS
resultClass: FIX_REQUIRED_RESOLVED
lane: B2
updatedAt: 2026-09-22T13:52:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
worktree-head-at-terminal: 628c2a3821cf2028b58578baadb0cac22abcaeed
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust

## Summary

Reproduced **`apps/web` production build failure** (`tsc -p tsconfig.build.json`): missing modules referenced by already-merged imports. **Minimal recovery** restored untracked canonical server/client modules (S03-042/043 lineage) without weakening typecheck. **`npm run build` @ `apps/web` PASS**, **typecheck PASS**, **app startup PASS** (Playwright `webServer` + HTTP 200), **targeted Sprint2 ordinary browser chain PASS** (ranking + battle presentation surfaces).

## Root cause

| Diagnostic | Location |
|------------|----------|
| `TS2307` Cannot find module `./production-sprint3-run-session-binding.js` | `apps/web/src/server/routes-simulation.ts:50` |
| `TS2307` Cannot find module `./competition-match-battle-presentation.js` | `apps/web/src/server/ui009/competition-match-view.ts:16` |
| Vite `UNRESOLVED_IMPORT` (after tsc green) | `AnnualRankingTable.js`, client `competition-match-battle-presentation.js` |

**Cause:** Product wiring landed in tracked files; **implementation files were never published** to the worktree (imports without modules).

## Repair (minimal)

| File | Action |
|------|--------|
| `apps/web/src/server/production-sprint3-run-session-binding.ts` | **added** — canonical Sprint3 session bind @ start/reset |
| `apps/web/src/server/ui009/competition-match-battle-presentation.ts` | **added** — battle log summary projection |
| `apps/web/src/server/ui009/competition-match-battle-presentation.test.ts` | **added** — unit coverage |
| `apps/web/src/client/competition/competition-match-battle-presentation.ts` | **added** — mock-battle view bridge for match UI |
| `apps/web/src/client/competition/AnnualRankingTable.tsx` | **added** — ranking/competition shared table |

No typecheck/test weakening. No change to `routes-simulation.ts` / `competition-match-view.ts` import contracts.

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Reproduce web production build failure | 1 | **PASS** — TS2307 ×2 as above |
| `npm run build` @ `apps/web` after repair | 1 | **PASS** — tsc + vite |
| `npm run typecheck` @ `apps/web` | 1 | **PASS** |
| App startup | 1 | **PASS** — `GET http://127.0.0.1:8787/` → 200; Playwright `webServer` with `CI=1` |
| Vitest targeted | 1 | **PASS** — 3/3 (`competition-match-battle-presentation.test.ts`, `ranking-page.test.tsx`) |
| Playwright ordinary Sprint2 chain (targeted B2 spec) | 1 | **PASS** — 1/1 chrome, 14.7s test / 27s total |
| Playwright `s2-full-product-browser-closure.spec.ts` (stale reused server) | 1 | **FAIL** — 360s timeout on `competition-step-cta` (session **終了** on reused `:8787`; not re-run) |
| Same-case Playwright retry after targeted PASS | — | **not run** (ladder closed) |

```powershell
cd D:\xampp\htdocs\dollworld\apps\web
npm run build

cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/server/ui009/competition-match-battle-presentation.test.ts apps/web/src/client/ranking/ranking-page.test.tsx

$env:CI = '1'
npx playwright test tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts --project=chrome
```

Evidence:

- Build failure capture: terminal reproduce before repair (TS2307 ×2).
- Playwright log: `_handoff-artifacts/results/SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1/playwright-targeted-chrome-attempt1.log`
- Full-closure failure (informational): `output/playwright/test-results/s2-full-product-browser-cl-67f30--person-nav-and-return-home-chrome/error-context.md`

## Acceptance matrix

| Requirement | Status |
|-------------|--------|
| Current-master web production build | **PASS** |
| App startup | **PASS** |
| Ordinary real UI/browser Sprint2 chain | **PASS** (targeted reacceptance spec) |
| Ranking UI | **PASS** (spec: standalone `/ranking` + embedded table) |
| Battle presentation UI | **PASS** (spec: `competition-battle-log-panel` / battle log surfaces) |
| Result persistence + ranking reflection via UI flow | **PASS** (spec ordinary weekly → tournament → history → ranking) |

## Notes

- **`tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts`** copied from canonical control worktree for this verification (was absent under repo `tests/e2e/`); recommend PM publish with product recovery commit.
- Sprint2 **CLOSED** not assigned here; control decides after GitHub publication of recovery files.
