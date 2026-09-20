# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-ROOT-CHECK-TYPECHECK-RECOVERY-A-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
updatedAt: 2026-09-21T01:23:00+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-ROOT-CHECK-TYPECHECK-RECOVERY-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before changes
- repair simulation-core test-project strict typing only; no gameplay semantic workaround
- do not touch B2 S03-009 runtime wiring/control/result
- do not publish S03-011 until S03-009 is canonical
- publish terminal result to GitHub canonical result path
- deadline-recovery: execute now; no status-only completion
