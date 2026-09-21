# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-028-SPECIAL-REASON-AUTHORITY-AUDIT-B2-20260921-R1
mode: INDEPENDENT_RELEASE_EVIDENCE
updatedAt: 2026-09-21T12:50:30+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-028-SPECIAL-REASON-AUTHORITY-AUDIT-B2-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
- evidence-only: do not modify A-owned S03-028 production source/tests/control/task/result
- do not start Sprint4
