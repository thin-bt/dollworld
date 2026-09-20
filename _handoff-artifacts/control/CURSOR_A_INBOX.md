# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-008-PUBLISH-RECOVERY-A-20260920-R1
mode: S03_008_PUBLISH_RECOVERY
updatedAt: 2026-09-20T21:35:41+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-008-PUBLISH-RECOVERY-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish the completed S03-008 teaching-selection slice to canonical master
- reconcile Sprint3 backlog without closing the remaining independent-technique/loss body
- publish terminal result with exact product SHA
- return lane A to IDLE after terminal publication
- do not alter B2 authority
- do not start Sprint4
