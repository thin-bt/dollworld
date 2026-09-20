# Cursor A Active Task

state: IDLE
lane: A
task-key: (none)
mode: (none)
updatedAt: 2026-09-21T03:48:00+09:00
pickup: (none)
startedAt: (none)
branch: master
HEAD: (see published-master-sha in last result)
origin-master-head: (see published-master-sha in last result)
completedAt: 2026-09-21T03:48:00+09:00
last-completed-task: SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1
last-result-path: _handoff-artifacts/results/SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1/result.md
last-terminal: READY / SPRINT3_SCOPE_AUTHORITY_RECONCILIATION_PUBLISHED
terminal: READY / SPRINT3_SCOPE_AUTHORITY_RECONCILIATION_PUBLISHED
instruction-path: _handoff-artifacts/tasks/SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1/instruction.md
control-authority: GitHub
predecessor: SPRINT3-WEB-TEST-TYPECHECK-RECOVERY-A-20260921-R1

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
