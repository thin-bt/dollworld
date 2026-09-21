# SPRINT2-REOPEN-REACCEPTANCE-EVIDENCE-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint2
mode: INDEPENDENT_REACCEPTANCE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
non-conflict-with: SPRINT2-REOPEN-CORE-LOOP-CANONICAL-PUBLICATION-A-20260921-R1

## Objective

Independently prepare the binding Sprint2 re-acceptance evidence against the reopened completion criteria while A publishes the already verified ordinary core-loop repair. Do not duplicate A's publication work.

## Required execution

1. Fresh-read GITHUB_CONTROL_PLANE.md, SPRINT2_STATUS.md, current A/B2 inboxes, newest Sprint2 reopen results, and current master.
2. Claim B2 execution for this exact task-key through the normal executor path.
3. Audit every reopened acceptance requirement: ordinary weekly progression -> tournament schedule -> participant selection -> automatic staging -> battle -> completion -> result persistence -> annual ranking update -> UI reflection; standalone Ranking screen; official tournament battle presentation reuse.
4. Inspect current canonical UI/product source and newest reopen results. Separate already-canonical evidence from evidence dependent on A's pending publication.
5. Run non-conflicting focused verification where useful. Do not modify or republish A-owned core-loop files while A is active.
6. If any unique remaining product/UI gap exists outside A's publication scope, identify exact paths/behavior and, only when non-conflicting and bounded, repair it in this task with tests and canonical publication. Otherwise produce a precise re-acceptance matrix ready for PM status transition after A publication.
7. Publish terminal result to _handoff-artifacts/results/SPRINT2-REOPEN-REACCEPTANCE-EVIDENCE-B2-20260921-R1/result.md with READY_FOR_REACCEPTANCE, FIX_REQUIRED, or BLOCKED, binding exact canonical SHAs/evidence.
8. Return B2 to IDLE only after terminal publication.

## Guardrails

- Do not change SPRINT2_STATUS.md to CLOSED; PM/control transition is separate.
- Do not touch A inbox/control or duplicate A publication.
- Do not start Sprint3 formal close while Sprint2 remains reopened.
- Transient scratch belongs only under _handoff-artifacts/control-tmp/.
