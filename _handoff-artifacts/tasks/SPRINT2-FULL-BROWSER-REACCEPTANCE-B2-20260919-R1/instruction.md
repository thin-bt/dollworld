# SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

state: PREPARED
lane: B2
sprint: Sprint2
priority: IMMEDIATE
mode: PUBLISH_RECONCILED_SPEC_AND_CLEAN_REACCEPTANCE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-FINAL-COMPLETION-CONTROL-AUDIT-A-20260919-R1
paired-a-terminal: SPRINT2_FINAL_COMPLETION_CONTROL_AUDIT_FIX_REQUIRED
required-master-head: 3215dec98a060b28e9627004323300a7bf20d324
non-overlap: ACCEPTANCE_SPEC_MAINTENANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_REQUIRE_PUBLISHED_CLEAN_BROWSER_GATE_1120

## Objective

Close the remaining formal Sprint2 browser gate identified by the latest A completion-control audit. The prior B2 7/7 READY is not consumable because the reconciled mandatory Playwright spec remained an unpublished local diff. Publish that acceptance-spec reconciliation to GitHub master, then rerun the mandatory Chrome 7/7 set from a clean tree on the published HEAD and replace the canonical B2 terminal with evidence bound to that HEAD.

Canonical reconciliation decision remains unchanged: after the final real round-robin match, the same manual competition step finalizes the competition and exposes coherent champion/standings/final result. The older `round_robin_complete`/champion-count-0 terminal assertion is stale. Do not regress product code.

## Required work

1. Fresh-read current GitHub master and the latest A audit result.
2. Reconcile only `tests/e2e/s2-ui009-round-robin-competition.spec.ts` terminal assertions/comments with the accepted finalized-state contract, preserving all earlier progression/CTA/history/read-integrity assertions.
3. Commit and push that spec-only reconciliation to `thin-bt/dollworld` `master`. No product implementation edits.
4. Fresh-sync to the resulting published master HEAD and ensure the verification worktree is CLEAN before the mandatory run.
5. Run:

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts tests/e2e/s2-ui009-round-robin-competition.spec.ts tests/e2e/s2-full-product-browser-closure.spec.ts --project=chrome
```

6. Publish the canonical terminal result at `_handoff-artifacts/results/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/result.md`.

## READY requirements

READY is allowed only when all are true:
- reconciled spec is present on GitHub `master` (not only local/untracked/dirty)
- mandatory Chrome set is 7/7 PASS against that published HEAD
- result records exact published HEAD
- result records `commit-status: CLEAN`
- no contradictory older READY is presented as the current consumable terminal

If publication or clean 7/7 fails, return FIX_REQUIRED with the first reproducible blocker and exact evidence. Do not leave a DIRTY_TEST_ONLY READY terminal.

## Rules

Sprint2 only. No Sprint3/4. Acceptance-spec maintenance only; no product edits. GitHub is canonical; Drive/local are compatibility mirrors only and their absence is non-terminal. Only explicit user PAUSE/STOP may disable execution.
