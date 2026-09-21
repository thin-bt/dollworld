# SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1

state: READY_FOR_DISPATCH
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: PRODUCT_IMPLEMENTATION
owner: next-free-lane
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Gap
`docs/SPRINT_3_BACKLOG.md` makes technique inheritance / original technique / loss part of the Sprint3 closed loop. Canonical source implements `evaluateOriginalTechniqueLoss(record)` as a pure evaluator over `livingPractitionerCount`, `registeredSuccessorPersonIds`, and `livingSuccessorPractitionerCount`, but current canonical source inspection does not establish a production world-step caller that derives those values from live world/person technique state and persists the loss transition.

This task is intentionally separate from A-owned S03-017 competitive-record wiring and B2-owned S03-019 formatting recovery.

## Required work
1. Fresh-read master and trace every production caller/reference of `evaluateOriginalTechniqueLoss` and `OriginalTechniqueLossEvaluationRecord`.
2. Prove the live call chain from world/person technique ownership + successor state -> loss evaluation -> persistent world/catalog/history state.
3. If absent/incomplete, implement the smallest deterministic production wiring. Do not redesign Sprint3 and do not touch unrelated S03-017/S03-019 owned paths.
4. Loss must be an actual state transition, not only a returned boolean. Ensure repeated world steps do not duplicate the same loss event/transition.
5. Add focused regression tests covering at minimum:
   - living practitioner remains => not lost;
   - no practitioner but living registered successor remains => not lost;
   - no living practitioner/successor => lost and persisted;
   - death/removal transition causes loss exactly once;
   - deterministic replay/order stability;
   - existing generated-technique registration and first-use MatchId persistence remain intact.
6. Run focused tests and repository gates appropriate to changed files; `npm run check` is the Sprint3 closure gate when feasible.
7. Publish product source/tests to canonical master, then publish terminal result under `_handoff-artifacts/results/<task-key>/result.md` with exact product commit SHA and test evidence.
8. Verify GitHub canonical readback of changed product symbols before READY/ACCEPTED.

## Terminal rules
- READY/ACCEPTED is forbidden for local-only work.
- If master already has complete wiring, publish an evidence result with exact production paths/tests instead of making duplicate changes.
- If blocked by an active lane-owned conflicting file, publish the exact collision and return lane to IDLE; do not overwrite another lane.
- Do not start Sprint4.
