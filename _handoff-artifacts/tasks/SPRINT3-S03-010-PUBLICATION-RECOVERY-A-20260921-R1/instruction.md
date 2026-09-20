# SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor-result: _handoff-artifacts/results/SPRINT3-S03-010-GENERATED-TECHNIQUE-REGISTRATION-A-20260921-R1/result.md

## Concrete product gap

The predecessor result claims READY but explicitly says `published-master-sha: (local worktree — executor push pending)` and `product-commit-sha: (uncommitted local)`. Fresh canonical master code search has no `generatedTechniqueMaterialization`, so S03-010 is not actually published to the canonical product despite the terminal label.

## Required execution

1. Fresh-read current `master`, this instruction, predecessor result, and B2 lane authority before changing source.
2. Claim this exact task ACTIVE in `_handoff-artifacts/control/CURSOR_A_INBOX.md` before product changes.
3. Recover the already-implemented S03-010 local worktree changes described by the predecessor result. Do not re-invent formulas or widen scope.
4. Rebase/reconcile against current canonical master without touching B2-owned S03-009 files beyond conflict-safe integration required for the already-described narrow adapter.
5. Publish the actual S03-010 source/tests/config/exports to `master` and record the real product commit SHA.
6. Run at minimum simulation-core typecheck/build and the Sprint3 focused tests including generated-technique-registration.
7. Verify from GitHub canonical `master` that `generatedTechniqueMaterialization` and the S03-010 public exports are present after publication.
8. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1/result.md`; READY is allowed only with a real canonical master SHA and readback evidence. If the local changes cannot be recovered, terminalize BLOCKED with exact missing files/diff rather than claiming READY.
9. Return lane A to IDLE after terminal publication.

## Non-goals / collision guard

- Do not implement S03-009 weekly wiring; B2 owns it.
- Do not start S03-011 first-use MatchId persistence in this task.
- Do not alter B2 control/task/result artifacts.
