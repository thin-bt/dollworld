# PTG-030 neutral-factor migration consistency evidence

state: GPT_ONLY_MIGRATION_CONSISTENCY_VERIFIED
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: final cross-artifact verification of the PTG-029 assertion migration
source-lineage: thin-bt/dollworld master
depends-on: PTG-029-neutral-factor-assertion-migration-contract.md

## Purpose

This evidence records a fresh-read, machine-checked reconciliation of the migrated PTG-014, PTG-020, and PTG-022 through PTG-026 artifacts. It proves that the specification and validator handoff agree on the neutral-factor migration. It does not execute the validator, browser, runtime, or product acceptance scenarios and does not claim product PASS.

## Canonical readback set

| artifact | master blob |
|---|---|
| PTG-014 executable test plan | 4c857ea7c9733603ee8266e6341815090e3ce039 |
| PTG-020 acceptance scenario matrix | f0eec066fd78bd1a2b3ab26f4244e19d024890ac |
| PTG-022 verdict closure crosswalk | cec25a5f8eb6f5297562dd78f211cfa4fa31fef4 |
| PTG-023 lane aggregation contract | 7527581c42d8b0e59b02e9320bc41fea0bf8b847 |
| PTG-024 evidence bundle schema | 02113e8de2fa5399329bf2910d679dc695435daa |
| PTG-025 conformance vectors | 412d94adaf22192d2747f7210882a85af601d59f |
| PTG-026 validator contract | 2966bcc0b159cd3529f664e7206cd4d31c49fce3 |

## Machine-checked results

1. The PTG-024 assertion enum contains fourteen unique IDs.
2. Lane counts are exactly PTG-014A=7, PTG-015=3, PTG-016=4.
3. Scenario sets are exact:
   - PTG-014A-S1: 4;
   - PTG-014A-S2: 2;
   - PTG-014A-S3: 1;
   - PTG-015-S1: 2;
   - PTG-015-S2: 1;
   - PTG-016-S1: 4;
   - ADAPTER-S1: 0.
4. Each ordinary scenario set is a subset of its lane and each scenario union equals the lane required set.
5. Retired A14-ARITH-03 is absent from the PTG-024 enum, attempt sets, lane sets, closure map, and open-assertion sets. Remaining mentions in PTG-023, PTG-025, and PTG-026 are compatibility/rejection prose only.
6. A16-ARITH-01 is present in PTG-020, PTG-022, PTG-023, PTG-024, PTG-025, and PTG-026.
7. PTG-014A-S3 requires count=0, resolved factor=10000, unchanged count and factor after action and reload, and does not require DISCIPLE_DOUBLE.
8. PTG-016-S1 requires a non-neutral resolved factor, DISCIPLE_DOUBLE, and A16-ARITH-01.
9. PTG-025 contains exactly 6 V, 13 S, 20 M, and 6 ND vectors: 45 total.
10. PTG-026 pins PTG-024 blob 02113e8de2fa5399329bf2910d679dc695435daa and PTG-025 blob 412d94adaf22192d2747f7210882a85af601d59f.
11. PTG-026 requires all 45 vectors to pass twice with byte-identical normalized reports.

## Validation boundary

JSON parsing and migration-specific structural checks passed. A general Draft 2020-12 meta-schema validator was unavailable in the preparation environment, so full meta-schema conformance was not executed here. No conformance vector was executed because the validator implementation remains pending.

The specification migration is internally consistent and ready for validator implementation. Acceptance reporting remains blocked until the implementation uses the pinned schema, passes all 45 vectors twice, and produces real immutable attempt evidence.

## Handoff

When executable work resumes:

1. implement the byte-safe parser and pinned PTG-024 structural stage;
2. implement exact arithmetic and scenario-aware counterfactual relevance;
3. implement attempt semantics and deterministic lane aggregation;
4. execute all 45 PTG-025 vectors twice;
5. only then connect validated evidence to acceptance reporting.

Cursor remains intentionally unused.
