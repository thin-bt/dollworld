# SPRINT2-FORMAL-CLOSE-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: FORMAL_CLOSE
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
required-b2-result: _handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4/result.md
non-overlap: CLOSE_CONTROL_ONLY_NO_PRODUCT_EDITS

## Objective
Consume the now-canonical B2 R4 READY browser terminal and perform the final Sprint2 formal-close reconciliation on GitHub canonical state.

## Required work
1. Fresh-read protocol, scope authority correction, A/B2 inboxes, B2 R4 READY result, A recovery READY result, newest Role terminal results if present, and current master.
2. Verify required product SHA remains the binding product baseline and no product delta invalidates accepted evidence.
3. Reconcile every Sprint2 completion guard and all consumable terminal evidence.
4. If no canonical blocker remains, publish terminal READY / SPRINT2_FORMAL_CLOSE_READY with an explicit close declaration and evidence. If any blocker remains, publish FIX_REQUIRED with the exact executable blocker.
5. No Sprint3/4 work and no product edits in this task. Drive/local mirrors are never authority.

## Completion
READY only when Sprint2 can be formally closed from canonical GitHub evidence; otherwise FIX_REQUIRED with the next unique executable Sprint2 action.
