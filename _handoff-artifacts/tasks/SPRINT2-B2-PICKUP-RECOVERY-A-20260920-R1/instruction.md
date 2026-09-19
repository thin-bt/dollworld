# SPRINT2-B2-PICKUP-RECOVERY-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: B2_PICKUP_RECOVERY
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4
non-overlap: CONTROL_PLANE_RECOVERY_ONLY_NO_PRODUCT_OR_BROWSER_ACCEPTANCE_EDITS

## Objective
Sprint2 is overdue and B2 R4 remains PREPARED without a canonical terminal. Diagnose and repair the GitHub-first dispatch/pickup path so B2 can claim ACTIVE and execute its already-defined Chrome 12/12 acceptance task. Do not duplicate B2 browser acceptance and do not edit product files.

## Required work
1. Fresh-read canonical protocol, both Cursor inboxes, B2 R4 instruction, newest B2 result/audit state, and current master evidence.
2. Determine why B2 R4 remains PREPARED/unpicked.
3. Apply any unique non-conflicting canonical control-plane repair that is executable from lane A.
4. If the B2 task-key must be superseded/retriggered, publish a fresh canonical B2 instruction/inbox handoff without weakening acceptance requirements.
5. Publish a terminal GitHub result for this A recovery task with exact evidence and next executable action.
6. Never treat missing Drive/local mirrors as terminal. No Sprint3/4.

## Completion
READY only when the canonical B2 pickup path has been repaired/retriggered with readback evidence, or FIX_REQUIRED with a concrete blocker that cannot be repaired from lane A.
