# PTG-029 neutral-factor assertion migration contract

state: GPT_ONLY_ASSERTION_MIGRATION_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: coordinated PTG-014A / PTG-016 assertion and validator-contract migration
source-lineage: thin-bt/dollworld master
source-base-commit: d316c1565cc91915e1ee887b493ea6acad7743fd
supersedes-on-conflict: PTG-014 count-zero DISCIPLE_DOUBLE inequality; PTG-020 A14-ARITH-03 mapping; PTG-022 A14-ARITH-03 closure; PTG-023 8/3/3 assertion partition; PTG-024 old assertion enum and lane sets; PTG-025 illustrative unequal count-zero DISCIPLE_DOUBLE; PTG-026 39-vector gate
depends-on: PTG-028-neutral-disciple-counterfactual-reconciliation.md

## Purpose

PTG-028 proved that a count-zero disciple factor of `10000` cannot distinguish one application from two. This migration contract replaces the unsatisfiable assertion without reducing total acceptance coverage.

The total catalog remains fourteen assertions:

- PTG-014A changes from eight to seven assertions;
- PTG-015 remains three assertions;
- PTG-016 changes from three to four assertions;
- the removed `A14-ARITH-03` is replaced by `A16-ARITH-01` on a legal non-neutral disciple fixture.

This document is the canonical conflict-resolution authority until each referenced artifact is updated and read back from `master`. It does not itself make the old PTG-024 schema safe for acceptance.

## Migrated assertion catalog

### PTG-014A: seven required assertions

1. `A14-PROV-01`: ordinary PTG fixture provenance is source-backed.
2. `A14-ARITH-01`: PTG teacher factor participates exactly once and EXPECTED_SINGLE differs from PTG_DOUBLE.
3. `A14-NATIVE-01`: one native weekly application equals EXPECTED_SINGLE.
4. `A14-PERSIST-01`: reload preserves the required PTG relation and native result evidence.
5. `A14-ARITH-02`: no formal teacher contribution leaks into the PTG path and EXPECTED_SINGLE differs from FORMAL_LEAK.
6. `A14-REL-01`: exactly one temporary-guidance relation exists and no formal relation exists.
7. `A14-DISC-01`: persisted discipleCount remains zero, resolves the neutral factor `10000`, and is unchanged after action and reload.

`A14-DISC-01` is a state-resolution and persistence assertion. It must not claim arithmetic distinguishability between one and two neutral factors.

### PTG-015: three unchanged required assertions

1. `A15-PROV-01`;
2. `A15-TEACH-01`;
3. `A15-WEEKLY-01`.

### PTG-016: four required assertions

1. `A16-PROV-01`: both compared fixtures derive from ordinary persisted production transitions.
2. `A16-ISO-01`: teacher factor and all guarded non-disciple inputs are fixed while the persisted disciple factor differs.
3. `A16-ARITH-01`: on a source-proven non-neutral disciple factor, EXPECTED_SINGLE differs from DISCIPLE_DOUBLE after production one-floor arithmetic.
4. `A16-NATIVE-01`: each observed native result equals its own EXPECTED_SINGLE and the legal fixture pair distinguishes the disciple-factor contrast.

## Exact lane sets

| Lane | Required assertion IDs | Count |
| --- | --- | ---: |
| PTG-014A | A14-PROV-01; A14-ARITH-01; A14-NATIVE-01; A14-PERSIST-01; A14-ARITH-02; A14-REL-01; A14-DISC-01 | 7 |
| PTG-015 | A15-PROV-01; A15-TEACH-01; A15-WEEKLY-01 | 3 |
| PTG-016 | A16-PROV-01; A16-ISO-01; A16-ARITH-01; A16-NATIVE-01 | 4 |

The union contains fourteen unique IDs. `A14-ARITH-03` is retired and must not occur in new attempt assertion sets, lane required sets, closure maps, or open-assertion lists.

## Scenario mapping

| Scenario | Exact assertion IDs | Arithmetic requirement |
| --- | --- | --- |
| PTG-014A-S1 | A14-PROV-01; A14-ARITH-01; A14-NATIVE-01; A14-PERSIST-01 | EXPECTED_SINGLE and PTG_DOUBLE |
| PTG-014A-S2 | A14-ARITH-02; A14-REL-01 | EXPECTED_SINGLE and FORMAL_LEAK |
| PTG-014A-S3 | A14-DISC-01 | resolved factor must equal 10000; no DISCIPLE_DOUBLE inequality |
| PTG-015-S1 | A15-PROV-01; A15-TEACH-01 | explicit-teach/cardinality evidence |
| PTG-015-S2 | A15-WEEKLY-01 | formal weekly native evidence |
| PTG-016-S1 | A16-PROV-01; A16-ISO-01; A16-ARITH-01; A16-NATIVE-01 | non-neutral EXPECTED_SINGLE and DISCIPLE_DOUBLE |
| ADAPTER-S1 | empty | synthetic non-candidate only |

PTG-016-S1 must use a persisted disciple-count factor other than `10000`. Under the current canonical Sprint3 brackets, legal representative boundaries are:

| Persisted count | Factor |
| ---: | ---: |
| 4 | 9200 |
| 7 | 8200 |
| 11 | 7000 |
| 21 | 5500 |
| 41 | 4000 |

Counts 1 through 3 are not suitable because their factor is also neutral `10000`.

## PTG-024 schema migration

The next PTG-024 update must be atomic and must perform all of the following:

