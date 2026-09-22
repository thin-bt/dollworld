# SPRINT2-WF5-BROWSER-ACCEPTANCE-B2-20260922-R1

state: TERMINAL
terminal: SPRINT2_WF5_BROWSER_ACCEPTANCE_B2_PASS
verificationOutcome: PASS
resultClass: RELEASE_EVIDENCE
lane: B2
updatedAt: 2026-09-22T22:05:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: c55515c3316435991414c49f4f5ed0be6cb89d20
local-worktree-head-at-verification: 9da74a532325605a95882613f6d71aca118a990f
wf5-product-publication-sha: e2a9e0855dfa8bc5e50b6e84133424416f7b6541
predecessor: SPRINT2-WF5-PARTICIPANT-COMPARISON-A-20260922-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — single focused Playwright run; no retry ladder
production-change: NO
documentation-change: NO

## Summary

Independently executed the focused ordinary-browser acceptance omitted by WF5 product task **SPRINT2-WF5-PARTICIPANT-COMPARISON-A-20260922-R1** (Playwright **guard-03** was explicitly **NOT RUN** there). Verified tournament participant comparison renders dense stat/aptitude columns (guard-03), participant tab/detail surfaces remain reachable (guard-02), and person-detail navigation from participants is preserved (guard-12). Evidence bound to WF5 publication lineage **`e2a9e08`** on **`origin/master`**; browser build used local worktree product bytes (uncommitted **`apps/web`** + **`tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts`** delta on pickup HEAD **`9da74a5`**). Full root **`npm run check`** not run (instruction scope). Sprint **CLOSED** not assigned. No Cursor A control files read or written.

## Browser verification

| Guard | Intent | Result |
|-------|--------|--------|
| guard-02 | Tournament detail + participants tab | **PASS** (1.1s) |
| guard-03 | Stat/aptitude columns + cell test ids | **PASS** (749ms) |
| guard-12 | Person link → person detail success | **PASS** (881ms) |

**Aggregate:** 3 passed (15.5s wall including webServer build), Chrome project, exit code 0.

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
npx playwright test tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts `
  -g "guard-02|guard-03|guard-12" `
  --project=chrome
```

Evidence artifacts:

- `output/playwright/playwright-report.json`
- `output/playwright/playwright-html/`
- `_handoff-artifacts/control-tmp/wf5-browser-acceptance-b2-playwright.log`

## Product lineage binding

| Check | Result |
|-------|--------|
| `e2a9e08` ancestor of `origin/master` @ pickup | **PASS** (exit 0) |
| WF5 A-task Playwright guard-03 | **NOT RUN** (superseded by this B2 run) |
| Local dirty product paths in browser build | **PRESENT** — see list below |

Dirty paths at verification (built into `@shared-world/web` for Playwright webServer):

- `apps/web/src/client/competition/CompetitionPage.tsx`
- `apps/web/src/client/competition/ui009-views.ts`
- `apps/web/src/server/routes-simulation.ts`
- `apps/web/src/server/ui004/project-person.ts`
- `apps/web/src/server/ui009/competition-auto-progression.test.ts`
- `apps/web/src/server/ui009/competition-auto-progression.ts`
- `apps/web/src/server/ui009/competition-engine-schedule-config.ts`
- `apps/web/src/server/ui009/competition-schedule-slot.ts`
- `apps/web/src/server/ui009/competition-wireframe-observation.ts`
- `apps/web/src/server/ui009/types.ts`
- `apps/web/src/server/ui009/competition-participant-comparison-projection.test.ts` (untracked)
- `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts`

## Remaining blockers (not in scope)

- Full Sprint2 wireframe guards **guard-01,04–11** not run in this focused acceptance.
- Root release gate / post-**`e2a9e08`** master gate remains separate (F-02 and sprint closure policy).
- Local worktree HEAD **`9da74a5`** is behind **`origin/master`** **`c55515c`**; GitHub canonical publish of this result is executor-owned.
