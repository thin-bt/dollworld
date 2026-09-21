# Cursor B2 Active Task

state: IDLE
lane: B2
task-key: (none)
mode: (none)
updatedAt: 2026-09-21T12:43:00+09:00
pickup: (none)
startedAt: (none)
branch: master
completedAt: 2026-09-21T12:43:00+09:00
last-completed-task: SPRINT3-S03-027-BACKLOG-CANONICAL-CLOSURE-RECONCILIATION-B2-20260921-R1
last-result-path: _handoff-artifacts/results/SPRINT3-S03-027-BACKLOG-CANONICAL-CLOSURE-RECONCILIATION-B2-20260921-R1/result.md
last-terminal: SPRINT3_S03_027_BACKLOG_CANONICAL_CLOSURE_RECONCILIATION_B2_READY
terminal: READY
control-authority: GitHub

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
