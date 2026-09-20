# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1
mode: PRODUCT_IMPLEMENTATION
updatedAt: 2026-09-21T01:02:00+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- implement/test/publish bounded S03-011 first-use MatchId persistence
- do not touch B2-owned S03-009 weekly runtime wiring or B2 control/task/result artifacts
- rebase/fresh-read before publication if B2 lands first
- publish terminal result to GitHub canonical result path
- deadline-recovery: execute product work now; no status-only completion
