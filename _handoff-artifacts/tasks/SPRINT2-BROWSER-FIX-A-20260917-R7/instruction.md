# SPRINT2-BROWSER-FIX-A-20260917-R7

sprint: Sprint2
lane: A
mode: SOURCE_PRODUCT_REPAIR
priority: IMMEDIATE
control-authority: GitHub
predecessor: SPRINT2-BROWSER-FIX-A-20260917-R6
recovery: ROLE3_RETRIGGER_STALE_PREPARED_R6_NO_ACTIVE_OR_TERMINAL

## Objective
Execute the overdue Sprint2 integrated product repair now. Preserve existing dirty Sprint2 tournament-closure work and fix the concrete B2 full-product browser failures. This R7 supersedes stale PREPARED R6 without changing repair scope.

## Required repair
1. Reproduce/cross-check premature lifecyclePhase=finished where champion/ranking/lastMatch exist while roundRobinProgress is 0/0, matrix/history are empty, and schedule still reports not-started/0-of-0.
2. Ordinary Simulation week/world advancement must automatically start, progress, and finalize scheduled tournaments without requiring a tournament-only manual action.
3. Do not expose finished until actually processed matches yield coherent non-empty final standings/champion/result/ranking facts.
4. Correct active/finished CTA and view gating.
5. Make round-robin standings/matrix/history reflect processed matches; ensure accepted knockout/group progression is reachable from normal product flow.
6. After tournament completion, the next ordinary Simulation week advance must succeed and preserve result/person/battle linkage.
7. Preserve retry/idempotency: no duplicate matches/results/finalization on retry, GET/render, repeated advancement, or retained manual/debug endpoints.
8. Preserve accepted annual-ranking behavior. No Sprint3/4 and no fabricated browser-only facts.

## Required tests
Scheduled tournament auto-start from normal week advance; automatic coherent completion; false-finished regression; round-robin plus accepted knockout/group progression; post-tournament next-week continuation; result/person/battle linkage; idempotency; relevant build/typecheck.

## Terminal contract
Claim ACTIVE before source changes. Publish `_handoff-artifacts/results/SPRINT2-BROWSER-FIX-A-20260917-R7/result.md` with exact HEAD/worktree binding, changed files, commands/pass-fail counts, remaining Sprint2 gaps, READY or FIX_REQUIRED. On READY B2 runs fresh browser reacceptance.
