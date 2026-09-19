# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
mode: BROWSER_CONTRACT_RECONCILIATION_AND_REACCEPTANCE
updatedAt: 2026-09-19T10:36:54+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1
paired-a-terminal: SPRINT2_NONBROWSER_PUBLICATION_SLICE_COMPLETE
required-master-head: 3215dec98a060b28e9627004323300a7bf20d324
non-overlap: ACCEPTANCE_SPEC_MAINTENANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE3_REBIND_LATEST_PUBLISHED_A_SLICE_1036
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- align only the stale contradictory round-robin terminal Playwright expectation with the published Sprint2 finalized-state contract if still required
- run mandatory Chrome 7/7 against master containing required-master-head
- publish terminal result to GitHub canonical result path
