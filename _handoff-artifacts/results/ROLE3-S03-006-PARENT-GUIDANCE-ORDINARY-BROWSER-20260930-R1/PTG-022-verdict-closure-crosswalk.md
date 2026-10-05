# PTG-022 verdict closure crosswalk

state: GPT_ONLY_VERDICT_CLOSURE_CROSSWALK_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG assertion-to-evidence closure and lane verdict derivation
source-lineage: thin-bt/dollworld master
base-authority: PTG-019 blob 335ae01aee100bb4e235ed7075db7b5f36e0a4b8; PTG-020 blob f0eec066fd78bd1a2b3ab26f4244e19d024890ac; PTG-021 blob ca7798a671d3c3124fccad7f076065e129643435
depends-on: PTG-018-fixture-provenance-and-verdict-contract.md; PTG-019-acceptance-evidence-record-schema.md; PTG-020-acceptance-scenario-matrix.md; PTG-021-execution-readiness-gates.md; PTG-029-neutral-factor-assertion-migration-contract.md

## Purpose

This document closes the gap between scenario design and an auditable lane verdict. Every PTG-020 assertion is mapped to its earliest blocking gate, evidence that must exist in one PTG-019 attempt, and the condition that closes the assertion. It is GPT-only preparation authority: it does not execute Cursor, browser, or runtime work and does not turn an unexecuted row into PASS.

## Assertion closure crosswalk

| assertion | scenario | earliest blocking gate | required same-attempt evidence | PASS closure |
|---|---|---|---|---|
| A14-PROV-01 | PTG-014A-S1 | G1 | PTG-017 fixture source; production entrypoint; biologicalParentId=selectedTeacherId; relationKind=parent_temporary_guidance; formalRelationCount=0; syntheticAdapterReplacement=false | Source-proven persisted PTG semantic shape is intact before action. |
| A14-ARITH-01 | PTG-014A-S1 | G4 | Native inputs; production flooring/cap semantics; EXPECTED_SINGLE; PTG_DOUBLE | EXPECTED_SINGLE differs from PTG_DOUBLE before the weekly action is consumed. |
| A14-NATIVE-01 | PTG-014A-S1 | G6 | action/request identity; matching native application identity/count; observedAppliedMilliPoints | Exactly one matching weekly_train_stat application occurs and equals EXPECTED_SINGLE. |
| A14-PERSIST-01 | PTG-014A-S1 | G7 | post-action and reload application counts; mentorship/relation/discipleCount before, after and reload | Reload retains one application and all required cardinalities without a second application. |
| A14-ARITH-02 | PTG-014A-S2 | G4 | Same-fixture native inputs; EXPECTED_SINGLE; FORMAL_LEAK; production flooring/cap semantics | EXPECTED_SINGLE differs from FORMAL_LEAK before action. |
| A14-REL-01 | PTG-014A-S2 | G6 | selected teacher/relation provenance; resolved teacher factor; observed native application | Observed weekly result equals EXPECTED_SINGLE and contains no formal-teacher contribution. |
| A14-DISC-01 | PTG-014A-S3 | G7 | persistedDiscipleCount=0 and resolvedFactor=10000 before action, after action, and after reload; observed native result; application count | Count 0 resolves to neutral factor 10000, remains unchanged through reload, and the one native result equals EXPECTED_SINGLE. |
| A15-PROV-01 | PTG-015-S1 | G1 | Separate child; first ordinary enrollment identity/outcome; persisted parent_master_disciple relation | The first ordinary enrollment directly creates the formal parent relation without injected pending state. |
| A15-TEACH-01 | PTG-015-S1 | G6 | mentorshipCount and discipleCount immediately before/after explicit teach and after reload | Explicit teach duplicates neither mentorship nor discipleCount and the invariant persists. |
| A15-WEEKLY-01 | PTG-015-S2 | G6 | Subsequent weekly action identity; complete native inputs/oracle; exactly-one application; reload | A separate subsequent weekly action independently equals the formal EXPECTED_SINGLE oracle and persists once. |
| A16-PROV-01 | PTG-016-S1 | G1 | Two fixture source references; legal transition identities; no direct counter/relation/sidecar edits | Both compared states derive only from legal persisted production transitions. |
| A16-ISO-01 | PTG-016-S1 | G4 | ComparisonAttemptId; equal teacher factor and guarded non-disciple inputs; differing persisted disciple factor | The legal pair isolates only the disciple-efficiency input under the production contract. |
| A16-ARITH-01 | PTG-016-S1 | G4 | selected persisted non-neutral disciple factor; production native inputs; EXPECTED_SINGLE; DISCIPLE_DOUBLE under identical flooring/cap semantics | The selected factor is not 10000 and EXPECTED_SINGLE differs from DISCIPLE_DOUBLE before either weekly action is consumed. |
| A16-NATIVE-01 | PTG-016-S1 | G6 | Both native calculations/results using identical flooring/cap semantics; exactly-one application per side | Native results distinguish the legal disciple-count contrast and each equals its expected oracle. |

