# PTG-028 neutral disciple counterfactual reconciliation

state: GPT_ONLY_CANONICAL_CONTRADICTION_RECONCILIATION_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG-014A-S3 / A14-ARITH-03 neutral-factor contradiction
source-lineage: thin-bt/dollworld master
source-base-commit: 2b8341c6100303f9b10cc189a80caceb0375a40d
depends-on: PTG-014-executable-test-plan.md; PTG-020-acceptance-scenario-matrix.md; PTG-022-verdict-closure-crosswalk.md; PTG-023-attempt-to-lane-verdict-aggregation.md; PTG-024-acceptance-evidence-bundle-schema.json; PTG-025-evidence-bundle-conformance-vectors.md; PTG-026-validator-implementation-contract.md; PTG-027-production-arithmetic-adapter-contract.md

## Decision

`PTG-014A-S3` as currently written is not satisfiable by any legal fixture.

The scenario fixes persisted `discipleCount=0`, production resolves that count to the neutral factor `10000`, and the `DISCIPLE_DOUBLE` counterfactual applies the same factor one additional time with one additional basis-points denominator. The result is identically equal to `EXPECTED_SINGLE` for every legal base, remainder, target stat, RNG value, and set of other factors.

Therefore:

- no fixture search can make `EXPECTED_SINGLE != DISCIPLE_DOUBLE` true;
- `A14-ARITH-03` cannot close under the current PTG-014A-S3 definition;
- PTG-014A lane PASS must remain unavailable while the assertion is still mandatory;
- implementations must not invent a non-production formula, omit the added denominator, change the persisted count, or misclassify the identity as a product defect;
- the exactly-once disciple-factor arithmetic check must move to a source-proven non-neutral formal-disciple fixture, preferably the PTG-016 isolation lane.

This is a specification contradiction, not runtime evidence that the product passed or failed.

## Source proof

| Authority | Blob | Relevant fact |
| --- | --- | --- |
| `packages/simulation-core/src/sprint3/resolve-weekly-disciple-count-teaching-efficiency.ts` | `05699d4199d57fee9845aa2ab11c8e7a591970b5` | `discipleCount === 0` returns `BASIS_POINTS_SCALE`, which is `10000`. |
| `packages/simulation-core/src/sprint1/multiply-basis-points.ts` | `7727a78ee24a6a017ba025b6f862992612029fa3` | N factors use one exact BigInt division by `10000^N`; appending a factor appends one denominator scale. |
| `packages/simulation-core/src/sprint1/weekly-training-effects.ts` | `496769f393828c5b4954ba11f2a9c7e2c9b452cb` | The resolved disciple factor occupies one member of the nine-factor stat-growth vector. |
| `packages/simulation-core/src/sprint3/sprint3-config-defaults.ts` | `b38efeb6b1e91e9627fb38515d22ba0cab07610e` | Non-neutral legal positive-count factors are `9200`, `8200`, `7000`, `5500`, and `4000`; the 1..3 bracket is also neutral `10000`. |
| `PTG-014-executable-test-plan.md` | `c9951b4e717baf1b63f1fc795d8f9b0869c2a6a7` | Requires count zero and defines DISCIPLE_DOUBLE as one additional application of the resolved factor. |
| `PTG-020-acceptance-scenario-matrix.md` | `3cbd6645fe925f804743f9e83e9206eaa1526165` | PTG-014A-S3 simultaneously requires persisted count zero and EXPECTED_SINGLE != DISCIPLE_DOUBLE. |
| `PTG-024-acceptance-evidence-bundle-schema.json` | `014c20f07fa0b501febaa0795a8d6e4414dd5037` | Makes `DISCIPLE_DOUBLE`, `A14-ARITH-03`, and `A14-DISC-01` mandatory for PTG-014A-S3 and for final PTG-014A closure. |
| `PTG-025-evidence-bundle-conformance-vectors.md` | `de33d4b3517e01b465b2705cb16316662836fe19` | Uses illustrative `DISCIPLE_DOUBLE=135` beside count zero, explicitly noting that the illustrative numbers do not define production arithmetic. |

## Algebraic proof

Let:

- `B` be the non-negative integer native base;
- `P` be the exact product of every ordinary production factor, including one disciple factor `10000`;
- `k` be the ordinary number of factors;
- `D = 10000^k`.

Then:

`EXPECTED_SINGLE = floor(B * P / D)`

The current counterfactual appends another resolved count-zero factor and another scale divisor:

`DISCIPLE_DOUBLE = floor(B * P * 10000 / (D * 10000))`

Exact cancellation gives:

`DISCIPLE_DOUBLE = floor(B * P / D) = EXPECTED_SINGLE`

Remainder and surface cap cannot break this identity because PTG native counterfactual comparison is made on raw `appliedMilliPoints` before those projection steps. Even if compared after projection, identical raw gain with identical pre-action remainder and surface value yields identical projection.

## Independently checked numeric witness

Using a production-shaped vector with base `500`, PTG teacher factor `7500`, count-zero disciple factor `10000`, and every other factor `10000`:

