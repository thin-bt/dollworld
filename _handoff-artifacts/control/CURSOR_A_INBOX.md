# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
updatedAt: 2026-09-21T11:25:00+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1
parallel-with: SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- verify persisted teaching-selection consumption by live explicit-teach materialization
- preserve B2 S03-021 persistence-regression ownership; fetch/rebase and do not overwrite B2 semantics
- publish terminal result to GitHub canonical result path
- no Sprint4 work
