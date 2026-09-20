# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-011-CANONICAL-PUBLICATION-RECOVERY-B2-20260921-R1
mode: PRODUCT_PUBLICATION_RECOVERY
updatedAt: 2026-09-21T04:38:49+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-011-CANONICAL-PUBLICATION-RECOVERY-B2-20260921-R1/instruction.md
non-conflict:
- Cursor A exclusively owns SPRINT3-S03-009-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1
- B2 must not modify/publish S03-009 authority or deltas
pickup-requirements:
- fresh-read GitHub canonical master and exact instruction
- claim ACTIVE before changes
- recover/reconcile only S03-011 first-use MatchId founding-history persistence
- if S03-009 dependency is still absent, terminal BLOCKED with exact dependency evidence and return IDLE
- if A has landed S03-009, immediately publish S03-011 product source/tests, run focused verification, and verify GitHub readback
- local-only READY is forbidden
