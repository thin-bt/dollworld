# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
mode: FULL_BROWSER_REACCEPTANCE
updatedAt: 2026-09-19T08:22:34+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1
paired-a-terminal: SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1
required-master-head: e40c60f71012f6b353a9944bd1e5abd92d9308ab
non-overlap: TEST_ACCEPTANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_GITHUB_FIRST_RETARGET_AFTER_A_PUBLICATION_READY_0822
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- bind browser acceptance to master containing required-master-head
- publish terminal result to GitHub canonical result path
