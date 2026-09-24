# Cursor A Active Task

state: ACTIVE
lane: A
task-key: SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
updatedAt: 2026-09-25T02:08:00+09:00
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-START-001 / verification-resume-r28
branch: master
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1/instruction.md
control-authority: GitHub
last-completed-task: UI-BATTLE-SHARED-MOCK-V03-20260923-R2
last-result-path: _handoff-artifacts/results/UI-BATTLE-SHARED-MOCK-V03-20260923-R2/result.md
recovery-note: r28 — reconcile probe/enrollment vs train_stat discovery; vitest probe → fixture seed → Chrome e2e evidence → result.md

Rules:
- Cursor A writes ACTIVE lock before handoff-artifact work for an A task.
- Cursor A returns this file to IDLE only after required implementation/verification/output/report is complete.
- Cursor A never edits CURSOR_B2_INBOX.md or CURSOR_B2_ACTIVE_TASK.md.
