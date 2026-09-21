# SPRINT3-S03-025-ROOT-CHECK-TIMEOUT-CLOSURE-A-20260921-R1

state: READY_FOR_PICKUP
lane: A
sprint: Sprint3
mode: RELEASE_GATE_RECOVERY
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessors:
- SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1
- SPRINT3-S03-024-LIVE-TECHNIQUE-LOSS-CLOSURE-B2-20260921-R1

## Objective

Close the only explicit release-gate gap recorded by S03-024: root `npm run check` timed out in Sprint2 long-run tests CHK-009 and WIN-006 while all Sprint3 focused checks passed.

## Required work

1. Fresh-read S03-023 and S03-024 results plus canonical master.
2. Re-run the two named Sprint2 long-run tests in a bounded/dedicated manner and determine whether this is environment timeout only or a real regression.
3. Run the strongest practical root release gate after the focused diagnosis. Do not endlessly retry the same timeout case.
4. If a deterministic product/test defect is found, make the smallest non-Sprint3-semantic fix, verify, and publish to master.
5. If the focused tests pass but aggregate root check remains executor-timeout-only, publish exact evidence and classify whether Sprint3 formal close may proceed despite environment limitation.
6. Do not modify S03-023 teaching-selection semantics or S03-024 technique-loss semantics unless a proven regression requires it.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT3-S03-025-ROOT-CHECK-TIMEOUT-CLOSURE-A-20260921-R1/result.md` and return A to IDLE.

## Terminal

READY only with evidence sufficient to resolve the S03-024 `PASS_WITH_REPO_CHECK_GAP`; otherwise FIX_REQUIRED/BLOCKED with exact failing contract and next executable task.
