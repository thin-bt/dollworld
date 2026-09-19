# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
mode: PUBLISH_RECONCILED_SPEC_AND_CLEAN_REACCEPTANCE
updatedAt: 2026-09-19T11:20:44+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-FINAL-COMPLETION-CONTROL-AUDIT-A-20260919-R1
paired-a-terminal: SPRINT2_FINAL_COMPLETION_CONTROL_AUDIT_FIX_REQUIRED
required-master-head: 3215dec98a060b28e9627004323300a7bf20d324
non-overlap: ACCEPTANCE_SPEC_MAINTENANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_REQUIRE_PUBLISHED_CLEAN_BROWSER_GATE_1120
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish reconciled mandatory round-robin spec to GitHub master
- fresh-sync clean worktree to resulting published HEAD
- run mandatory Chrome 7/7 against that published HEAD
- READY only with commit-status CLEAN and exact published HEAD
- publish terminal result to GitHub canonical result path
