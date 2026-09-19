# SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

state: PREPARED
lane: B2
sprint: Sprint2
priority: IMMEDIATE
mode: CLEAN_REACCEPTANCE_AND_CANONICAL_TERMINAL_PUBLICATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
published-browser-spec-head: 0fcd7a8c297f2f854306dd2d855e9c54acf3b169
non-browser-publication-head: 3215dec98a060b28e9627004323300a7bf20d324
paired-a-terminal: READY_FOR_B2_CLEAN_TERMINAL_CONSUMPTION
non-overlap: ACCEPTANCE_VERIFICATION_ONLY_NO_PRODUCT_EDITS
recovery: PM_FAILOVER_CANONICAL_RESULT_MISSING_1659

## Objective

Close the only remaining formal Sprint2 browser-control gap. The reconciled mandatory spec is already published on master at `0fcd7a8c297f2f854306dd2d855e9c54acf3b169`. A preclosure audit reports local evidence of a CLEAN Chrome 7/7 run, but the required canonical GitHub result file `_handoff-artifacts/results/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/result.md` is still absent. GitHub is authority, so local/Drive evidence alone is not terminal.

## Required work

1. Fresh-read GitHub master, this instruction, A preclosure result, and current B2 inbox.
2. Do not re-edit the reconciled spec or product code if GitHub master already contains the accepted `0fcd7a8` reconciliation.
3. Verify the mandatory Chrome 7/7 evidence is bound to a CLEAN worktree and published head containing `0fcd7a8`. If existing evidence cannot be proven against a clean published head, rerun the mandatory set:

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts tests/e2e/s2-ui009-round-robin-competition.spec.ts tests/e2e/s2-full-product-browser-closure.spec.ts --project=chrome
```

4. Publish the canonical terminal result to GitHub at `_handoff-artifacts/results/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/result.md` in this task.
5. READY only if the result records `commit-status: CLEAN`, exact verified published head, 7/7 PASS, and evidence paths. Otherwise publish FIX_REQUIRED with the first reproducible blocker.
6. Return B2 control to terminal/IDLE according to protocol after canonical result publication.

## Rules

Sprint2 only. No Sprint3/4. No product edits. Do not treat missing Drive/local mirrors as terminal. GitHub result publication is mandatory for completion consumption. Only explicit user PAUSE/STOP may disable execution.
