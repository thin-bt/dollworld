# ROLE1 Inbox
state: PREPARED
lane: ROLE1
task-key: SPRINT2-COMPLETION-EVIDENCE-AUDIT-ROLE1-20260920-R1
mode: SPRINT2_COMPLETION_EVIDENCE_AUDIT
updatedAt: 2026-09-20T20:01:36+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-COMPLETION-EVIDENCE-AUDIT-ROLE1-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before work
- stay within declared non-overlap scope
- publish terminal result to GitHub canonical result path
- do not start Sprint4
- do not treat Drive/local mirror absence as terminal
- pickup-recovery: canonical PREPARED remains unclaimed; immediate re-dispatch at 2026-09-20T20:01:36+09:00
- completion-driven: perform the audit now; do not return status-only
