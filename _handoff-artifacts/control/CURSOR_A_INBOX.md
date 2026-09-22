# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-BACKLOG-CURRENT-GATE-RECONCILIATION-A-20260923-R1
mode: SPEC_TO_SOURCE_CLOSURE
updatedAt: 2026-09-23T00:40:38+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-BACKLOG-CURRENT-GATE-RECONCILIATION-A-20260923-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before changes
- reconcile backlog/status release-evidence binding against latest product SHA; do not assign CLOSED
- avoid B2 browser-evidence task collision
- publish terminal result to GitHub canonical result path
