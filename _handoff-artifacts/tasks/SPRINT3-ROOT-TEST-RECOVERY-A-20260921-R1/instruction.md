# SPRINT3-ROOT-TEST-RECOVERY-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Why this is now executable

Fresh canonical state has advanced beyond the post-S03-014 release-gate evidence:

- S03-009 weekly original-technique runtime wiring is now published on master (`b81df17`).
- S03-011 first-use MatchId persistence is now published on master (`fbb83b1`).
- the Role3 scope-closure contradiction is RESOLVED by `SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1`.
- apps/web test-project typecheck was repaired on master (`bf6e629`): 273 -> 0 errors; root `npm run typecheck` PASS.

Therefore the stale post-S03-014 root-test count (41 failures / 1793 passed) must not be reused as current evidence. The next unique non-conflicting deadline-recovery slice is a fresh root-test run and bounded repair of actual current failures.

## Required execution

1. Fresh-read `origin/master`, this instruction, A/B2 lane state, and newest Sprint3 results. Claim lane A `ACTIVE` for this exact task before product changes.
2. Work from current canonical master; do not reuse an old dirty worktree as evidence.
3. Run `npm run test` once and capture exact failing files/tests on current master.
4. Classify each current failure into: deterministic regression caused by published Sprint3/Sprint2 integration; stale fixture/assertion; environment/browser/external dependency; or unrelated pre-existing repository failure.
5. Fix only deterministic, mechanically bounded repository failures that can be repaired without changing accepted gameplay semantics or weakening tests. Prefer production correctness when an assertion exposes a real regression; prefer fixture/assertion repair only when canonical behavior/spec clearly shows the test is stale.
6. Do not absorb repo-wide Prettier cleanup in this task. Do not weaken TypeScript strictness, skip/disable tests, reduce assertions, add broad mocks, or change Sprint3 numeric/gameplay rules merely to turn tests green.
7. Re-run affected focused tests, then `npm run test`. Also run `npm run typecheck` if any TS/production source changed. If all root tests pass, record exact pass counts. If failures remain outside safe bounded scope, publish BLOCKED with exact failing tests and concrete next repair slices rather than masking them.
8. Publish any safe product/test repairs to `master`, verify GitHub readback, write terminal result at `_handoff-artifacts/results/SPRINT3-ROOT-TEST-RECOVERY-A-20260921-R1/result.md`, then return A to IDLE.

## Collision guard

- B2 is currently IDLE, but do not edit B2 control artifacts.
- S03-009 and S03-011 are canonical published dependencies; do not revert or replace them.
- Do not perform repo-wide `prettier --write` in this slice.

## Acceptance

READY requires fresh current-master root-test evidence plus all safe bounded repairs published/read back. A residual BLOCKED terminal is acceptable only with exact current failures, classification, and next executable repair boundaries. Status-only completion is forbidden.
