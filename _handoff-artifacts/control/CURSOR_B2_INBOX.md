# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1
mode: RELEASE_EVIDENCE
updatedAt: 2026-09-21T10:55:34+09:00
sprint: Sprint3
priority: DEADLINE_CRITICAL
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-021-LIVE-WEEKLY-TEACH-WIRING-B2-20260921-R1
parallel-with: SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- prove next-week persistence visibility and replay/idempotence on canonical master
- preserve A S03-022 ownership; fetch/rebase and do not overwrite A semantics
- publish terminal result to GitHub canonical result path
- no Sprint4 work
