# SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4

state: READY
terminal: SPRINT2_BROWSER_REGRESSION_PREP_B2_READY
verificationOutcome: FIX_REQUIRED
lane: B2
updatedAt: 2026-09-19T00:35:30+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: DIRTY_NO_COMMIT
worktree-head: 2d16d51639a892a22c05573dcfc1e8626a62dfc7
predecessor-task: SPRINT2-BROWSER-REGRESSION-PREP-B2-20260917-R3
paired-a-terminal: SPRINT2-BROWSER-FIX-A-20260918-R13 (READY, same dirty worktree)
recovery: RECOVERY_SAME_TASK_ACTIVE_SDK_EXECUTOR / control PREPARED vs audit terminal reconcile (2026-09-19T00:35+09:00); prior ROLE3_RETRIGGER + CURSOR-B2-001 closure (2026-09-18T20:44+09:00)

## Summary

Sprint2 browser/Playwright regression prep harness remains in place (test-only). Recovery pickup reconciled stale **control** inbox PREPARED (23:59) against existing terminal **READY** result and audit mirrors: harness files unchanged; **0/5 prep cases pass** on last bounded Playwright attempt (SDK attempt1 2026-09-18T19:54+09:00 at worktree `a40b2de`). Current HEAD is `2d16d516` (+2 executor-only commits); uncommitted A-owned `apps/web/src/server/ui009/*` deltas are present but **not** re-verified in B2 lane (CURSOR-B2-001 forbids same-case retry ladder). Primary blocker for last gating run unchanged — false-finished competition GET after accepted bootstrap.

## Instruction gap coverage

| Product gap (instruction) | Harness coverage |
|---------------------------|------------------|
| false-finished / 0-of-0 round-robin | `expectNotFalseFinished` + prep test 1; wired into closure spec after schedule open |
| empty history while terminal | prep tests 2, 4; closure history row count |
| CTA gating through tournament | prep test 2; `s2-ui009-round-robin-competition.spec.ts` |
| knockout / group bracket progression | **Not browser-covered** (no stable product-visible knockout surface on accepted tiny preset; server vitest only) |
| larger-bracket standings | partial via matrix row count >2 in round-robin spec |
| annual ranking / champion / final linkage | prep test 2; round-robin spec terminal assertions |
| match-detail / battle-log / person from tournament | partial: person nav prep test 4; closure person link; **no competition→battle-log link in UI** |
| post-tournament simulation week continuation | prep test 3; closure second week |
| retry / idempotency / stale revision error | prep test 5 |

## Changed paths (test-only, uncommitted)

- `tests/e2e/s2-browser-regression-acceptance-prep.spec.ts` (new)
- `tests/e2e/support/s2-competition-coherence.ts` (new)
- `tests/e2e/s2-full-product-browser-closure.spec.ts` (coherence assertions)
- `tests/e2e/s2-ui009-round-robin-competition.spec.ts` (terminal champion/ranking aligned to repaired product contract)

No A-owned product surfaces modified in B2 lane this task.

## Verification (CURSOR-B2-001)

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts --project=chrome
```

| Attempt | When | Result |
|---------|------|--------|
| attempt1 (initial) | 2026-09-18T17:25+09:00 | **FAIL 0/5** |
| attempt1 (redispatch) | 2026-09-18T19:02+09:00 | **FAIL 0/5** (elapsed ~34m; exit 1) |
| attempt1 (SDK pickup) | 2026-09-18T19:54+09:00 | **FAIL 0/5** (elapsed ~2037s; exit 1) |
| SDK executor closure | 2026-09-18T20:44+09:00 | **not re-run** (ladder exhausted; prior attempt1 terminal retained) |
| recovery same-task ACTIVE | 2026-09-19T00:35+09:00 | **not re-run** (CURSOR-B2-001; reconcile control/audit + HEAD evidence only) |

Evidence:
- `_handoff-artifacts/audit/current/SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4/playwright-prep-chrome-r4-sdk-pickup.log`
- `_handoff-artifacts/audit/current/SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4/sdk-pickup-timing.txt`
- `_handoff-artifacts/audit/current/SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4/verification-transcript.txt`
- `output/playwright/test-results/` (failure screenshots / error-context)

Representative failure:

```
expect(competition.lifecyclePhase).not.toBe("finished")
  at expectNotFalseFinished (s2-competition-coherence.ts:55)
  when roundRobinProgress.matchesTotal === 0 && matchesCompleted === 0 after accepted bootstrap
```

Downstream prep cases (2–5) fail on missing/disabled `competition-step-cta` after the same bootstrap path.

Cross-check (non-gating): A lane vitest 9/9 PASS per `SPRINT2-BROWSER-FIX-A-20260918-R13/result.md` — does not override browser FIX_REQUIRED.

## Reacceptance after A terminal (mandatory full Sprint2 browser set)

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts tests/e2e/s2-ui009-round-robin-competition.spec.ts tests/e2e/s2-full-product-browser-closure.spec.ts --project=chrome
```

Expected when repair is effective: **7/7** chrome tests pass (5 prep + 1 round-robin + 1 closure; edge project optional).

## Remaining browser gaps (documented, not fabricated)

- Knockout/group bracket progression in real browser UI
- Competition history row → battle log / match detail navigation (product has no link today)
- Larger-bracket (non-tiny) standings browser fixture
