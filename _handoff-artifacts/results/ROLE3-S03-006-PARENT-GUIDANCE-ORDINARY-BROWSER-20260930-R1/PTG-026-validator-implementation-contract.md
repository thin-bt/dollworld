# PTG-026 validator implementation contract

state: GPT_ONLY_VALIDATOR_IMPLEMENTATION_CONTRACT_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 deterministic PTG evidence-bundle validator implementation handoff
source-lineage: thin-bt/dollworld master
base-authority: PTG-024 blob 02113e8de2fa5399329bf2910d679dc695435daa; PTG-025 blob 412d94adaf22192d2747f7210882a85af601d59f
depends-on: PTG-018-fixture-provenance-and-verdict-contract.md; PTG-023-attempt-to-lane-verdict-aggregation.md; PTG-024-acceptance-evidence-bundle-schema.json; PTG-025-evidence-bundle-conformance-vectors.md; PTG-029-neutral-factor-assertion-migration-contract.md

## Purpose

This contract turns PTG-024 and PTG-025 into an implementation boundary. It fixes input parsing, pure validation phases, deterministic failure selection, arithmetic comparison, output shape, and exit behavior before executable work resumes.

Schema success alone is never acceptance PASS. Only a complete STRUCTURE + IDENTITY + ATTEMPT_SEMANTICS + AGGREGATION validation may return VALID.

This is GPT-only preparation authority. It does not execute Cursor, browser, or runtime acceptance.

## Pure API boundary

The implementation must expose an in-memory pure entrypoint equivalent to:

```ts
type ValidationContext = {
  schemaBytes: Uint8Array;
  expectedSchemaBlob: string;
  productionArithmetic: ProductionArithmeticVerifier;
  nowIso: string;
};

type ValidationReport = {
  result: "VALID" | "STRUCTURAL_REJECT" | "SEMANTIC_REJECT";
  firstFailureCode: string | null;
  diagnostics: Diagnostic[];
  schemaBlob: string;
  bundleDigest: string;
  attemptCount: number;
  laneSummaryCount: number;
};

validateEvidenceBundle(inputBytes: Uint8Array, context: ValidationContext): ValidationReport;
```

The function performs no file writes, network access, repository access, wall-clock reads, random generation, fixture mutation, or product execution. File/CLI adapters may call it but must not alter its result.

## Byte ingestion

Before ordinary JSON parsing:

1. require strict UTF-8 decoding;
2. require exactly one JSON root value followed only by JSON whitespace;
3. reject duplicate object member names at every nesting level before a normal parser can discard them;
4. reject non-object roots;
5. retain the original bytes for `bundleDigest` and diagnostics.

Map malformed encoding, syntax, truncation, and trailing bytes to `STR_JSON_SYNTAX`. Map any duplicate key to `STR_DUPLICATE_JSON_KEY`, even when duplicate values are identical.

Do not normalize, repair, coerce, or silently drop fields before PTG-024 validation.

## Schema authority

- Hash the exact supplied schema bytes and require blob identity `02113e8de2fa5399329bf2910d679dc695435daa` through the repository handoff adapter. The pre-migration blob `014c20f07fa0b501febaa0795a8d6e4414dd5037` is not admissible for new acceptance bundles.
- Validate Draft 2020-12 semantics, including `if`/`then`, `const`, `propertyNames`, and local `$ref` resolution.
- Disable remote `$ref` retrieval. PTG-024 contains only local references.
- Preserve every schema diagnostic with instance JSON pointer, schema pointer, and keyword.
- Convert PTG-025 S01-S13 patterns to their named `STR_*` codes. If no specialized structural code matches, use `STR_SCHEMA_VIOLATION`.

Specialized mapping takes priority over the fallback. When multiple schema errors exist, choose the first code using PTG-025 deterministic failure priority, then lexicographically by instance pointer, schema pointer, and keyword.

## Identity indexes

After structure succeeds, build immutable maps:

- attemptId -> attempt;
- lane + currentProductSha -> lane summary;
- lane + productSha -> all ordinary candidate attempts;
- lane + productSha -> all synthetic non-candidates.

Reject repeated attemptId before comparing record bytes. Identical duplicates are still `SEM_DUPLICATE_ATTEMPT_ID`; differing duplicates additionally emit an immutability diagnostic, but the first code remains determined by PTG-025 priority.

Every referenced attemptId must resolve exactly once. Do not create placeholder attempts for missing references.

## Exact arithmetic

The validator must not use floating-point tolerance, `Number.EPSILON`, rounded UI deltas, or string-to-number coercion.

The production arithmetic verifier receives the recorded native inputs and returns integer native-unit results for:

- EXPECTED_SINGLE;
- every counterfactual required by the scenario;
- the observed native applied value after production flooring/cap semantics.

Use exact integers or BigInt for native milli-points, remainders, factors, intermediate products, and flooring boundaries. Reject values outside the implementation's exact integer domain instead of rounding them.

For weekly PASS:

1. recomputed EXPECTED_SINGLE equals recorded EXPECTED_SINGLE;
2. recomputed counterfactuals equal their recorded values;
3. EXPECTED_SINGLE differs from every scenario-relevant counterfactual;
4. observedAppliedMilliPoints equals EXPECTED_SINGLE exactly.

Failure order is counterfactual collision before observed/expected mismatch when both apply.

Scenario relevance is normative:

