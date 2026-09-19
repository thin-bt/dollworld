# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4
mode: WIREFRAME_BROWSER_ACCEPTANCE
updatedAt: 2026-09-20T04:01:34+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
paired-a-task: SPRINT2-FORMAL-COMPLETION-GATE-A-20260920-R2
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: PM_FAILOVER_CANONICAL_B2_R4
pickup-requirements:
- fresh-read GitHub canonical instruction and claim ACTIVE before changes
- fresh-sync canonical master and verify required product SHA is ancestor of exact clean HEAD
- execute full canonical Sprint2 wireframe browser harness in Chrome without weakening/skipping
- publish terminal result to GitHub canonical R4 result path with exact HEAD, clean-tree status, command and pass count
- do not edit product files or start Sprint3/4
- do not pause/disable for Drive/local mirror absence
