# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T05:06:00+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1/instruction.md
failover-from-lane: B2
recovery-request: REDISPATCH
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- execute the existing unique S03-009 authority now; do not create a duplicate recovery task
- recover/reconcile any already verified local S03-009 deltas against latest master
- exclude unrelated S03-010/S03-011 deltas
- run focused Sprint3 tests plus simulation-core build/typecheck
- commit and push S03-009 product files to canonical master
- verify GitHub master readback; local-only READY is not sufficient
- publish terminal result to _handoff-artifacts/results/SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1/result.md
- return lane IDLE only after terminal result
- after READY, S03-011 first-use MatchId persistence is unblocked
