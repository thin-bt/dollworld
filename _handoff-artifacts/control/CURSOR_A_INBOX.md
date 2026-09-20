# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-WEB-TEST-TYPECHECK-RECOVERY-A-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
updatedAt: 2026-09-21T03:20:07+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-WEB-TEST-TYPECHECK-RECOVERY-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before changes
- repair apps/web test-project typecheck mechanically without weakening strict compiler safety
- do not touch B2 S03-009 ownership or reconstruct S03-011
- publish terminal result to GitHub canonical result path
- no status-only completion
