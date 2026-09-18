# SPRINT2-AUTO-PROGRESSION-BROWSER-CONTRACT-A-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: PRODUCT_CONTRACT_RECONCILIATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-A-R14-FIX-INTEGRITY-AUDIT-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: A_OWNS_PRODUCT_FIX_B2_OWNS_BROWSER_ACCEPTANCE

## Objective

Resolve the concrete Sprint2 acceptance tension proven by the R14 integrity audit: simulation/start currently auto-finishes the playable competition when weeksUntilTournament == 0, while the accepted browser flow expects the competition-step CTA/manual POST progression before terminal finished state. Reconcile the product behavior and A-owned tests to the authoritative Sprint2/wireframe contract, then hand B2 a stable surface for mandatory Chrome 7/7 reacceptance.

## Required work

1. Fresh-read GitHub canonical protocol, R13 READY, accepted-scope closure, B2 acceptance-unblock result, R14 integrity-audit result, current B2 task/inbox, and current master/worktree before editing.
2. Inspect authoritative Sprint2 specification/wireframe and existing browser assertions before choosing behavior. Do not guess between auto-finish-on-start and manual CTA progression.
3. Trace `routes-simulation.ts` start/reset/step hooks, `syncCompetitionAutoProgressionForWeek`, `runCompetitionThroughFinish`, competition lifecycle mapping, and `competition-step-cta` rendering/POST route.
4. Implement the smallest coherent product change that makes the authoritative browser flow reachable without reintroducing false-finished 0/0. Preserve normal weekly progression, champion/ranking/history finalization, next-week continuation, and retry/idempotency.
5. Update A-owned vitest expectations only where the authoritative contract proves the old auto-finish-on-start assertion is wrong. Add focused regression coverage for the exact start-vs-manual-step boundary.
6. Run bounded relevant vitest/typecheck/lint evidence. Do not run B2's full Playwright 7/7 suite and do not edit B2 inbox/result/control files.
7. No Sprint3/4 and no FUTURE_RESERVE implementation.

## Terminal output

Publish:
_handoff-artifacts/results/SPRINT2-AUTO-PROGRESSION-BROWSER-CONTRACT-A-20260919-R1/result.md

READY requires: authoritative-contract citation/evidence, concrete implementation (if required), focused regression verification, and an explicit statement that B2 can rerun the mandatory Chrome 7/7. If authority proves current product behavior is correct and the browser harness is stale, do not force a product edit: produce exact evidence and the smallest required acceptance-harness correction for PM/B2.