# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-ROOT-FORMAT-LINT-RECOVERY-A-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
updatedAt: 2026-09-21T06:24:30+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-ROOT-FORMAT-LINT-RECOVERY-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- execute current root format/lint recovery; do not status-only
- publish terminal result to GitHub canonical result path
- verify canonical master readback before READY
