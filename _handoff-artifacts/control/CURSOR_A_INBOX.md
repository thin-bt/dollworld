# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T01:40:58+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
runtime-status: DISPATCHED
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- trace and close bounded S03-003/S03-004/S03-007 runtime entrypoint integration gap
- do not touch B2 S03-009 or blocked S03-011 publication surfaces
- publish terminal result to GitHub canonical result path
- deadline-recovery: execute product work now; no status-only completion
