# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-25T10:01:00+09:00
pickup: SDK_EXECUTOR / CURSOR-START-001
branch: master
control-authority: GitHub
last-completed-task: SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1
last-result-path: _handoff-artifacts/results/SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1/result.md

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
