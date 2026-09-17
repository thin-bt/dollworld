# Cursor A Inbox
state: PREPARED
lane: A
task-key: GITHUB-CONTROL-PLANE-MIGRATION-A-20260917
mode: CONTROL_INFRASTRUCTURE
updatedAt: 2026-09-17T15:00:00+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/GITHUB-CONTROL-PLANE-MIGRATION-A-20260917/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-TOURNAMENT-CLOSURE-A-20260917
last-terminal: READY / SPRINT2_TOURNAMENT_CLOSURE_A_READY / UNCOMMITTED
pickup-requirements:
- fresh-read GitHub canonical instruction
- preserve existing dirty Sprint2 worktree
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
