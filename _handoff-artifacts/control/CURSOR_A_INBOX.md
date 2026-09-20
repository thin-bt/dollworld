# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-009-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1
mode: PRODUCT_PUBLICATION_RECOVERY
updatedAt: 2026-09-21T04:21:25+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical master and S03-009 terminal result
- claim ACTIVE before changes
- recover the already verified S03-009 local product deltas and reconcile against latest master
- exclude unrelated S03-010/S03-011 deltas
- rerun S03-009 focused tests and simulation-core build
- commit and push S03-009 product files to canonical master
- verify GitHub master readback; local-only READY is not sufficient
- publish terminal result and return lane IDLE
- after publication, S03-011 first-use MatchId persistence is unblocked
