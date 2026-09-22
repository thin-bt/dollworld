# Cursor B2 Active Task

state: IDLE
lane: B2
task-key: (none)
mode: (none)
updatedAt: 2026-09-22T12:43:00+09:00
pickup: (none)
control-authority: GitHub
instruction-path: (none)

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
