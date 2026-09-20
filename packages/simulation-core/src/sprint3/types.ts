import type { CareerStatus, LifeStatus, Rank } from "../enums.js";
import type {
  MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
  MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
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

/** Balance-tuning numeric gates live in config only (S3-SPEC §2.3 / S03-002). */
export type MasterQualificationEligibilityThresholds = {
  minimumRetirementRank: Rank;
  minimumOfficialWins: number;
  minimumLimitedOfficialWins: number;
  minimumTournamentTitles: number;
};

export type Sprint3MasterQualificationConfigDeferred = {
  evaluationPolicyVersion: typeof MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED;
};

export type Sprint3MasterQualificationConfigWithThresholds = {
  evaluationPolicyVersion: typeof MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS;
  eligibilityThresholds: MasterQualificationEligibilityThresholds;
};

export type Sprint3MasterQualificationConfig =
  Sprint3MasterQualificationConfigDeferred | Sprint3MasterQualificationConfigWithThresholds;

/** Pure evaluation input at retirement boundary (processor wiring in later slices). */
export type MasterQualificationEvaluationRecord = {
  careerStatus: CareerStatus;
  lifeStatus: LifeStatus;
  retirementRank?: Rank;
  highestRank: Rank;
  officialWins: number;
  limitedOfficialWins: number;
  tournamentTitles: number;
};

export type MasterQualificationEvaluationOutcome = {
  eligible: boolean;
  reasons: readonly string[];
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
