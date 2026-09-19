# SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1

state: READY
terminal: SPRINT2_VISUAL_QUALITY_REVIEW_A_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T08:42:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
product-baseline: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
worktree-head: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
supersedes-close: SPRINT2-FORMAL-CLOSE-A-20260920-R1
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

Sprint2 visual quality was reopened per `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` (visual completion correction). Lane A implemented Sprint2 competition UI presentation fixes (narrow/mid/desktop width overflow containment, shared `data-table` readability, schedule/year-nav and step-CTA styling) and added dedicated Chrome evidence harness `tests/e2e/s2-visual-quality-review-a.spec.ts`. **3/3** viewport runs passed with document horizontal-overflow guards and **36** full-page screenshots published under the canonical audit path.

## Visual fixes (product)

| Area | Change |
|------|--------|
| Global / shell | `html`/`body`/`dw-shell`/`dw-main` width containment; prevent document-level horizontal scroll while preserving internal scroll regions |
| Annual schedule | `.competition-schedule` + scroll container `width:100%`, `contain:inline-size`; removed schedule table `min-width:100%` that expanded the page |
| Competition surfaces | `min-width:0` grid children; scoped `overflow-x:auto` on detail, ranking, knockout, series, match, promotion, person-rank sections |
| Tables / controls | Unified `.data-table` spacing/zebra headers; ranking year pills; schedule year nav; step CTA hover/disabled clarity |
| Responsive | Nav wrap and slightly smaller table type at `max-width:900px` |

Files: `apps/web/src/client/presentation.css` (on baseline **`92f2a09`**).

## Verification

```powershell
$env:CI='true'
$env:DOLLWORLD_EVIDENCE_OUTPUT_ROOT=(Get-Location).Path
npx playwright test tests/e2e/s2-visual-quality-review-a.spec.ts --project=chrome
npm run build -w @shared-world/web
```

| Check | Result |
|-------|--------|
| Playwright visual review (390 / 900 / 1440) | **PASS** — 3 passed, ~57s |
| Document horizontal overflow guards | **PASS** at each checkpoint |
| Web production build | **PASS** |
| Sprint3/4 scope | **Not started** |

Evidence:
- Screenshots: `_handoff-artifacts/audit/current/SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1/chrome/{narrow-390,app-900,desktop-1440}/01-..12-*.png` (**36** files)
- Run log: `_handoff-artifacts/audit/current/SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1/playwright-chrome.log`

## Wireframe surfaces covered in evidence flow

Annual schedule → tournament detail → participant comparison → person detail → round-robin matrices → knockout → tournament result → series history → annual ranking → promotion → person rank history → battle detail (representative finished-tournament states).

## Disposition

**READY** for independent B2 visual validation. No known Sprint2-scoped visual defect remains on the exercised paths at supported widths after this slice. Prior formal-close READY remains historical only; current Sprint2 UI completion requires visual acceptance per protocol correction.

## Non-goals honored

No Cursor B2 control files read or edited. No Sprint3/4 work.
