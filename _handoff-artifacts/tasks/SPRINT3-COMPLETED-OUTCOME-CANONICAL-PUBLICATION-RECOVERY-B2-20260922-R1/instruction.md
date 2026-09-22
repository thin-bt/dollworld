# SPRINT3-COMPLETED-OUTCOME-CANONICAL-PUBLICATION-RECOVERY-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: CANONICAL_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Problem

The terminal result for `SPRINT3-COMPLETED-OUTCOME-RUNTIME-VALIDATION-B2-20260922-R1` claims product commit `f08896c0eaf299283dd0d95dd2fc5e079e7aff96`, but that commit is not reachable from canonical GitHub master and the claimed validator changes are absent from current master. Current `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` still only `snapshotDenseArrayOrFail(...)`s the three completed-history arrays and then `cloneValidatedPlainJson(...)`s them without entry-level validation.

This is a publication-integrity failure, not a new feature.

## Required execution

1. Fresh-read protocol, this instruction, B2 lane state, prior terminal result, and current master source.
2. Claim B2 ACTIVE per executor contract.
3. Recover/reapply the prior completed-history validation product change onto current canonical master. Do not assume local commit `f08896c` exists; reconstruct from the prior result requirements if necessary.
4. Required behavior for all three completed arrays: entry object validation, unknown-key rejection, non-negative safe `absoluteWeek`, required non-empty person IDs, nested closed-union outcome validation, and string-array `reasons` validation where applicable. Preserve schema version unless a real compatibility requirement is discovered.
5. Preserve the already-landed mentorship assignment semantic validation on current master; do not regress it.
6. Run focused completed-outcome/enrollment/entrypoint runtime tests + simulation-core typecheck + changed-path prettier/eslint. Add/update regression tests proving malformed completed-history entries are rejected and valid state round-trips.
7. Publish product commit to canonical GitHub master and verify readback from GitHub master that entry-level completed-history validators are present.
8. Publish terminal result under `_handoff-artifacts/results/SPRINT3-COMPLETED-OUTCOME-CANONICAL-PUBLICATION-RECOVERY-B2-20260922-R1/result.md`, binding exact canonical product SHA and verification evidence.
9. Do not alter Sprint2/Sprint3 status labels in this task.

## Acceptance

Terminal only when canonical GitHub `master` contains the completed-history validation behavior. A local-only commit or a result that says push/readback is deferred is not acceptance.