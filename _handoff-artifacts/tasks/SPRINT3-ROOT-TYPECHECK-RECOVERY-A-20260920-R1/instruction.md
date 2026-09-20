# SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: RELEASE_GATE_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor-result: _handoff-artifacts/results/SPRINT3-FORMAL-ACCEPTANCE-CHECK-RECOVERY-A-20260920-R1/result.md

## Objective
Recover the primary Sprint3 formal release gate blocker reported by the predecessor: workspace typecheck failure, especially `packages/simulation-core/tsconfig.test.json` strict test typing errors, without changing gameplay semantics.

## Required execution
1. Fresh-read master and predecessor result; claim this exact task ACTIVE in CURSOR_A_INBOX before product changes.
2. Reproduce `npx tsc -p packages/simulation-core/tsconfig.test.json --noEmit` and capture the exact current failures.
3. Repair the bounded test/type-fixture errors mechanically. Preserve Sprint3 behavior and all S03-001..008 semantics. Do not alter B2 control/task/result artifacts.
4. Re-run the simulation-core test-project typecheck until PASS where feasible, then run root `npm run typecheck`.
5. Re-run the Sprint3 focused regression bundle and `npm run build -w @shared-world/simulation-core` to prove no semantic regression.
6. If typecheck becomes green, continue to root `npm run check`; if the remaining blocker is root tests, publish exact failing suites/counts rather than broad unrelated refactors.
7. Commit/push safe repairs to canonical master and publish terminal result at `_handoff-artifacts/results/SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1/result.md`, including master SHA, commands, counts, changed files, and next exact blocker if any.
8. Return lane A to IDLE after terminal publication.

## Acceptance
READY only if the targeted simulation-core test typecheck is green and the committed evidence is on canonical master. If another bounded root gate remains, terminal may be PARTIAL/BLOCKED but must identify it exactly with command evidence.

No Sprint4 work. No status-only completion.