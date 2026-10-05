# PTG-025 evidence bundle conformance vectors

state: GPT_ONLY_CONFORMANCE_VECTORS_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG-024 structural and cross-record semantic validator conformance
source-lineage: thin-bt/dollworld master
base-authority: PTG-023 blob 7527581c42d8b0e59b02e9320bc41fea0bf8b847; PTG-024 blob 02113e8de2fa5399329bf2910d679dc695435daa
depends-on: PTG-019-acceptance-evidence-record-schema.md; PTG-022-verdict-closure-crosswalk.md; PTG-023-attempt-to-lane-verdict-aggregation.md; PTG-024-acceptance-evidence-bundle-schema.json; PTG-029-neutral-factor-assertion-migration-contract.md

## Purpose

PTG-024 validates record shape, but JSON Schema cannot by itself prove cross-record identity, candidate completeness, arithmetic equality, product-SHA isolation, or deterministic aggregation. This document fixes the conformance corpus for the future validator so schema-valid but semantically laundered evidence cannot become acceptance PASS.

This is GPT-only preparation authority. It does not execute Cursor, browser, or runtime acceptance.

## Validator stages

Run stages in order and stop at the first failing stage for each bundle.

1. **STRUCTURE:** validate the complete bundle against the exact canonical PTG-024 blob named above.
2. **IDENTITY:** index immutable attempts and summaries; reject duplicate IDs and unresolved references.
3. **ATTEMPT_SEMANTICS:** recompute provenance, arithmetic, application identity/count, persistence, and attempt verdict.
4. **AGGREGATION:** recompute candidate inventory, assertion closure, mismatch guard, OPEN/FINAL state, and final verdict under PTG-023.

The validator emits exactly one result:

- VALID;
- STRUCTURAL_REJECT with one `STR_*` code;
- SEMANTIC_REJECT with one `SEM_*` code.

Additional diagnostics may follow, but the first failure code must be deterministic.

## Canonical baseline values

Use these non-production illustrative values only for validator fixtures:

- product SHA A = forty `a` characters; product SHA B = forty `b` characters;
- PTG count-zero weekly arithmetic: EXPECTED_SINGLE=125, PTG_DOUBLE=150, FORMAL_LEAK=140, optional diagnostic DISCIPLE_DOUBLE=125, observed=125;
- formal non-neutral arithmetic: resolved disciple factor=9200, EXPECTED_SINGLE=115, DISCIPLE_DOUBLE=106, observed=115;
- exactly-once counts: action=1, reload=1;
- PTG provenance: relation=`parent_temporary_guidance`, formal=0, temporary=1, discipleCount=0, selectedTeacherId=biologicalParentId;
- formal provenance: relation=`parent_master_disciple`, formal=1, temporary=0;
- all ordinary attempts use `syntheticAdapterReplacement=false`.

These numbers do not define product arithmetic. A real acceptance record must use captured production inputs and production flooring/cap semantics.

## Valid vectors

| id | baseline/mutation | expected |
|---|---|---|
| V01 | No attempts; one correctly formed PTG-015 summary with all three assertions open and no `finalVerdict` | VALID; laneState remains OPEN |
| V02 | One ADAPTER-S1 attempt with `assertionIds=[]`, synthetic=true, non-PASS attempt verdict, listed only in `syntheticNonCandidateAttemptIds` | VALID; closes no ordinary assertion |
| V03 | One PTG-015-S1 PASS attempt with exact two assertion IDs, formal provenance, unchanged explicit-teach cardinalities | VALID attempt; PTG-015 lane remains OPEN because A15-WEEKLY-01 is open |
| V04 | PTG-014A-S1/S2/S3 PASS attempts on SHA A with the exact 4/2/1 assertion sets and all seven closure mappings | VALID; PTG-014A FINAL/PASS |
| V05 | A FIXTURE_INSUFFICIENT S1 attempt followed by a distinguishable S1 PASS on SHA A; both included in candidate inventory, closure points to PASS | VALID; earlier attempt remains immutable and lane may close if all other assertions close |
| V06 | Complete PASS summaries for SHA A and later SHA B stored separately; no closure crosses SHA | VALID; two independent historical product summaries |

## Structural rejection vectors

Apply each mutation to the nearest valid vector.

