# Cursor A Inbox
state: PREPARED
lane: A
task-key: PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1
mode: MEASURE_REPAIR_IF_PROVEN
updatedAt: 2026-09-30T12:06:58+09:00
instruction-path: _handoff-artifacts/tasks/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/instruction.md
source-assignment-generation: 20260929-P0-01
source-assignment-id: 20260929-P0-01-R3
source-evidence: _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/role3.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint2/Sprint3
pickup-requirements:
- fresh-read GitHub canonical instruction, ROLE_ASSIGNMENTS.md, and Role3 evidence
- claim ACTIVE before changes
- preserve Role3 write boundary; do not edit Role1/Role2 source or shared result.md
- publish material measured evidence to Role3 evidence path
