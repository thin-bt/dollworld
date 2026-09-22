# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-STATUS-POST-F02-LIVE-GATE-RECONCILIATION-A-20260923-R1
mode: CONTROL_PUBLICATION_REPAIR
updatedAt: 2026-09-23T04:51:40+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-STATUS-POST-F02-LIVE-GATE-RECONCILIATION-A-20260923-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- preserve Sprint3 REOPENED_FIX_REQUIRED; no CLOSED assignment
- publish terminal result to GitHub canonical result path
