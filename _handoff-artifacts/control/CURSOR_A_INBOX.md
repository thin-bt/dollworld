# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-BROWSER-FIX-A-20260917-R3
mode: SOURCE_PRODUCT_REPAIR
updatedAt: 2026-09-17T19:04:28+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-BROWSER-FIX-A-20260917-R3/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-BROWSER-FIX-A-20260917-R2
recovery: PM_FAILOVER_COMPLETE_R3_PUBLICATION_AFTER_R2_STALE_PREPARED
pickup-requirements:
- fresh-read GitHub canonical instruction
- preserve existing dirty Sprint2 worktree
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
