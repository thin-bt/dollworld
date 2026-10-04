import {
  multiplyBasisPointsFloor,
  resolveWeeklyStatGrowthProjection,
  type WeeklyStatGrowthFactorBreakdown,
  type WeeklyStatGrowthProjection,
} from "@shared-world/simulation-core";

export type ProductionStatGrowthInputs = {
  baseMilliPointsPerTraining: number;
  surfaceBefore: number;
  remainderBefore: number;
  factorBreakdown: WeeklyStatGrowthFactorBreakdown;
  formalLeakFactorValue: number;
};

export type ProductionArithmeticEvidence = {
  preActionNativeBase: number;
  preActionRemainder: number;
  resolvedTeacherFactorValue: number;
  resolvedDiscipleFactorValue: number;
  productionInputs: ProductionStatGrowthInputs;
};

export type ProductionArithmeticProjection = {
  projection: WeeklyStatGrowthProjection;
  EXPECTED_SINGLE: number;
  PTG_DOUBLE: number;
  FORMAL_LEAK: number;
  DISCIPLE_DOUBLE: number;
  neutralDiscipleIdentity: boolean;
};

export type ProductionArithmeticFailureCode =
  | "SEM_NATIVE_ARITHMETIC_INPUT_INVALID"
  | "SEM_FIXTURE_INSUFFICIENT"
  | "CFG_PRODUCTION_ARITHMETIC_FAILURE";

export type ProductionArithmeticResult =
  | { ok: true; value: ProductionArithmeticProjection }
  | {
      ok: false;
      code: ProductionArithmeticFailureCode;
      instancePointer: string;
      message: string;
    };

const FACTOR_KEYS = [
  "growthPotentialFactor",
  "ageFactor",
  "currentValueFactor",
  "teacherFactor",
  "discipleCountFactor",
  "fatigueFactor",
  "injuryFactor",
  "motivationFactor",
  "rngFactor",
] as const satisfies readonly (keyof WeeklyStatGrowthFactorBreakdown)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)
  );
}

function invalid(instancePointer: string, message: string): ProductionArithmeticResult {
  return {
    ok: false,
    code: "SEM_NATIVE_ARITHMETIC_INPUT_INVALID",
    instancePointer,
    message,
  };
}

function readInteger(
  record: Record<string, unknown>,
  key: string,
  pointer: string,
  maximum = Number.MAX_SAFE_INTEGER,
): number | ProductionArithmeticResult {
  const value = record[key];
  if (!isNonNegativeSafeInteger(value) || value > maximum) {
    return invalid(pointer, `${key} must be a non-negative safe integer within its domain`);
  }
  return value;
}

function isFailure(
  value: number | ProductionArithmeticResult,
): value is ProductionArithmeticResult {
  return typeof value !== "number";
}

/**
 * Recompute PTG weekly arithmetic from captured native inputs. The ordinary
 * projection calls the same simulation-core helper as applyTrainStat; appended
 * counterfactuals call the same exact one-final-floor multiplication primitive.
 */
