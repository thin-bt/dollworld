# SPRINT2-BROWSER-REGRESSION-PREP-B2-20260917

sprint: Sprint2
lane: B2
mode: BROWSER_ACCEPTANCE_PREP
priority: IMMEDIATE
control-authority: GitHub

## Objective
Use B2 while Cursor A owns the R3 product/source repair. Prepare and validate the browser/Playwright regression acceptance needed to immediately verify A's fix, without editing A-owned product implementation surfaces.

## Non-overlap scope
- Inspect current Sprint2 full-product browser/Playwright acceptance coverage for the previously observed false-finished / 0-of-0 round-robin / empty history / CTA gating / knockout-normal-flow failures.
- Add or tighten test-only acceptance coverage where missing, using stable product-visible assertions and existing test hooks.
- Do NOT modify competition engine, lifecycle/finalization, weekly-step integration, mapping, store/routes, or other A-owned production implementation.
- Do NOT weaken assertions or fabricate test-only product state.
- If existing coverage is already sufficient, document exact commands/assertions and return READY with no product-source changes.

## Terminal
Publish `_handoff-artifacts/results/SPRINT2-BROWSER-REGRESSION-PREP-B2-20260917/result.md` with changed files, commands, pass/fail counts, HEAD/worktree evidence, and exact reacceptance command to run after A terminal.

## Handoff
After A R3 READY, B2 must run fresh full-product browser/Playwright reacceptance against the repaired worktree. No Sprint3/4.