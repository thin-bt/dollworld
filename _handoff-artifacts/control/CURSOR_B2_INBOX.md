# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-COMPLETED-OUTCOME-CANONICAL-PUBLICATION-RECOVERY-B2-20260922-R1
mode: CANONICAL_PUBLICATION_RECOVERY
updatedAt: 2026-09-22T15:20:00+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-COMPLETED-OUTCOME-CANONICAL-PUBLICATION-RECOVERY-B2-20260922-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- preserve current-master semantic validation
- publish product change to canonical master
- verify GitHub master readback
- publish terminal result to GitHub canonical result path
