# SPRINT2-BROWSER-FIX-A-20260917-R2

sprint: Sprint2
lane: A
mode: SOURCE_PRODUCT_REPAIR
priority: IMMEDIATE
control-authority: GitHub
predecessor: SPRINT2-FULL-PRODUCT-BROWSER-REACCEPTANCE-B2-20260917
terminal-input: FIX_REQUIRED / SPRINT2_FULL_PRODUCT_BROWSER_REACCEPTANCE_B2 / ab1202f7027493d34c16f82906bf7b0454597a4a
recovery: PM_NEW_TASK_KEY_AFTER_EXECUTOR_NOOP_ALREADY_COMPLETE_SAME_TASK

## Objective
Repair the concrete full-product browser acceptance failures reported by Cursor B2, preserving existing uncommitted Sprint2 tournament-closure work. This R2 key exists to force a fresh executor pickup after the prior task key was treated as already completed/no-op.

## Required repair
1. Reproduce/cross-check the premature `lifecyclePhase: finished` state where champion/ranking/lastMatch are populated while roundRobinProgress is empty (0/0 matrix, no history) and schedule still reports 開催予定 · 0/0試合.
2. Fix lifecycle/finalization integration so ordinary week/world advancement automatically starts, progresses, and finalizes scheduled tournaments; normal product flow must not require a separate manual `POST /api/s1_5/competition/step` or tournament button.
3. Completion must expose non-empty, coherent final standings/champion/ranking facts derived from actually processed matches before finished is exposed.
4. Restore correct active-vs-finished CTA/view gating; no false finished mapping.
5. Ensure round-robin standings/history reflect processed matches and verify knockout progression/completion integration reached from normal product flow where Sprint2 authority requires it.
6. Verify the next ordinary week continues after tournament completion.
7. Preserve idempotency/no double-run across retry, render/GET, repeated normal advancement, or retained debug/manual endpoints.
8. Preserve annual ranking behavior already accepted. Do not fabricate browser-only data, weaken acceptance assertions, or implement future-reserve Sprint3/4 features.

## Focused tests required
- normal week trigger starts scheduled tournament automatically
- automatic rounds reach coherent completion
- persisted result facts are non-empty and internally consistent
- next-week continuation succeeds after completion
- retry/render/repeated calls do not duplicate matches/results/finalization
- regression for false-finished + empty progress/history

## Primary surfaces
- apps/web/src/server/ui009/map-competition-view.ts
- apps/web/src/server/ui009/competition-engine.ts
- apps/web/src/components/CompetitionPage.tsx (or actual current path)
- competition store/routes and weekly/world-step integration as required

## Acceptance before terminal
- Build/typecheck relevant packages.
- Targeted competition/unit tests pass with focused regression coverage above.
- Preserve unrelated dirty work; no commit unless current project policy permits it.
- Publish precise terminal result to GitHub canonical results with changed files, commands, pass/fail counts, HEAD/worktree binding, and remaining acceptance item if any.

## Next handoff
On READY, Cursor B2 reruns full-product browser/Playwright acceptance against the repaired worktree. No Sprint3/4.