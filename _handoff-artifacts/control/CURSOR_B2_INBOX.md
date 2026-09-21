# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-043-ORDINARY-SESSION-ACTIVATION-CANONICAL-PUBLISH-B2-20260921-R1
mode: CANONICAL_PUBLICATION_RECOVERY
updatedAt: 2026-09-21T23:38:34+09:00
authority-ref: master
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-043-ORDINARY-SESSION-ACTIVATION-CANONICAL-PUBLISH-B2-20260921-R1/instruction.md
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
