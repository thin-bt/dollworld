# SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: S03_006_PARENT_TEMP_GUIDANCE_IMPLEMENTATION
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1
predecessor-terminal: READY / SPRINT3_S03_005_TEACHING_EFFICIENCY_READY
predecessor-published-master-sha: e3ebf9170e54461b7f33c103dd46ce7202946859

## Objective
Implement the next unique Sprint3 product slice, S03-006 親一時指導, directly on canonical master. Formal-master absence may use parent temporary guidance at the mentorship/training boundary, and later formal enrollment must remain possible.

## Required fresh reads before edit
- docs/SPRINT_3_BACKLOG.md S03-006
- docs/specs/15-sprint3-config-schema.md
- docs/SPEC.md mentorship / age-8 enrollment rules
- current S03-003 enrollment assignment and S03-005 weekly training source/tests
- newest canonical master

## Required implementation
1. Add/configure `parentTemporaryGuidanceFactorTenThousandths` only through Sprint3 config; do not hard-code a gameplay factor absent from canonical config/spec.
2. Apply parent temporary guidance only when there is no formal master and the parent-guidance outcome is valid; do not treat it as a permanent formal master relationship.
3. Preserve transition to later formal enrollment; temporary parent guidance must not block S03-003 formal-master assignment.
4. Bind at the correct mentorship/weekly-training boundary without breaking Sprint1 behavior when Sprint3 binding is absent.
5. Add deterministic pure validation/selection behavior and focused tests covering eligible parent guidance, formal-master precedence, no eligible parent, later formal enrollment transition, invalid/missing config fail-closed, and determinism.
6. Update Sprint3 config version/feature flag only as required by the existing versioning pattern; do not change SPEC version authority.
7. Update docs/SPRINT_3_BACKLOG.md implementation status/acceptance evidence after product implementation.

## Verification / release gate
- Build `@shared-world/simulation-core`.
- Run focused Sprint3 tests including S03-001 through S03-006 regression.
- Run `npm run check`; if unrelated pre-existing formatting drift remains, record exact failure separately and prove the product slice tests/build are green.
- Publish product commit to `thin-bt/dollworld` `master`.
- Verify published product SHA is an ancestor of current `origin/master`.
- Publish terminal result to `_handoff-artifacts/results/SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1/result.md` with changed files, commands, test counts, published SHA, acceptance mapping, and next unique Sprint3 gap.
- Return lane A to IDLE after terminal publication.

## Collision rules
- Do not edit Cursor B2 control/task/result files.
- Do not start Sprint4.
- Do not implement S03-007/008 except minimal type/config seams strictly necessary for S03-006.
- Claim ACTIVE before product changes.
