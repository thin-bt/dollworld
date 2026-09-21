# Cursor A Inbox
state: PREPARED
lane: A
task-key: CONTROL-RECOVER-STASHED-HANDOFF-UNTRACKED-A-20260922-R1
mode: CONTROL_RECOVERY
updatedAt: 2026-09-22T06:55:00+09:00
sprint: Sprint3
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/CONTROL-RECOVER-STASHED-HANDOFF-UNTRACKED-A-20260922-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction
- preserve current tracked worktree
- no stash apply/pop/drop
- restore affected untracked handoff files path-by-path
- publish terminal result to GitHub canonical result path
