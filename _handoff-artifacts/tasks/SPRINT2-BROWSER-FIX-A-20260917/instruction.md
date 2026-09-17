# SPRINT2-BROWSER-FIX-A-20260917

sprint: Sprint2
lane: A
mode: SOURCE_PRODUCT_REPAIR
priority: IMMEDIATE
control-authority: GitHub
predecessor: SPRINT2-FULL-PRODUCT-BROWSER-REACCEPTANCE-B2-20260917
terminal-input: FIX_REQUIRED / SPRINT2_FULL_PRODUCT_BROWSER_REACCEPTANCE_B2 / ab1202f7027493d34c16f82906bf7b0454597a4a

## Objective
Repair the concrete full-product browser acceptance failures reported by Cursor B2, preserving existing uncommitted Sprint2 tournament-closure work.

## Required repair
1. Reproduce/cross-check the premature `lifecyclePhase: finished` state where champion/ranking/lastMatch are populated while roundRobinProgress is empty (0/0 matrix, no history) and schedule still reports 開催予定 · 0/0試合.
2. Fix lifecycle/finalization integration so ordinary week advancement produces a coherent playable/completed tournament state; do not require a separate manual tournament progression control when weekly progression should drive it.
3. Restore correct active-vs-finished CTA gating; `competition-step-cta` must not disappear because of a false finished mapping.
4. Ensure round-robin standings/history reflect actually processed matches before a champion/completion state is exposed.
5. Check knockout progression/completion integration reached from the normal product flow.
6. Preserve annual ranking behavior that already passed.
7. Do not fabricate browser-only data or weaken acceptance assertions.

## Primary surfaces from B2 evidence
- apps/web/src/server/ui009/map-competition-view.ts
- apps/web/src/server/ui009/competition-engine.ts
- apps/web/src/components/CompetitionPage.tsx (or actual current CompetitionPage path)
- related competition store/routes and weekly-step integration as required

## Acceptance before terminal
- Build/typecheck relevant packages.
- Targeted competition/unit tests pass.
- Add/adjust regression coverage for false-finished + empty progress/history.
- Leave a precise terminal result with changed files, commands, pass/fail counts, HEAD/worktree binding, and any remaining browser-only acceptance item.
- No commit unless existing project policy explicitly permits it; preserve unrelated dirty work.

## Next handoff
On READY, Cursor B2 must rerun full-product browser/Playwright acceptance against the repaired worktree. No Sprint3/4 work.