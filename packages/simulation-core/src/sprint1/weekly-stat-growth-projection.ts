import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { multiplyBasisPointsFloor } from "./multiply-basis-points.js";

const MILLI_POINTS_PER_SURFACE_POINT = 1000;

export type WeeklyStatGrowthFactorBreakdown = {
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

export type WeeklyStatGrowthProjectionInput = {
  baseMilliPointsPerTraining: number;
  surfaceBefore: number;
  remainderBefore: number;
  factorBreakdown: WeeklyStatGrowthFactorBreakdown;
};

export type WeeklyStatGrowthProjection = {
  appliedMilliPoints: number;
  accumulatedMilliPoints: number;
  surfaceGain: number;
  surfaceAfter: number;
  remainderAfter: number;
  capApplied: boolean;
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

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)
  );
}

/**
 * Resolve the native weekly stat-growth projection with production's exact
 * nine-factor, one-final-floor arithmetic. This function is pure and is shared
 * by the runtime mutation path and evidence verification adapters.
 */
export function resolveWeeklyStatGrowthProjection(
  input: WeeklyStatGrowthProjectionInput,
): ValidationResult<WeeklyStatGrowthProjection> {
  const issues: ValidationIssue[] = [];

  if (!isNonNegativeSafeInteger(input.baseMilliPointsPerTraining)) {
    issues.push({
      path: "/baseMilliPointsPerTraining",
      message: "baseMilliPointsPerTraining must be a non-negative safe integer",
      actual: input.baseMilliPointsPerTraining,
      expected: "safe integer >= 0",
    });
  }
  if (!isNonNegativeSafeInteger(input.surfaceBefore) || input.surfaceBefore > 100) {
    issues.push({
      path: "/surfaceBefore",
      message: "surfaceBefore must be a safe integer within 0..100",
      actual: input.surfaceBefore,
      expected: "safe integer 0..100",
    });
  }
  if (!isNonNegativeSafeInteger(input.remainderBefore) || input.remainderBefore > 999) {
    issues.push({
      path: "/remainderBefore",
      message: "remainderBefore must be a safe integer within 0..999",
      actual: input.remainderBefore,
      expected: "safe integer 0..999",
    });
  }

  const factors = FACTOR_KEYS.map((key) => input.factorBreakdown[key]);
  FACTOR_KEYS.forEach((key, index) => {
    const factor = factors[index];
    if (!isNonNegativeSafeInteger(factor)) {
      issues.push({
        path: `/factorBreakdown/${key}`,
        message: "weekly stat-growth factors must be non-negative safe integers",
        actual: factor,
        expected: "safe integer >= 0",
      });
    }
  });
  if (issues.length > 0) {
    return failure(issues);
  }

  const applied = multiplyBasisPointsFloor(input.baseMilliPointsPerTraining, factors);
  if (!applied.ok) {
    return failure(applied.issues);
  }
  const accumulatedMilliPoints = input.remainderBefore + applied.value;
  if (!Number.isSafeInteger(accumulatedMilliPoints)) {
    return failure([
      {
        path: "",
        message: "weekly stat-growth accumulation exceeds the safe-integer range",
        actual: String(accumulatedMilliPoints),
        expected: "safe integer",
      },
    ]);
  }

  const uncappedSurfaceGain = Math.floor(accumulatedMilliPoints / MILLI_POINTS_PER_SURFACE_POINT);
  const availableSurfaceGain = 100 - input.surfaceBefore;
  const surfaceGain = Math.min(uncappedSurfaceGain, availableSurfaceGain);

  return success({
    appliedMilliPoints: applied.value,
    accumulatedMilliPoints,
    surfaceGain,
    surfaceAfter: input.surfaceBefore + surfaceGain,
    remainderAfter: accumulatedMilliPoints % MILLI_POINTS_PER_SURFACE_POINT,
    capApplied: uncappedSurfaceGain > availableSurfaceGain,
  });
}
