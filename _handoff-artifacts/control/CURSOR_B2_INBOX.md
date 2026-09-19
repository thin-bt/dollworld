# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
mode: BROWSER_CONTRACT_RECONCILIATION_AND_REACCEPTANCE
updatedAt: 2026-09-19T09:23:09+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-FINAL-COMPLETION-EVIDENCE-AUDIT-A-20260919-R1
paired-a-terminal: SPRINT2_FINAL_COMPLETION_EVIDENCE_AUDIT_FIX_REQUIRED
required-master-head: e40c60f71012f6b353a9944bd1e5abd92d9308ab
non-overlap: ACCEPTANCE_SPEC_MAINTENANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_RECONCILE_STALE_ROUND_ROBIN_ACCEPTANCE_CONTRACT_0923
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- align only the stale contradictory round-robin terminal Playwright expectation with the published Sprint2 finalized-state contract
- run mandatory Chrome 7/7 against master containing required-master-head
- publish terminal result to GitHub canonical result path
