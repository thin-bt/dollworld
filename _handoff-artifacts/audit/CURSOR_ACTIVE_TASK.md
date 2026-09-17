# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-17T16:20:00+09:00
pickup: (none)
last-completed-task-key: GITHUB-CONTROL-PLANE-MIGRATION-A-20260917
last-terminal: READY / GITHUB_CONTROL_PLANE_MIGRATION_A_READY / COMMITTED
last-commit-sha: 07c0472e569a482bb505db2acaa530cb55f12bdd

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
