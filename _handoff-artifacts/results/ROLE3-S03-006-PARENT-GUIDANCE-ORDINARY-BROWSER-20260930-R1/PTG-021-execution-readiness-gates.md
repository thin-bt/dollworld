# PTG-021 execution readiness gates

state: GPT_ONLY_EXECUTION_READINESS_GATES_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG ordinary-flow pre-execution gates and evidence closure
source-lineage: thin-bt/dollworld master
depends-on: PTG-018-fixture-provenance-and-verdict-contract.md; PTG-019-acceptance-evidence-record-schema.md; PTG-020-acceptance-scenario-matrix.md

## Purpose

This document makes the GPT-only preparation boundary explicit: when execution resumes, no PTG acceptance action is consumed until its source provenance, semantic shape, arithmetic oracle, and evidence sink are ready. It does not claim runtime or browser PASS.

## Gate order

Run these gates in order for every PTG-020 scenario. A failed earlier gate stops the row; do not continue to obtain a more convenient verdict.

| gate | proof required before advancing | failure classification |
|---|---|---|
| G0 product identity | exact product SHA and canonical scenario/assertion IDs recorded in a new PTG-019 attempt | PRECONDITION_FAILED if identity/evidence record cannot be bound |
| G1 source provenance | fixture derives from the lane-specific ordinary production entrypoint; no forbidden direct edits or synthetic replacement | PRECONDITION_FAILED for wrong semantic shape; NOT_REACHABLE only when the required legal production transition itself cannot be reached |
| G2 persisted semantic shape | relation kind, biological parent/teacher identity, mentorship cardinality, formal/temporary counts and discipleCount match the scenario | PRECONDITION_FAILED |
| G3 native input capture | pre-action base/remainder, teacher factor, disciple factor and every production arithmetic input needed to recompute the result are captured before action | PRECONDITION_FAILED; do not consume the action |
| G4 oracle admissibility | EXPECTED_SINGLE and every guarded defect counterfactual are recomputed with production flooring/cap semantics and are distinguishable | FIXTURE_INSUFFICIENT |
| G5 evidence sink | native application identity/count and post-action persistence can be captured without replacing the production path | NOT_REACHABLE if the required production evidence path is genuinely unavailable |
| G6 single legal action | execute only the action named by PTG-020 for this attempt | valid distinguishable mismatch -> PRODUCT_OR_SPEC_MISMATCH |
| G7 reload persistence | reload/re-read once; prove no duplicate application and required relation/cardinality/disciple invariants persist | valid distinguishable mismatch -> PRODUCT_OR_SPEC_MISMATCH |
| G8 verdict closure | one PTG-019 verdict with assertion IDs and source evidence references | PASS only if all mandatory assertions hold |

## Lane-specific readiness

### PTG-014A
Before G6:
- consume the PTG-017 persisted initial ordinary parent_temporary_guidance fixture;
- teacher is the biological parent;
- no formal relation is injected;
- choose an uncapped legal stat/week where each counterfactual required by the selected PTG-020 row survives flooring;
- preserve the same fixture provenance across A14-PROV-01 and the row-specific arithmetic assertion.

Do not reuse one consumed weekly action to claim a second arithmetic row unless the native evidence independently proves the second oracle on that same production action.

### PTG-015
Before explicit teach:
- use a separate child;
- prove the first ordinary enrollment directly persisted parent_master_disciple;
- capture mentorship/discipleCount immediately before explicit teach.

After explicit teach, capture the cardinalities before any weekly action. PTG-015-S2 requires its own native weekly evidence; successful explicit-teach cardinality alone cannot satisfy A15-WEEKLY-01.

### PTG-016
Before comparison:
- both sides must be source-proven legal persisted formal states;
- disciple-count contrast must arise only from legal production transitions;
- teacher factor and every guarded non-disciple arithmetic input must be fixed or explicitly normalized by the production contract;
- if a legal matched pair cannot be constructed, classify NOT_REACHABLE rather than editing discipleCount.

## Attempt isolation

Each consumed action belongs to exactly one PTG-019 attemptId. Failed, insufficient, or mismatching attempts remain immutable evidence. A replacement fixture starts a new attemptId and cannot overwrite the earlier verdict.

Synthetic adapter coverage may continue under ADAPTER-S1, but its record must carry syntheticAdapterReplacement=true and cannot close PTG-014A, PTG-015, or PTG-016.

## PASS closure checklist

A PASS row requires, in one attempt:
1. product SHA and assertion IDs;
2. source-proven lane provenance;
3. required persisted semantic shape;
4. complete pre-action native inputs;
5. distinguishable same-semantics counterfactuals;
6. exactly one matching native application;
7. observed native result equal to EXPECTED_SINGLE;
8. lane-specific relation/cardinality/disciple invariants;
9. one reload proving persistence without a second application;
10. PTG-019 verdict and source evidence references.

If any required item is absent, do not report PASS. Apply PTG-018 precedence and preserve the attempt.

## Handoff boundary

GPT-only preparation is ready when PTG-018 through PTG-021 are readable from canonical master. Runtime/browser execution remains intentionally deferred while Cursor execution is paused. No unexecuted scenario is converted to PASS by this document.
