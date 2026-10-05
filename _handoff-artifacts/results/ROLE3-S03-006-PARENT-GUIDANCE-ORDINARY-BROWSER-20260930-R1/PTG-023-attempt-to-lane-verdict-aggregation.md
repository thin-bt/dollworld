# PTG-023 attempt-to-lane verdict aggregation contract

state: GPT_ONLY_VERDICT_AGGREGATION_CONTRACT_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG immutable attempt evidence to current-product lane verdict aggregation
source-lineage: thin-bt/dollworld master
base-authority: PTG-014 blob 4c857ea7c9733603ee8266e6341815090e3ce039; PTG-019 blob 335ae01aee100bb4e235ed7075db7b5f36e0a4b8; PTG-022 blob cec25a5f8eb6f5297562dd78f211cfa4fa31fef4
depends-on: PTG-018-fixture-provenance-and-verdict-contract.md; PTG-019-acceptance-evidence-record-schema.md; PTG-020-acceptance-scenario-matrix.md; PTG-021-execution-readiness-gates.md; PTG-022-verdict-closure-crosswalk.md; PTG-029-neutral-factor-assertion-migration-contract.md

## Purpose

PTG-019 assigns one immutable verdict to each attempted acceptance row, while PTG-022 allows a lane to require evidence from more than one attempt. This contract defines deterministic aggregation without rewriting earlier verdicts, mixing product versions, selecting only favorable evidence, or treating unexecuted work as PASS.

This is GPT-only preparation authority. It does not execute Cursor, browser, or runtime work.

## Two verdict levels

### Attempt verdict

An attempt verdict applies only to one attemptId, one productSha, one scenarioId, and the assertions actually exercised by that legal action. It uses the PTG-018 precedence:

PRECONDITION_FAILED -> NOT_REACHABLE -> FIXTURE_INSUFFICIENT -> PRODUCT_OR_SPEC_MISMATCH -> PASS.

The record is immutable. A replacement fixture or rerun creates a new attemptId; it does not update or delete the old verdict.

### Lane verdict

A lane verdict is a derived summary for exactly one productSha and one lane. It is not stored inside an attempt record and does not relabel any attempt. It references the complete candidate attempt set considered for that productSha and the specific closure attemptIds used for each mandatory assertion.

Before all mandatory assertions can be evaluated, laneState=OPEN and finalVerdict must be absent. OPEN is workflow state, not a sixth acceptance verdict.

## Required assertions by lane

| lane | mandatory assertion set |
|---|---|
| PTG-014A | A14-PROV-01; A14-ARITH-01; A14-NATIVE-01; A14-PERSIST-01; A14-ARITH-02; A14-REL-01; A14-DISC-01 |
| PTG-015 | A15-PROV-01; A15-TEACH-01; A15-WEEKLY-01 |
| PTG-016 | A16-PROV-01; A16-ISO-01; A16-ARITH-01; A16-NATIVE-01 |

The migrated partition is 7/3/4 and still contains fourteen unique mandatory assertion IDs. A14-ARITH-03 is retired by PTG-029 and cannot close any migrated lane. No lane PASS is possible with a proper subset.

## Candidate-set construction

For a requested lane summary:

1. Bind one exact currentProductSha.
2. Include every preserved PTG-019 attempt whose lane and productSha match, not only successful attempts.
3. Exclude ADAPTER-S1 and every record with syntheticAdapterReplacement=true from ordinary-flow aggregation, while retaining them in the evidence package as non-candidates.
4. Reject an attempt from assertion closure when its identity, provenance, scenario/assertion binding, or evidence references cannot be validated. Retain it as an invalid candidate with the reason; do not mutate its stored verdict.
5. Never combine closure evidence across productSha values. A new productSha starts a new lane summary and preserves the earlier summary as history.

## Deterministic aggregation algorithm

Evaluate in this order:

