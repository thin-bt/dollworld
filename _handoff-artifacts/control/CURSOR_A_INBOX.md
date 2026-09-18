# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-POST-CONTRACT-COMPLETION-AUDIT-A-20260919-R1
mode: POST_CONTRACT_COMPLETION_AUDIT
updatedAt: 2026-09-19T07:00:38+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-POST-CONTRACT-COMPLETION-AUDIT-A-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-AUTO-PROGRESSION-BROWSER-CONTRACT-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: NO_B2_CONTROL_OR_PLAYWRIGHT_EDITS_WHILE_B2_REACCEPTANCE_IS_RUNNING
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- do not edit B2 control/Playwright surfaces while B2 runs
- publish terminal result to GitHub canonical result path
