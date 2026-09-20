/**
 * S03-005: map formal disciple count to Sprint3 teachingEfficiency brackets at weekly training boundary.
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { BASIS_POINTS_SCALE } from "../sprint1/basis-points.js";
import type { Sprint3TeachingEfficiencyConfig } from "./types.js";
import type { Sprint3Config } from "./types.js";

function requirePositiveDiscipleCount(discipleCount: number): ValidationResult<number> {
  if (
    typeof discipleCount !== "number" ||
    !Number.isInteger(discipleCount) ||
    Object.is(discipleCount, -0)
  ) {
    return failure([
      {
        path: "/discipleCount",
        message: "discipleCount must be a finite integer",
        actual: discipleCount,
        expected: "integer >= 0",
      },
    ]);
  }
  if (discipleCount < 0) {
    return failure([
      {
        path: "/discipleCount",
        message: "discipleCount must be non-negative",
        actual: discipleCount,
        expected: ">= 0",
      },
    ]);
  }
  return success(discipleCount);
}

export function isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled(
  config: Sprint3Config,
): boolean {
  return config.mentorshipFeatures.weeklyTrainingDiscipleCountTeachingEfficiencyEnabled === true;
}

export function selectDiscipleCountTeachingEfficiencyFactor(
  discipleCount: number,
  teachingEfficiency: Sprint3TeachingEfficiencyConfig,
): ValidationResult<number> {
  const countResult = requirePositiveDiscipleCount(discipleCount);
  if (!countResult.ok) {
    return countResult;
  }
  if (discipleCount === 0) {
    return success(BASIS_POINTS_SCALE);
  }
  for (const bracket of teachingEfficiency.discipleCountFactorBrackets) {
    if (
      discipleCount >= bracket.minDisciplesInclusive &&
      discipleCount <= bracket.maxDisciplesInclusive
    ) {
      return success(bracket.factorTenThousandths);
    }
  }
  return failure([
    {
      path: "/discipleCount",
      message: "no teachingEfficiency discipleCountFactorBracket matches discipleCount",
      actual: discipleCount,
      expected: "value covered by configured brackets",
    },
  ]);
}

