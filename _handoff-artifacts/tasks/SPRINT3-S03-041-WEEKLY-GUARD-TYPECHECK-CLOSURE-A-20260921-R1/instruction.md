# SPRINT3-S03-041-WEEKLY-GUARD-TYPECHECK-CLOSURE-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Gap
Canonical Sprint2 re-acceptance evidence reports the Sprint3 weekly regression guard runtime tests PASS, but full `npm run typecheck -w @shared-world/web` FAILS specifically on guard-test typings. This leaves the Sprint3/Sprint2 integration guard non-clean in the canonical product tree.

Target: `apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts`.

## Execute
1. Fresh-read protocol, Sprint2/Sprint3 status, A/B2 state, predecessor re-acceptance result, and current target source from GitHub master.
2. Reproduce the typecheck failure once. Fix only the guard-test typing defects with the smallest semantics-preserving change; do not weaken assertions or alter product behavior.
3. Run the focused guard test and `npm run typecheck -w @shared-world/web`. Both must PASS for READY.
4. Publish the fix to canonical GitHub master and verify readback of the changed source/commit.
5. Publish terminal evidence at `_handoff-artifacts/results/SPRINT3-S03-041-WEEKLY-GUARD-TYPECHECK-CLOSURE-A-20260921-R1/result.md`, including exact diagnostics before, files changed, focused-test count, typecheck result, publication SHA, and readback.
6. Do not change Sprint2/Sprint3 formal status. Do not overlap B2 work. Use `_handoff-artifacts/control-tmp/` for any transient scratch; no root-level temp artifacts.

## Acceptance
- guard runtime semantics remain exactly-once/deterministic;
- focused guard tests PASS;
- full `@shared-world/web` typecheck PASS;
- fix is on GitHub canonical master and read back;
- no unrelated product/source changes.
