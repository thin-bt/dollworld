# SPRINT2-REOPEN-BROWSER-HARNESS-CANONICAL-PUBLISH-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint2
mode: CANONICAL_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
authority-ref: master

## Objective
Recover the publication gap explicitly recorded by `SPRINT2-REOPEN-BROWSER-HARNESS-GREEN-B2-20260921-R1`: the passing targeted browser reacceptance harness exists on B2 local verification head `ed123ca5763172184458db67af602efc6629f878` but `tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts` is absent from GitHub canonical master.

## Required work
1. Fresh-read protocol, this instruction, predecessor result, Sprint2/Sprint3 status, and current master.
2. Claim B2 ACTIVE before changes.
3. Recover ONLY the bounded test-harness delta for `tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts` from the verified local head/worktree. Do not publish unrelated local changes and do not rewrite product source.
4. Reconcile onto fresh master; preserve all newer canonical product/control work.
5. Run the targeted Playwright Chrome gate once, plus `npx vitest run apps/web/src/client/ranking/ranking-page.test.tsx` and `npm run typecheck -w @shared-world/web` where feasible under the existing bounded recovery policy.
6. Publish the harness to GitHub canonical master and verify GitHub readback that the exact spec path now exists.
7. Publish terminal result under `_handoff-artifacts/results/SPRINT2-REOPEN-BROWSER-HARNESS-CANONICAL-PUBLISH-B2-20260921-R1/result.md`, binding the canonical commit and checks. Return B2 to IDLE only after terminal publication.

## Acceptance
READY only if the verified harness is actually present on GitHub master and readback succeeds. If the local verified delta cannot be recovered exactly or a product regression appears, publish BLOCKED with concrete evidence; do not fabricate/reconstruct a weaker test from memory.

## Non-conflict
A currently owns `SPRINT2-REOPEN-FINAL-ROOT-GATE-A-20260921-R1`. Do not edit A control/result/task files and do not change Sprint2/Sprint3 status in this task.