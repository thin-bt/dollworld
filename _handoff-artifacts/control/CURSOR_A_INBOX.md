# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1
mode: RELEASE_GATE_RECOVERY
updatedAt: 2026-09-20T22:51:51+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before product changes
- recover simulation-core test-project/root typecheck gate without gameplay semantic changes
- do not touch B2 control/task/result artifacts
- publish terminal result to GitHub canonical result path
