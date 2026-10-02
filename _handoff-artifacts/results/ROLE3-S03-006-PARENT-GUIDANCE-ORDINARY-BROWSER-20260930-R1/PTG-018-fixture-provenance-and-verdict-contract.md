# PTG-018 fixture provenance and verdict contract

state: GPT_ONLY_ACCEPTANCE_FIXTURE_CONTRACT_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG ordinary-flow acceptance fixture provenance and verdict classification
source-lineage: thin-bt/dollworld master
depends-on: PTG-014-executable-test-plan.md; PTG-017-ordinary-flow-reachability-correction.md

## Purpose

This contract closes the remaining ambiguity between a valid production-reachable fixture and a numerically convenient synthetic fixture. It does not claim browser PASS. It defines what evidence may be consumed when Cursor execution resumes.

## Provenance gate

Before evaluating arithmetic, prove the fixture was produced by the production entrypoint for its lane.

PTG-014A:
- consume the initial ordinary PTG persisted state from PTG-017;
- relation must be parent_temporary_guidance and teacher must be the biological parent;
- do not rewrite mentorship, teacher, discipleCount, enrollment outcome, weekly sidecar, or native growth evidence.

PTG-015:
- use a separate child whose first ordinary enrollment directly yields parent_master_disciple;
- explicit teach may be exercised only after that production-valid enrollment exists;
- do not obtain this fixture by completing PTG and injecting a second pending enrollment.

PTG-016:
- disciple-count contrast must be a consequence of legal persisted mentorship transitions through production entrypoints;
- do not directly edit discipleCount or mentorship sidecars to manufacture the comparison.

A manually injected second pending boundary after completed PTG remains SYNTHETIC_ADAPTER_REPLACEMENT and cannot satisfy ordinary-flow acceptance.

## Required native evidence

For each weekly row retain enough native data to recompute the production result:
- product SHA;
- child id, week identity, action/request identity and target stat;
- relation kind and selected teacher id;
- teacher-factor key/value;
- persisted discipleCount and resolved disciple-count factor;
- pre-action native base/remainder and other production inputs used by stat growth;
- native appliedMilliPoints/result;
- post-action mentorship cardinality and persisted values;
- reload/re-read result proving the action was not applied again.

UI text or surface-stat delta alone is insufficient for exactly-once proof.

## Arithmetic admissibility

Using the captured production inputs, compute the same-flooring counterfactuals required by PTG-014:
- EXPECTED_SINGLE;
- PTG_DOUBLE;
- FORMAL_LEAK;
- DISCIPLE_DOUBLE.

The fixture is acceptance-capable only when EXPECTED_SINGLE is distinguishable from every relevant defect counterfactual after production flooring. If flooring, cap, or remainder behavior makes a relevant defect numerically identical, classify FIXTURE_INSUFFICIENT and select another legal fixture. Do not weaken the oracle.

## Verdict precedence

Classify each acceptance row in this order:

1. PRECONDITION_FAILED — persisted state violates the lane's required semantic shape.
2. NOT_REACHABLE — the required legal production fixture/contrast cannot be reached through the source-proven ordinary entrypoint.
3. FIXTURE_INSUFFICIENT — the legal fixture exists but cannot distinguish the guarded defect after production arithmetic/flooring.
4. PRODUCT_OR_SPEC_MISMATCH — a valid, distinguishable production fixture executes and the observed native result violates the reconciled contract.
5. PASS — provenance is valid, the oracle is distinguishable, and all native/cardinality/reload assertions hold.

Do not use NOT_REACHABLE to hide an invalid fixture, and do not use FIXTURE_INSUFFICIENT after an observable contract mismatch.

## Execution handoff

When execution resumes:
1. source-prove the production entrypoint for the selected lane;
2. capture persisted fixture provenance before action;
3. run the native counterfactual admissibility check before treating the row as acceptance-capable;
4. execute exactly one legal action;
5. capture native evidence and reload persistence;
6. emit one verdict using the precedence above.

This document is preparation authority only. It does not invoke Cursor and does not convert any unexecuted row into PASS.
