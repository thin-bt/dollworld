# PTG-014 executable weekly regression contract

state: GPT_ONLY_EXECUTABLE_TEST_PLAN_RECONCILED
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: reachable PTG weekly train_stat plus independently reachable formal controls
source-lineage: thin-bt/dollworld master
depends-on: PTG-017-ordinary-flow-reachability-correction.md; PTG-018-fixture-provenance-and-verdict-contract.md; PTG-029-neutral-factor-assertion-migration-contract.md
supersedes: PTG-014 assumptions that consume PTG-013 synthetic second intake as ordinary-flow evidence

## Purpose

PTG-017 proves that a completed initial parent-temporary-guidance enrollment is not ordinarily rematerialized merely because the same parent later becomes formal-master-qualified. This contract therefore separates three evidence lineages:
- PTG-014A: persisted initial ordinary PTG state;
- PTG-015/016: independently reachable first-formal-enrollment state;
- synthetic PTG -> formal second intake: replacement/cardinality adapter regression only.

No acceptance case may relabel the synthetic second intake as ordinary-flow evidence.

## Normative acceptance authority

PTG-018 is normative for fixture provenance, native-evidence sufficiency, arithmetic admissibility, and final verdict classification. PTG-014 lane-specific assertions may strengthen PTG-018, but must not weaken or bypass its provenance gate or native-evidence requirements.

Classify the final result using this precedence: PRECONDITION_FAILED -> NOT_REACHABLE -> FIXTURE_INSUFFICIENT -> PRODUCT_OR_SPEC_MISMATCH -> PASS. A source-proven, arithmetically distinguishable fixture that reaches the production path and exposes a contract mismatch must not be downgraded to FIXTURE_INSUFFICIENT.

## PTG-014A ordinary PTG weekly fixture

Consume the runtimeState and weeklyTrainingSidecars returned by PTG-017 Week N directly. Do not rebuild the world, replace the parent, inject a second pending enrollment, or rewrite mentorship/sidecar fields.

Before the weekly action require:
- exactly one completed enrollment outcome for the child;
- exactly one mentorship for the child;
- relation kind = parent_temporary_guidance;
- selected teacher = biological parent;
- zero formal parent_master_disciple relations for the child;
- parent sidecar discipleCount = 0;
- no second pending enrollment for the child.

If any precondition fails, classify the fixture as PRECONDITION_FAILED; do not continue and reinterpret another lineage as PASS evidence.

## PTG-014A action and oracle

Schedule exactly one legal train_stat action for one uncapped target stat in the next legal week. Capture the production inputs required to recompute the native stat-growth result, including the resolved PTG teacher factor, resolved disciple-count factor, pre-action remainder, and RNG factor.

Filter native stat-growth evidence by child + week + targetStat + reason=weekly_train_stat and require:
1. exactly one matching application;
2. native appliedMilliPoints equals production recomputation;
3. teacher contribution resolves to parentTemporaryGuidanceFactorTenThousandths exactly once;
4. no formal teacher-factor contribution is present;
5. persisted discipleCount=0 resolves the neutral disciple factor 10000 and remains unchanged;
6. after the action, mentorship cardinality/relation and parent discipleCount remain unchanged.

Surface-stat delta alone is not the exactly-once oracle.

## Arithmetic admissibility guard

Using the same captured base and unchanged non-target factors, compute production-flooring counterfactuals:
- EXPECTED_SINGLE: PTG factor once + count-0 disciple factor once;
- PTG_DOUBLE: apply the PTG factor one additional time;
- FORMAL_LEAK: add/substitute the formal teacher contribution according to the production slot semantics being guarded.

A fixture may provide PTG-014A arithmetic PASS evidence only when EXPECTED_SINGLE differs from PTG_DOUBLE and FORMAL_LEAK after production flooring. Otherwise classify FIXTURE_INSUFFICIENT and choose another legal target/week/base/remainder. Never weaken the assertion to surface-stat equality.

