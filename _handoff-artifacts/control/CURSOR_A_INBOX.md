# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-ROOT-TEST-RECOVERY-A-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
updatedAt: 2026-09-21T05:25:29+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
instruction-path: _handoff-artifacts/tasks/SPRINT3-ROOT-TEST-RECOVERY-A-20260921-R1/instruction.md
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical instruction and current origin/master
- claim ACTIVE for exact task before changes
- run fresh root npm test; stale 41-failure count is not current evidence
- repair only safe bounded deterministic failures; no test weakening or repo-wide prettier
- publish terminal result to GitHub canonical result path
- publish/readback any safe repair commit before READY
