import type { TeacherCanTeachContext } from "../sprint1/technique-teacher.js";
import type { LearningTier } from "../sprint1/technique-enums.js";
import type { CareerStatus, LifeStatus, Rank } from "../enums.js";
import type { WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT } from "./constants.js";
import type {
  MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
  MASTER_INTAKE_EVALUATION_POLICY_DEFERRED,
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

/** Config-held weights for deterministic per-master max disciple count (S03-004). */
export type MasterIntakeLimitFormula = {
  baseAutonomousMaxDisciples: number;
  teachingAbilityBonusPerTenPoints: number;
  massDiscipleToleranceBonusPerTenPoints: number;
  successorOrientationPenaltyPerTenPoints: number;
  minimumAutonomousMaxDisciples: number;
  maximumAutonomousMaxDisciples: number;
};

export type Sprint3MasterIntakeConfigDeferred = {
  evaluationPolicyVersion: typeof MASTER_INTAKE_EVALUATION_POLICY_DEFERRED;
};

export type Sprint3MasterIntakeConfigAutonomousLimit = {
  evaluationPolicyVersion: typeof MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT;
  limitFormula: MasterIntakeLimitFormula;
  /** Applicant lineage aptitude at or above this yields defer (hold) instead of reject at limit. */
  deferApplicantAptitudeThreshold: number;
};

export type Sprint3MasterIntakeConfig =
  Sprint3MasterIntakeConfigDeferred | Sprint3MasterIntakeConfigAutonomousLimit;

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

/** Per-tier refusal thresholds (docs/SPEC.md §師匠が教える技の決定; config-held). */
export type WeeklyTeachTierThresholds = {
  minimumCompositeScore: number;
  minimumTrustScore?: number;
  minimumMasterMasteryHundredths?: number;
};

export type WeeklyTeachEvaluationWeights = {
  styleMatchMaxPoints: number;
  requirementsMetMaxPoints: number;
  trustAndCompatibilityMaxPoints: number;
  tacticalNeedMaxPoints: number;
  successionPriorityMaxPoints: number;
  secrecyAndLoyaltyPenaltyMaxPoints: number;
};

export type WeeklyTeachAllocationFormula = {
  baseWeeklyTeachSlots: number;
  teachingAbilityBonusPerTenPoints: number;
  minimumWeeklyTeachSlots: number;
  maximumWeeklyTeachSlots: number;
};

export type Sprint3WeeklyTeachActionConfig = {
  evaluationPolicyVersion: typeof WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT;
  evaluationWeights: WeeklyTeachEvaluationWeights;
  tierThresholds: Record<LearningTier, WeeklyTeachTierThresholds>;
  allocationFormula: WeeklyTeachAllocationFormula;
};

/** Feature gates for later Sprint3 slices; S03-001 validates structure only. */
export type Sprint3MentorshipFeatureFlags = {
  explicitWeeklyTeachActionEnabled: boolean;
  enrollmentAssignmentAiEnabled: boolean;
  /** S03-005: bind teachingEfficiency disciple brackets into weekly training outcomes. */
  weeklyTrainingDiscipleCountTeachingEfficiencyEnabled?: boolean;
  /** S03-006: bind parent temporary guidance teacher factor into weekly train_stat outcomes. */
  weeklyTrainingParentTemporaryGuidanceEnabled?: boolean;
};

export type Sprint3ConfigInput = {
  schemaVersion: typeof SPRINT3_CONFIG_SCHEMA_VERSION;
  configVersion: string;
  enrollment: Sprint3EnrollmentConfig;
  teachingEfficiency: Sprint3TeachingEfficiencyConfig;
  masterQualification: Sprint3MasterQualificationConfig;
  mentorshipFeatures: Sprint3MentorshipFeatureFlags;
  /** Present from sprint3-balance-0.4.0 (S03-004); omitted on earlier configVersion bodies. */
  masterIntake?: Sprint3MasterIntakeConfig;
  /** Present from sprint3-balance-0.7.0 (S03-007); omitted on earlier configVersion bodies. */
  weeklyTeachAction?: Sprint3WeeklyTeachActionConfig;
};

export type Sprint3Config = Sprint3ConfigInput;

/** Mentorship relation kinds referenced from docs/SPEC.md §師匠資格と門下制度 (storage in later slices). */
export type MentorshipRelationKind =
  "formal_master_disciple" | "parent_master_disciple" | "parent_temporary_guidance";

/**
 * Boundary for explicit weekly `teach` (docs/specs/09-technique-system.md Sprint 3).
 */
export type ExplicitWeeklyTeachActionContract = {
  readonly actionKind: "teach";
  readonly processorId: "sprint3-explicit-weekly-teach-0.1.0";
};

export type WeeklyTeachEvaluationInputScores = {
  styleMatchScore: number;
  requirementsMetScore: number;
  trustAndCompatibilityScore: number;
  tacticalNeedScore: number;
  successionPriorityScore: number;
  secrecyAndLoyaltyPenalty: number;
};

export type WeeklyTeachDiscipleRequest = {
  disciplePersonId: string;
  techniqueId: string;
  learningTier: LearningTier;
  teacherCanTeachContext: TeacherCanTeachContext;
  mentorshipRelationKind: MentorshipRelationKind;
  evaluationInputs: WeeklyTeachEvaluationInputScores;
  /** When true, master may refuse starting a new technique (docs/SPEC.md). */
  discipleHasIncompletePriorFocus?: boolean;
};

export type ExplicitWeeklyTeachMasterWeeklyAction =
  | "teach"
  | "train_stat"
  | "learn_technique"
  | "practice_technique"
  | "rest";

export type ExplicitWeeklyTeachActionRecord = {
  masterPersonId: string;
  masterWeeklyPipelineEligible: boolean;
  masterFormalDiscipleCount: number;
  teachingAbilityScore: number;
  selectedWeeklyAction: ExplicitWeeklyTeachMasterWeeklyAction;
  discipleRequests: readonly WeeklyTeachDiscipleRequest[];
};

export type WeeklyTeachDiscipleDecision = "accepted" | "refused" | "skipped_allocation";

export type WeeklyTeachDiscipleOutcome = {
  disciplePersonId: string;
  techniqueId: string;
  decision: WeeklyTeachDiscipleDecision;
  compositeScore?: number;
  reasons: readonly string[];
};

export type ExplicitWeeklyTeachActionOutcomeKind =
  | "feature_disabled"
  | "invalid_master_action"
  | "master_not_pipeline_eligible"
  | "teach_week_completed";

export type ExplicitWeeklyTeachActionOutcome = {
  kind: ExplicitWeeklyTeachActionOutcomeKind;
  weeklyTeachSlotLimit: number;
  discipleOutcomes: readonly WeeklyTeachDiscipleOutcome[];
  reasons: readonly string[];
};

/** Per-master intake decision supplied by caller; S03-004 owns autonomous limit policy. */
export type MasterIntakeAcceptance = "accept" | "reject" | "defer";

/** Processor input for autonomous intake limit evaluation (no world-state mutation). */
export type MasterIntakeEvaluationRecord = {
  masterPersonId: string;
  currentFormalDiscipleCount: number;
  teachingAbilityScore: number;
  successorOrientationScore: number;
  massDiscipleToleranceScore: number;
  applicant?: {
    childPersonId: string;
    lineageAptitudeScore: number;
    parentChildCompatibilityScore: number;
  };
};

export type MasterIntakeEvaluationOutcome = {
  acceptance: MasterIntakeAcceptance;
  autonomousMaxDisciples: number;
  reasons: readonly string[];
};

/** SPEC §8歳時の師匠決定 — reasons that permit a non-default formal master. */
export type EnrollmentSpecialReason =
  | "superior_master_invitation"
  | "rebellion_against_parent"
  | "poor_parent_child_compatibility"
  | "aptitude_lineage_mismatch"
  | "parent_intake_limit_reached";

export type EnrollmentMasterCandidate = {
  masterPersonId: string;
  isBiologicalParent: boolean;
  qualificationRecord: MasterQualificationEvaluationRecord;
  parentChildCompatibilityScore: number;
  lineageAptitudeScore: number;
  schoolFitScore: number;
  teachingEfficiencyScore: number;
  intakeAcceptance: MasterIntakeAcceptance;
};

/** Processor input at the formal enrollment age boundary (no world-state mutation). */
export type EnrollmentAssignmentRecord = {
  childPersonId: string;
  childAge: number;
  activeSpecialReasons: readonly EnrollmentSpecialReason[];
  masterCandidates: readonly EnrollmentMasterCandidate[];
  /** Living parent for parent-temporary guidance when no formal master is assigned. */
  temporaryGuidanceParentPersonId?: string;
};

export type EnrollmentAssignmentKind =
  | "not_at_enrollment_boundary"
  | "parent_master_assigned"
  | "formal_master_assigned"
  | "parent_temporary_guidance"
  | "no_eligible_or_accepted_master";

export type EnrollmentAssignmentOutcome = {
  kind: EnrollmentAssignmentKind;
  selectedMasterPersonId?: string;
  mentorshipRelationKind?: MentorshipRelationKind;
  reasons: readonly string[];
};
