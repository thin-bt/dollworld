# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1
mode: SPEC_TO_SOURCE_CLOSURE
updatedAt: 2026-09-21T03:36:46+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before changes
- reconcile Sprint3 original-technique scope authority in canonical docs without touching B2-owned S03-009 product source
- preserve published S03-010 evidence; do not claim S03-009/S03-011 complete unless canonical master proves it
- publish terminal result to GitHub canonical result path
- deadline-recovery: complete docs/spec-to-source closure and canonical publication in this pickup where feasible; no status-only completion
