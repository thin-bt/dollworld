# SPRINT3-S03-008-CURRENT-MASTER-TEACHING-SELECTION-OTL-SPEC-SOURCE-AUDIT-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master

## Goal
Perform one bounded current-master spec-to-source audit for S03-008: teaching-technique selection plus original-technique-learning (OTL) pure processor and its accepted production consumption boundaries. Do not treat pure-helper existence as sufficient. Establish whether persisted/live inputs, deterministic selection/research state, generated-technique handoff, and downstream runtime consumers still conform on the latest canonical product lineage.

## Required fresh reads
1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT3_STATUS.md`
3. `docs/SPRINT_3_BACKLOG.md` S03-008 and production/integration evidence
4. `docs/specs/15-sprint3-config-schema.md` applicable teaching-selection / OTL sections
5. newest relevant S03-008/009/010/021/022/023 results and current `apps/**` + `packages/**` source/tests
6. A/B2 lane state before edits; do not touch B2.

## Audit questions
- Is teaching-technique selection derived from real persisted master/disciple technique state rather than fixture/default-only data, with deterministic ordering/tie behavior?
- Is the persisted selection actually consumed by explicit weekly teach, without stale/duplicate/invalid technique IDs bypassing validation?
- Does OTL research progression use live weekly state/config and persist its state exactly once per eligible week?
- Does generation handoff materialize a generated technique into the catalog/runtime path without double registration or pure-processor-only dead ends?
- Are loss/reset/eligibility boundaries and generated-technique battle consumption still connected to the same canonical IDs/state?
- Are disabled/ineligible/no-candidate/invalid persisted states fail-closed and deterministic?
- Are there any current-master regressions where accepted historical S03-008 evidence no longer proves the live production boundary?

## Execution
Trace exact symbols and canonical paths end-to-end. Run the smallest focused production-chain tests that prove the findings. If a real product/test gap exists, repair it in this same task where safely bounded, add a regression, publish only task-owned changes, and verify exact-lineage focused checks. If product bytes change, run fresh root `npm run check` and production web build and update Sprint3 live-gate artifacts only after PASS. If no product gap exists, do not churn code and do not rerun the root gate solely for audit.

Preserve unrelated local WIP. Never use broad untracked stash/clean. Any transient scratch belongs only under `_handoff-artifacts/control-tmp/`; correct any root-level temp defect encountered in this run.

## Terminal result
Publish `_handoff-artifacts/results/SPRINT3-S03-008-CURRENT-MASTER-TEACHING-SELECTION-OTL-SPEC-SOURCE-AUDIT-A-20260923-R1/result.md` with: exact product SHA, spec-to-source chain, concrete gap/no-gap findings, focused commands/counts, changed paths/publication SHA if any, release-gate disposition, and residual ordinary-browser risk. Return A to IDLE after terminal publication.
