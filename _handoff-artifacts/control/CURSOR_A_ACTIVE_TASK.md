# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-29T13:07:00+09:00
pickup: (none)
startedAt: (none)
branch: master
HEAD: a90ac02c200fff19b94691e8e0da5d2fd08c47aa
completedAt: 2026-09-29T13:07:00+09:00
last-completed-task: PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1
last-result-path: _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/result.md
last-terminal: PERF_PERSON_TOURNAMENT_ORDINARY_UI_MEASURED_REPAIR_VERIFIED
terminal: (none)
instruction-path: (none)
control-authority: GitHub

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
