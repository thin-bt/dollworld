# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-FORMAL-CLOSE-A-20260920-R1
mode: FORMAL_CLOSE
updatedAt: 2026-09-20T06:00:00+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FORMAL-CLOSE-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
required-b2-result: _handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4/result.md
non-overlap: CLOSE_CONTROL_ONLY_NO_PRODUCT_EDITS
recovery: PM_CONSUME_B2_R4_READY_AND_CLOSE_SPRINT2
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- consume canonical B2 R4 READY terminal
- publish formal-close terminal result to GitHub canonical result path
- do not edit product files
- do not start Sprint3/4
- do not treat Drive/local mirror absence as terminal
