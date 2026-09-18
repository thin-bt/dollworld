# SPRINT2-AUTO-PROGRESSION-BROWSER-CONTRACT-A-20260919-R1

state: READY
terminal: SPRINT2_AUTO_PROGRESSION_BROWSER_CONTRACT_READY
lane: A
updatedAt: 2026-09-19T06:05:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: DIRTY_NO_COMMIT
worktree-head: aa500b60e2c041548b42909fea23a6ae59f3373e
predecessor-task: SPRINT2-A-R14-FIX-INTEGRITY-AUDIT-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR
production-change: YES

## Summary

Reconciled **simulation/start** (and **reset**) with the authoritative Sprint2 **browser/wireframe** contract: tournament-week bootstrap must expose the manual `competition-step-cta` / `POST /competition/step` path instead of auto-finishing via `runCompetitionThroughFinish` on start. Removed `syncCompetitionAutoProgressionForWeek` from simulation **start** and **reset** only; **weekly simulation step** sync is unchanged so multi-week simulation integration and post-finish week continuation remain available. R13 false-finished **0/0** guards in `map-competition-view.ts` are untouched.

## Authoritative contract evidence

| Source | Requirement |
|--------|-------------|
| `_handoff-artifacts/audit/current/SPRINT2-WIREFRAME-SOURCE-EVIDENCE-REPAIR-A-20260914/capture-wireframe-browser-acceptance.spec.ts` | Before step: panel **未開始**; `competition-step-cta` enabled; after click: **終了** / champion / **年間順位** |
| `tests/e2e/s2-browser-regression-acceptance-prep.spec.ts` | After `sprint1-tiny-accepted` seed 42 bootstrap: CTA enabled; manual clicks through matrix; no premature terminal **finished** |
| `_handoff-artifacts/results/SPRINT2-A-R14-FIX-INTEGRITY-AUDIT-20260919-R1/result.md` | Root cause: start-hook sync when `weeksUntilTournament === 0` closed UI before CTA |

## Implementation

| File | Change |
|------|--------|
| `apps/web/src/server/routes-simulation.ts` | Drop `syncCompetitionAutoProgressionForWeek` after `resetCompetitionStore` on **start** and **reset** |
| `apps/web/src/server/ui009/competition-auto-progression.ts` | Document start/reset omission; step-only wiring |
| `apps/web/src/server/ui009/competition-auto-progression.test.ts` | Replace wrong auto-finish-on-start expectation; add start-on-tournament-week manual-path regression; align idempotency branch for `weeksUntil === 0` |

## Regression verification

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts apps/web/src/server/ui009.competition.test.ts apps/web/src/server/ui009/competition-knockout-auto-progression.test.ts
npx eslint apps/web/src/server/routes-simulation.ts apps/web/src/server/ui009/competition-auto-progression.test.ts
```

| When | Result |
|------|--------|
| 2026-09-19T06:04:11+09:00 | **vitest 9/9 PASS** (4 files) @ HEAD `aa500b60…` |
| 2026-09-19T06:04:30+09:00 | eslint: 1 pre-existing `prefer-const` in `competition-auto-progression.ts` (unchanged logic) |

No Playwright 7/7 run (B2 lane owns mandatory Chrome reacceptance).

## B2 handoff

B2 may rerun mandatory **Chrome 7/7** (`SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1`). Expected unblock: prep test 2 (`competition-step-cta` enabled after accepted bootstrap) and wireframe-aligned manual progression; prep test 1 (false-finished GET) remains covered by existing view-layer guards.
