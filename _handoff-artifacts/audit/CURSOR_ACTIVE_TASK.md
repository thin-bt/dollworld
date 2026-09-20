# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-20T22:05:00+09:00
pickup: (none)
startedAt: (none)
branch: master
HEAD: (see published-master-sha in result)
origin-master-head: (see published-master-sha in result)
completedAt: 2026-09-20T22:05:00+09:00
last-completed-task: SPRINT3-S03-008-ORIGINAL-TECHNIQUE-LIFECYCLE-A-20260920-R1
last-result-path: _handoff-artifacts/results/SPRINT3-S03-008-ORIGINAL-TECHNIQUE-LIFECYCLE-A-20260920-R1/result.md
last-terminal: READY / SPRINT3_S03_008_ORIGINAL_TECHNIQUE_LIFECYCLE_PUBLISHED
terminal: READY / SPRINT3_S03_008_ORIGINAL_TECHNIQUE_LIFECYCLE_PUBLISHED
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-008-ORIGINAL-TECHNIQUE-LIFECYCLE-A-20260920-R1/instruction.md
control-authority: GitHub
predecessor: SPRINT3-S03-008-PUBLISH-RECOVERY-A-20260920-R1

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
