# Cursor B2 Active Task

state: IDLE
lane: B2
task-key: (none)
mode: (none)
updatedAt: 2026-09-20T22:01:54+09:00
pickup: (none)
startedAt: (none)
branch: master
completedAt: (none)
last-completed-task: (none)
last-result-path: (none)
last-terminal: (none)
terminal: (none)
control-authority: GitHub

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
