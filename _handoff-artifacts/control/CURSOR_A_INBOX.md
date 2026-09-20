# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-013-LIVE-MENTORSHIP-QUEUE-MATERIALIZATION-A-20260921-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T02:02:00+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-013-LIVE-MENTORSHIP-QUEUE-MATERIALIZATION-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- implement live enrollment + explicit-teach queue materialization only
- preserve S03-012 queue-fed replay/test APIs
- do not touch B2 S03-009 original-technique runtime scope or B2 control/task/result artifacts
- publish terminal result to GitHub canonical result path
- deadline-recovery: complete product wiring/tests/publication in this pickup where feasible; no status-only completion
