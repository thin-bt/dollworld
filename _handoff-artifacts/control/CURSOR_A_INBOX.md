# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-BROWSER-FIX-A-20260917-R10
mode: SOURCE_PRODUCT_REPAIR
updatedAt: 2026-09-17T23:03:00+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-BROWSER-FIX-A-20260917-R10/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-BROWSER-FIX-A-20260917-R9
recovery: PM_FAILOVER_STALE_PREPARED_R9_NO_ACTIVE_OR_TERMINAL_2303
pickup-requirements:
- fresh-read GitHub canonical instruction
- preserve existing dirty Sprint2 worktree
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
