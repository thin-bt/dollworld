# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2
mode: WIREFRAME_BROWSER_ACCEPTANCE
updatedAt: 2026-09-20T01:20:33+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
paired-a-task: SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_REBIND_R2_TO_CANONICAL_WIREFRAME_PUBLICATION
pickup-requirements:
- fresh-read GitHub canonical instruction and claim ACTIVE before changes
- fresh-sync canonical master and verify required product SHA is ancestor of exact clean HEAD
- execute full canonical Sprint2 wireframe browser harness in Chrome without weakening/skipping
- include full battle detail/detailed log plus all wireframe completion guards
- publish exact FIX_REQUIRED assertions if any required surface is absent
- publish terminal result with exact HEAD, clean-tree status, command and pass count
- do not pause/disable for Drive/local mirror absence
