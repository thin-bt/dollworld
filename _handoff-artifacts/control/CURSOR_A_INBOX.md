# Cursor A Inbox
state: PREPARED
lane: A
task-key: PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2
mode: BROWSER_MEASUREMENT_ACCEPTANCE
updatedAt: 2026-09-30T21:50:00+09:00
instruction-path: _handoff-artifacts/tasks/PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint2/Sprint3
recovery-generation: 20260930-215000-JST
recovery-requested-at: 2026-09-30T21:50:00+09:00
recovery-reason: EXECUTOR_NO_CHILD_NO_PROGRESS_STALE_2H52
recovery-mode: SAME_TASK_BOUNDED_REINVOKE
source-generation: 20260929-P0-01
source-assignment-id: 20260929-P0-01-R1
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- preserve Role1 Person Detail write boundary
- publish terminal result to GitHub canonical result path
