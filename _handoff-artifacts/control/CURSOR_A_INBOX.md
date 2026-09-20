# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-FINAL-RELEASE-GATE-A-20260921-R1
mode: FINAL_RELEASE_GATE
updatedAt: 2026-09-21T05:54:10+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
instruction-path: _handoff-artifacts/tasks/SPRINT3-FINAL-RELEASE-GATE-A-20260921-R1/instruction.md
priority: DEADLINE_CRITICAL
predecessor: SPRINT3-ROOT-TEST-RECOVERY-A-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction and current origin/master
- claim ACTIVE for exact task before changes
- verify S03-009/S03-011 product source directly
- run final root release gates and preserve exact evidence
- do not race B2 backlog reconciliation
- publish terminal result to GitHub canonical result path
- return A to IDLE after terminal publication/readback
