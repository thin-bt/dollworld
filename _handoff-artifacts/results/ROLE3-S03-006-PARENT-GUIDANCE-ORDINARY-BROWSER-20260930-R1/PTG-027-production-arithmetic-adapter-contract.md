# PTG-027 production arithmetic adapter contract

state: GPT_ONLY_SOURCE_RECONCILIATION_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: Sprint3 PTG evidence-validator production arithmetic adapter
source-lineage: thin-bt/dollworld master
source-base-commit: 4a28144bedbfa59ca916d73cfe7225c908d5ad11
depends-on: PTG-014-executable-test-plan.md; PTG-018-fixture-provenance-and-verdict-contract.md; PTG-024-acceptance-evidence-bundle-schema.json; PTG-025-evidence-bundle-conformance-vectors.md; PTG-026-validator-implementation-contract.md

## Purpose

This contract reconciles the PTG validator arithmetic boundary with the production Sprint1/Sprint3 weekly-training source. It fixes what `observedAppliedMilliPoints` means, which production factor slots participate, how each defect counterfactual is derived, and how the validator avoids creating a second arithmetic implementation.

This is GPT-only preparation authority. It does not execute Cursor, browser acceptance, or product mutation.

## Reviewed production authority

| Concern | Master path | Blob | Source-backed conclusion |
| --- | --- | --- | --- |
| PTG teacher-factor selection | `packages/simulation-core/src/sprint3/resolve-weekly-parent-temporary-guidance.ts` | `f0bf8192c8375370a293a82f553969f72cb89f14` | `parent_temporary_guidance` selects `parentTemporaryGuidanceFactorTenThousandths`; formal relations stay on the Sprint1 teacher-key path; disallowed PTG fails closed. |
| Disciple-factor selection | `packages/simulation-core/src/sprint3/resolve-weekly-disciple-count-teaching-efficiency.ts` | `05699d4199d57fee9845aa2ab11c8e7a591970b5` | Count zero resolves to `10000`; positive counts resolve through exactly one inclusive configured bracket; uncovered or invalid counts fail closed. |
| Weekly application | `packages/simulation-core/src/sprint1/weekly-training-effects.ts` | `496769f393828c5b4954ba11f2a9c7e2c9b452cb` | `applyTrainStat` resolves nine factors, performs one final floor, emits the raw gain as `appliedMilliPoints`, then applies remainder and surface-cap projection. |
| Shared exact multiplication | `packages/simulation-core/src/sprint1/multiply-basis-points.ts` | `7727a78ee24a6a017ba025b6f862992612029fa3` | `multiplyBasisPointsFloor` uses BigInt, divides once by `10000^N`, and rejects unsafe inputs/results. |
| Weekly PTG coverage | `packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts` | `27e73e196b34e28f373784a2cec2cbc128e5684c` | Production tests cover PTG selection, formal-path preservation, disallowed configuration, and weekly entrypoint binding. |
| Disciple-efficiency coverage | `packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts` | `560135644386489c8cd2916da94454b4a0ac5e0d` | Production tests cover zero neutrality, bracket boundaries, single application, event payload, and persisted remainder. |
| Current validator implementation | `apps/simulator/src/ptg-evidence-validator/parse-evidence-json.ts` | `51fb969b235df760d7a2f8d45864220ed1ca553d` | The validator currently has a strict byte/duplicate-key parser, but no production arithmetic adapter. |

## Canonical production arithmetic

The weekly stat-growth factor vector is ordered and labeled as follows:

1. `growthPotentialFactor`;
2. `ageFactor`;
3. `currentValueFactor`;
4. `teacherFactor`;
5. `discipleCountFactor`;
6. `fatigueFactor`;
7. `injuryFactor`;
8. `motivationFactor`;
9. `rngFactor`.

Let `B` be `config.growth.baseMilliPointsPerTraining`, and let `F` contain those nine basis-point integers. Production computes:

`rawGain = floor(B * product(F) / 10000^9)`

