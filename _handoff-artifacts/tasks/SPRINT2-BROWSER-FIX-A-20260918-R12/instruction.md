# SPRINT2-BROWSER-FIX-A-20260918-R12

state: PREPARED
lane: A
sprint: Sprint2
mode: SOURCE_PRODUCT_REPAIR
priority: IMMEDIATE
control-authority: GitHub
predecessor-task: SPRINT2-BROWSER-FIX-A-20260918-R11
recovery: PM_FAILOVER_STALE_PREPARED_R11_NO_ACTIVE_OR_TERMINAL_0100

## Objective
Complete the outstanding Sprint2 browser/product implementation gaps. Fresh-read current master and the latest Sprint2 acceptance evidence before editing; preserve existing dirty Sprint2 worktree.

## Required work
1. Repair tournament lifecycle through normal weekly progression: automatic start, active progression, completion and post-tournament continuation.
2. Eliminate false-finished/false-complete behavior and make completion/idempotency observable and stable.
3. Ensure standings/history and tournament result UI/data reflect actual completed lifecycle state.
4. Run the relevant focused tests and browser/product acceptance evidence available in the repository.
5. Do not touch Sprint3/4.
6. Claim ACTIVE in `_handoff-artifacts/control/CURSOR_A_INBOX.md` before implementation.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT2-BROWSER-FIX-A-20260918-R12/result.md` with result class, changed paths, commands/tests and exact remaining gaps if any.
