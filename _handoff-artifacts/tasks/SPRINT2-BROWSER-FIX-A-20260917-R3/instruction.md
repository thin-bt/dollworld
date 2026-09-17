# SPRINT2-BROWSER-FIX-A-20260917-R3

sprint: Sprint2
lane: A
mode: SOURCE_PRODUCT_REPAIR
priority: IMMEDIATE
control-authority: GitHub
predecessor: SPRINT2-BROWSER-FIX-A-20260917-R2
terminal-input: FIX_REQUIRED / SPRINT2_FULL_PRODUCT_BROWSER_REACCEPTANCE_B2 / ab1202f7027493d34c16f82906bf7b0454597a4a
recovery: ROLE3_NEW_TASK_KEY_AFTER_R2_REMAINED_PREPARED_WITH_A_IDLE

## Objective
Execute the already-verified Sprint2 integrated product repair now. Preserve existing dirty Sprint2 tournament-closure work and fix the concrete B2 full-product browser failures.

## Required repair
1. Reproduce/cross-check premature lifecyclePhase=finished where champion/ranking/lastMatch exist while roundRobinProgress is 0/0, matrix/history are empty, and schedule still reports not-started/0-of-0.
2. Ordinary Simulation week/world advancement must automatically start, progress, and finalize scheduled tournaments without requiring POST /api/s1_5/competition/step or a tournament-only manual action.
3. Do not expose finished until actually processed matches yield coherent non-empty final standings/champion/result/ranking facts.
4. Correct active/finished CTA and view gating.
5. Make round-robin standings/matrix/history reflect processed matches; ensure accepted knockout/group progression is reachable from normal product flow.
6. After tournament completion, the next ordinary Simulation week advance must succeed and preserve result/person/battle linkage.
7. Preserve retry/idempotency: no duplicate matches/results/finalization on retry, GET/render, repeated advancement, or retained manual/debug endpoints.
8. Preserve accepted annual-ranking behavior. No Sprint3/4 and no fabricated browser-only facts.

## Focused tests required
- scheduled tournament auto-start from normal week advance
- automatic progression reaches coherent completion
- false-finished + empty-progress/history regression
- round-robin and accepted knockout/group progression coverage
- post-tournament next-week continuation
- stable result/person/battle linkage
- retry/render/repeated-call idempotency
- relevant build/typecheck

## Terminal contract
Claim ACTIVE before source changes. Publish GitHub canonical terminal result with exact HEAD/worktree binding, changed files, commands and pass/fail counts, remaining Sprint2 acceptance gaps, and READY or FIX_REQUIRED. On READY, B2 is the next lane for fresh Chrome/Playwright re-acceptance.