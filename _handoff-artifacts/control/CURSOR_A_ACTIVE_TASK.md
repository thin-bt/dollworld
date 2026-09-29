# Cursor A Active Task

state: ACTIVE
lane: A
task-key: PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1
mode: IMPLEMENT_PROFILE_FIX_VERIFY
updatedAt: 2026-09-29T12:02:00+09:00
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
branch: master
control-authority: GitHub
instruction-path: _handoff-artifacts/tasks/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/instruction.md
last-completed-task:
last-result-path:

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
