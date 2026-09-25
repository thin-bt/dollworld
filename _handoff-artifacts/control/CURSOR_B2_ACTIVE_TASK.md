# Cursor B2 Active Task

state: ACTIVE
lane: B2
task-key: SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
updatedAt: 2026-09-26T01:05:00+09:00
pickup: RECOVERY_SAME_TASK_ACTIVE
verification-attempt: bounded-run-1-retry
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/instruction.md
control-authority: GitHub
result-path: _handoff-artifacts/results/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/result.md
recovery-phase: bounded-verification-run-1
executor: Cursor-B2-SDK
product-sha-at-pickup: a90ac02c200fff19b94691e8e0da5d2fd08c47aa
progress-note: bounded-run-1-retry — page.request API harness (AV-safe, matches s2-wireframe); seed=1 pinned; CI fresh webServer.

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
