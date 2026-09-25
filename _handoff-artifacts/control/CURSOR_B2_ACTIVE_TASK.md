# Cursor B2 Active Task

state: IDLE
lane: B2
task-key:
mode:
updatedAt: 2026-09-26T05:00:00+09:00
pickup:
verification-attempt:
instruction-path:
control-authority: GitHub
result-path: _handoff-artifacts/results/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/result.md
recovery-phase: terminal-published
executor: Cursor-B2-SDK
last-completed-task-key: SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1
last-result-class: FIX_REQUIRED

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
