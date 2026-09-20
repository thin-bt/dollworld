# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-015-CANONICAL-PUBLISH-RECOVERY-B2-20260921-R1
mode: IMPLEMENTATION_RECOVERY
priority: DEADLINE_CRITICAL
updatedAt: 2026-09-21T08:54:16+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-015-CANONICAL-PUBLISH-RECOVERY-B2-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
recovery-request: REDISPATCH
pickup-requirements:
- fresh-read GitHub canonical instruction, current master, prior S03-015 BLOCKED result, and A lane state
- claim ACTIVE before product changes
- reconstruct and publish the bounded generated-technique production battle lookup integration lost to workspace sync
- canonical product commit/readback is mandatory for READY; no audit-only terminalization
- do not touch A S03-016 live master qualification/enrollment domain
- publish terminal result to canonical result path and verify GitHub master readback before READY
