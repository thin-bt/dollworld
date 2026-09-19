# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
mode: CLEAN_REACCEPTANCE_AND_CANONICAL_TERMINAL_PUBLICATION
updatedAt: 2026-09-19T16:23:43+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
published-browser-spec-head: 0fcd7a8c297f2f854306dd2d855e9c54acf3b169
paired-a-terminal: READY_FOR_B2_CLEAN_TERMINAL_CONSUMPTION
non-overlap: ACCEPTANCE_VERIFICATION_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_CANONICAL_RESULT_MISSING_1623_RETRIGGER
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- verify CLEAN published-head Chrome 7/7 evidence or rerun if binding is not provable
- publish terminal result to GitHub canonical result path
- READY only with commit-status CLEAN and exact published verified head
