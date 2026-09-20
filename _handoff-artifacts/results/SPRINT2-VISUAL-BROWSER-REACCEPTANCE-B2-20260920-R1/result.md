# SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1

state: READY
terminal: SPRINT2_VISUAL_BROWSER_REACCEPTANCE_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-20T09:09:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
required-product-sha: 8d52ead09e7a5a6736777ab281db21ae79f28d48
binding-verification-head: 8d52ead09e7a5a6736777ab281db21ae79f28d48
worktree-head: 8d52ead09e7a5a6736777ab281db21ae79f28d48
predecessor: SPRINT2-VISUAL-BROWSER-ACCEPTANCE-B2-20260920-R1
paired-a-terminal: READY / SPRINT2_VISUAL_FIX_PUBLICATION_READY @ 8d52ead
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — new task-key reacceptance; single bounded attempt1 (prior FIX_REQUIRED @ 92f2a09 not reused)

## Summary

Fresh-read `SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` visual completion correction and A publication **READY** (`SPRINT2-VISUAL-FIX-PUBLICATION-A-20260920-R1`). Bound independent Chrome visual acceptance to published product **`8d52ead`**. Prior **V-B2-01** annual-schedule document overflow at **390 / 900** re-checked with overflow guards on first checkpoint; **person-detail** (`12-person-detail`) captured on all viewports via participants-tab navigation before tournament completion. **3/3** Playwright cases **PASS**, ~58s.

## Prior defect disposition (published fix)

| ID | Prior (92f2a09) | Reacceptance @ 8d52ead |
|----|-----------------|-------------------------|
| V-B2-01 | Document horizontal overflow on annual schedule @ narrow-390 / app-900 | **Cleared** — `assertNoDocumentHorizontalOverflow` PASS before `01-annual-schedule` capture |
| V-B2-02 | Journey blocked after V-B2-01 @ narrow/app | **Cleared** — full 12-state screenshot ladder @ 390 and 900 |
| V-B2-03 | Missing person-detail evidence @ desktop-1440 | **Cleared** — `12-person-detail.png` @ all three viewports |

## Verification (CURSOR-B2-001)

| Attempt | When | Result |
|---------|------|--------|
| attempt1 (reacceptance r1) | 2026-09-20T09:08+09:00 | **PASS 3/3**, exit 0, ~57.5s |

```powershell
cd D:\xampp\htdocs\dollworld
git rev-parse HEAD
npm run build -w @shared-world/web
$env:CI='true'
$env:DOLLWORLD_EVIDENCE_OUTPUT_ROOT=(Get-Location).Path
npx playwright test tests/e2e/s2-visual-browser-acceptance-b2.spec.ts --project=chrome
```

| Check | Result |
|-------|--------|
| HEAD == required-product-sha `8d52ead` | **PASS** |
| Web production build | **PASS** |
| Chrome visual journey narrow-390 | **PASS** — overflow guards + 12 screenshots |
| Chrome visual journey app-900 | **PASS** — overflow guards + 12 screenshots |
| Chrome visual journey desktop-1440 | **PASS** — overflow guards + 12 screenshots |
| Sprint3/4 scope | **Not started** |

Evidence:
- Log: `_handoff-artifacts/audit/current/SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1/playwright-visual-chrome-reacceptance-r1.log`
- Screenshots (36): `_handoff-artifacts/audit/current/SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1/chrome/{narrow-390,app-900,desktop-1440}/` (`01`–`12` incl. person-detail and battle-detail)

## Harness deliverable (B2 lane, test-only)

| Path | Status |
|------|--------|
| `tests/e2e/s2-visual-browser-acceptance-b2.spec.ts` | Present — 3 viewports, overflow guards + full Sprint2 visual journey |

## Disposition

**READY** — Sprint2 visual browser acceptance independently accepted on canonical published product **`8d52ead`** with no material known Sprint2 visual defect in this gate. Executor: publish/consume control inbox → IDLE.

## Non-goals honored

No Cursor A control files read or edited. No product edits in B2 lane. No Sprint3/4 work.