| Calculation | Exact raw result |
| --- | ---: |
| EXPECTED_SINGLE | 375 |
| PTG_DOUBLE (`7500` appended) | 281 |
| FORMAL_LEAK (`13000` appended) | 487 |
| DISCIPLE_DOUBLE (`10000` appended) | 375 |

The disciple equality is exact; changing the base or other factors cannot alter it.

## Affected canonical contracts

The following current requirements must be treated as contradictory until revised:

| Artifact | Required correction |
| --- | --- |
| PTG-014 | Replace count-zero DISCIPLE_DOUBLE distinguishability with a non-neutral, source-proven exactly-once test. |
| PTG-020 | Mark PTG-014A-S3 impossible as written; move the arithmetic inequality to the non-neutral disciple isolation scenario. |
| PTG-022 | Do not allow A14-ARITH-03 to close from count-zero arithmetic. |
| PTG-023 | PTG-014A cannot reach FINAL/PASS while the contradictory assertion remains required. |
| PTG-024 | Remove or supersede PTG-014A-S3's mandatory DISCIPLE_DOUBLE inequality binding; add the replacement binding to the selected non-neutral scenario. |
| PTG-025 | Replace the illustrative count-zero DISCIPLE_DOUBLE value with the exact identity and add a contradiction/replacement conformance vector. |
| PTG-026 | Exclude neutral-factor identity from collision rejection and surface it as a pinned specification contradiction. |
| PTG-027 | Apply the neutral-factor correction recorded in this reconciliation. |

## Corrective scenario design

Preserve two separate claims instead of forcing both into the count-zero PTG fixture.

### PTG temporary-guidance claim

The ordinary PTG fixture continues to prove:

- persisted `parent_temporary_guidance` relation;
- selected teacher is the biological parent;
- PTG teacher factor is applied exactly once;
- formal teacher contribution does not leak;
- persisted discipleCount remains zero;
- resolved count-zero disciple factor is `10000`;
- one native application and one reload-preserved result.

It must not claim arithmetic distinguishability between one and two neutral disciple factors.

### Non-neutral disciple exactly-once claim

Use independently reachable formal mentorship fixtures in PTG-016 with a persisted disciple count in a non-neutral bracket. Counts `4`, `7`, `11`, `21`, or `41` are boundary representatives for factors `9200`, `8200`, `7000`, `5500`, and `4000`.

For the selected legal fixture:

1. capture the persisted disciple count and resolved non-neutral factor;
2. hold teacher factor, target stat, base, remainder, RNG factor, and every other factor fixed;
3. compute EXPECTED_SINGLE with the factor once;
4. compute DISCIPLE_DOUBLE with that same non-neutral factor appended once and the denominator scale appended once;
5. require inequality after production one-floor arithmetic;
6. compare the native observed application with EXPECTED_SINGLE;
7. reject direct sidecar/count edits or synthetic fixture replacement.

If no ordinary source-proven fixture reaches a non-neutral bracket while preserving the isolation invariants, report `NOT_REACHABLE`; do not fall back to the neutral count-zero fixture.

## Validator behavior before upstream repair

Until PTG-014/020/022/023/024/025/026 are reconciled:

- the validator may parse and structurally inspect PTG-014A-S3 records;
- it must recompute count-zero DISCIPLE_DOUBLE as exactly equal to EXPECTED_SINGLE;
- it must not accept an unequal recorded value such as the illustrative PTG-025 value;
- it must not label the exact equality as a product counterfactual collision;
- it must return a deterministic specification-configuration blocker for attempted PTG-014A final closure;
- it must not emit PTG-014A PASS.

Recommended internal code: `CFG_NEUTRAL_DISCIPLE_COUNTERFACTUAL_UNSATISFIABLE`, mapped to CLI exit 2 because the acceptance contract is internally inconsistent. This code is validator configuration state, not an attempt verdict.

## Replacement conformance vectors

| ID | Input | Expected result |
| --- | --- | --- |
| ND-01 | count zero, factor 10000, ordinary and doubled vectors | exact EXPECTED_SINGLE = DISCIPLE_DOUBLE for multiple bases |
| ND-02 | recorded count-zero DISCIPLE_DOUBLE differs from recomputation | configuration/spec blocker; never VALID |
| ND-03 | attempted PTG-014A FINAL/PASS while A14-ARITH-03 retains inequality semantics | configuration/spec blocker; never attempt-level product mismatch |
| ND-04 | legal non-neutral factor 9200 applied once versus twice | distinct exact raw values using one final floor |
| ND-05 | non-neutral comparison created by direct discipleCount or sidecar edit | semantic reject as non-ordinary/synthetic evidence |
| ND-06 | non-neutral legal fixture unavailable | NOT_REACHABLE, lane not PASS |

Run each vector twice and require byte-identical normalized reports.

## Completion boundary

PTG-028 documents and proves the contradiction; it does not by itself rewrite every affected artifact or complete the validator implementation. A later canonical reconciliation must update the affected contracts consistently, then regenerate the aggregate required-assertion sets and conformance expectations.

Cursor, browser acceptance, and runtime mutation remain out of scope.
