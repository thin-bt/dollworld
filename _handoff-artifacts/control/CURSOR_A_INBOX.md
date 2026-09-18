# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1
mode: DIRTY_SLICE_PUBLICATION_GATE
updatedAt: 2026-09-19T08:00:25+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-LINT-CLOSURE-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: NO_B2_CONTROL_OR_PLAYWRIGHT_EDITS_WHILE_B2_REACCEPTANCE_IS_RUNNING
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- reconcile/publish only accepted Sprint2 dirty slice; preserve unrelated changes
- publish terminal result to GitHub canonical result path
