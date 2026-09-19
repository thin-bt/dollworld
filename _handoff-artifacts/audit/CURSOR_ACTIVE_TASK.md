# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-19T10:30:00+09:00
pickup: (none)
startedAt: (none)
branch: master
HEAD: 3215dec98a060b28e9627004323300a7bf20d324
completedAt: 2026-09-19T10:30:00+09:00
lastCompletedTask: SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1
last-consumed-task-key: SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1
terminal: READY / SPRINT2_NONBROWSER_PUBLICATION_SLICE_COMPLETE
last-terminal: READY / SPRINT2_NONBROWSER_PUBLICATION_SLICE_COMPLETE
last-worktree-head: 3215dec98a060b28e9627004323300a7bf20d324
result-path: _handoff-artifacts/results/SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1/result.md
instruction-path: _handoff-artifacts/tasks/SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1/instruction.md
control-authority: GitHub
predecessor-task: SPRINT2-NONBROWSER-REMAINING-GAP-SCAN-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