1. **Summary integrity.** If the lane, currentProductSha, complete candidate inventory, or canonical assertion set cannot be bound, set laneState=FINAL and finalVerdict=PRECONDITION_FAILED.
2. **Same-product mismatch guard.** If any valid, source-proven, arithmetically distinguishable candidate for currentProductSha has attempt verdict PRODUCT_OR_SPEC_MISMATCH, set laneState=FINAL and finalVerdict=PRODUCT_OR_SPEC_MISMATCH. A favorable attempt on the same productSha cannot hide it.
3. **Assertion closure.** For each mandatory assertion, find at least one valid same-product attempt with attempt verdict PASS whose evidence closes that assertion under PTG-022. Record exactly one designated closureAttemptId and retain all other candidates.
4. **Lane PASS.** If every mandatory assertion has a designated closure attempt, all designated attempts use currentProductSha, and no mismatch guard fired, set laneState=FINAL and finalVerdict=PASS.
5. **Still executable.** If a mandatory assertion remains open and an unconsumed legal scenario/fixture may still close it, keep laneState=OPEN and omit finalVerdict. Do not convert incomplete execution into PRECONDITION_FAILED, NOT_REACHABLE, or FIXTURE_INSUFFICIENT.
6. **Closed non-PASS.** Only after execution has reached a documented terminal stop for every still-open assertion, derive the final non-PASS verdict using the earliest applicable PTG-018 class among the terminal blockers for those open assertions: PRECONDITION_FAILED, then NOT_REACHABLE, then FIXTURE_INSUFFICIENT. PRODUCT_OR_SPEC_MISMATCH was already handled at step 2.

## Replacement-attempt rules

- PRECONDITION_FAILED, NOT_REACHABLE, or FIXTURE_INSUFFICIENT on one fixture does not permanently poison a lane when a different legal attempt on the same productSha can still be made. The lane remains OPEN until terminality is established or all assertions close.
- A later PASS may close an assertion left open by an earlier insufficient attempt, but both attempt records remain in the candidate inventory.
- A later PASS on the same productSha cannot override a valid PRODUCT_OR_SPEC_MISMATCH. Resolve the contradiction by producing a new productSha after a product/spec change or by adding separate evidence that the mismatch candidate failed a prerequisite and therefore was never valid; never edit its historical record.
- Evidence from a newer productSha cannot close an older product summary and vice versa.

## Lane-summary record

The derived record must contain:

- assignmentGeneration;
- assignmentId;
- lane;
- currentProductSha;
- laneState: OPEN | FINAL;
- finalVerdict, present only when laneState=FINAL;
- requiredAssertionIds;
- closureByAssertion: assertionId -> closureAttemptId, only for closed assertions;
- openAssertionIds;
- candidateAttemptIds, complete for the lane/productSha;
- invalidCandidateAttemptIds with exclusion reasons;
- syntheticNonCandidateAttemptIds;
- mismatchAttemptIds;
- terminalBlockersByAssertion;
- canonicalAuthorityBlobs;
- generatedAt;
- sourceEvidenceReferences.

The summary is reproducible data, not a substitute for the referenced immutable attempt records.

## Consistency checks

A lane summary is invalid when any of the following is true:

1. finalVerdict=PASS while openAssertionIds is non-empty;
2. finalVerdict=PASS without exactly one closureAttemptId for every mandatory assertion;
3. a closure attempt uses another productSha, synthetic evidence, or a non-PASS attempt verdict;
4. a valid same-product PRODUCT_OR_SPEC_MISMATCH attempt exists but finalVerdict=PASS;
5. laneState=OPEN includes finalVerdict;
6. laneState=FINAL omits finalVerdict;
7. candidate inventory omits a preserved same-lane, same-product attempt merely because its verdict is unfavorable;
8. an old attempt record was overwritten or relabeled to make aggregation succeed;
9. requiredAssertionIds contains retired A14-ARITH-03 or omits active A16-ARITH-01.

## Execution handoff

When execution resumes, write immutable PTG-019 attempt records first. After each attempt, regenerate the lane summary from the complete same-product candidate set using this algorithm. Report attempt results separately from the derived lane result. Until every required assertion is closed or terminally blocked, report laneState=OPEN and do not claim acceptance PASS.
