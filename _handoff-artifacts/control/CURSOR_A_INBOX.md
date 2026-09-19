# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1
mode: PRODUCT_PUBLICATION_CLOSURE
updatedAt: 2026-09-19T10:22:37+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-NONBROWSER-REMAINING-GAP-SCAN-A-20260919-R1
predecessor-terminal: SPRINT2_NONBROWSER_PUBLICATION_SLICE_COMPLETION_REQUIRED
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: PRODUCT_PUBLICATION_ONLY_NO_PLAYWRIGHT_OR_B2_CONTROL_EDITS
pickup-requirements:
- fresh-read GitHub canonical instruction and predecessor result
- claim ACTIVE before changes
- publish the missing ui009 module/test/fetch slice to master; do not leave required files local-only
- verify focused lint/tests/typecheck/web build from committed tree
- publish terminal result to GitHub canonical result path
