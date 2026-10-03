# PTG-019 acceptance evidence record schema

state: GPT_ONLY_ACCEPTANCE_EVIDENCE_SCHEMA_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG executable acceptance evidence recording
source-lineage: thin-bt/dollworld master
depends-on: PTG-014-executable-test-plan.md; PTG-018-fixture-provenance-and-verdict-contract.md

## Purpose

PTG-014 and PTG-018 define what is acceptable. This document fixes the evidence record that must be emitted when execution resumes so a row cannot be marked PASS from UI text, a surface-stat delta, or an unlabeled synthetic fixture.

This is preparation authority only. It does not execute Cursor and does not convert an unexecuted row into PASS.

## One record per acceptance row

Emit one immutable record for each attempted PTG-014A, PTG-015, or PTG-016 row. Do not merge multiple attempts into a single PASS. A replacement attempt receives a new attemptId and retains the earlier verdict.

Required identity fields:
- assignmentGeneration;
- assignmentId;
- lane: PTG-014A | PTG-015 | PTG-016;
- attemptId;
- productSha;
- evidenceCapturedAt;
- childId;
- weekIdentity;
- actionOrRequestId;
- targetStat where applicable.

## Provenance block

Record before the action:
- productionEntrypoint;
- fixtureSourceReference;
- relationKind;
- selectedTeacherId;
- biologicalParentId;
- completedEnrollmentOutcomeCount;
- mentorshipCount;
- formalRelationCount;
- temporaryGuidanceRelationCount;
- persistedDiscipleCount;
- syntheticAdapterReplacement: true | false.

For PTG-014A, fixtureSourceReference must identify the consumed PTG-017 persisted state. For PTG-015/016, it must identify the ordinary production transition that created the formal fixture/contrast.

If syntheticAdapterReplacement=true, the row cannot be a PTG-014A/015/016 PASS record.

## Native arithmetic block

For each weekly stat-growth assertion record:
- preActionNativeBase;
- preActionRemainder;
- resolvedTeacherFactorKey;
- resolvedTeacherFactorValue;
- resolvedDiscipleFactorValue;
- all other production inputs required by the native calculation;
- EXPECTED_SINGLE;
- PTG_DOUBLE when relevant;
- FORMAL_LEAK when relevant;
- DISCIPLE_DOUBLE when relevant;
- observedAppliedMilliPoints.

Before execution, record distinguishableFromAllRelevantCounterfactuals=true only if EXPECTED_SINGLE differs from every relevant defect counterfactual after the same production flooring/cap semantics.

If false, verdict must be FIXTURE_INSUFFICIENT and the acceptance action must not be used as PASS evidence.

## Exactly-once and persistence block

After one legal action record:
- matchingNativeApplicationCount;
- nativeApplicationReason;
- nativeApplicationChildId;
- nativeApplicationWeekIdentity;
- nativeApplicationTargetStat;
- postActionMentorshipCount;
- postActionRelationKind;
- postActionPersistedDiscipleCount;
- reloadMatchingApplicationCount;
- reloadMentorshipCount;
- reloadPersistedDiscipleCount.

PTG-014A requires matchingNativeApplicationCount=1 and reloadMatchingApplicationCount=1. Reload must prove persistence without a second application.

PTG-015 additionally records explicitTeachMentorshipCountBefore/After and explicitTeachDiscipleCountBefore/After. The explicit-teach operation must not duplicate mentorship or increment discipleCount again.

PTG-016 additionally records comparisonAttemptId and proves that the teacher factor and other guarded non-disciple inputs are unchanged while the legally persisted disciple factor differs.

## Verdict record

Emit exactly one:
- PRECONDITION_FAILED;
- NOT_REACHABLE;
- FIXTURE_INSUFFICIENT;
- PRODUCT_OR_SPEC_MISMATCH;
- PASS.

Apply PTG-018 precedence exactly. Record:
- verdict;
- verdictReason;
- failedAssertionIds;
- sourceEvidenceReferences.

A valid, distinguishable production fixture whose observed native result violates the reconciled contract is PRODUCT_OR_SPEC_MISMATCH, not FIXTURE_INSUFFICIENT.

## PASS minimums

PASS is admissible only when all of the following are present in the same attempt record:
1. source-proven production provenance for the lane;
2. arithmetic counterfactual distinction before the acceptance assertion;
3. exactly one matching native application;
4. observedAppliedMilliPoints = EXPECTED_SINGLE;
5. required relation/cardinality/disciple-count invariants;
6. reload evidence proving no second application;
7. no synthetic ordinary-flow substitution.

Missing required evidence is not silently treated as PASS. Classify it using PTG-018 before starting a replacement attempt.

## Handoff order

When execution resumes:
1. create the attempt record and capture provenance;
2. compute and store native counterfactuals;
3. stop/classify if the fixture is inadmissible;
4. execute exactly one legal production action;
5. capture native and post-action evidence;
6. reload/re-read once and capture persistence;
7. emit exactly one verdict;
8. preserve the record even when a later attempt supersedes it.
