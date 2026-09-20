# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T01:03:00+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
runtime-status: PICKUP_RECOVERY_REQUIRED
recovery-request: REDISPATCH
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- implement bounded S03-009 runtime wiring only; do not expand into S03-010/S03-011
- do not touch lane A S03-011 or A control/task/result artifacts
- publish terminal result to GitHub canonical result path
- pickup-recovery: B2 active lock is IDLE while this canonical PREPARED has remained unclaimed; executor must retry pickup now rather than rewrite status
- deadline-recovery: execute product work now; no status-only completion
