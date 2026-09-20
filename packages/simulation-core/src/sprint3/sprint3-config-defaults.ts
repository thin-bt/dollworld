/**
 * Canonical Sprint3Config default body (S3-SPEC-0.3.0-draft §2 / docs/SPEC.md enrollment & 門下人数係数).
 */
import {
  MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
  MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
  SPRINT3_CONFIG_SCHEMA_VERSION,
  SPRINT3_CONFIG_VERSION_DEFAULT,
  MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
  SPRINT3_CONFIG_VERSION_ENROLLMENT,
  SPRINT3_CONFIG_VERSION_INTAKE,
  SPRINT3_CONFIG_VERSION_QUALIFICATION,
  SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
  SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
  SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
  WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
} from "./constants.js";
import type { Sprint3ConfigInput } from "./types.js";

export function createDefaultSprint3ConfigInput(): Sprint3ConfigInput {
  return {
    schemaVersion: SPRINT3_CONFIG_SCHEMA_VERSION,
    configVersion: SPRINT3_CONFIG_VERSION_DEFAULT,
    enrollment: {
      childhoodInfluenceMaxAge: 7,
      formalEnrollmentMinAge: 8,
      parentTemporaryGuidanceAllowed: true,
    },
    teachingEfficiency: {
      parentTemporaryGuidanceFactorTenThousandths: 7500,
      discipleCountFactorBrackets: [
        { minDisciplesInclusive: 1, maxDisciplesInclusive: 3, factorTenThousandths: 10000 },
        { minDisciplesInclusive: 4, maxDisciplesInclusive: 6, factorTenThousandths: 9200 },
        { minDisciplesInclusive: 7, maxDisciplesInclusive: 10, factorTenThousandths: 8200 },
        { minDisciplesInclusive: 11, maxDisciplesInclusive: 20, factorTenThousandths: 7000 },
        { minDisciplesInclusive: 21, maxDisciplesInclusive: 40, factorTenThousandths: 5500 },
        { minDisciplesInclusive: 41, maxDisciplesInclusive: 999_999, factorTenThousandths: 4000 },
      ],
    },
    masterQualification: {
      evaluationPolicyVersion: MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
    },
    mentorshipFeatures: {
      explicitWeeklyTeachActionEnabled: false,
      enrollmentAssignmentAiEnabled: false,
    },
  };
}

/** S03-002 canonical balance pack with config-held qualification thresholds (not code literals). */
export function createSprint3Balance020ConfigInput(): Sprint3ConfigInput {
  return {
    schemaVersion: SPRINT3_CONFIG_SCHEMA_VERSION,
    configVersion: SPRINT3_CONFIG_VERSION_QUALIFICATION,
    enrollment: {
      childhoodInfluenceMaxAge: 7,
      formalEnrollmentMinAge: 8,
      parentTemporaryGuidanceAllowed: true,
    },
    teachingEfficiency: {
      parentTemporaryGuidanceFactorTenThousandths: 7500,
      discipleCountFactorBrackets: [
        { minDisciplesInclusive: 1, maxDisciplesInclusive: 3, factorTenThousandths: 10000 },
        { minDisciplesInclusive: 4, maxDisciplesInclusive: 6, factorTenThousandths: 9200 },
        { minDisciplesInclusive: 7, maxDisciplesInclusive: 10, factorTenThousandths: 8200 },
        { minDisciplesInclusive: 11, maxDisciplesInclusive: 20, factorTenThousandths: 7000 },
        { minDisciplesInclusive: 21, maxDisciplesInclusive: 40, factorTenThousandths: 5500 },
        { minDisciplesInclusive: 41, maxDisciplesInclusive: 999_999, factorTenThousandths: 4000 },
      ],
    },
    masterQualification: {
      evaluationPolicyVersion: MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
      eligibilityThresholds: {
        minimumRetirementRank: "C",
        minimumOfficialWins: 0,
        minimumLimitedOfficialWins: 0,
        minimumTournamentTitles: 0,
      },
    },
    mentorshipFeatures: {
      explicitWeeklyTeachActionEnabled: false,
      enrollmentAssignmentAiEnabled: false,
    },
  };
}

