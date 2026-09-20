# SPRINT3-CANONICAL-BACKLOG-TRUTH-RECONCILIATION-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: SPEC_TO_SOURCE_RECONCILIATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Concrete product gap

`docs/SPRINT_3_BACKLOG.md` still says S03-009 is pending canonical publication and S03-011 is blocked, but canonical master has already published both: S03-009 product dependency is reported present at `b81df17`, and S03-011 was published/read back at `fbb83b1` by `SPRINT3-S03-011-CANONICAL-PUBLICATION-RECOVERY-B2-20260921-R1`.

This stale canonical backlog can incorrectly keep Sprint3 formal closure blocked even though the product source is present.

## Required work

1. Fresh-read `origin/master`, this instruction, current A/B2 control, latest S03-009/S03-011 results, `docs/SPRINT_3_BACKLOG.md`, and the referenced product files.
2. Claim this exact task ACTIVE in B2 control before edits.
3. Verify on current master that S03-009 runtime state/weekly wiring and S03-011 first-use MatchId persistence really exist; do not trust result prose alone.
4. Reconcile `docs/SPRINT_3_BACKLOG.md` to source truth: mark S03-009 and S03-011 canonical implemented only if verification succeeds; remove obsolete pending/blocked wording while preserving scope authority and task ordering.
5. Check for any remaining explicit S03-009/S03-011 pending/blocked statements in Sprint3 canonical docs that would falsely block formal closure; repair only bounded stale status text, not product semantics.
6. Run a focused docs/source consistency check and, if practical, simulation-core typecheck or the smallest relevant test family. Do not duplicate A's current root-test recovery authority.
7. Publish changes to canonical master, publish terminal result under `_handoff-artifacts/results/<task-key>/result.md`, then GitHub-readback the updated backlog and result before READY.

## Non-conflict guard

- Do not edit product implementation unless verification discovers a concrete regression; if so, report BLOCKED with exact evidence rather than expanding scope.
- Do not touch A control/task/result except reading it.
- Do not run/own the root `npm test` recovery currently assigned to A.

## READY gate

READY requires source verification plus canonical backlog publication/readback. A documentation-only assertion without checking master product files is not sufficient.