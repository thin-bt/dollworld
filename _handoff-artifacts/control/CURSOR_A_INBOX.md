# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-031-FINAL-RELEASE-GATE-A-20260921-R1
mode: DEADLINE_CRITICAL_RELEASE_GATE
authority-ref: thin-bt/dollworld master
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-031-FINAL-RELEASE-GATE-A-20260921-R1/instruction.md
updatedAt: 2026-09-21T14:02:52+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
predecessor: SPRINT3-S03-030-REBELLION-SIGNAL-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1
parallel-with: SPRINT3-S03-030-FORMAL-CLOSE-RECONCILIATION-B2-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- run fresh final release gate against canonical master
- publish terminal result to GitHub canonical result path
- do not edit B2-owned backlog/reconciliation evidence
- do not start Sprint4
