# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T04:06:00+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-terminal: SPRINT3_S03_011_FIRST_USE_MATCHID_BLOCKED_MISSING_S03_009_CANONICAL
failover-from-lane: B2
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- execute the transferred unique S03-009 task now; B2 authority has been RELEASED
- publish product changes/tests and terminal result to canonical master
- do not duplicate S03-011; S03-011 is the immediate follow-up after S03-009 READY
- no status-only completion
