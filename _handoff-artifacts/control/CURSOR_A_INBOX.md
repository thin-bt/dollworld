# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1
mode: PRODUCT_PUBLICATION_RECOVERY
updatedAt: 2026-09-21T00:40:20+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
recovery-request: IMMEDIATE
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before product changes
- recover and publish the already-implemented S03-010 product diff; READY requires real master SHA/readback
- do not touch B2-owned S03-009 control/task/result authority
- do not expand into S03-011
- publish terminal result to GitHub canonical result path
