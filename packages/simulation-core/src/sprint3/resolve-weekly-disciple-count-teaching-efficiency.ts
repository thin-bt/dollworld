/**
 * S03-005: map formal disciple count to Sprint3 teachingEfficiency brackets at weekly training boundary.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { BASIS_POINTS_SCALE } from "../sprint1/basis-points.js";
import { SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY } from "./constants.js";
import type { Sprint3Config, Sprint3TeachingEfficiencyConfig } from "./types.js";
import { validateNormalizedSprint3Config } from "./validate-sprint3-config.js";

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

export function validateWeeklyTrainingSprint3ConfigBinding(
  sprint3Config: unknown,
): ValidationResult<Sprint3Config | undefined> {
  if (sprint3Config === undefined) {
    return success(undefined);
  }
  const validated = validateNormalizedSprint3Config(sprint3Config);
  if (!validated.ok) {
    const issues: ValidationIssue[] = validated.issues.map((issue) => ({
      ...issue,
      path: issue.path === "" ? "/sprint3Config" : `/sprint3Config${issue.path}`,
    }));
    return failure(issues);
  }
  const config = validated.value;
  const enabled = isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled(config);
  if (enabled && config.configVersion !== SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY) {
    return failure([
      {
        path: "/sprint3Config/configVersion",
        message:
          "weeklyTrainingDiscipleCountTeachingEfficiencyEnabled requires sprint3-balance-0.5.0",
        actual: config.configVersion,
        expected: SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
      },
    ]);
  }
  return success(config);
}