The count-zero disciple factor is neutral: appending 10000 to both the numerator factor product and denominator leaves the quotient unchanged. Therefore DISCIPLE_DOUBLE equals EXPECTED_SINGLE identically for PTG-014A-S3 and is not an admissibility counterfactual in this lane. PTG-014A-S3 instead verifies persisted count=0, resolved factor=10000, and unchanged state through reload.

Prefer an uncapped stat (before <= 98) and a non-zero remainder so cap/flooring cannot hide the multiplier defect.

## PTG-015 independently reachable formal explicit-teach control

PTG-015 must start from a separate child whose first ordinary enrollment directly produces parent_master_disciple. Source-prove the fixture through the normal live enrollment entrypoint; do not derive it by completing PTG and injecting a second pending boundary.

Before explicit teach require:
- exactly one completed enrollment outcome;
- exactly one parent_master_disciple mentorship;
- zero parent_temporary_guidance relations;
- teacher is the biological parent;
- parent discipleCount matches the persisted formal-enrollment result.

Execute one legal explicit-teach operation. Require that the teach operation itself does not duplicate mentorship, alter mentorship cardinality, or increment discipleCount again. Then execute one legal train_stat action and require exactly one native weekly stat-growth application. Explicit-teach evidence is not proof of weekly teacher-factor application.

## PTG-016 disciple-efficiency isolation

Use independently reachable formal-enrollment fixtures only. The compared disciple counts must be consequences of legal persisted mentorship transitions through production entrypoints; acceptance evidence must not directly edit discipleCount or mentorship sidecars.

Hold child-relevant training inputs, relation kind, teacher-factor key, target stat, and other non-disciple factors fixed as far as the production fixture permits. Require:
- resolved teacher factor is unchanged between compared cases;
- resolved disciple-count factor differs and the selected factor is non-neutral (not 10000);
- exactly one disciple-count slot participates in each native recomputation;
- EXPECTED_SINGLE differs from DISCIPLE_DOUBLE when the same selected non-neutral factor is appended once more under identical production flooring semantics;
- resulting native appliedMilliPoints are distinguishable after production flooring.

If no source-proven ordinary fixture can legally produce the required disciple-count contrast while preserving the comparison invariants, classify PTG-016 as NOT_REACHABLE. Do not manufacture a PASS by mutating sidecar counts.

## Synthetic adapter regression

A manually injected second pending boundary after completed PTG may still verify replacement/cardinality adapter behavior. Label this evidence SYNTHETIC_ADAPTER_REPLACEMENT. It may prove replacement mechanics, but it may not satisfy PTG-014A, PTG-015, PTG-016, or any ordinary-flow acceptance row.

## Acceptance matrix

| Case | fixture source | relation | weekly teacher slot | disciple slot | PASS evidence |
|---|---|---|---|---|---|
| PTG-014A | PTG-017 initial ordinary PTG persisted state | parent_temporary_guidance | PTG exactly once; formal leak=0 | count=0 resolves to neutral 10000 and persists | one native weekly application + PTG/formal counterfactual distinction |
| PTG-015 | independent first ordinary formal enrollment | parent_master_disciple | formal path exactly once in subsequent weekly action | persisted formal count | explicit teach does not duplicate weekly contribution/cardinality |
| PTG-016 | independent legal formal mentorship fixtures | parent_master_disciple | fixed across comparison | only intended differing factor | native result distinguishes legal count contrast |
| synthetic replacement | manually injected second pending after completed PTG | replacement target | not acceptance evidence | not acceptance evidence | adapter/cardinality regression only |

## Implementation order

1. Reuse PTG-017 initial ordinary PTG returned state for PTG-014A.
2. Add the native-unit counterfactual admissibility helper.
3. Construct/source-prove an independent first-formal fixture for PTG-015.
4. Attempt PTG-016 only through legal production transitions; emit NOT_REACHABLE when the required contrast cannot be constructed.
5. Keep synthetic replacement coverage separately labelled and out of ordinary-flow acceptance.
