# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-039-SPRINT2-REPAIR-REGRESSION-GUARD-B2-20260921-R1
mode: PRODUCT_REGRESSION_GUARD
updatedAt: 2026-09-21T17:39:22+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-039-SPRINT2-REPAIR-REGRESSION-GUARD-B2-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
binding-status: _handoff-artifacts/control/SPRINT3_STATUS.md
pickup-requirements:
- fresh-read GitHub canonical instruction plus Sprint2/Sprint3 binding status
- claim execution before changes
- preserve A-owned Sprint2 core-loop repair; implement only non-conflicting Sprint3 regression guard/evidence
- publish terminal result to GitHub canonical result path
