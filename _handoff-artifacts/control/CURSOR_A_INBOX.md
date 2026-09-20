# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1
mode: RELEASE_GATE_RECOVERY
updatedAt: 2026-09-20T23:53:13+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
priority: DEADLINE_CRITICAL
runtime-status: DEADLINE_FINAL_REDISPATCH_AFTER_PRODUCT_COMMIT
recovery-request: IMMEDIATE
pickup-requirements:
- fresh-read GitHub canonical instruction and current master
- claim ACTIVE immediately before any product changes; do not wait for ROLE1_INBOX
- current master already contains bounded type-fixture repair commit 6e515b3e8d242574f667e6c228bc4bbfb26c3583; verify it rather than redoing it
- run npx tsc -p packages/simulation-core/tsconfig.test.json --noEmit, root npm run typecheck, focused Sprint3 regression, simulation-core build, then root npm run check when typecheck is green
- publish terminal result in this pickup with exact command/count evidence and exact remaining blocker if any
- do not touch B2 control/task/result artifacts; B2 owns S03-009 runtime wiring
- do not declare Sprint3 formal READY solely from green gates while the canonical original-technique scope contradiction remains unresolved
- publish terminal result to GitHub canonical result path and return A to IDLE only after terminal publication
