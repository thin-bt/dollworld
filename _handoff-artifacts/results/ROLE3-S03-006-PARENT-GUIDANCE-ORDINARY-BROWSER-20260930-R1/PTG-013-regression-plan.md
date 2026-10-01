# PTG-013 source-verified regression plan

state: GPT_ONLY_EXECUTABLE_TEST_PLAN_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 parent_temporary_guidance -> parent_master_disciple continuity and weekly train_stat oracle
source-lineage: thin-bt/dollworld master

## Material delta

Current `parent-temporary-guidance-weekly.test.ts` ends at PTG-012. PTG-011 proves factor selection only by directly constructing weekly records, while PTG-012 proves intake persistence only for the initial temporary-guidance boundary. There is no regression that carries the returned runtime + sidecar state through a later intake for the same child/biological parent and proves replacement plus disciple-count side effect.

Add PTG-013 to close that gap without browser execution.

## Fixture

Use one child `child_enrollment_ptg013` and one biological parent `parent_ptg013`.

Boundary 1, absoluteWeek 384:
- child age 8;
- parent candidate is biological parent;
- parent lifeStatus=living;
- parent careerStatus=active_competitor;
- highestRank=D (not formal-master qualified);
- temporaryGuidanceParentPersonId = same parent id;
- initial parent sidecar discipleCount=0.

Expected after boundary 1:
- outcome.kind = parent_temporary_guidance;
- persisted mentorship relation kind = parent_temporary_guidance;
- selectedMasterPersonId = parent id;
- parent sidecar discipleCount remains 0;
- exactly one mentorship entry exists for child.

Boundary 2, absoluteWeek 385:
- start from boundary-1 returned runtimeState and weeklyTrainingSidecars; do not recreate either;
- enqueue a new pending enrollment record for the same child;
- same parent remains biological parent and intakeAcceptance=accept;
- parent qualification becomes careerStatus=retired, lifeStatus=living, retirementRank=C, highestRank=C.

Expected after boundary 2:
- outcome.kind = parent_master_assigned;
- persisted relation kind = parent_master_disciple;
- selectedMasterPersonId remains the same biological parent;
- exactly one mentorship entry exists for child;
- zero parent_temporary_guidance entries remain for child;
- parent sidecar discipleCount = 1 exactly.

This is a relation-semantics replacement test, not a teacher-identity-change test.

## Weekly oracle extension

For the post-replacement weekly `train_stat`, retain `teacherFactorKey=eraLeadingInstructor` so the normal formal path is distinguishable from PTG.

The primary stat-growth oracle is the single `training.stat_growth_applied` event emitted by `applyTrainStat`:
- exactly one event for child + absoluteWeek + targetStat;
- payload.reason = weekly_train_stat;
- payload.factorBreakdown.teacherFactor equals Sprint1 `eraLeadingInstructor` factor;
- payload.factorBreakdown.teacherFactor is not the Sprint3 PTG factor (7500 in the current 0.6.0 fixture);
- payload.factorBreakdown.discipleCountFactor is asserted independently;
- payload.appliedMilliPoints equals a recomputation using `multiplyBasisPointsFloor(baseMilliPointsPerTraining, [growthPotentialFactor, ageFactor, currentValueFactor, teacherFactor, discipleCountFactor, fatigueFactor, injuryFactor, motivationFactor, rngFactor])`.

Surface delta is secondary only. Verify:
`accumulated = remainderBefore + appliedMilliPoints`;
`surfaceGain = min(floor(accumulated / 1000), 100 - before)`;
`after = before + surfaceGain`;
`remainderAfter = accumulated % 1000`.

Do not use `after-before == appliedMilliPoints` as an exactly-once oracle.

## Regression matrix

| Case | teacher relation | teacher factor source | disciple count expectation | failure caught |
|---|---|---|---|---|
| PTG initial | parent_temporary_guidance | Sprint3 parentTemporaryGuidanceFactorTenThousandths | unchanged at 0 | PTG incorrectly treated as formal assignment |
| same-parent replacement | parent_master_disciple | Sprint1 teacherFactorKey | exactly 1 | stale PTG/coexisting relation or missing/double increment |
| formal weekly | parent_master_disciple | Sprint1 eraLeadingInstructor | disciple factor separate | PTG factor leaking after replacement |
| explicit teach negative control | unchanged formal relation | train_stat teacher slot once | unchanged by teach itself unless product rule says otherwise | teach duplicating train_stat teacher contribution |
| disciple-efficiency negative control | either legal relation | one teacher slot | one discipleCountFactor slot | teacher/disciple multiplier duplication |

## Source anchors reviewed

- `packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts`: PTG-001..012; missing continuous replacement regression.
- `packages/simulation-core/src/sprint3/process-sprint3-enrollment-intake-boundary.ts`: `replaceMentorshipAssignment` removes prior child assignment; `applyMasterDiscipleIncrement` is called for parent_master_assigned/formal_master_assigned, not parent_temporary_guidance.
- `packages/simulation-core/src/sprint3/resolve-weekly-parent-temporary-guidance.ts`: parent_master_disciple/formal_master_disciple use normal Sprint1 teacherFactorKey; parent_temporary_guidance uses PTG factor.
- `packages/simulation-core/src/sprint1/weekly-training-effects.ts`: `applyTrainStat` emits appliedMilliPoints and independent teacherFactor/discipleCountFactor in factorBreakdown, then applies remainder carry to the surface stat.

## Implementation order

1. Add PTG-013 continuous intake replacement test.
2. Extend it or add PTG-014 for post-replacement `applyTrainStat` native-unit assertions.
3. Add explicit-teach and disciple-efficiency negative controls only after preserving the same returned state/identity; do not construct unrelated replacement worlds for PASS evidence.
4. Browser ordinary-flow acceptance later mirrors these source-level invariants but is not claimed by this document.
