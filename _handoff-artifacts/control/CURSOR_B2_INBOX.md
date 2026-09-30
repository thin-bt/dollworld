# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
updatedAt: 2026-09-25T18:38:36+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
recovery-generation: 20260930-184347-JST
recovery-requested-at: 2026-09-30T18:43:47+09:00
recovery-reason: EXECUTOR_HEARTBEAT_STALE
recovery-mode: SAME_TASK_RECONCILE_ONLY
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- ordinary production browser path only; no test-only substitute
- publish terminal result to GitHub canonical result path
