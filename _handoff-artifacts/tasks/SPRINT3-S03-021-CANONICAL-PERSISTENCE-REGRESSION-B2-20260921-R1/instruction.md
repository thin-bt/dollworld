# SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: RELEASE_EVIDENCE
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-S03-021-LIVE-WEEKLY-TEACH-WIRING-B2-20260921-R1
parallel-with: SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1

## Goal

Close a unique release-evidence gap after S03-021: verify from fresh canonical master that accepted explicit weekly `teach` outcomes persist into live person `sprint1State.techniqueStates`, remain visible on the next weekly step, and do not double-apply when the same completed outcome/week is replayed.

## Required execution

1. Fresh-read canonical master, this instruction, A lane state, S03-021 terminal result, Sprint3 backlog/spec, and the production source named by S03-021.
2. Claim B2 ACTIVE for this exact task before changes.
3. Do not edit or consume A S03-022 teaching-selection ownership. Fetch/rebase around A publication if it lands during this task; preserve its semantics.
4. Inspect the canonical production call chain `runSprint1WeeklyStep` -> live explicit weekly teach materialization/evaluation -> `applyExplicitWeeklyTeachOutcomesToWorldState`.
5. Add or strengthen a focused regression only if canonical tests do not already prove BOTH next-week visibility and replay/idempotence. If existing canonical tests already prove both, publish exact test/source anchors as evidence without gratuitous product edits.
6. Run the smallest focused test family that proves the persistence/replay contract plus `@shared-world/simulation-core` build. Attempt root `npm run check` once only when the worktree is not contaminated by parallel A WIP; record a bounded NOT COMPLETED if A WIP makes that unsafe/non-diagnostic.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1/result.md` with canonical commit(s), exact source/test anchors, commands/results, and READY/BLOCKED.
8. Return B2 control to IDLE after terminal publication.

## READY gate

READY requires canonical GitHub evidence that persistence is next-week visible and replay-safe. A local-only result is not READY. Do not declare Sprint3 globally complete; A S03-022 and any later release gates remain independent.