export function resolveProductionArithmetic(evidence: unknown): ProductionArithmeticResult {
  if (!isRecord(evidence)) {
    return invalid("", "weekly arithmetic evidence must be an object");
  }
  if (!isRecord(evidence.productionInputs)) {
    return invalid("/productionInputs", "productionInputs must be an object");
  }
  const inputs = evidence.productionInputs;
  if (!isRecord(inputs.factorBreakdown)) {
    return invalid("/productionInputs/factorBreakdown", "factorBreakdown must be an object");
  }

  const preActionNativeBase = readInteger(evidence, "preActionNativeBase", "/preActionNativeBase");
  if (isFailure(preActionNativeBase)) return preActionNativeBase;
  const preActionRemainder = readInteger(
    evidence,
    "preActionRemainder",
    "/preActionRemainder",
    999,
  );
  if (isFailure(preActionRemainder)) return preActionRemainder;
  const resolvedTeacherFactorValue = readInteger(
    evidence,
    "resolvedTeacherFactorValue",
    "/resolvedTeacherFactorValue",
  );
  if (isFailure(resolvedTeacherFactorValue)) return resolvedTeacherFactorValue;
  const resolvedDiscipleFactorValue = readInteger(
    evidence,
    "resolvedDiscipleFactorValue",
    "/resolvedDiscipleFactorValue",
  );
  if (isFailure(resolvedDiscipleFactorValue)) return resolvedDiscipleFactorValue;

  const baseMilliPointsPerTraining = readInteger(
    inputs,
    "baseMilliPointsPerTraining",
    "/productionInputs/baseMilliPointsPerTraining",
  );
  if (isFailure(baseMilliPointsPerTraining)) return baseMilliPointsPerTraining;
  const surfaceBefore = readInteger(inputs, "surfaceBefore", "/productionInputs/surfaceBefore", 99);
  if (isFailure(surfaceBefore)) return surfaceBefore;
  const remainderBefore = readInteger(
    inputs,
    "remainderBefore",
    "/productionInputs/remainderBefore",
    999,
  );
  if (isFailure(remainderBefore)) return remainderBefore;
  const formalLeakFactorValue = readInteger(
    inputs,
    "formalLeakFactorValue",
    "/productionInputs/formalLeakFactorValue",
  );
  if (isFailure(formalLeakFactorValue)) return formalLeakFactorValue;

  const factorBreakdown = {} as WeeklyStatGrowthFactorBreakdown;
  for (const key of FACTOR_KEYS) {
    const factor = readInteger(
      inputs.factorBreakdown,
      key,
      `/productionInputs/factorBreakdown/${key}`,
    );
    if (isFailure(factor)) return factor;
    factorBreakdown[key] = factor;
  }

  const equalityChecks: readonly [number, number, string, string][] = [
    [
      preActionNativeBase,
      baseMilliPointsPerTraining,
      "/preActionNativeBase",
      "preActionNativeBase must equal productionInputs.baseMilliPointsPerTraining",
    ],
    [
      preActionRemainder,
      remainderBefore,
      "/preActionRemainder",
      "preActionRemainder must equal productionInputs.remainderBefore",
    ],
    [
      resolvedTeacherFactorValue,
      factorBreakdown.teacherFactor,
      "/resolvedTeacherFactorValue",
      "resolvedTeacherFactorValue must equal productionInputs.factorBreakdown.teacherFactor",
    ],
    [
      resolvedDiscipleFactorValue,
      factorBreakdown.discipleCountFactor,
      "/resolvedDiscipleFactorValue",
      "resolvedDiscipleFactorValue must equal productionInputs.factorBreakdown.discipleCountFactor",
    ],
  ];
  for (const [recorded, captured, pointer, message] of equalityChecks) {
    if (recorded !== captured) return invalid(pointer, message);
  }

  const projection = resolveWeeklyStatGrowthProjection({
    baseMilliPointsPerTraining,
    surfaceBefore,
    remainderBefore,
    factorBreakdown,
  });
  if (!projection.ok) {
    return {
      ok: false,
      code: "CFG_PRODUCTION_ARITHMETIC_FAILURE",
      instancePointer: projection.issues[0]?.path ?? "",
      message: projection.issues[0]?.message ?? "production projection failed",
    };
  }
  if (projection.value.capApplied) {
    return {
      ok: false,
      code: "SEM_FIXTURE_INSUFFICIENT",
      instancePointer: "/productionInputs/surfaceBefore",
      message: "weekly arithmetic fixture is surface-capped",
    };
  }

  const ordinaryFactors = FACTOR_KEYS.map((key) => factorBreakdown[key]);
  const counterfactualFactors = [
    ["PTG_DOUBLE", factorBreakdown.teacherFactor],
    ["FORMAL_LEAK", formalLeakFactorValue],
    ["DISCIPLE_DOUBLE", factorBreakdown.discipleCountFactor],
  ] as const;
  const counterfactuals = new Map<string, number>();
  for (const [name, appendedFactor] of counterfactualFactors) {
    const result = multiplyBasisPointsFloor(baseMilliPointsPerTraining, [
      ...ordinaryFactors,
      appendedFactor,
    ]);
    if (!result.ok) {
      return {
        ok: false,
        code: "CFG_PRODUCTION_ARITHMETIC_FAILURE",
        instancePointer: "",
        message: `${name} recomputation failed: ${result.issues[0]?.message ?? "unknown error"}`,
      };
    }
    counterfactuals.set(name, result.value);
  }

  const discipleDouble = counterfactuals.get("DISCIPLE_DOUBLE");
  if (discipleDouble === undefined) {
    throw new Error("DISCIPLE_DOUBLE counterfactual was not computed");
  }

  return {
    ok: true,
    value: {
      projection: projection.value,
      EXPECTED_SINGLE: projection.value.appliedMilliPoints,
      PTG_DOUBLE: counterfactuals.get("PTG_DOUBLE")!,
      FORMAL_LEAK: counterfactuals.get("FORMAL_LEAK")!,
      DISCIPLE_DOUBLE: discipleDouble,
      neutralDiscipleIdentity:
        factorBreakdown.discipleCountFactor === 10000 &&
        discipleDouble === projection.value.appliedMilliPoints,
    },
  };
}
