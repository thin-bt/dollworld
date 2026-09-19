# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-FINAL-COMPLETION-EVIDENCE-AUDIT-A-20260919-R1
mode: FINAL_COMPLETION_EVIDENCE_AUDIT
updatedAt: 2026-09-19T09:02:00+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FINAL-COMPLETION-EVIDENCE-AUDIT-A-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
required-master-head: e40c60f71012f6b353a9944bd1e5abd92d9308ab
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: READ_AUDIT_AND_BOUNDED_NON_BROWSER_VERIFICATION_ONLY
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- do not edit B2 control or Playwright acceptance specs
- publish terminal result to GitHub canonical result path
