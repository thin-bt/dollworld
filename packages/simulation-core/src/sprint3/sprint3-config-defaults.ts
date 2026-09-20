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
