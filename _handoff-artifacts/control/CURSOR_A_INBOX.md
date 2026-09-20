# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1
mode: RELEASE_GATE_RECOVERY
updatedAt: 2026-09-20T23:03:38+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
runtime-status: REDISPATCH_AFTER_PRODUCT_COMMIT
recovery-request: REDISPATCH
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before product changes
- current master already contains the bounded type-fixture repair commit 6e515b3e8d242574f667e6c228bc4bbfb26c3583; verify it rather than redoing it
- run the required simulation-core test-project typecheck, root typecheck/check, focused Sprint3 regression, and simulation-core build
- publish terminal result with the exact remaining root blocker, if any
- do not touch B2 control/task/result artifacts
- publish terminal result to GitHub canonical result path