through `multiplyBasisPointsFloor(B, F)`. Per-factor flooring, floating-point tolerance, percent conversion, and UI-value comparison are forbidden.

Production then computes, in this order:

```text
accumulated = remainderBefore + rawGain
surfaceGain = min(floor(accumulated / 1000), 100 - surfaceBefore)
surfaceAfter = surfaceBefore + surfaceGain
remainderAfter = accumulated % 1000
```

The emitted `weekly_train_stat` payload sets `appliedMilliPoints = rawGain`. It does not replace that field with `surfaceGain * 1000`, and it does not subtract milli-points hidden by the surface cap.

Therefore the PTG-024 fields have these meanings:

| Evidence field | Production meaning |
| --- | --- |
| `preActionNativeBase` | `baseMilliPointsPerTraining`; it does not include the carried remainder. |
| `preActionRemainder` | The target stat's carried milli-point remainder before the action. |
| `EXPECTED_SINGLE` | The raw one-floor gain using the ordinary production nine-slot vector. |
| `observedAppliedMilliPoints` | The native event payload's raw `appliedMilliPoints`. |

## Required semantic shape of `productionInputs`

PTG-024 deliberately leaves `productionInputs` structurally open. The semantic arithmetic stage must require exactly the following arithmetic members for weekly attempts:

```ts
type ProductionStatGrowthInputs = {
  baseMilliPointsPerTraining: number;
  surfaceBefore: number;
  remainderBefore: number;
  factorBreakdown: {
    growthPotentialFactor: number;
    ageFactor: number;
    currentValueFactor: number;
    teacherFactor: number;
    discipleCountFactor: number;
    fatigueFactor: number;
    injuryFactor: number;
    motivationFactor: number;
    rngFactor: number;
  };
  formalLeakFactorValue: number;
};
```

Every numeric member above must be a non-negative safe integer and must not be negative zero. `surfaceBefore` must be an integer in `0..99`; `remainderBefore` must be an integer in `0..999`. The validator must reject a weekly PASS candidate that lacks any member, contains a mismatched duplicate of a top-level recorded value, or contains an arithmetic input outside the exact domain.

The following equality checks are mandatory before recomputation:

- `preActionNativeBase === productionInputs.baseMilliPointsPerTraining`;
- `preActionRemainder === productionInputs.remainderBefore`;
- `resolvedTeacherFactorValue === productionInputs.factorBreakdown.teacherFactor`;
- `resolvedDiscipleFactorValue === productionInputs.factorBreakdown.discipleCountFactor`.

`resolvedTeacherFactorKey` is provenance, not a substitute for the recorded numeric factor.

## One shared production helper

The validator must not copy the multiplication, remainder, or cap formula from `applyTrainStat`.

Before wiring the adapter, extract an exported pure simulation-core helper equivalent to:

```ts
type WeeklyStatGrowthProjection = {
  appliedMilliPoints: number;
  accumulatedMilliPoints: number;
  surfaceGain: number;
  surfaceAfter: number;
  remainderAfter: number;
  capApplied: boolean;
};

resolveWeeklyStatGrowthProjection(input: ProductionStatGrowthInputs):
  ValidationResult<WeeklyStatGrowthProjection>;
```

`applyTrainStat` and the evidence validator must both call that helper. The helper must continue to call the existing `multiplyBasisPointsFloor`; it must not introduce another BigInt formula. RNG drawing, draft mutation, event construction, and catalog/mastery behavior remain outside the helper.

Until both callers share the helper, production-arithmetic verification is not admissible for PTG acceptance.

## Factor-vector counterfactuals

All counterfactuals start from the captured production input and keep `B`, remainder, surface value, target, RNG factor, and every non-target factor unchanged.

| Result | Factor-vector transformation |
| --- | --- |
| `EXPECTED_SINGLE` | Use the ordinary nine-slot vector unchanged. |
| `PTG_DOUBLE` | Append one additional factor equal to the captured PTG `teacherFactor`. |
| `FORMAL_LEAK` | Append one additional factor equal to `formalLeakFactorValue`; do not replace the PTG teacher slot. |
| `DISCIPLE_DOUBLE` | Append one additional factor equal to the captured `discipleCountFactor`. |

