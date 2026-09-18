# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-AUTO-PROGRESSION-BROWSER-CONTRACT-A-20260919-R1
mode: PRODUCT_CONTRACT_RECONCILIATION
updatedAt: 2026-09-19T05:54:46+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-AUTO-PROGRESSION-BROWSER-CONTRACT-A-20260919-R1/instruction.md
predecessor-task: SPRINT2-A-R14-FIX-INTEGRITY-AUDIT-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: A_OWNS_PRODUCT_FIX_B2_OWNS_BROWSER_ACCEPTANCE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path
