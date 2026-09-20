# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
updatedAt: 2026-09-21T06:38:19+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- execute generated-technique production battle consumption audit/integration; do not status-only
- do not take over Cursor A root format/lint recovery
- publish terminal result to GitHub canonical result path
- verify canonical master readback before READY
