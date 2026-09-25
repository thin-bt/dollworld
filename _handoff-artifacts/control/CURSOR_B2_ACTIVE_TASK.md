# Cursor B2 Active Task

state: IDLE
lane: B2
task-key: (none)
mode: (none)
updatedAt: 2026-09-25T14:21:00+09:00
pickup: (none)
instruction-path: (none)
control-authority: GitHub
result-path: (none)
last-completed: UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1
last-result-path: _handoff-artifacts/results/UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1/result.md

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
