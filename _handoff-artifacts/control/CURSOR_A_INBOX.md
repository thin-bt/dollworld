# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-BROWSER-FIX-A-20260917-R2
mode: SOURCE_PRODUCT_REPAIR
updatedAt: 2026-09-17T18:02:15+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-BROWSER-FIX-A-20260917-R2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-FULL-PRODUCT-BROWSER-REACCEPTANCE-B2-20260917
recovery: PM_NEW_TASK_KEY_AFTER_EXECUTOR_NOOP_ALREADY_COMPLETE_SAME_TASK
pickup-requirements:
- fresh-read GitHub canonical instruction
- preserve existing dirty Sprint2 worktree
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
