# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-21T13:01:00+09:00
pickup: (none)
startedAt: (none)
branch: master
HEAD: 8e9b825be269a6660cdd36a74fc55cd2ed138240
origin-master-head: 8e9b825be269a6660cdd36a74fc55cd2ed138240
completedAt: 2026-09-21T13:01:00+09:00
last-completed-task: SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1
last-result-path: _handoff-artifacts/results/SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1/result.md
last-terminal: READY / S03_028_LIVE_ENROLLMENT_SPECIAL_REASON_MATERIALIZATION_READY
terminal: READY / S03_028_LIVE_ENROLLMENT_SPECIAL_REASON_MATERIALIZATION_READY
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1/instruction.md
control-authority: GitHub
predecessor: SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
