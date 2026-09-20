# SPRINT3-S03-003-ENROLLMENT-A-20260920-R1

state: PREPARED
priority: IMMEDIATE
lane: A
sprint: Sprint3
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-002-MASTER-QUALIFICATION-A-20260920-R1
predecessor-terminal: READY / SPRINT3_S03_002_MASTER_QUALIFICATION_READY
predecessor-master-sha: a23145f7249ba5c82514a67418e876cfe1b59d45

## Objective
Implement S03-003: deterministic 8-year-old enrollment / master-selection AI and processor I/O contract on canonical master.

## Binding scope
- Fresh-read `docs/SPRINT_3_BACKLOG.md`, `docs/SPEC.md`, Sprint3 config/schema, and existing simulation-core processor conventions before edits.
- Define deterministic enrollment processor input/output and master-selection decision rules using S03-002 qualification results.
- Preserve compatibility with the future S03-004 autonomous intake-limit contract; do not invent a world-global fixed disciple cap.
- Implement production code, validation/types/exports as required, and focused deterministic tests.
- Update Sprint3 backlog/spec notes only where required to record the implemented S03-003 contract.
- Run focused tests/build plus the strongest practical repository check; distinguish pre-existing unrelated failures from regressions.
- Publish implementation to canonical `master`, then publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-003-ENROLLMENT-A-20260920-R1/result.md` with published master SHA and evidence.
- Set Cursor A back to IDLE only after terminal result publication.

## Non-goals
- S03-004 intake-limit implementation beyond the interface/boundary needed to avoid conflict.
- S03-005+ work.
- Sprint4 scope.
- Explicit weekly `teach` implementation.

## Acceptance
1. Enrollment is evaluated at the canonical enrollment-age boundary (8) and is deterministic for identical canonical inputs/config/RNG contract.
2. Only eligible living masters according to the S03-002 qualification contract can be selected.
3. No hard-coded global disciple-count cap is introduced; S03-004 remains authoritative for autonomous intake limits.
4. Processor result explicitly represents assignment versus no eligible/accepted master without corrupting lineage/mentorship state.
5. Focused tests cover age boundary, deterministic selection/tie behavior, no-candidate outcome, qualification filtering, and S03-004-compatible acceptance boundary.
6. Canonical master publication and GitHub terminal evidence are complete.
