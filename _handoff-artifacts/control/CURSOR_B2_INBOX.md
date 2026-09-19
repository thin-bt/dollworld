# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1
mode: WIREFRAME_BROWSER_ACCEPTANCE
updatedAt: 2026-09-19T19:04:31+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
paired-a-task: SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: PM_FAILOVER_RETRIGGER_WIREFRAME_GATE_1904
pickup-requirements:
- fresh-read GitHub canonical instruction and scope authority
- claim ACTIVE before changes
- preserve old reduced 7/7 as regression evidence only
- build/run Sprint2 wireframe browser acceptance against published master
- if A gaps are still absent, publish exact FIX_REQUIRED assertions; never weaken or skip them
- publish terminal result to GitHub canonical result path
- do not pause/disable for Drive/local mirror absence
