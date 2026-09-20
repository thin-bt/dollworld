# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1
mode: S03_005_TEACHING_EFFICIENCY_PIPELINE_INTEGRATION
updatedAt: 2026-09-20T11:53:48+09:00
sprint: Sprint3
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-004-INTAKE-A-20260920-R1
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- implement/test/publish S03-005 to canonical master
- publish terminal result to GitHub canonical result path
- do not start Sprint4
- pickup-recovery: canonical PREPARED was still unclaimed at 2026-09-20T11:53:48+09:00; treat this write as immediate re-dispatch, not a new task
