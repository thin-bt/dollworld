# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-032-BACKLOG-PUBLICATION-RECOVERY-B2-20260921-R1
mode: DEADLINE_CRITICAL_CANONICAL_PUBLICATION_RECOVERY
authority-ref: thin-bt/dollworld master
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-032-BACKLOG-PUBLICATION-RECOVERY-B2-20260921-R1/instruction.md
updatedAt: 2026-09-21T14:20:33+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
predecessor: SPRINT3-S03-030-FORMAL-CLOSE-RECONCILIATION-B2-20260921-R1
parallel-with: SPRINT3-S03-031-FINAL-RELEASE-GATE-A-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- recover only the already-accepted S03-030 backlog reconciliation onto canonical master
- publish terminal result to GitHub canonical result path
- do not edit A-owned product/source/test/control state
- do not assign Sprint3 CLOSED while A S03-031 is non-terminal
- do not start Sprint4
