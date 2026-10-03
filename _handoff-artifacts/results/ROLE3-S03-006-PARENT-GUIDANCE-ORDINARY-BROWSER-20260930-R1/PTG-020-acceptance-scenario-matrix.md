# PTG-020 acceptance scenario matrix

state: GPT_ONLY_ACCEPTANCE_SCENARIO_MATRIX_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG ordinary-flow acceptance scenario selection and stop conditions
source-lineage: thin-bt/dollworld master
depends-on: PTG-014-executable-test-plan.md; PTG-018-fixture-provenance-and-verdict-contract.md; PTG-019-acceptance-evidence-record-schema.md

## Purpose

This matrix turns the reconciled PTG acceptance contract into executable scenario choices without claiming execution PASS. It fixes which production lineage may satisfy each lane, which defect counterfactual must be distinguishable, and where execution must stop and classify instead of substituting synthetic evidence.

## Scenario matrix

| scenario | production fixture | action | guarded defect | mandatory native evidence | stop/classify |
|---|---|---|---|---|---|
| PTG-014A-S1 | PTG-017 persisted initial ordinary parent_temporary_guidance state | one legal weekly train_stat on an uncapped stat | PTG factor applied twice | EXPECTED_SINGLE vs PTG_DOUBLE; one weekly_train_stat application | invalid semantic shape -> PRECONDITION_FAILED; arithmetic collision -> FIXTURE_INSUFFICIENT |
| PTG-014A-S2 | same source-proven PTG fixture, selecting a legal stat/week whose arithmetic distinguishes formal contribution | one legal weekly train_stat | formal teacher contribution leaks into PTG | EXPECTED_SINGLE vs FORMAL_LEAK; selected teacher/relation provenance | no legal distinguishable fixture -> FIXTURE_INSUFFICIENT |
| PTG-014A-S3 | same source-proven PTG fixture with persisted discipleCount=0 | one legal weekly train_stat | disciple factor participates more than once | EXPECTED_SINGLE vs DISCIPLE_DOUBLE; persisted count and resolved factor | observed mismatch on valid distinguishable fixture -> PRODUCT_OR_SPEC_MISMATCH |
| PTG-015-S1 | separate child whose first ordinary enrollment directly persists parent_master_disciple | one legal explicit-teach operation | explicit teach duplicates mentorship or increments discipleCount again | mentorship/discipleCount before and after explicit teach | first-formal ordinary fixture cannot be reached -> NOT_REACHABLE |
| PTG-015-S2 | persisted result of PTG-015-S1 with unchanged formal relation | one subsequent legal weekly train_stat | explicit teach is incorrectly treated as proof/substitute for weekly factor application | native weekly application and production recomputation | missing native weekly evidence cannot become PASS |
| PTG-016-S1 | two source-proven legal formal states whose disciple-count contrast results only from persisted production transitions | matched legal weekly train_stat comparison | disciple-efficiency slot absent, duplicated, or contaminated by teacher-factor change | fixed teacher factor/non-disciple inputs; differing persisted disciple factor; distinguishable native results | legal contrast impossible while invariants hold -> NOT_REACHABLE |
| ADAPTER-S1 | manually injected second pending boundary after completed PTG | replacement/cardinality adapter exercise only | replacement mechanics regression | adapter/cardinality evidence | always SYNTHETIC_ADAPTER_REPLACEMENT; never ordinary-flow PASS |

## Selection rules

1. Start PTG-014A from the PTG-017 persisted state; do not reconstruct its mentorship or sidecars.
2. Compute same-flooring counterfactuals before consuming a weekly action as acceptance evidence. Prefer a legal uncapped target and non-zero remainder.
3. PTG-015 must use a separate child and a first ordinary enrollment that directly creates parent_master_disciple. A PTG child plus injected second pending enrollment is not a substitute.
4. PTG-016 may vary disciple efficiency only through legal persisted mentorship transitions. Direct discipleCount/sidecar edits invalidate the row.
5. Preserve one PTG-019 record per attempted row, including failed or insufficient attempts.

## Assertion IDs

PTG-014A-S1:
- A14-PROV-01: production provenance and required PTG semantic shape are intact.
- A14-ARITH-01: EXPECTED_SINGLE != PTG_DOUBLE after production flooring.
- A14-NATIVE-01: exactly one matching weekly_train_stat native application equals EXPECTED_SINGLE.
- A14-PERSIST-01: reload retains one application and unchanged mentorship/discipleCount.

PTG-014A-S2:
- A14-ARITH-02: EXPECTED_SINGLE != FORMAL_LEAK after production flooring.
- A14-REL-01: no formal teacher contribution is present in the PTG weekly result.

PTG-014A-S3:
- A14-ARITH-03: EXPECTED_SINGLE != DISCIPLE_DOUBLE after production flooring.
- A14-DISC-01: persisted count=0 factor participates exactly once.

PTG-015-S1/S2:
- A15-PROV-01: first ordinary enrollment directly created the formal parent relation.
- A15-TEACH-01: explicit teach changes neither mentorship cardinality nor discipleCount.
- A15-WEEKLY-01: subsequent weekly native application independently satisfies the formal weekly oracle.

PTG-016-S1:
- A16-PROV-01: both compared states derive from legal persisted production transitions.
- A16-ISO-01: teacher factor and guarded non-disciple inputs are fixed while disciple factor differs.
- A16-NATIVE-01: native results distinguish the legal count contrast after production flooring.

## Verdict discipline

Use PTG-018 precedence without reinterpretation:
PRECONDITION_FAILED -> NOT_REACHABLE -> FIXTURE_INSUFFICIENT -> PRODUCT_OR_SPEC_MISMATCH -> PASS.

A valid, source-proven and arithmetically distinguishable production fixture that reaches the guarded production path and violates an assertion is PRODUCT_OR_SPEC_MISMATCH. Do not downgrade it because another fixture might be easier.

## Execution handoff

When execution resumes, select the first legal scenario for the lane, open its PTG-019 attempt record, prove provenance, compute admissibility, execute at most the specified legal action, reload once, and emit one verdict. Synthetic adapter coverage remains separately labelled and cannot close any ordinary-flow acceptance row.

This document is GPT-only preparation authority. It does not invoke Cursor and does not claim browser or runtime PASS.