/** S03-003 canonical balance pack with enrollment assignment AI gate enabled. */
export function createSprint3Balance030ConfigInput(): Sprint3ConfigInput {
  return {
    ...createSprint3Balance020ConfigInput(),
    configVersion: SPRINT3_CONFIG_VERSION_ENROLLMENT,
    mentorshipFeatures: {
      explicitWeeklyTeachActionEnabled: false,
      enrollmentAssignmentAiEnabled: true,
    },
  };
}

/** S03-004 canonical balance pack with autonomous per-master intake limit policy. */
export function createSprint3Balance040ConfigInput(): Sprint3ConfigInput {
  return {
    ...createSprint3Balance030ConfigInput(),
    configVersion: SPRINT3_CONFIG_VERSION_INTAKE,
    masterIntake: {
      evaluationPolicyVersion: MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
      limitFormula: {
        baseAutonomousMaxDisciples: 3,
        teachingAbilityBonusPerTenPoints: 1,
        massDiscipleToleranceBonusPerTenPoints: 2,
        successorOrientationPenaltyPerTenPoints: 1,
        minimumAutonomousMaxDisciples: 1,
        maximumAutonomousMaxDisciples: 40,
      },
      deferApplicantAptitudeThreshold: 80,
    },
  };
}

/** S03-005 canonical balance pack with weekly training teachingEfficiency binding. */
export function createSprint3Balance050ConfigInput(): Sprint3ConfigInput {
  return {
    ...createSprint3Balance040ConfigInput(),
    configVersion: SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
    mentorshipFeatures: {
      explicitWeeklyTeachActionEnabled: false,
      enrollmentAssignmentAiEnabled: true,
      weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true,
    },
  };
}

/** S03-006 canonical balance pack with parent temporary guidance weekly binding. */
export function createSprint3Balance060ConfigInput(): Sprint3ConfigInput {
  return {
    ...createSprint3Balance050ConfigInput(),
    configVersion: SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
    mentorshipFeatures: {
      explicitWeeklyTeachActionEnabled: false,
      enrollmentAssignmentAiEnabled: true,
      weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true,
      weeklyTrainingParentTemporaryGuidanceEnabled: true,
    },
  };
}

/** S03-007 canonical balance pack with explicit weekly teach action policy. */
export function createSprint3Balance070ConfigInput(): Sprint3ConfigInput {
  return {
    ...createSprint3Balance060ConfigInput(),
    configVersion: SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
    mentorshipFeatures: {
      explicitWeeklyTeachActionEnabled: true,
      enrollmentAssignmentAiEnabled: true,
      weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true,
      weeklyTrainingParentTemporaryGuidanceEnabled: true,
    },
    weeklyTeachAction: {
      evaluationPolicyVersion: WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
      evaluationWeights: {
        styleMatchMaxPoints: 25,
        requirementsMetMaxPoints: 20,
        trustAndCompatibilityMaxPoints: 20,
        tacticalNeedMaxPoints: 15,
        successionPriorityMaxPoints: 20,
        secrecyAndLoyaltyPenaltyMaxPoints: 40,
      },
      tierThresholds: {
        basic: { minimumCompositeScore: 30 },
        standard: { minimumCompositeScore: 45 },
        advanced: {
          minimumCompositeScore: 65,
          minimumTrustScore: 40,
          minimumMasterMasteryHundredths: 7000,
        },
        secret: {
          minimumCompositeScore: 85,
          minimumTrustScore: 70,
          minimumMasterMasteryHundredths: 8500,
        },
      },
      allocationFormula: {
        baseWeeklyTeachSlots: 1,
        teachingAbilityBonusPerTenPoints: 1,
        minimumWeeklyTeachSlots: 1,
        maximumWeeklyTeachSlots: 6,
      },
    },
  };
}
