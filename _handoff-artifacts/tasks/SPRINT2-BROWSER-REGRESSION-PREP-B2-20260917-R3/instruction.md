# SPRINT2-BROWSER-REGRESSION-PREP-B2-20260917-R3

sprint: Sprint2
lane: B2
mode: BROWSER_ACCEPTANCE_PREP
priority: IMMEDIATE
control-authority: GitHub
predecessor-task: SPRINT2-BROWSER-REGRESSION-PREP-B2-20260917-R2
recovery: PM_FAILOVER_STALE_PREPARED_R2_NO_ACTIVE_OR_TERMINAL_2303

## Objective
Use B2 while Cursor A owns the current product/source repair. Prepare and validate browser/Playwright regression acceptance needed to immediately verify A's fix, without editing A-owned product implementation surfaces. This R3 supersedes stale PREPARED R2.

## Non-overlap scope
- Inspect current Sprint2 full-product browser/Playwright acceptance coverage for false-finished / 0-of-0 round-robin / empty history / CTA gating / knockout/group progression / larger-bracket standings / annual ranking-history-champion-result linkage / match-detail-battle-log-person-result navigation / post-tournament week continuation / retry-idempotency-error-empty usability.
- Add or tighten test-only acceptance coverage where missing, using stable product-visible assertions and existing test hooks.
- Do NOT modify competition engine, lifecycle/finalization, weekly-step integration, mapping, store/routes, or other A-owned production implementation.
- Do NOT weaken assertions or fabricate test-only product state.
- If existing coverage is sufficient, document exact routes, commands and assertions and return READY with no product-source changes.

## Terminal
Publish `_handoff-artifacts/results/SPRINT2-BROWSER-REGRESSION-PREP-B2-20260917-R3/result.md` with changed files, commands, pass/fail counts, HEAD/worktree evidence, exact covered product gaps, and exact reacceptance command to run after A terminal.

## Handoff
After current Cursor A repair READY, B2 must run fresh full-product browser/Playwright reacceptance against repaired worktree. No Sprint3/4.
