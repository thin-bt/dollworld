# SPRINT2-B2-ACCEPTANCE-UNBLOCK-A-20260919-R1

state: READY
terminal: SPRINT2_B2_ACCEPTANCE_UNBLOCK_A_READY
lane: A
updatedAt: 2026-09-19T04:22:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: DIRTY_NO_COMMIT
worktree-head: aa500b60e2c041548b42909fea23a6ae59f3373e
predecessor-task: SPRINT2-ACCEPTED-SCOPE-CLOSURE-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR
production-change: YES

## Summary

B2 reacceptance was blocked by a **reproducible product/bootstrap defect**, not an unbounded Playwright deadlock. After `simulation/start` (accepted `sprint1-tiny-accepted` seed 42), integration selected **>4 entrants**, Sprint2 format selection chose **single-elimination knockout**, auto-progression persisted a **terminal store** while `roundRobinProgress` stayed **0/0**. The GET/view layer then exposed `lifecyclePhase=finished` with champion/ranking (knockout completion path), failing prep test 1 immediately (~8–17s). Remaining prep cases and full 7/7 runs appear “long” because downstream tests wait on a disabled `competition-step-cta` (~1.1m each) and Playwright’s **360s project timeout** can still fire during teardown after a fast assertion failure.

Executor evidence `recovery-terminal-timing.txt` (`exit=-1` in ~1s) is a **mechanical abort**, not proof of a multi-hour product hang.

## Diagnosis (concrete)

| Hypothesis | Verdict | Evidence |
|------------|---------|----------|
| Playwright/webServer startup hang | **No** | Fresh `CI=1` webServer; prep test 1 fails/asserts in 8–17s |
| Fixture/bootstrap loop | **No** | Single POST start + GET competition; failure on first coherence assertion |
| Excessive wait/deadlock | **Partial** | Disabled CTA waits (~1.1m) on tests 2–5 after bootstrap defect; not a server deadlock |
| Stale port / reuseExistingServer alone | **No** | Reproduced with `CI=1` forced rebuild; same assertion |
| Product false-finished 0/0 | **Yes (root)** | `expectNotFalseFinished` @ `s2-competition-coherence.ts:55`; UI snapshot `0/0試合` + 終了 + champion |
| B2 control / executor publish | **Secondary** | B2 R1 logs show fast FAIL 0/5 pattern; local SDK recovery exit -1 is host-side abort |

Prior B2 R4 FIX_REQUIRED and B2 R1 chrome logs align with the same first assertion; A R13 vitest green did not cover the **>4 entrant knockout + empty roundRobinPairs projection** browser path.

## Repository fix (A-owned, minimal)

1. **`competition-participant-preview.ts`** — After accepted participant resolution/supplement, cap roster to `format.roundRobinMaximum` (4) so F-slot integration stays on **round_robin** (accepted browser matrix path), not 5–16 knockout.
2. **`map-competition-view.ts`** — `tournamentCompletionCoherent` rejects terminal completion when projected round-robin progress is **0/0** (blocks knockout-finished mapping with empty RR matrix).
3. **Regression tests** — `map-competition-view-lifecycle.test.ts` (knockout 0/0 case); `competition-knockout-auto-progression.test.ts` threshold adjusted for capped integration roster.

No B2 control files edited. No Sprint3/4 work.

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts apps/web/src/server/ui009.competition.test.ts
$env:CI='1'
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts:26 --project=chrome
```

| When | Result |
|------|--------|
| 2026-09-19T04:21:14+09:00 | **vitest 7/7 PASS** (auto-progression + lifecycle + competition) |
| 2026-09-19T04:21:40+09:00 | **prep chrome test 1 PASS** (~10.3s) @ dirty HEAD `aa500b60…` |

## Next action (B2 lane)

Re-run mandatory Chrome set when safe (A dirty tree unchanged aside from fix above):

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts tests/e2e/s2-ui009-round-robin-competition.spec.ts tests/e2e/s2-full-product-browser-closure.spec.ts --project=chrome
```

Expect prep test 1 no longer false-finished at bootstrap; full **7/7** verdict remains B2-owned.

## Harness note (non-blocking)

`playwright.config.ts` `timeout: 360_000` exceeds per-test `test.setTimeout(120_000)` on prep test 1; failed runs may log both a fast assertion failure and a later global timeout during teardown—classify as **harness noise**, not ongoing server hang.
