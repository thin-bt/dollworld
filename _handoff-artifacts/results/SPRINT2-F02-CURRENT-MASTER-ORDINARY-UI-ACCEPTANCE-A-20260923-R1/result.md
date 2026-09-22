# SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1

state: TERMINAL
terminal: SPRINT2_F02_CURRENT_MASTER_ORDINARY_UI_ACCEPTANCE_A_PASS
verificationOutcome: PASS
resultClass: RELEASE_EVIDENCE
lane: A
task-key: SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1
updatedAt: 2026-09-23T03:26:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: ae23fb9e0cc4c446bc052e75d303db44c9e5f911
origin-master-at-completion: 3ff8d39b7ac2643ebaf46621cc956a420292ebff
required-product-sha: ae23fb9e0cc4c446bc052e75d303db44c9e5f911
tested-product-sha: ae23fb9e0cc4c446bc052e75d303db44c9e5f911
local-worktree-head-at-pickup: 9da74a532325605a95882613f6d71aca118a990f
verification-worktree: _handoff-artifacts/control-tmp/post-f02-publication-wt @ ae23fb9
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1
production-change: NO
documentation-change: NO
sprint2-control-state: REOPENED_FIX_REQUIRED (unchanged — formal CLOSED not assigned)

## Summary

Executed binding **ordinary real-browser** F-02 acceptance on exact published current-master product **`ae23fb9`**. From a cold session on production web start (`npm run build` + `npm run start` via Playwright webServer), drove the ordinary home **1週進める** flow across **48** weekly steps, completed **two** distinct F-rank schedule tournaments (**春風杯** @ **1月 第1週** absoluteWeek **0**, then **2月 第1週** absoluteWeek **4**), verified past slots show **終了** (never **開催予定**), ranking earnings evolved between tournaments, battle logs open from ordinary UI, crossed world year **1 → 2**, and prior-year ranking navigation on both **大会** and **ランキング** surfaces exposes persisted rows (**4** prior-year ranking rows).

## Value evidence (observed)

| Check | Observed values |
|-------|-----------------|
| Tournament 1 complete | 春風杯 · 1月 第1週 · **終了**; top earnings `[100000, 50000, 25000, 25000]` |
| Tournament 2 complete | 春風杯 · 2月 第1週 · **終了**; top earnings `[200000, 100000, 50000, 25000]` (evolved vs T1) |
| Past-week schedule truth | Earlier F-rank slot **終了** when later slot completed; detail meta never **開催予定** for completed slots |
| Results persistence / UI | Match history link → battle log panel `data-status=success`; champion visible per finished slot |
| Year crossing | `worldYearStart=1`, `worldYearAfterCrossing=2` after ordinary weekly steps |
| Prior-year ranking | Competition + ranking year nav @ year **1** → **4** ranking rows, `hasData` for prior year |

Full machine-readable capture: `_handoff-artifacts/audit/current/SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1/f02-ordinary-ui-acceptance-evidence.json`

## Browser verification

| Step | Result |
|------|--------|
| Production web build + start (Playwright webServer @ **ae23fb9** worktree) | **PASS** |
| Ordinary cold `/` session → weekly progression (no API preset bootstrap) | **PASS** |
| Playwright `s2-f02-current-master-ordinary-ui-acceptance-a.spec.ts` (Chrome) | **PASS** (58.0s test, 1.3m wall incl. reuse server) |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\post-f02-publication-wt
git checkout ae23fb9e0cc4c446bc052e75d303db44c9e5f911
$env:DOLLWORLD_EVIDENCE_OUTPUT_ROOT="D:\xampp\htdocs\dollworld"
npx playwright test tests/e2e/s2-f02-current-master-ordinary-ui-acceptance-a.spec.ts --project=chrome
```

Evidence artifacts:

- `_handoff-artifacts/audit/current/SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1/` (screenshots `01`–`04`, JSON evidence, playwright log)
- `_handoff-artifacts/control-tmp/post-f02-publication-wt/output/playwright/playwright-report.json`
- `_handoff-artifacts/control-tmp/post-f02-publication-wt/output/playwright/playwright-html/`

Acceptance harness path (worktree-only, not published product): `tests/e2e/s2-f02-current-master-ordinary-ui-acceptance-a.spec.ts` under `post-f02-publication-wt`.

## Product lineage binding

| Check | Result |
|-------|--------|
| `ae23fb9` ancestor of `origin/master` @ completion | **PASS** |
| Verification executed on clean worktree HEAD ≡ **`ae23fb9`** (`apps/` + `packages/` diff empty) | **PASS** |
| Main worktree dirty deltas excluded from browser build | **PASS** — acceptance bound to published SHA only |

## Verification matrix

| Check | Result |
|-------|--------|
| A inbox PREPARED + instruction fresh-read | **PASS** |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| Each crossed tournament completes exactly once (2 distinct schedule keys/weeks) | **PASS** |
| No past-week tournament remains **開催予定** | **PASS** |
| Tournament/battle results reachable through ordinary UI | **PASS** |
| Ranking values evolve across successive tournaments | **PASS** |
| Ranking UI reflects persisted updates (大会 + ランキング) | **PASS** |
| Year boundary + prior-year ranking navigation | **PASS** |
| Ranking screen and battle presentation usable in ordinary flow | **PASS** |

## Non-conflict guard

- No Cursor B2 inbox/active read or write.
- Sprint2 formal **CLOSED** not assigned (PM/control authority).

## Terminal

**SPRINT2_F02_CURRENT_MASTER_ORDINARY_UI_ACCEPTANCE_A_PASS** — F-02 ordinary real-browser acceptance satisfied on published product **`ae23fb9`**.
