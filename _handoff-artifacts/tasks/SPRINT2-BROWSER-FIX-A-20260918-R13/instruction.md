# SPRINT2-BROWSER-FIX-A-20260918-R13

state: PREPARED
lane: A
sprint: Sprint2
mode: SOURCE_PRODUCT_REPAIR
priority: IMMEDIATE
control-authority: GitHub
predecessor-task: SPRINT2-BROWSER-FIX-A-20260918-R12
recovery: PM_FAILOVER_STALE_PREPARED_R12_NO_ACTIVE_OR_TERMINAL_0121

## Objective
Complete the outstanding Sprint2 browser/product implementation gaps. Fresh-read current master and latest Sprint2 acceptance evidence before editing; preserve existing dirty Sprint2 worktree.

## Required work
1. Repair tournament lifecycle through normal Simulation/week advancement: scheduled tournaments must automatically start, progress, finalize, and allow the next normal week to continue; no required manual competition-step button/API operation.
2. Eliminate false-finished/false-complete behavior and preserve idempotency: retry, render, or repeated advancement must not double-run a tournament/round/result.
3. On completion persist non-empty standings/champion/ranking/history facts derived from actual completed matches and expose the accepted Sprint2 result state.
4. Add/run focused tests for normal-week trigger, automatic rounds/completion, persisted result facts, next-week continuation, and retry/render no-duplicate behavior; include browser/product acceptance evidence available in the repository.
5. Do not implement future-reserve features merely because older B2 notes list them. Do not touch Sprint3/4.
6. Claim ACTIVE in `_handoff-artifacts/control/CURSOR_A_INBOX.md` before implementation.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT2-BROWSER-FIX-A-20260918-R13/result.md` with result class, changed paths, commands/tests, exact master parent/commit state, and remaining Sprint2 gaps if any.
