# Cursor A Active Task

state: ACTIVE
lane: A
task-key: SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
updatedAt: 2026-09-25T22:25:00+09:00
pickup: SDK_EXECUTOR / CURSOR-START-001 / RECOVERY_SAME_TASK_ACTIVE / RESUME_EVIDENCE_RUN / R45
branch: master
control-authority: GitHub
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1/instruction.md

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
