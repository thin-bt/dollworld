# SPRINT3-FORMAL-ACCEPTANCE-CHECK-RECOVERY-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: IMPLEMENTATION_VERIFICATION
priority: IMMEDIATE
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Why this is the next unique gap

Fresh canonical read shows S03-001 through S03-008 product slices are published, A and B2 are both IDLE, and the newest S03-008 terminal result reports the focused Sprint3 bundle PASS (93/93) plus simulation-core build PASS. However the Sprint3 backlog fixed completion condition still requires root `npm run check` success, while the S03-008 result records root `npm run check` FAIL due to repository-wide Prettier warnings. Therefore Sprint3 cannot be formally closed from the existing evidence.

## Execute now

1. Claim this exact task ACTIVE in CURSOR_A_INBOX.md before product changes.
2. Fresh-read master and run root `npm run check`; capture exact current failures. Do not assume the prior Prettier warning set is unchanged.
3. If failures are formatting-only and mechanically safe, repair only files necessary to make the root check pass. Do not alter gameplay semantics, config values, SPEC versions, Sprint2 visual behavior, or generated evidence artifacts merely to silence checks.
4. If root check exposes substantive failures, fix only a bounded non-conflicting defect attributable to current master and document any remaining blocker precisely. Do not invent scope.
5. Re-run root `npm run check`, Sprint3 focused regression bundle, and `packages/simulation-core` build. Verify published S03-001..008 behavior remains intact.
6. If all fixed Sprint3 completion conditions are now evidenced, update `docs/SPRINT_3_BACKLOG.md` minimally to record formal acceptance/closure evidence without changing specification scope. If not, leave Sprint3 open and identify the exact remaining condition.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-FORMAL-ACCEPTANCE-CHECK-RECOVERY-A-20260920-R1/result.md`, including commands, pass/fail counts, changed files, product commit SHA, master SHA, and READY/BLOCKED classification.
8. Return lane A to IDLE only after terminal result is on canonical master.

## Non-conflict

B2 is IDLE after S03-004 independent acceptance. Do not edit CURSOR_B2_INBOX.md or redo S03-004 acceptance. This task is solely Sprint3 formal check/acceptance recovery.
