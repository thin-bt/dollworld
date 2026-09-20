# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-CANONICAL-BACKLOG-TRUTH-RECONCILIATION-B2-20260921-R1
mode: SPEC_TO_SOURCE_RECONCILIATION
updatedAt: 2026-09-21T05:36:59+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
instruction-path: _handoff-artifacts/tasks/SPRINT3-CANONICAL-BACKLOG-TRUTH-RECONCILIATION-B2-20260921-R1/instruction.md
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical instruction and current origin/master
- claim ACTIVE for exact task before changes
- verify S03-009 and S03-011 product source on master before changing backlog status
- reconcile stale pending/blocked Sprint3 canonical status without duplicating A root-test recovery
- publish terminal result to GitHub canonical result path
- publish/readback canonical backlog correction before READY
