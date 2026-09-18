# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-BROWSER-FIX-A-20260918-R13
mode: SOURCE_PRODUCT_REPAIR
updatedAt: 2026-09-18T09:37:29+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-BROWSER-FIX-A-20260918-R13/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-BROWSER-FIX-A-20260918-R12
recovery: ROLE3_RETRIGGER_STALE_PREPARED_R13_NO_ACTIVE_OR_TERMINAL_0937
pickup-requirements:
- fresh-read GitHub canonical instruction
- preserve existing dirty Sprint2 worktree
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
