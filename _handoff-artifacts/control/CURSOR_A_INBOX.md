# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260920-R2
mode: WIREFRAME_CANONICAL_PUBLICATION
priority: IMMEDIATE
updatedAt: 2026-09-20T01:01:19+09:00
last-consumed-task-key: SPRINT2-FORMAL-COMPLETION-EVIDENCE-A-20260919-R1
last-terminal: FIX_REQUIRED / SPRINT2_FORMAL_COMPLETION_EVIDENCE_FIX_REQUIRED
last-result-path: _handoff-artifacts/results/SPRINT2-FORMAL-COMPLETION-EVIDENCE-A-20260919-R1/result.md
instruction-path: _handoff-artifacts/tasks/SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260920-R2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint2
recovery: PM_FRESH_KEY_AFTER_PREPARED_WITH_IDLE_NO_PICKUP
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish all remaining Sprint2 wireframe product gaps and canonical browser harness to master
- publish terminal result to GitHub canonical R2 result path
- return lane to IDLE only after terminal publication
- never pause/disable absent explicit user PAUSE/STOP
