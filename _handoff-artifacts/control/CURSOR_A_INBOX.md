# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T03:51:43+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
runtime-status: DEPENDENCY_AWARE_DISPATCH
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- first verify whether B2 S03-009 has landed on canonical master
- if S03-009 has landed, implement/publish S03-011 immediately and publish terminal evidence
- if S03-009 is still absent, perform all non-conflicting S03-011 source/battle-boundary analysis and publish exact BLOCKED evidence without inventing runtime state; do not duplicate B2 work
- re-read master before publication and adapt to landed S03-009 interfaces
- do not touch B2 control/task/result artifacts
- no status-only completion