- PTG-014A-S1 compares PTG_DOUBLE;
- PTG-014A-S2 compares FORMAL_LEAK;
- PTG-014A-S3 requires count=0 and resolved factor=10000; diagnostic DISCIPLE_DOUBLE, when supplied, must equal EXPECTED_SINGLE and must not trigger collision rejection;
- PTG-016-S1 requires a persisted non-neutral factor, A16-ARITH-01, and EXPECTED_SINGLE != DISCIPLE_DOUBLE.

## Attempt semantics

Validate each attempt in stable attemptId byte order.

For ordinary attempts:

- selected teacher must equal biological parent where the scenario requires parent guidance;
- recorded relation/cardinality/disciple shape must match the exact scenario;
- assertion IDs must equal the PTG-024 scenario set;
- retired A14-ARITH-03 is structurally ineligible for migrated attempts and summaries;
- failedAssertionIds must be empty for PASS and a subset of the scenario assertion set otherwise;
- child/week/target/reason in native application evidence must match attempt identity;
- weekly PASS requires application count=1 and reload count=1;
- reload relation, mentorship, and discipleCount must preserve the required invariant;
- explicit teach must not add mentorship or increment discipleCount;
- PTG-014A-S3 must preserve count=0 and resolved factor=10000 before action, after action, and after reload;
- PTG-016 must prove its compared attempt exists, uses the same productSha, isolates the disciple factor, derives the non-neutral factor through an ordinary persisted transition, and closes A16-ARITH-01 only when exact once/twice results differ.

Never trust boolean claims such as `teacherFactorUnchanged` without comparing their referenced source evidence.
Direct edits to discipleCount, factor, mentorship, relation, or sidecar state are `SEM_DIRECT_STATE_EDIT`, not legal fixture construction.

## Candidate inventory and aggregation

For each summary, derive rather than trust:

- complete same-lane/same-product ordinary candidateAttemptIds;
- synthetic non-candidate IDs;
- mismatch attempt IDs;
- assertion closure eligibility;
- open assertions;
- terminal blockers;
- laneState and finalVerdict.

Compare each derived value with the supplied summary. Omission of an unfavorable ordinary attempt is `SEM_CANDIDATE_INVENTORY_INCOMPLETE`.

Apply the same-product mismatch guard before PASS closure. A valid PRODUCT_OR_SPEC_MISMATCH candidate on the current product SHA forces the derived final verdict to PRODUCT_OR_SPEC_MISMATCH and cannot be hidden by another PASS attempt.

Keep summaries for different product SHAs independent. Never use newer-product evidence to repair an older summary.

## Deterministic failure selection

Stop phase advancement after the first failing phase, but collect all diagnostics within that phase. Select `firstFailureCode` using this order:

1. JSON syntax and duplicate-key failures;
2. PTG-024 structural failures;
3. attempt identity uniqueness and reference existence;
4. synthetic and product-SHA isolation;
5. provenance and scenario/assertion binding;
6. native arithmetic admissibility;
7. exactly-once and reload persistence;
8. candidate completeness and mismatch guard;
9. assertion closure completeness;
10. final verdict precedence.

Within one priority level, sort by diagnostic JSON pointer, then code.

Map migrated neutral-factor cases deterministically:

- retired A14-ARITH-03 in a new bundle -> `STR_RETIRED_ASSERTION_ID`;
- unequal or recomputation-inconsistent count-zero DISCIPLE_DOUBLE -> `SEM_COUNT_ZERO_ARITHMETIC_MISMATCH`;
- direct state editing used to manufacture a non-neutral comparison -> `SEM_DIRECT_STATE_EDIT`.

## Output and diagnostics

Each diagnostic contains:

- code;
- phase: STRUCTURE | IDENTITY | ATTEMPT_SEMANTICS | AGGREGATION;
- instancePointer;
- relatedAttemptIds sorted uniquely;
- relatedAssertionIds in canonical PTG order;
- message containing no timestamps or nondeterministic values;
- sourceAuthority reference.

`bundleDigest` is SHA-256 of the original input bytes. Diagnostic order must be stable for identical bytes and context. `nowIso` may appear only in an outer execution record, never in failure selection or `bundleDigest`.

## CLI adapter

If a CLI is implemented, use:

- exit 0: VALID;
- exit 1: STRUCTURAL_REJECT or SEMANTIC_REJECT;
- exit 2: validator configuration/internal failure, including unavailable pinned schema or arithmetic verifier failure.

Exit 2 is not evidence that the product passed or failed. Print one JSON report to stdout; operational logging goes to stderr and must not change the report.

## Conformance gate

Before the validator may assess acceptance evidence:

1. execute every PTG-025 V01-V06, S01-S13, M01-M20, and ND-01-ND-06 vector;
2. require expected class and first failure code for all 45 vectors;
3. run every vector twice and require byte-identical normalized reports after excluding the outer execution timestamp;
4. prove no network call, product mutation, or evidence rewrite occurs;
5. record validator product SHA and canonical PTG-024/PTG-025 blobs.

A validator with 44/45 vectors passing is not admissible.

## Handoff boundary

When implementation resumes, implement the byte-safe parser, pinned-schema structural stage, semantic verifier, and aggregation derivation in that order. Do not connect the validator to acceptance reporting until all 45 conformance vectors pass twice with byte-identical normalized reports. No schema-only success, illustrative arithmetic, or execution error may be reported as PTG product PASS.
