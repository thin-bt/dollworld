# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T11:02:00+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1
parallel-with: SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1
recovery-request: REDISPATCH
recovery-reason: PREPARED_UNCLAIMED_DESPITE_ACTIVE_IDLE_AND_EVALUATE_PICKUP_ACTIVE_IDLE
recovery-diagnosis: canonical pickup.mjs says PREPARED plus Active IDLE is invokable; if this remains unclaimed, inspect daemon/local executor polling-sync health rather than rewriting timestamps again
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- implement or prove complete live technique-teaching-selection production wiring
- preserve B2 S03-021 persistence-regression ownership; fetch/rebase and do not overwrite B2 semantics
- publish terminal result to GitHub canonical result path
- no Sprint4 work
