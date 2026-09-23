# SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_PUBLICATION_RELEASE_GATE
authority: GitHub thin-bt/dollworld master
predecessor: SPRINT3-S03-006-CURRENT-MASTER-PARENT-GUIDANCE-SPEC-SOURCE-AUDIT-A-20260923-R1

## Objective
Publish the already-verified local-only PTG-011/PTG-012 regression locks from the predecessor audit to canonical master, then establish a fresh exact-lineage pristine release gate. Do not claim Sprint3 CLOSED.

## Required work
1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, current A/B2 state, Sprint3 status/backlog, and predecessor result before changes.
2. Recover/reconcile only the predecessor's intended delta in `packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts`: PTG-011 (`applyTrainStat` teacher-factor closure) and PTG-012 (enrollment intake -> persisted relation-kind lookup). Do not overwrite unrelated newer master changes.
3. Verify focused simulation-core build/tests including the predecessor suites.
4. Publish the minimal product/test delta to canonical master and record the exact product SHA.
5. From a pristine exact published lineage, run the full root `npm run check` and production web build. App-start / browser acceptance must be rerun if current product behavior changed; if this is test-only and no runtime bytes changed, explicitly prove that fact and preserve applicable current UI evidence rather than inventing a new browser PASS.
6. Reconcile `docs/SPRINT_3_BACKLOG.md` live-gate prose if it still names POST-F02 as the live current-master gate. The newest successful exact-lineage gate must be the live binding; older gates become historical.
7. Update `_handoff-artifacts/control/SPRINT3_STATUS.md` only after the new gate actually passes. Keep `REOPENED_FIX_REQUIRED`; formal CLOSED is forbidden in this task.
8. Publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1/result.md` with changed paths, product SHA, exact test counts, build result, and remaining acceptance risk.

## Safety
No Drive dependency. No broad stash/clean. Preserve `_handoff-artifacts/tools/**` and `_handoff-artifacts/specs/**`. Any transient scratch belongs only under `_handoff-artifacts/control-tmp/`.
