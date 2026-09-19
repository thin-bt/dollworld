# SPRINT2-VISUAL-BROWSER-ACCEPTANCE-B2-20260920-R1

state: FIX_REQUIRED
terminal: SPRINT2_VISUAL_BROWSER_ACCEPTANCE_B2_FIX_REQUIRED
verificationOutcome: FAIL
lane: B2
updatedAt: 2026-09-20T08:38:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: CLEAN_PRODUCT_DIRTY_HANDOFF
published-head: 28e5b4ed69be85f672466631e50ebfd060275bc5
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
binding-verification-head: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
worktree-head: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
paired-a-task: SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1
predecessor: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4
pickup: RECOVERY_SAME_TASK_ACTIVE (SDK executor)
recovery: CURSOR-B2-001 — reconcile prior infra/overflow attempts; **clean published product @ 92f2a09** terminal run (r4); ladder closed

## Summary

Fresh-read `SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` visual completion correction (2026-09-20). `git fetch origin master`: `origin/master` **`28e5b4e`** is control-only atop wireframe product; **`git diff 92f2a09 origin/master -- apps/ tests/`** empty — binding verification on **`92f2a09`**. Local `apps/web/src/client/presentation.css` WIP restored to **`92f2a09`** before run (no B2 product overlay). Dedicated **`tests/e2e/s2-visual-browser-acceptance-b2.spec.ts`** (3 viewports × full visual journey): **0/3 passed**, `exit=1`, ~1170s.

Functional wireframe gate **12/12 PASS** on the same SHA does **not** satisfy visual completion: narrow/app widths fail document overflow guards on the annual schedule; desktop captures 11/12 screenshot states but cannot finish person-detail evidence in the combined long-flow harness.

## Material defects (Sprint2 visual scope)

| ID | Viewport | Screen / state | Defect | Evidence |
|----|----------|----------------|--------|----------|
| V-B2-01 | narrow-390, app-900 | Annual schedule (`/competition`, session ready) | **Document horizontal overflow**: `scrollWidth` **1104** vs `clientWidth` **390** / **900** (guard `assertNoDocumentHorizontalOverflow` at first check). Annual schedule matrix/table does not fit supported narrow UI widths — layout integrity failure per visual completion protocol. | Playwright failure attachments; partial prior captures under `chrome/narrow-390/` and `chrome/app-900/` (`01-annual-schedule.png` from earlier runs) |
| V-B2-02 | narrow-390, app-900 | Full representative journey | Harness **blocks** downstream screenshots after V-B2-01 (overflow guard runs before capture). States 02–12 not verified at narrow/app in terminal r4. | `playwright-visual-chrome-pickup-sdk-20260920-r4-clean.log` |
| V-B2-03 | desktop-1440 | Person detail (post-tournament return path) | After completing tournament + battle detail, `page.goto("/competition")` + `selectFirstPlayableTournament` — **no playable schedule cell** within 60s (`competition-schedule-cell--playable` missing). **12-person-detail** not captured; person-detail visual acceptance incomplete in this harness pass. | `chrome/desktop-1440/01`–`11` screenshots; failure @ line 171 in spec log |

## Desktop partial visual evidence (binding run r4)

Captured at **1440×1000** before V-B2-03: annual schedule, tournament overview, participants comparison, round-robin matrices, knockout bracket, tournament result, series history, annual ranking, promotion result, person rank history, battle detail — under:

`_handoff-artifacts/audit/current/SPRINT2-VISUAL-BROWSER-ACCEPTANCE-B2-20260920-R1/chrome/desktop-1440/`

Manual spot-check: desktop states render coherently at reference width, but **READY cannot be asserted** while V-B2-01 remains open and person-detail evidence is missing.

## Verification (CURSOR-B2-001)

Recovery reconciled Active **ACTIVE** on same task-key against incomplete r3 + prior FAIL/infra logs. **Not** a wireframe R1 FAIL ladder continuation — fresh visual task key with bounded attempts:

| Attempt | When | Result |
|---------|------|--------|
| pickup-sdk | 2026-09-20 ~07:47 | **FAIL** — narrow/app overflow + desktop round-robin/history timeout |
| pickup-sdk r2 | 2026-09-20 ~08:05 | **FAIL** — webServer `start` crash (8787 conflict) |
| pickup-sdk r3 | 2026-09-20 ~08:07 | **incomplete** log (superseded) |
| **r4 clean @ 92f2a09** | 2026-09-20 ~08:18–08:37 | **FAIL** — **0/3 passed**, `exit=1`, ~1170s |

Terminal command (binding):

```powershell
cd D:\xampp\htdocs\dollworld
git checkout -- apps/web/src/client/presentation.css
npm run build -w @shared-world/web
$env:DOLLWORLD_EVIDENCE_OUTPUT_ROOT="D:\xampp\htdocs\dollworld"
$env:CI="1"
npx playwright test tests/e2e/s2-visual-browser-acceptance-b2.spec.ts --project=chrome
```

**CURSOR-B2-001:** Same-case visual verification ladder **closed** after r4 clean published-product terminal run. No further B2 re-run until A publishes visual fixes to GitHub `master` (or PM reopens gate).

## Harness deliverable

| Path | Status |
|------|--------|
| `tests/e2e/s2-visual-browser-acceptance-b2.spec.ts` | Present (untracked in worktree); 3 viewports, overflow guards + screenshot evidence |

## Route

**FIX_REQUIRED** — return to **Cursor A** (`SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1`) for annual-schedule responsive overflow at **390px / 900px** and person-detail capture path. Executor: publish this `result.md`, consume control inbox → IDLE.