## Attempt-level verdict derivation

Apply the PTG-018 precedence to each immutable attempt, stopping at the first applicable class:

1. PRECONDITION_FAILED: product identity, semantic shape, required pre-action inputs, or evidence binding is invalid or absent.
2. NOT_REACHABLE: the required legal production transition or native evidence path genuinely cannot be reached after valid preconditions.
3. FIXTURE_INSUFFICIENT: for an assertion that requires arithmetic distinction, the source-proven legal fixture reaches the path but EXPECTED_SINGLE is indistinguishable from its guarded defect counterfactual under the same production arithmetic semantics.
4. PRODUCT_OR_SPEC_MISMATCH: a valid, source-proven, distinguishable attempt reaches the production path and violates any required assertion.
5. PASS: every mandatory assertion for the attempt closes with the required same-attempt evidence.

Do not continue past an earlier blocking gate merely to obtain a later or more convenient verdict.

## Lane closure

- PTG-014A PASS requires all seven active A14 assertions closed. Multiple legal attempts may be used only when each assertion retains its own immutable PTG-019 evidence record and the lane summary references every contributing attempt; evidence fields may not be spliced into a synthetic attempt.
- PTG-015 PASS requires all three A15 assertions. Explicit-teach cardinality evidence cannot substitute for A15-WEEKLY-01 native weekly evidence.
- PTG-016 PASS requires all four A16 assertions from a legally constructed matched pair. If such a pair cannot be produced without direct edits, the lane is NOT_REACHABLE, not PASS.

## Anti-laundering rules

1. Never copy missing provenance, arithmetic, native-application, or reload evidence from another attemptId.
2. ADAPTER-S1 or any record with syntheticAdapterReplacement=true cannot close an ordinary-flow assertion.
3. Direct edits to discipleCount, mentorship, relation kind, enrollment outcome, or sidecars invalidate PTG-016 provenance and cannot manufacture a comparison pair.
4. An action consumed without G3/G4 evidence cannot be retroactively made PASS by recomputing an oracle afterward; preserve its non-PASS attempt and start a new legal attempt.
5. A later successful attempt does not delete, overwrite, or relabel an earlier verdict.
6. UI text, surface-stat deltas, or screenshots without the matching native application identity/count cannot close a native assertion.

## Evidence package closure

For each attempt, retain the PTG-019 record, source references, production product SHA, assertion IDs, native calculation inputs, counterfactuals, action identity, post-action state, reload state, and exactly one verdict. A lane summary may reference multiple immutable attempts, but it must state which attempt closes each assertion and must not claim lane PASS while any mandatory assertion remains open.

## Handoff boundary

When execution resumes, open a new PTG-019 attempt, run PTG-021 gates in order, execute at most the PTG-020 legal action for that attempt, and use this crosswalk to close assertions and derive the verdict. Until that evidence exists, status remains preparation-ready rather than acceptance PASS.
