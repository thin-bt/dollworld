# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-B2-PICKUP-RECOVERY-A-20260920-R1
mode: B2_PICKUP_RECOVERY
updatedAt: 2026-09-20T05:48:00+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-B2-PICKUP-RECOVERY-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4
non-overlap: CONTROL_PLANE_RECOVERY_ONLY_NO_PRODUCT_OR_BROWSER_ACCEPTANCE_EDITS
recovery: PM_FAILOVER_B2_PREPARED_UNPICKED
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- diagnose and repair/retrigger B2 canonical pickup path
- publish terminal result to GitHub canonical result path
- do not edit product files or duplicate browser acceptance
- do not start Sprint3/4