1. replace `A14-ARITH-03` with `A16-ARITH-01` in the global assertion enum;
2. remove `A14-ARITH-03` from PTG-014A attempt and lane enums;
3. add `A16-ARITH-01` to PTG-016 attempt and lane enums;
4. change PTG-014A-S3 exact `assertionIds` to `["A14-DISC-01"]`;
5. remove the PTG-014A-S3 structural requirement for `DISCIPLE_DOUBLE`;
6. change PTG-016-S1 exact `assertionIds` to include `A16-ARITH-01`;
7. require `DISCIPLE_DOUBLE` for PTG-016-S1;
8. change PTG-014A lane `requiredAssertionIds`, closure property names, open IDs, and FINAL closure requirement to the seven-ID set;
9. change the equivalent PTG-016 structures to the four-ID set;
10. preserve the empty ADAPTER-S1 assertion set and all anti-synthetic constraints.

After the schema changes, its new blob SHA must replace `014c20f07fa0b501febaa0795a8d6e4414dd5037` everywhere the validator pins PTG-024. The old blob must remain rejected for post-migration acceptance.

## PTG-020 / PTG-022 / PTG-023 migration

PTG-020 must:

- redefine PTG-014A-S3 as neutral-factor state and persistence verification;
- remove the distinguishable-fixture/product-mismatch claim from that scenario;
- add `A16-ARITH-01` to PTG-016-S1 with a non-neutral legal fixture.

PTG-022 must:

- retire the A14-ARITH-03 row;
- rewrite A14-DISC-01 closure as count-zero resolution and persistence, not arithmetic exactly-once proof;
- add an A16-ARITH-01 row requiring persisted non-neutral factor provenance, EXPECTED_SINGLE, DISCIPLE_DOUBLE, and exact inequality.

PTG-023 must:

- replace the 8/3/3 partition with 7/3/4;
- reject retired assertion IDs in new closure records;
- leave historical immutable attempts readable but ineligible to close the migrated lane when they use the old set.

## PTG-025 conformance migration

The valid seed must no longer state an unequal count-zero DISCIPLE_DOUBLE. For count-zero PTG records, either omit the field when the migrated schema permits it or record the exact identity `DISCIPLE_DOUBLE = EXPECTED_SINGLE` only as diagnostic input.

Retain V01-V06, S01-S13, and M01-M20, adapting their assertion sets to this contract. Add the six PTG-028 neutral-factor vectors:

| ID | Required expected behavior |
| --- | --- |
| ND-01 | Multiple count-zero bases prove exact EXPECTED_SINGLE = DISCIPLE_DOUBLE. |
| ND-02 | Unequal recorded count-zero DISCIPLE_DOUBLE is rejected as inconsistent arithmetic/config evidence. |
| ND-03 | Old PTG-014A FINAL/PASS closure using A14-ARITH-03 is rejected after migration. |
| ND-04 | A legal non-neutral factor produces distinct once/twice exact results. |
| ND-05 | Directly edited count/sidecar evidence is rejected. |
| ND-06 | No legal non-neutral fixture yields NOT_REACHABLE, never PASS. |

The migrated conformance gate contains 45 vectors:

- 6 valid;
- 13 structural rejects;
- 20 semantic rejects;
- 6 neutral-factor migration vectors.

All 45 must pass twice with byte-identical normalized reports.

## Failure and compatibility rules

- An old bundle containing `A14-ARITH-03` is historical evidence, not migrated PASS evidence.
- An old bundle claiming unequal count-zero DISCIPLE_DOUBLE must fail exact recomputation.
- A migrated PTG-014A bundle must not be rejected merely because a diagnostic count-zero DISCIPLE_DOUBLE equals EXPECTED_SINGLE.
- A migrated PTG-016 bundle with neutral factor `10000` cannot close A16-ARITH-01; use NOT_REACHABLE or another ordinary fixture.
- A migrated PTG-016 bundle with a non-neutral factor but no ordinary provenance fails A16-PROV-01.
- A schema/validator pair using different assertion catalogs is configuration failure and CLI exit 2, not a product verdict.

## Publication order

To avoid a partially migrated acceptance stack, publish and read back in this order:

1. PTG-014 and PTG-020 scenario/assertion semantics;
2. PTG-022 crosswalk and PTG-023 aggregation sets;
3. PTG-024 schema;
4. PTG-025 vectors;
5. PTG-026 pinned schema blob and 45-vector gate;
6. final cross-artifact consistency evidence.

No intermediate state may assess product acceptance. Publication commits may be separate, but acceptance remains disabled until the final consistency evidence proves the entire set agrees.

## Cross-artifact validation

The final migration evidence must mechanically prove:

- fourteen unique assertion IDs across lane sets;
- lane counts exactly 7/3/4;
- every scenario's assertion set is an exact subset of its lane;
- the scenario union equals its lane required set;
- A14-ARITH-03 occurs only in historical/supersession prose;
- A16-ARITH-01 occurs in PTG-020, PTG-022, PTG-023, PTG-024, PTG-025, and PTG-026;
- PTG-014A-S3 does not require DISCIPLE_DOUBLE;
- PTG-016-S1 does require DISCIPLE_DOUBLE and a non-neutral factor;
- PTG-026 pins the migrated PTG-024 blob;
- the validator gate count is 45.

## Completion boundary

PTG-029 fixes the migration target and precedence. The acceptance stack remains implementation-blocked until the referenced artifacts are actually updated in order and the final consistency evidence is canonical.

Cursor, browser acceptance, runtime implementation, and product verdict generation remain out of scope.
