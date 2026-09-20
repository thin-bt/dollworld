# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-POST-S03-014-RELEASE-GATE-A-20260921-R1
mode: RELEASE_GATE_EVIDENCE
updatedAt: 2026-09-21T02:50:15+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-POST-S03-014-RELEASE-GATE-A-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
runtime-status: DISPATCHED
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE before changes
- execute release-gate checks/evidence now; no status-only completion
- do not touch B2 S03-009 ownership/control/task/result artifacts
- keep product/test gate separate from Sprint3 scope-completeness gate
- publish terminal result to GitHub canonical result path and return lane A to IDLE
