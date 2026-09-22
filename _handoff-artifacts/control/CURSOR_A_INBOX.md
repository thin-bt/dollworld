# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1
mode: PUBLICATION_AND_RELEASE_GATE_RECOVERY
updatedAt: 2026-09-23T01:40:47+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- preserve and attribute all existing local product deltas before publication
- publish terminal result to GitHub canonical result path
- do not assign Sprint2/Sprint3 CLOSED
