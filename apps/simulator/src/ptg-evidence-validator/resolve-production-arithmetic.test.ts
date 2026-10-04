import { describe, expect, it } from "vitest";
import { resolveProductionArithmetic } from "./resolve-production-arithmetic.js";

function evidence(discipleCountFactor = 10000) {
  return {
    preActionNativeBase: 500,
    preActionRemainder: 100,
    resolvedTeacherFactorValue: 7500,
    resolvedDiscipleFactorValue: discipleCountFactor,
    productionInputs: {
      baseMilliPointsPerTraining: 500,
      surfaceBefore: 10,
      remainderBefore: 100,
      formalLeakFactorValue: 13000,
      factorBreakdown: {
        growthPotentialFactor: 10000,
        ageFactor: 10000,
        currentValueFactor: 10000,
        teacherFactor: 7500,
        discipleCountFactor,
        fatigueFactor: 10000,
        injuryFactor: 10000,
        motivationFactor: 10000,
        rngFactor: 10000,
      },
    },
  };
}

describe("resolveProductionArithmetic", () => {
  it("recomputes the production projection and all appended-factor counterfactuals", () => {
    expect(resolveProductionArithmetic(evidence())).toEqual({
      ok: true,
      value: {
        projection: {
          appliedMilliPoints: 375,
          accumulatedMilliPoints: 475,
          surfaceGain: 0,
          surfaceAfter: 10,
          remainderAfter: 475,
          capApplied: false,
        },
        EXPECTED_SINGLE: 375,
        PTG_DOUBLE: 281,
        FORMAL_LEAK: 487,
        DISCIPLE_DOUBLE: 375,
        neutralDiscipleIdentity: true,
      },
    });
  });

  it("distinguishes a legal non-neutral disciple factor applied once and twice", () => {
    const result = resolveProductionArithmetic(evidence(9200));

    expect(result).toMatchObject({
      ok: true,
      value: {
        EXPECTED_SINGLE: 345,
        DISCIPLE_DOUBLE: 317,
        neutralDiscipleIdentity: false,
      },
    });
  });

  it("fails closed on missing, negative-zero, and contradictory captured inputs", () => {
    const missing = evidence();
    delete (
      missing.productionInputs.factorBreakdown as Partial<
        typeof missing.productionInputs.factorBreakdown
      >
    ).rngFactor;
    expect(resolveProductionArithmetic(missing)).toMatchObject({
      ok: false,
      code: "SEM_NATIVE_ARITHMETIC_INPUT_INVALID",
      instancePointer: "/productionInputs/factorBreakdown/rngFactor",
    });

    expect(resolveProductionArithmetic({ ...evidence(), preActionNativeBase: -0 })).toMatchObject({
      ok: false,
      code: "SEM_NATIVE_ARITHMETIC_INPUT_INVALID",
      instancePointer: "/preActionNativeBase",
    });

    expect(
      resolveProductionArithmetic({ ...evidence(), resolvedTeacherFactorValue: 10000 }),
    ).toMatchObject({
      ok: false,
      code: "SEM_NATIVE_ARITHMETIC_INPUT_INVALID",
      instancePointer: "/resolvedTeacherFactorValue",
    });
  });

  it("classifies a capped weekly fixture as insufficient, not product failure", () => {
    const capped = evidence();
    capped.productionInputs.surfaceBefore = 99;
    capped.productionInputs.remainderBefore = 900;
    capped.preActionRemainder = 900;
    capped.productionInputs.baseMilliPointsPerTraining = 2500;
    capped.preActionNativeBase = 2500;

    expect(resolveProductionArithmetic(capped)).toEqual({
      ok: false,
      code: "SEM_FIXTURE_INSUFFICIENT",
      instancePointer: "/productionInputs/surfaceBefore",
      message: "weekly arithmetic fixture is surface-capped",
    });
  });
});
