/**
 * Canonical Sprint3Config default body (S3-SPEC-0.3.0-draft §2 / docs/SPEC.md enrollment & 門下人数係数).
 */
import {
  MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
  SPRINT3_CONFIG_SCHEMA_VERSION,
  SPRINT3_CONFIG_VERSION_DEFAULT,
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
