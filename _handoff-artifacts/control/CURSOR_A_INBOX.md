# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-FORMAL-ACCEPTANCE-CHECK-RECOVERY-A-20260920-R1
mode: IMPLEMENTATION_VERIFICATION
updatedAt: 2026-09-20T22:23:52+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-FORMAL-ACCEPTANCE-CHECK-RECOVERY-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: IMMEDIATE
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- run root npm run check and repair bounded current-master failures where safe
- preserve S03-001..008 behavior and Sprint2 visual baseline
- publish terminal result to GitHub canonical result path
