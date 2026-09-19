# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2
mode: WIREFRAME_BROWSER_ACCEPTANCE
updatedAt: 2026-09-19T21:36:37+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
paired-a-task: SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R2
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: ROLE3_REBIND_EXISTING_R2_AFTER_STALE_R1_INBOX
pickup-requirements:
- fresh-read GitHub canonical instruction and claim ACTIVE before changes
- fresh-sync canonical master and bind verdict to exact clean HEAD
- preserve reduced 7/7 as regression evidence only
- execute full Sprint2 wireframe browser acceptance, including full battle detail/detailed log after A publication
- publish exact FIX_REQUIRED assertions if any required surface is absent; never weaken/skip
- publish terminal result to GitHub canonical R2 result path
- do not pause/disable for Drive/local mirror absence
