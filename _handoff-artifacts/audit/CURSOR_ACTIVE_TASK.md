# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-16T01:22:00+09:00
pickup: (none)
last-completed-task-key: SPRINT2-WIREFRAME-SOURCE-EVIDENCE-REPAIR-A-20260914
last-terminal: READY / SPRINT2_WIREFRAME_SOURCE_EVIDENCE_REPAIR_A_READY / COMMITTED

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
