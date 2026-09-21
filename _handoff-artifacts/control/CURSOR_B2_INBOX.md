# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-019-FORMAT-GATE-RECOVERY-B2-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
updatedAt: 2026-09-21T09:34:00+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-019-FORMAT-GATE-RECOVERY-B2-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-018-FORMAL-CLOSE-INDEPENDENT-AUDIT-B2-20260921-R1
paired-a-task: SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- formatting-only recovery on confirmed S03-015 five-file set
- preserve A-owned S03-017 semantics and control state
- publish terminal result to GitHub canonical result path
- no Sprint4 work
