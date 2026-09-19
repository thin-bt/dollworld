# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-FORMAL-COMPLETION-GATE-A-20260920-R2
mode: SPRINT2_FORMAL_COMPLETION_GATE
updatedAt: 2026-09-20T03:02:52+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-FORMAL-COMPLETION-GATE-A-20260920-R2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
product-baseline: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R3
non-overlap: COMPLETION_EVIDENCE_AND_FIX_ONLY_IF_CANONICAL_NONBROWSER_GAP_FOUND
recovery: PM_FAILOVER_FRESH_TASK_KEY_AFTER_PREPARED_IDLE
pickup-requirements:
- fresh-read GitHub canonical instruction and scope authority
- claim ACTIVE before changes
- fresh-sync canonical master and verify baseline ancestry/clean HEAD
- reconcile all Sprint2 completion guards and non-browser verification
- consume B2 R3 terminal result if it appears; do not duplicate B2 browser work
- publish terminal result to GitHub canonical result path
- do not pause/disable for Drive/local mirror absence
