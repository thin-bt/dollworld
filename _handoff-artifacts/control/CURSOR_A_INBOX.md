# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1
mode: S03_006_PARENT_TEMP_GUIDANCE_IMPLEMENTATION
updatedAt: 2026-09-20T20:50:50+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1
predecessor-terminal: READY / SPRINT3_S03_005_TEACHING_EFFICIENCY_READY
last-consumed-task-key: SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1
last-terminal: READY / SPRINT3_S03_005_TEACHING_EFFICIENCY_READY
last-result-path: _handoff-artifacts/results/SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1/result.md
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- implement, test, publish S03-006 product slice to canonical master
- publish terminal result to GitHub canonical result path
- return lane A to IDLE after terminal publication
- do not start Sprint4