| id | mutation | expected first failure |
|---|---|---|
| S01 | PTG-014A-S1 carries A14-REL-01 or omits one of its exact four assertion IDs | STRUCTURAL_REJECT `STR_SCENARIO_ASSERTION_SET` |
| S02 | ADAPTER-S1 carries any ordinary assertion ID | STRUCTURAL_REJECT `STR_SYNTHETIC_ASSERTION_SET` |
| S03 | ADAPTER-S1 attempt verdict is PASS | STRUCTURAL_REJECT `STR_SYNTHETIC_PASS` |
| S04 | Weekly PASS omits `nativeArithmetic`, `applicationAndPersistence`, or `targetStat` | STRUCTURAL_REJECT `STR_WEEKLY_PASS_EVIDENCE` |
| S05 | PTG-014A-S1/S2 or PTG-016-S1 native block omits its required PTG_DOUBLE/FORMAL_LEAK/DISCIPLE_DOUBLE field | STRUCTURAL_REJECT `STR_COUNTERFACTUAL_FIELD` |
| S06 | laneState=OPEN includes `finalVerdict` | STRUCTURAL_REJECT `STR_OPEN_HAS_VERDICT` |
| S07 | FINAL/PASS has a non-empty `openAssertionIds` or `mismatchAttemptIds` | STRUCTURAL_REJECT `STR_PASS_HAS_OPEN_OR_MISMATCH` |
| S08 | PTG-015 closure map contains an A14 or A16 key | STRUCTURAL_REJECT `STR_CROSS_LANE_CLOSURE_KEY` |
| S09 | PTG-015-S1 PASS omits `explicitTeachEvidence` | STRUCTURAL_REJECT `STR_EXPLICIT_TEACH_EVIDENCE` |
| S10 | PTG-016-S1 PASS omits comparison evidence, uses factor 10000, omits A16-ARITH-01, or any required comparison flag is false | STRUCTURAL_REJECT `STR_COMPARISON_ISOLATION` |
| S11 | Input bytes are invalid UTF-8, truncated JSON, or have trailing non-whitespace bytes after the root value | STRUCTURAL_REJECT `STR_JSON_SYNTAX` |
| S12 | Any JSON object contains the same member name more than once, even when both values are identical | STRUCTURAL_REJECT `STR_DUPLICATE_JSON_KEY` |
| S13 | Any other PTG-024 schema violation not matched by S01-S10, such as a missing common identity field or forbidden extra property | STRUCTURAL_REJECT `STR_SCHEMA_VIOLATION` |

## Semantic rejection vectors

These vectors must first pass PTG-024 structure.

| id | mutation | expected first failure |
|---|---|---|
| M01 | Two attempt records use the same attemptId, even if their bytes are identical | SEMANTIC_REJECT `SEM_DUPLICATE_ATTEMPT_ID` |
| M02 | closureByAssertion points to an attemptId absent from the bundle | SEMANTIC_REJECT `SEM_CLOSURE_ATTEMPT_MISSING` |
| M03 | closure points to a PRECONDITION_FAILED, NOT_REACHABLE, FIXTURE_INSUFFICIENT, or PRODUCT_OR_SPEC_MISMATCH attempt | SEMANTIC_REJECT `SEM_CLOSURE_ATTEMPT_NOT_PASS` |
| M04 | closure attempt uses a different productSha from `currentProductSha` | SEMANTIC_REJECT `SEM_CROSS_PRODUCT_CLOSURE` |
| M05 | closure points to ADAPTER-S1 or any synthetic=true attempt | SEMANTIC_REJECT `SEM_SYNTHETIC_CLOSURE` |
| M06 | candidateAttemptIds omits a preserved same-lane, same-product ordinary attempt because its verdict is unfavorable | SEMANTIC_REJECT `SEM_CANDIDATE_INVENTORY_INCOMPLETE` |
| M07 | same-product valid mismatch attempt exists but summary claims PASS or omits it from mismatchAttemptIds | SEMANTIC_REJECT `SEM_MISMATCH_GUARD_BYPASS` |
| M08 | weekly PASS has observedAppliedMilliPoints != EXPECTED_SINGLE | SEMANTIC_REJECT `SEM_OBSERVED_EXPECTED_MISMATCH` |
| M09 | weekly PASS has EXPECTED_SINGLE equal to a scenario-relevant defect counterfactual after production flooring; count-zero S3 diagnostic equality is not relevant | SEMANTIC_REJECT `SEM_COUNTERFACTUAL_COLLISION` |
| M10 | ordinary parent-guidance attempt has selectedTeacherId != biologicalParentId | SEMANTIC_REJECT `SEM_PARENT_TEACHER_MISMATCH` |
| M11 | native application child/week/target differs from attempt identity, or reason is not the captured production weekly action | SEMANTIC_REJECT `SEM_APPLICATION_IDENTITY_MISMATCH` |
| M12 | application count or reload count is not exactly one for a weekly PASS | SEMANTIC_REJECT `SEM_NOT_EXACTLY_ONCE` |
| M13 | PTG reload mentorship, relation, discipleCount, or resolved count-zero factor differs from the required post-action invariant | SEMANTIC_REJECT `SEM_RELOAD_INVARIANT_MISMATCH` |
| M14 | explicit teach changes mentorship cardinality or increments discipleCount | SEMANTIC_REJECT `SEM_EXPLICIT_TEACH_DUPLICATION` |
| M15 | PTG-016 comparison changes teacher factor or guarded non-disciple input, despite boolean claims in the record | SEMANTIC_REJECT `SEM_COMPARISON_NOT_ISOLATED` |
| M16 | PASS has non-empty failedAssertionIds, or a non-PASS record names an assertion outside its exact scenario set | SEMANTIC_REJECT `SEM_FAILED_ASSERTION_BINDING` |
| M17 | summary closure key maps to a PASS attempt whose exact scenario assertion set does not contain that key | SEMANTIC_REJECT `SEM_ASSERTION_NOT_CLOSED_BY_ATTEMPT` |
| M18 | summary is FINAL/PASS but one required assertion lacks a closure mapping | SEMANTIC_REJECT `SEM_REQUIRED_ASSERTION_OPEN` |
| M19 | all remaining assertions are terminally blocked, but final non-PASS verdict violates PTG-018 precedence | SEMANTIC_REJECT `SEM_VERDICT_PRECEDENCE` |
| M20 | historical evidence package contains two different records for the same attemptId, indicating overwrite/relabel behavior | SEMANTIC_REJECT `SEM_DUPLICATE_ATTEMPT_ID`; diagnostics must also include `SEM_IMMUTABILITY_VIOLATION` |

