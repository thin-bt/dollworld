# SPRINT3-S03-044-PERSON-DETAIL-MENTORSHIP-VISIBILITY-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
authority-ref: master
control-authority: GitHub
repository: thin-bt/dollworld
branch: master

## Gap

Sprint3 mentorship state is present in the accepted UI-005 PersonDetail client contract (`qualifiedMaster`, `formalMasterPersonIds`) but the current `PersonDetailViewPanel` does not present those fields to the observer. The product therefore computes/persists the mentorship relationship while the ordinary person-detail UI leaves the relationship invisible.

This task is deliberately limited to existing accepted fields. Do not widen the UI-005 server/client contract unless fresh source inspection proves that a minimal existing-field presentation is impossible.

## Required work

1. Fresh-read `master`, this instruction, `GITHUB_CONTROL_PLANE.md`, Sprint3 status/backlog, and current UI-005 person-detail source/tests.
2. Claim B2 ACTIVE before edits. Do not touch Cursor A control state.
3. Add a compact human-observer mentorship presentation to ordinary Person Detail using the existing `qualifiedMaster` and `formalMasterPersonIds` fields. At minimum, a viewer must be able to tell whether the person is master-qualified and which formal master person IDs are attached; use existing navigation/link conventions where safely available rather than inventing a new data contract.
4. Preserve existing UI-005 exact-key contract, Japanese presentation conventions, loading/error behavior, and developer-detail separation.
5. Add/update focused client tests proving visible qualified-master state and formal-master relationship, including an empty/no-master case without misleading output.
6. Run focused person-detail tests, web typecheck, and formatting/lint checks appropriate to changed paths. Do not weaken assertions to obtain green.
7. Publish the product/test delta to canonical GitHub `master`, then fresh-read the published paths from GitHub. Terminal READY requires canonical publication and readback, not a local-only commit.
8. Publish `_handoff-artifacts/results/SPRINT3-S03-044-PERSON-DETAIL-MENTORSHIP-VISIBILITY-B2-20260922-R1/result.md`, then return B2 inbox to IDLE with terminal/result pointers.

## Non-conflict / scope guard

- Do not modify Sprint2 behavior, tournament scheduling, simulation progression, mentorship domain semantics, or Sprint3 formal-close status.
- Do not touch A-owned task/control files.
- Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` only.
- This is a UI visibility closure over already accepted Sprint3 state, not a new Sprint3 specification slice.

## Acceptance

READY only when ordinary Person Detail visibly exposes existing master qualification/formal-master relationship, focused regression coverage passes, canonical `master` contains the change, and GitHub readback verifies it. If fresh source proves the gap premise false, publish concrete file/line/test evidence instead of making redundant changes.