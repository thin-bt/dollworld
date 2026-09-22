# SPRINT23-CURRENT-MASTER-WEB-PLAYABILITY-REACCEPTANCE-B2-20260922-R1

state: TERMINAL
terminal: SPRINT23_CURRENT_MASTER_WEB_PLAYABILITY_REACCEPTANCE_B2_PASS
verificationOutcome: PASS
resultClass: RELEASE_EVIDENCE
lane: B2
updatedAt: 2026-09-22T16:30:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup-local-head: 788342efb644623c2101e7aa7a3c410a3f79b627
origin-master-at-terminal: 5fad32179000b4acb35e7660d37f320617f0a671
tested-git-sha: 5fad32179000b4acb35e7660d37f320617f0a671
pickup: SDK_EXECUTOR / PREPARED / ACTIVE_IDLE
recovery: CURSOR-B2-001 — single bounded attempt per check family; no same-case retry after exhaust
production-change: NO
documentation-change: NO

## Summary

Fresh-read Sprint2+Sprint3 reopen driver on current GitHub `master`. Local pickup tip **`788342e`** was an ancestor of canonical **`origin/master`**; terminal evidence was executed on a clean worktree @ **`origin/master`** readback (**`5fad321`**) after fetch showed master had advanced with playability harness already present. Web production **build PASS**, production **start PASS** (HTTP 200 @ `:8787`), bounded **vitest** PASS (auto-progression + battle presentation + ranking), and bounded **Playwright** ordinary real-UI chain PASS (`s2-reopen-targeted-browser-reacceptance-b2.spec.ts`, chrome). Legacy API-bootstrap specs (`s2-ui009-round-robin-competition`, `s2-full-product-browser-closure`) **failed once** on stale local tip because tournament-week auto-finish hides `competition-step-cta`; **not re-run** (ladder closed). Did not read or edit Cursor A control files. Did not assign Sprint2/Sprint3 `CLOSED`. Did not claim A mentorship gap-closure acceptance.

## Binding matrix

| Condition | Result |
|-----------|--------|
| 1. Web production build | **PASS** @ `5fad321` |
| 2. Web app start | **PASS** — `npm run start -w @shared-world/web`, `GET /` → 200 |
| 3. Ordinary real UI Sprint2 flow (週進行→大会→…→UI反映) | **PASS** — targeted spec: home load → `simulation-step-1` → 大会 menu → schedule/detail → champion/ranking |
| 4. Ranking screen | **PASS** — embedded `competition-annual-ranking-table` + standalone `/ranking` (`ranking-annual-ranking-table`) |
| 5. Battle presentation | **PASS** — `competition-battle-log-panel`, `battle-log-status=success`, match detail route |
| 6. Persistence/ranking visible in UI flow | **PASS** — champion, annual ranking rows, ranking year nav after tournament completion |
| 7. Sprint3 applicable surface / no startup regression | **PASS** (bounded) — production build/start green; global nav includes 人物/ランキング; `/ranking` ordinary route verified. Mentorship-specific A acceptance **not** asserted. |

## Verification (CURSOR-B2-001)

Worktree: `_handoff-artifacts/control-tmp/sprint23-publish-wt-20260922` @ detached **`origin/master`**.

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read B2 inbox + instruction + sprint status | 1 | **PASS** |
| B2 ACTIVE lock before work | 1 | **PASS** |
| `git fetch origin master` + readback SHA | 1 | **PASS** @ **`5fad321`** |
| `npm run build -w @shared-world/simulation-core` + `@shared-world/web` | 1 | **PASS** |
| Production start smoke | 1 | **PASS** — `GET http://127.0.0.1:8787/` → 200 |
| Vitest (auto-progression, battle presentation, ranking page) | 1 | **PASS** — 7/7 |
| Playwright targeted ordinary Sprint2 reacceptance (chrome, `CI=1`) | 1 | **PASS** — 1/1 (~16–31s) |
| Legacy Playwright (`s2-full-product` + `s2-ui009`) on local `788342e` | 1 | **FAIL** — missing/disabled `competition-step-cta` under auto-finished tournament; **no retry** |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\sprint23-publish-wt-20260922
git fetch origin master
git rev-parse origin/master

npm run build -w @shared-world/simulation-core
npm run build -w @shared-world/web

npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009/competition-match-battle-presentation.test.ts apps/web/src/client/ranking/ranking-page.test.tsx

$env:CI = '1'
npx playwright test tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts --project=chrome
```

Browser route/actions (targeted spec):

- `/` → wait `session-state=ready` → click `simulation-step-1` (週進行)
- Menu **大会** → `/competition` → schedule cell / detail (`competition-detail`, tabs)
- Assert tournament completion surfaces (`competition-champion`, `competition-annual-ranking-table`)
- History match link → `/competition/matches/*` → `competition-battle-log-panel`
- Menu **ランキング** → `/ranking` → `ranking-annual-ranking-table` → link back to 大会

Evidence logs:

- `_handoff-artifacts/results/SPRINT23-CURRENT-MASTER-WEB-PLAYABILITY-REACCEPTANCE-B2-20260922-R1/playwright-targeted-chrome-terminal.log`
- Legacy failure context (informational): `output/playwright/test-results/s2-ui009-round-robin-compe-9d09a--in-the-real-competition-UI-chrome/error-context.md`

## Hygiene

| Item | Result |
|------|--------|
| Cursor A control files | **Not read or written** |
| Sprint2/Sprint3 status labels | **Not altered** |
| A task `SPRINT3-MENTORSHIP-REAL-UI-GAP-CLOSURE-A-20260922-R1` | **Not duplicated** |

## Disposition

- **TERMINAL PASS**: current-master production build/start and ordinary real-UI Sprint2 playability evidence satisfied @ GitHub `master` **`5fad321`**.
- **Note**: PM/status artifacts may still cite older recovery task keys; this terminal supersedes B2 playability evidence for the Sprint23 binding driver only.
