# Cursor A Active Task

state: ACTIVE
lane: A
task-key: PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2
mode: BROWSER_MEASUREMENT_ACCEPTANCE
updatedAt: 2026-09-30T17:20:00+09:00
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
startedAt: 2026-09-30T17:20:00+09:00
branch: master
HEAD: a90ac02c200fff19b94691e8e0da5d2fd08c47aa
completedAt: (none)
last-completed-task: PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1
last-result-path: _handoff-artifacts/results/PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1/result.md
last-terminal: (none)
terminal: (none)
instruction-path: _handoff-artifacts/tasks/PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2/instruction.md
control-authority: GitHub

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
