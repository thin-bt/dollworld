# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-013-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1
mode: PRODUCT_PUBLICATION_RECOVERY
updatedAt: 2026-09-21T02:21:18+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-013-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before changes
- recover/reconcile the already-implemented S03-013 product diff and publish it to canonical master
- verify canonical master contains the S03-013 production files before terminal READY
- do not touch B2 S03-009 ownership/artifacts
- publish terminal result to GitHub canonical result path
- no status-only completion
