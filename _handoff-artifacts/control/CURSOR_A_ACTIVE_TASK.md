# Cursor A Active Task

state: IDLE
lane: A
task-key:
mode:
updatedAt: 2026-09-26T19:22:00+09:00
pickup:
branch: master
control-authority: GitHub
instruction-path:
last-completed-task: PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1
last-result-path: _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/result.md

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
