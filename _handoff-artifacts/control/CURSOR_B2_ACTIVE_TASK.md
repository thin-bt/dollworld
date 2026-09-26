# Cursor B2 Active Task

state: ACTIVE
lane: B2
task-key: SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
updatedAt: 2026-09-27T06:06:00+09:00
pickup: RECOVERY_SAME_TASK_ACTIVE
verification-attempt: bounded-run-3-sdk-mock-battle-probe-pass-browser-e2e
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/instruction.md
control-authority: GitHub
result-path: _handoff-artifacts/results/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/result.md
recovery-phase: await-bounded-run-3-e2e-or-finalize-terminal
executor: Cursor-B2-SDK
progress: mock-battle-probe 2/2 PASS @ 2026-09-27T06:06; browser e2e bounded-run-3-sdk-recovery-20260927 started

Rules:
- Cursor B2 writes ACTIVE lock before B2 verification work.
- Cursor B2 returns this file to IDLE only after required verification/output/report is complete.
- Cursor B2 never edits Cursor A control files.
