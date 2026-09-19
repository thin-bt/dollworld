# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-PUBLISHED-BROWSER-GATE-PRECLOSURE-A-20260919-R1
mode: PUBLISHED_BROWSER_GATE_PRECLOSURE_AUDIT
updatedAt: 2026-09-19T12:04:13+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-PUBLISHED-BROWSER-GATE-PRECLOSURE-A-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-FINAL-COMPLETION-CONTROL-AUDIT-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: AUDIT_ONLY_NO_PRODUCT_NO_PLAYWRIGHT_NO_B2_CONTROL_EDITS
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- do not edit product, Playwright, or B2 control surfaces
- publish terminal result to GitHub canonical result path
