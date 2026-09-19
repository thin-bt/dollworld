# SPRINT2-VISUAL-FIX-PUBLICATION-A-20260920-R1

state: READY
terminal: SPRINT2_VISUAL_FIX_PUBLICATION_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T08:58:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: 8d52ead09e7a5a6736777ab281db21ae79f28d48
pre-publication-head: 4d9c41a49c7df1ca2057eecfa24089a9bb528026
product-baseline-before: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
predecessor: SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1
paired-b2-task: SPRINT2-VISUAL-BROWSER-ACCEPTANCE-B2-20260920-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

Published the Sprint2 visual presentation slice verified in **SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1** onto canonical GitHub `master`. Reconciled local `presentation.css` overflow/layout fixes against current `origin/master` (control-only delta since wireframe product **`92f2a09`**) without overwriting unrelated canonical commits. Bound post-push verification to published product SHA **`8d52ead`**.

## Published commit

| Field | Value |
|-------|--------|
| SHA | `8d52ead09e7a5a6736777ab281db21ae79f28d48` |
| Message | Publish Sprint2 visual presentation fixes and A visual evidence harness. |
| Remote | `origin/master` (pushed) |

## Changed files (product)

| Path | Note |
|------|------|
| `apps/web/src/client/presentation.css` | Document/shell overflow containment; annual schedule scroll region; competition surface `min-width:0`; shared `.data-table` and responsive nav/table tuning |
| `tests/e2e/s2-visual-quality-review-a.spec.ts` | Lane A dedicated Chrome visual evidence harness (390 / 900 / 1440) |

## Evidence consumed (fresh-read)

| Source | Disposition |
|--------|-------------|
| `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` | Visual completion correction authority |
| `_handoff-artifacts/results/SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1/result.md` | **READY** — verified fixes @ local **`92f2a09`** |
| `_handoff-artifacts/results/SPRINT2-VISUAL-BROWSER-ACCEPTANCE-B2-20260920-R1/result.md` | **FIX_REQUIRED** — overflow @ narrow/app on unpublished product |
| `origin/master` @ `4d9c41a` | Pre-publication control head; product tree matched **`92f2a09`** for `apps/` / published tests |

## Verification (binding @ published candidate `8d52ead`)

```powershell
cd D:\xampp\htdocs\dollworld
git rev-parse HEAD
npm run build -w @shared-world/web
$env:CI='true'
$env:DOLLWORLD_EVIDENCE_OUTPUT_ROOT=(Get-Location).Path
npx playwright test tests/e2e/s2-visual-quality-review-a.spec.ts --project=chrome
```

| Check | Result |
|-------|--------|
| `git fetch origin master` + fast-forward sync | **PASS** — merged `4d9c41a` before product commit |
| Web production build | **PASS** |
| Playwright A visual review (390 / 900 / 1440) | **PASS** — **3/3**, ~57s |
| Document horizontal overflow guards | **PASS** at each viewport checkpoint |
| Sprint3/4 scope | **Not started** |

Evidence (local audit, bound to verification run on commit tree **`8d52ead`**):
- Screenshots: `_handoff-artifacts/audit/current/SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1/chrome/{narrow-390,app-900,desktop-1440}/` (12 states × 3 viewports)
- Run captured during publication pickup (Playwright stdout **3 passed**)

## Disposition

**READY** — visual product fix and A harness exist on canonical **`master`** at **`8d52ead`**. **B2** (`SPRINT2-VISUAL-BROWSER-ACCEPTANCE-B2-20260920-R1`) is eligible for independent visual re-acceptance on the published SHA. No remaining blocker on the A publication path.

## Non-goals honored

No Cursor B2 control files read or edited. No Sprint3 work. B2 visual harness not published from this slice (remains B2 lane deliverable).