Each transformed vector is passed to the same shared one-floor production helper/multiplication primitive. An appended factor also appends one `10000` scale divisor; multiplying a numerator without extending the denominator is forbidden.

For PTG-014A the ordinary teacher slot must be the PTG factor and the ordinary disciple slot must be the count-zero factor `10000`. `formalLeakFactorValue` must be source-proven from the formal teacher factor that the scenario guards against; the validator must not infer it from a display label.

## Cap and fixture admissibility

PTG-014 requires an uncapped target stat. The adapter must nevertheless compute the production projection and require `capApplied === false` before a weekly candidate can close PASS.

Counterfactual distinction is evaluated on raw native `appliedMilliPoints`, because that is the production event field asserted by `A14-NATIVE-01` and `A16-NATIVE-01`. The adapter must also require the recorded pre-action surface/remainder to reproduce the post-action projection used by persistence evidence. A capped candidate is `FIXTURE_INSUFFICIENT`, not product PASS or product arithmetic failure.

The current PTG-024 schema does not type the required members inside `productionInputs`. This is intentional at the structural layer; PTG-027 makes them mandatory semantic inputs. A later schema revision may close them structurally, but the validator must not wait for that revision.

## Failure classification

Use these deterministic semantic failures before ordinary observed/expected mismatch:

1. missing, non-integral, negative-zero, unsafe, or contradictory arithmetic input -> `SEM_NATIVE_ARITHMETIC_INPUT_INVALID`;
2. production shared helper failure -> validator internal/configuration failure and CLI exit 2, unless the failure was caused by evidence-domain input already classified above;
3. capped fixture -> `SEM_FIXTURE_INSUFFICIENT`;
4. any required raw counterfactual equals `EXPECTED_SINGLE` -> `SEM_COUNTERFACTUAL_COLLISION`;
5. recorded counterfactual differs from recomputed value -> `SEM_COUNTERFACTUAL_RECOMPUTE_MISMATCH`;
6. `observedAppliedMilliPoints !== EXPECTED_SINGLE` -> `SEM_OBSERVED_EXPECTED_MISMATCH`.

Never classify the absence of the adapter or a shared-helper exception as evidence that the product passed or failed.

## Source-parity test plan

The implementation gate must add tests that prove:

1. the extracted helper and `applyTrainStat` produce identical `appliedMilliPoints`, surface value, and remainder for the same fixed input/RNG;
2. the nine-factor order and values in the event payload equal the adapter input;
3. PTG selection resolves `7500` from the validated Sprint3 default while formal relations retain the Sprint1 teacher-key factor;
4. disciple count zero resolves `10000`, and representative positive bracket boundaries match production;
5. the fixed one-floor regression `base=500`, factors `[6500, 9000, 11500]` remains `336`;
6. all three appended-factor counterfactuals use one final floor and a matching extra denominator scale;
7. a deliberately capped fixture is classified insufficient even when its raw event gain is arithmetically correct;
8. unsafe integers, negative zero, missing factor members, and top-level/`productionInputs` contradictions fail closed;
9. all PTG-025 V01-V06, S01-S13, and M01-M20 vectors still return their pinned class and first code twice byte-identically.

## Change boundary when execution resumes

Expected implementation touch points are limited to:

- a pure shared weekly stat-growth projection module under `packages/simulation-core/src/sprint1/`;
- the existing `applyTrainStat` call site and focused production tests;
- a production-arithmetic adapter and tests under `apps/simulator/src/ptg-evidence-validator/`;
- the simulation-core public export required by the simulator workspace package.

Do not change balance values, mentorship reachability, RNG generation, canonical acceptance verdicts, or browser fixtures as part of this extraction. Do not report completion until both production and validator callers use the same helper and the full validator conformance gate is green.
