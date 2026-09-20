import type {
  MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
  SPRINT3_CONFIG_SCHEMA_VERSION,
} from "./constants.js";

export type DiscipleCountFactorBracket = {
  minDisciplesInclusive: number;
  maxDisciplesInclusive: number;
  factorTenThousandths: number;
};

export type Sprint3EnrollmentConfig = {
  childhoodInfluenceMaxAge: number;
  formalEnrollmentMinAge: number;
  parentTemporaryGuidanceAllowed: boolean;
};

export type Sprint3TeachingEfficiencyConfig = {
  discipleCountFactorBrackets: readonly DiscipleCountFactorBracket[];
  parentTemporaryGuidanceFactorTenThousandths: number;
};

export type Sprint3MasterQualificationConfig = {
  evaluationPolicyVersion: typeof MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED;
};

/** Feature gates for later Sprint3 slices; S03-001 validates structure only. */
export type Sprint3MentorshipFeatureFlags = {
  explicitWeeklyTeachActionEnabled: boolean;
  enrollmentAssignmentAiEnabled: boolean;
};

export type Sprint3ConfigInput = {
  schemaVersion: typeof SPRINT3_CONFIG_SCHEMA_VERSION;
  configVersion: string;
  enrollment: Sprint3EnrollmentConfig;
  teachingEfficiency: Sprint3TeachingEfficiencyConfig;
  masterQualification: Sprint3MasterQualificationConfig;
  mentorshipFeatures: Sprint3MentorshipFeatureFlags;
};

export type Sprint3Config = Sprint3ConfigInput;

/** Mentorship relation kinds referenced from docs/SPEC.md §師匠資格と門下制度 (storage in later slices). */
export type MentorshipRelationKind =
  "formal_master_disciple" | "parent_master_disciple" | "parent_temporary_guidance";

/**
 * Boundary for explicit weekly `teach` (docs/specs/09-technique-system.md Sprint 3).
 * No planner/processor behavior in S03-001.
 */
export type ExplicitWeeklyTeachActionContract = {
  readonly actionKind: "teach";
  readonly enabledByConfig: false;
};
