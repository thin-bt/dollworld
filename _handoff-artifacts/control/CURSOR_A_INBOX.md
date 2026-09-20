# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-014-LIVE-ENROLLMENT-CANDIDATE-MATERIALIZATION-A-20260921-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T02:38:16+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-014-LIVE-ENROLLMENT-CANDIDATE-MATERIALIZATION-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
runtime-status: DISPATCHED
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- fix bounded S03-014 live enrollment candidate/intake materialization only
- do not touch B2 S03-009/S03-011 or B2 control/task/result artifacts
- publish source/tests to canonical master before READY
- publish terminal result to GitHub canonical result path with actual product/master SHA
