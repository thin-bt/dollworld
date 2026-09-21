# SPRINT3-S03-043-ORDINARY-SESSION-ACTIVATION-CANONICAL-PUBLISH-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: CANONICAL_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
authority-ref: master
control-authority: GitHub
repository: thin-bt/dollworld
branch: master
predecessor: SPRINT3-S03-042-ORDINARY-SESSION-ACTIVATION-B2-20260921-R1

## Objective
Publish the already verified S03-042 ordinary-session Sprint3 activation production/test delta to canonical GitHub master, without broadening scope.

## Required procedure
1. Fresh-read GITHUB_CONTROL_PLANE.md, this instruction, S03-042 result, current A/B2 state, Sprint2/3 status, and fresh origin/master.
2. Claim B2 ACTIVE before changes. Do not touch or consume A's task.
3. Recover/reconcile only the S03-042 bounded delta identified by its terminal result: production-sprint3-run-session-binding.ts, routes-simulation.ts start/reset binding, sprint3-ordinary-session-activation.test.ts, and removal of S03-040 post-start test injection as required by that verified delta.
4. Preserve all newer canonical master changes. Do not reset/rebase master backward and do not publish unrelated local changes.
5. Re-run at minimum the S03-042 focused Vitest pair and @shared-world/web typecheck on the reconciled tree. If reconciliation changes semantics, stop BLOCKED rather than improvising.
6. Publish the bounded product/test delta to GitHub master and perform fresh GitHub readback proving the production binding and ordinary-session test exist canonically.
7. Write terminal result to _handoff-artifacts/results/SPRINT3-S03-043-ORDINARY-SESSION-ACTIVATION-CANONICAL-PUBLISH-B2-20260921-R1/result.md, including exact product commit SHA, commands/results, readback evidence, and whether Sprint3 remains blocked by Sprint2 status.
8. Return B2 to IDLE only after terminal result is canonical.

## Acceptance
READY only if the verified S03-042 production/test delta is present on fresh GitHub master, focused tests/typecheck pass, and readback confirms canonical publication. Otherwise terminal BLOCKED with exact residual.

## Hygiene
No transient scratch directly under _handoff-artifacts/. Use _handoff-artifacts/control-tmp/ for any scratch and clean it in the same run.