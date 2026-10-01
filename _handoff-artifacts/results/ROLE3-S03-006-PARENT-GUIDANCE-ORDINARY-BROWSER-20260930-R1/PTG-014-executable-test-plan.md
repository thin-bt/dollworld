# PTG-014 executable weekly regression contract

state: GPT_ONLY_EXECUTABLE_TEST_PLAN_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: post-replacement parent_master_disciple weekly train_stat and negative controls
source-lineage: thin-bt/dollworld master
depends-on: PTG-013-regression-plan.md

## Purpose

PTG-013 closes the persistence/replacement gap. PTG-014 must prove that the *returned* state after that replacement drives the normal formal-master weekly path exactly once. It must not rebuild a fresh world, replace the parent, or infer replacement only from teacher identity.

## Preconditions

Consume PTG-013 boundary-2 returned runtimeState and weeklyTrainingSidecars directly.

Before the weekly action assert all of:
- child id = child_enrollment_ptg013;
- selected teacher id = parent_ptg013;
- exactly one mentorship exists for the child;
- relation kind = parent_master_disciple;
- zero parent_temporary_guidance relations remain for the child;
- parent sidecar discipleCount = 1;
- weekly teacherFactorKey resolves through the normal Sprint1 formal path, not parentTemporaryGuidanceFactorTenThousandths.

A failure of any precondition is a replacement failure; do not continue and reinterpret the weekly result as PASS.

## PTG-014 action

Schedule exactly one train_stat action for one uncapped target stat in the next legal week. Preserve the PTG-013 child/parent/runtime/sidecars. Choose fixture values with a non-zero pre-action remainder (recommended 999 milliPoints) so carry is exercised.

Capture before:
- surface stat;
- statGrowthRemainder;
- fatigue/injury/motivation inputs;
- growthPotential/age/currentValue factors;
- resolved teacherFactor;
- resolved discipleCountFactor;
- rngFactor.

Run one weekly-training mutation.

## Primary assertions

Filter stat-growth evidence by child + week + targetStat + reason=weekly_train_stat.

Require:
1. exactly one matching stat-growth application;
2. its native appliedMilliPoints equals the production recomputation from the nine factor slots;
3. teacherFactor equals the formal teacherFactorKey result and differs from the PTG factor for this fixture;
4. discipleCountFactor equals the factor for discipleCount=1 and occupies its own slot;
5. no second matching stat-growth application exists.

Surface-stat change is not the exactly-once oracle.

## Counterfactual fixture-admissibility guard

Using the same base and all unchanged factors, calculate three counterfactual native results with production flooring semantics:
- PTG_LEAK: replace formal teacherFactor with parentTemporaryGuidanceFactorTenThousandths;
- TEACHER_DOUBLE: apply the formal teacherFactor one extra time;
- DISCIPLE_DOUBLE: apply discipleCountFactor one extra time.

The fixture is admissible for PASS evidence only if expectedSingle differs from all three counterfactual results. If any are equal after flooring, mark FIXTURE_INSUFFICIENT and choose another target stat/week/base/remainder; do not weaken the assertion.

## Carry/cap consistency

Let accumulated = remainderBefore + appliedMilliPoints.
Require surfaceGain = min(floor(accumulated / 1000), 100 - before), after = before + surfaceGain, and remainderAfter = accumulated % 1000, subject to the production cap/remainder rule if the implementation explicitly clears remainder at cap.

Prefer before <= 98 so cap behavior cannot mask the multiplier test.

## PTG-015 explicit-teach negative control

From the same post-replacement lineage, execute one legal explicit-teach operation separately from PTG-014.

Assert mentorship relation/cardinality and parent discipleCount are unchanged by the teach operation itself. Then execute one train_stat action and require exactly one matching stat-growth application. Explicit teach may affect its own technique/teaching evidence according to product rules, but must not create a duplicate weekly stat-growth teacher contribution.

Do not use an explicit-teach event as proof of weekly teacher-factor application.

## PTG-016 disciple-efficiency isolation

Keep child, parent, relation kind, teacherFactorKey, target stat, and all non-disciple factors fixed. Change only the legal disciple-count fixture so the resolved discipleCountFactor differs.

Require teacherFactor unchanged and exactly one discipleCountFactor slot in the native recomputation. Reject a fixture if the changed disciple factor floors to the same appliedMilliPoints; choose values that distinguish the counterfactual.

## Acceptance matrix

| Case | relation | teacher slot | disciple slot | cardinality/side effect | PASS evidence |
|---|---|---|---|---|---|
| PTG-013 boundary 1 | parent_temporary_guidance | PTG factor | independent | mentorship=1; parent count=0 | persisted relation |
| PTG-013 boundary 2 | parent_master_disciple | formal key | independent | mentorship=1; old PTG=0; parent count=1 | returned runtime+sidecar |
| PTG-014 weekly | parent_master_disciple | formal exactly once | count=1 factor exactly once | unchanged | one native stat-growth application |
| PTG-015 explicit teach | unchanged | weekly slot not duplicated | unchanged | unchanged by teach | teach evidence separated from train_stat |
| PTG-016 efficiency | unchanged | fixed | only changed dimension | controlled fixture | native result distinguishes disciple counterfactual |

## Implementation order

1. Implement PTG-013 continuity first.
2. Add PTG-014 using PTG-013 returned state, preferably in the same test file/helper lineage.
3. Add the counterfactual admissibility helper so an arithmetically weak fixture cannot PASS.
4. Add PTG-015 and PTG-016 as separate controls.
5. Only after source tests pass should ordinary-flow acceptance mirror these invariants.
