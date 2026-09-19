# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R2
mode: PRODUCT_SLICE_PUBLICATION
updatedAt: 2026-09-19T21:03:28+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R1
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2
recovery: PM_FAILOVER_FRESH_TASK_KEY_FOR_UNPICKED_PREPARED
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish only the completed detailed-battle-log product slice to canonical master
- verify focused checks and published-head presence
- publish terminal result to GitHub canonical result path
- do not pause/disable for Drive/local mirror absence
