# Cursor B2 Active Task

state: ACTIVE
lane: B2
task-key: SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
updatedAt: 2026-09-25T20:45:00+09:00
pickup: RECOVERY_SAME_TASK_ACTIVE
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/instruction.md
control-authority: GitHub
result-path: _handoff-artifacts/results/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/result.md
recovery-phase: bounded-verification-run-1
last-completed: UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1
last-result-path: _handoff-artifacts/results/UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1/result.md

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
