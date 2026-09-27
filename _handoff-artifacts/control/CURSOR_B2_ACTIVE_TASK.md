# Cursor B2 Active Task

state: IDLE
lane: B2
task-key: none
mode: none
updatedAt: 2026-09-27T16:26:00+09:00
pickup: none
instruction-path: none
control-authority: GitHub
result-path: none
progress: Terminal result published — SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1 FIX_REQUIRED @ bounded-run-3-sdk r9

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
