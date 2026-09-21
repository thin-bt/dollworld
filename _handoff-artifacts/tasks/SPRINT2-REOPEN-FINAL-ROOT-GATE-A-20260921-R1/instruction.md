# SPRINT2-REOPEN-FINAL-ROOT-GATE-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint2
mode: RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master

## Objective

While B2 runs targeted real-browser re-acceptance, independently close the non-browser final release gate on the current repaired canonical master. This is evidence work only and must not conflict with B2 browser acceptance.

## Required execution

1. Fresh-read GITHUB_CONTROL_PLANE.md, SPRINT2_STATUS.md, SPRINT3_STATUS.md, both lane inboxes, newest relevant results, and current master.
2. Claim A ACTIVE using the canonical lane protocol. Do not touch B2 control/task state.
3. Verify current master contains repaired Sprint2 lineage `5b5103a7ccdeb2514c56cfd95cd9fb272962378b`, UI publication `085a5450ed72dcf1490bdb73428e8f2806b9a481`, and weekly-guard typecheck closure `d84680b23477b0d61cd972e97a851ba3ea7c513f` as ancestors.
4. Run the canonical root release gate (`npm run check`) on current master. Also run any focused Sprint2 ordinary-weekly-loop/ranking regression suite required by the existing repair evidence if root check does not already execute it.
5. Do not alter product behavior merely to force a green gate. If a real failure is found, classify the exact bounded blocker and smallest repair recommendation.
6. If all non-browser gates pass, publish terminal READY evidence explicitly stating that Sprint2 status transition still depends on B2 targeted browser acceptance and PM/control authority.
7. Publish result under `_handoff-artifacts/results/SPRINT2-REOPEN-FINAL-ROOT-GATE-A-20260921-R1/result.md`, set A TERMINAL, then return A to IDLE after canonical consumption/readback.

## Workspace hygiene

Never create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/`. Correct any observed root-level transient defect in the same pickup.

## Terminal classes

- READY — current canonical repaired master passes final non-browser release gates.
- BLOCKED_GATE_FAILURE — a reproducible release/focused regression gate fails; include exact command and failure.
- BLOCKED_ENVIRONMENT — gate cannot execute for a concrete environmental reason.
