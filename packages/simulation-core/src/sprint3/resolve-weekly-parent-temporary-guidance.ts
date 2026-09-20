/**
 * S03-006: parent temporary guidance teacher factor at weekly training boundary.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { selectTeacherGrowthFactor } from "../sprint1/growth-factor-selectors.js";
import type { Sprint1Config } from "../sprint1/types.js";
import type { WeeklyTrainingPersonRecord } from "../sprint1/weekly-training-types.js";
import {
  SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
  SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
} from "./constants.js";
import type {
  MentorshipRelationKind,
  Sprint3Config,
  Sprint3TeachingEfficiencyConfig,
} from "./types.js";
import { validateNormalizedSprint3Config } from "./validate-sprint3-config.js";
import { isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled } from "./resolve-weekly-disciple-count-teaching-efficiency.js";

export function isWeeklyTrainingParentTemporaryGuidanceEnabled(
  config: Sprint3Config,
): boolean {
  return config.mentorshipFeatures.weeklyTrainingParentTemporaryGuidanceEnabled === true;
}

export function isFormalMasterMentorshipRelationKind(
  kind: MentorshipRelationKind | undefined,
): boolean {
  return kind === "formal_master_disciple" || kind === "parent_master_disciple";
}

export function shouldApplyParentTemporaryGuidanceTeacherFactor(
  kind: MentorshipRelationKind | undefined,
): boolean {
  return kind === "parent_temporary_guidance";
}

export function selectParentTemporaryGuidanceTeacherFactor(
  teachingEfficiency: Sprint3TeachingEfficiencyConfig,
): ValidationResult<number> {
  const factor = teachingEfficiency.parentTemporaryGuidanceFactorTenThousandths;
  if (
    typeof factor !== "number" ||
    !Number.isInteger(factor) ||
    factor < 1 ||
    factor > 20_000
  ) {
    return failure([
      {
        path: "/teachingEfficiency/parentTemporaryGuidanceFactorTenThousandths",
        message: "parentTemporaryGuidanceFactorTenThousandths must be a validated integer in 1..20000",
        actual: factor,
        expected: "1..20000",
      },
    ]);
  }
  return success(factor);
}

export function selectWeeklyTrainingTeacherFactorBasisPoints(
  record: WeeklyTrainingPersonRecord,
  config: Sprint1Config,
  sprint3Config?: Sprint3Config,
): ValidationResult<number> {
  if (
    sprint3Config === undefined ||
    !isWeeklyTrainingParentTemporaryGuidanceEnabled(sprint3Config)
  ) {
    return selectTeacherGrowthFactor(record.teacherFactorKey, config);
  }
  if (isFormalMasterMentorshipRelationKind(record.mentorshipRelationKind)) {
    return selectTeacherGrowthFactor(record.teacherFactorKey, config);
  }
  if (shouldApplyParentTemporaryGuidanceTeacherFactor(record.mentorshipRelationKind)) {
    if (!sprint3Config.enrollment.parentTemporaryGuidanceAllowed) {
      return failure([
        {
          path: "/sprint3Config/enrollment/parentTemporaryGuidanceAllowed",
          message: "parent temporary guidance teacher factor requires enrollment.parentTemporaryGuidanceAllowed",
          actual: sprint3Config.enrollment.parentTemporaryGuidanceAllowed,
          expected: "true",
        },
      ]);
    }
    return selectParentTemporaryGuidanceTeacherFactor(sprint3Config.teachingEfficiency);
  }
  return selectTeacherGrowthFactor(record.teacherFactorKey, config);
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
  const discipleBindingEnabled = isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled(config);
  const parentGuidanceEnabled = isWeeklyTrainingParentTemporaryGuidanceEnabled(config);
  if (
    discipleBindingEnabled &&
    config.configVersion !== SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE &&
    config.configVersion !== SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY
  ) {
    return failure([
      {
        path: "/sprint3Config/configVersion",
        message:
          "weeklyTrainingDiscipleCountTeachingEfficiencyEnabled requires sprint3-balance-0.5.0 or sprint3-balance-0.6.0",
        actual: config.configVersion,
        expected: `${SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY}|${SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE}`,
      },
    ]);
  }
  if (
    parentGuidanceEnabled &&
    config.configVersion !== SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE
  ) {
    return failure([
      {
        path: "/sprint3Config/configVersion",
        message: "weeklyTrainingParentTemporaryGuidanceEnabled requires sprint3-balance-0.6.0",
        actual: config.configVersion,
        expected: SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
      },
    ]);
  }
  return success(config);
}
