# Cursor B2 Active Task

state: ACTIVE
lane: B2
task-key: SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
updatedAt: 2026-09-26T01:54:00+09:00
pickup: RECOVERY_SAME_TASK_ACTIVE
verification-attempt: bounded-run-1-final
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/instruction.md
control-authority: GitHub
result-path: _handoff-artifacts/results/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/result.md
recovery-phase: bounded-verification-run-1-final
executor: Cursor-B2-SDK
product-sha-at-pickup: a90ac02c200fff19b94691e8e0da5d2fd08c47aa
progress-note: bounded-run-1-final — executing pinned seed=1 e2e after probe; no further same-case retry after this run.

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
