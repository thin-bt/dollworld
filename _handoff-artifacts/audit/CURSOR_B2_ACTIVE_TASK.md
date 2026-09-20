# Cursor B2 Active Task

state: ACTIVE
lane: B2
task-key: SPRINT3-CANONICAL-BACKLOG-TRUTH-RECONCILIATION-B2-20260921-R1
mode: SPEC_TO_SOURCE_RECONCILIATION
updatedAt: 2026-09-21T05:58:00+09:00
pickup: ACTIVE_IDLE
startedAt: 2026-09-21T05:58:00+09:00
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