M20 is intentionally multi-diagnostic. Identity uniqueness is evaluated before record-content comparison, so its deterministic first failure is `SEM_DUPLICATE_ATTEMPT_ID`, exactly as for M01. The differing bytes additionally require `SEM_IMMUTABILITY_VIOLATION`; that secondary diagnostic must not replace the earlier identity failure as `firstFailureCode`.

## Neutral-factor migration vectors

These six vectors supplement, rather than renumber, V01-V06, S01-S13, and M01-M20.

| id | baseline/mutation | expected |
|---|---|---|
| ND-01 | Recompute several legal PTG-014A-S3 count-zero bases and remainders with resolved factor 10000; diagnostic DISCIPLE_DOUBLE, when present, equals EXPECTED_SINGLE in every case | VALID; A14-DISC-01 remains a resolution/persistence assertion |
| ND-02 | A count-zero record states DISCIPLE_DOUBLE != EXPECTED_SINGLE or either recorded value differs from exact recomputation | SEMANTIC_REJECT `SEM_COUNT_ZERO_ARITHMETIC_MISMATCH` |
| ND-03 | A migrated attempt or lane summary includes retired A14-ARITH-03 | STRUCTURAL_REJECT `STR_RETIRED_ASSERTION_ID` |
| ND-04 | A source-proven PTG-016-S1 fixture uses persisted count 4/factor 9200, carries A16-ARITH-01, and exact recomputation gives EXPECTED_SINGLE != DISCIPLE_DOUBLE | VALID; A16-ARITH-01 may close |
| ND-05 | A nominally non-neutral PTG-016 fixture obtains its count, factor, mentorship, relation, or sidecar state by direct edit rather than an ordinary persisted transition | SEMANTIC_REJECT `SEM_DIRECT_STATE_EDIT` |
| ND-06 | Exhaustive ordinary fixture construction yields no legal non-neutral factor while preserving comparison invariants, and the lane records the terminal blocker without closure | VALID; final verdict is NOT_REACHABLE, never PASS |

## Deterministic failure priority

Within a stage, use this priority so the same malformed bundle always produces the same first code:

1. identity uniqueness and reference existence;
2. synthetic and product-SHA isolation;
3. provenance and scenario/assertion binding;
4. native arithmetic admissibility;
5. exactly-once and reload persistence;
6. candidate completeness and mismatch guard;
7. assertion closure completeness;
8. final verdict precedence.

Do not continue to aggregation after an attempt-semantic rejection.

## Required validator output per vector

For every vector record:

- vectorId;
- PTG-024 schema blob;
- validator product SHA;
- actual class: VALID | STRUCTURAL_REJECT | SEMANTIC_REJECT;
- actual first failure code or null;
- expected class and code;
- pass boolean for the conformance vector itself;
- diagnostic JSON pointer(s);
- generatedAt.

The vector passes only when both class and first failure code match.

## Handoff boundary

When implementation resumes, encode V01-V06, S01-S13, M01-M20, and ND-01-ND-06 as 45 executable validator fixtures before using PTG-024 evidence for acceptance. All 45 must pass twice with byte-identical normalized reports. Schema conformance alone is insufficient: all semantic and neutral-factor migration vectors must also pass. No vector in this document is product acceptance evidence, and no illustrative value may be reported as a runtime result.
