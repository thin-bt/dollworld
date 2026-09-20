# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-WEB-TYPECHECK-RECOVERY-A-20260921-R1
mode: RELEASE_GATE_RECOVERY
updatedAt: 2026-09-21T00:01:59+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-WEB-TYPECHECK-RECOVERY-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before changes
- repair bounded @shared-world/web test typecheck gate only
- do not touch B2 S03-009 runtime-wiring scope or B2 control/result artifacts
- publish terminal result to GitHub canonical result path
- after READY, return lane A to IDLE for next Sprint3 root gate
