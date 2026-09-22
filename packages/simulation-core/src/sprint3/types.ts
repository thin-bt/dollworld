import type { TechniqueLearnerContext } from "../sprint1/technique-acquisition.js";
import type { TeacherCanTeachContext } from "../sprint1/technique-teacher.js";
import type { LearningTier, TechniqueConsumptionClass } from "../sprint1/technique-enums.js";
import type { CareerStatus, LifeStatus, Rank } from "../enums.js";
import type {
  GENERATED_TECHNIQUE_MATERIALIZATION_EVALUATION_POLICY,
  ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY,
  ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID,
  TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY,
  TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID,
  WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
} from "./constants.js";
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

export type TeachingSelectionReEvaluationTriggers = {
  fourWeekCadenceWeeks: number;
  triggerOnNewEnrollment: boolean;
  triggerOnCurrentTechniqueAcquisitionComplete: boolean;
};

export type Sprint3TeachingSelectionConfig = {
  evaluationPolicyVersion: typeof TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY;
  evaluationWeights: WeeklyTeachEvaluationWeights;
  tierThresholds: Record<LearningTier, WeeklyTeachTierThresholds>;
  reEvaluationTriggers: TeachingSelectionReEvaluationTriggers;
};

/** Feature gates for later Sprint3 slices; S03-001 validates structure only. */
export type Sprint3MentorshipFeatureFlags = {
  explicitWeeklyTeachActionEnabled: boolean;
  enrollmentAssignmentAiEnabled: boolean;
  /** S03-005: bind teachingEfficiency disciple brackets into weekly training outcomes. */
  weeklyTrainingDiscipleCountTeachingEfficiencyEnabled?: boolean;
  /** S03-006: bind parent temporary guidance teacher factor into weekly train_stat outcomes. */
  weeklyTrainingParentTemporaryGuidanceEnabled?: boolean;
  /** S03-008: deterministic master→disciple teachable technique ranking. */
  techniqueTeachingSelectionEnabled?: boolean;
  /** S03-008: original-technique research/generation/loss lifecycle (sprint3-balance-0.9.0). */
  originalTechniqueLifecycleEnabled?: boolean;
  /** S03-010: generated TechniqueDefinition materialization + catalog overlay (sprint3-balance-0.10.0). */
  generatedTechniqueRegistrationEnabled?: boolean;
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
  /** Present from sprint3-balance-0.8.0 (S03-008); omitted on earlier configVersion bodies. */
  teachingSelection?: Sprint3TeachingSelectionConfig;
  /** Present from sprint3-balance-0.9.0 (S03-008); omitted on earlier configVersion bodies. */
  originalTechniqueLifecycle?: Sprint3OriginalTechniqueLifecycleConfig;
  /** Present from sprint3-balance-0.10.0 (S03-010); omitted on earlier configVersion bodies. */
  generatedTechniqueMaterialization?: Sprint3GeneratedTechniqueMaterializationConfig;
};

export type Sprint3Config = Sprint3ConfigInput;

/** Mentorship relation kinds referenced from docs/SPEC.md §師匠資格と門下制度 (storage in later slices). */
export type MentorshipRelationKind =
  "formal_master_disciple" | "parent_master_disciple" | "parent_temporary_guidance";

export const MENTORSHIP_RELATION_KINDS = [
  "formal_master_disciple",
  "parent_master_disciple",
  "parent_temporary_guidance",
] as const satisfies readonly MentorshipRelationKind[];

export function isMentorshipRelationKind(value: string): value is MentorshipRelationKind {
  return (MENTORSHIP_RELATION_KINDS as readonly string[]).includes(value);
}

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
  "teach" | "train_stat" | "learn_technique" | "practice_technique" | "rest";

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

/**
 * Boundary for deterministic teachable-technique ranking (docs/SPEC.md §師匠が教える技の決定).
 */
export type TechniqueTeachingSelectionContract = {
  readonly processorId: typeof TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID;
};

export type TechniqueTeachingSelectionCandidate = {
  techniqueId: string;
  teacherCanTeachContext: TeacherCanTeachContext;
  evaluationInputs: WeeklyTeachEvaluationInputScores;
  discipleHasIncompletePriorFocus?: boolean;
};

export type TechniqueTeachingSelectionRecord = {
  masterPersonId: string;
  disciplePersonId: string;
  mentorshipRelationKind: MentorshipRelationKind;
  discipleLearnerContext: TechniqueLearnerContext;
  candidates: readonly TechniqueTeachingSelectionCandidate[];
};

export type TechniqueTeachingSelectionRankedCandidate = {
  techniqueId: string;
  compositeScore: number;
  rank: number;
};

export type TechniqueTeachingSelectionExcludedCandidate = {
  techniqueId: string;
  reasons: readonly string[];
};

export type TechniqueTeachingSelectionOutcomeKind = "feature_disabled" | "selection_completed";

export type TechniqueTeachingSelectionOutcome = {
  kind: TechniqueTeachingSelectionOutcomeKind;
  rankedCandidates: readonly TechniqueTeachingSelectionRankedCandidate[];
  excludedCandidates: readonly TechniqueTeachingSelectionExcludedCandidate[];
  reasons: readonly string[];
};

export type TeachingSelectionReEvaluationContext = {
  weeksSinceLastTeachingSelectionEvaluation: number;
  newEnrollmentThisEvaluation: boolean;
  currentTechniqueAcquisitionCompleted: boolean;
};

export type TeachingSelectionReEvaluationDueResult = {
  due: boolean;
  matchedTriggers: readonly string[];
};

/** docs/SPEC.md §独自技の発生 — research threshold tier. */
export type OriginalTechniqueResearchTier =
  "derived_technique" | "composite_technique" | "full_original_technique";

export type OriginalTechniqueResearchThresholds = {
  derivedTechnique: number;
  compositeTechnique: number;
  fullOriginalTechnique: number;
};

export type OriginalTechniqueGenerationPolicy = {
  baseSuccessPercent: number;
  minimumSuccessPercent: number;
  maximumSuccessPercent: number;
  failureResearchRetentionPercent: number;
  regenerationCooldownWeeks: number;
  initialMasteryHundredthsMinimum: number;
  initialMasteryHundredthsMaximum: number;
  maximumPositiveSuccessAdjustmentPoints: number;
  maximumNegativeSuccessAdjustmentPoints: number;
};

export type Sprint3OriginalTechniqueLifecycleConfig = {
  evaluationPolicyVersion: typeof ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY;
  researchThresholds: OriginalTechniqueResearchThresholds;
  generation: OriginalTechniqueGenerationPolicy;
};

/** Config-held deterministic stat synthesis step (docs/SPEC.md tradeoff; numeric values in config). */
export type GeneratedTechniqueStatSynthesisStep = {
  averageWeightPercent: number;
  tradeoffDelta: number;
};

export type GeneratedTechniqueTierMaterializationPolicy = {
  power: GeneratedTechniqueStatSynthesisStep;
  accuracy: GeneratedTechniqueStatSynthesisStep;
  mentalCost: GeneratedTechniqueStatSynthesisStep;
  activationDifficulty: GeneratedTechniqueStatSynthesisStep;
  difficulty: GeneratedTechniqueStatSynthesisStep;
  learningTier: LearningTier;
  consumptionClass: TechniqueConsumptionClass;
  generatedTag: string;
};

export type Sprint3GeneratedTechniqueMaterializationConfig = {
  evaluationPolicyVersion: typeof GENERATED_TECHNIQUE_MATERIALIZATION_EVALUATION_POLICY;
  /** TechniqueDefinition.dataVersion for runtime-generated entries (distinct from initial catalog). */
  generatedDefinitionDataVersion: string;
  byResearchTier: Record<
    OriginalTechniqueResearchTier,
    GeneratedTechniqueTierMaterializationPolicy
  >;
};

/** Explicit display name supplied at registration boundary (not inferred from SPEC prose). */
export type GeneratedTechniqueMaterializationRequest = {
  displayName: string;
  foundingHistory: OriginalTechniqueFoundingHistoryRecord;
};

/**
 * Boundary for original-technique research/generation/loss (docs/SPEC.md §独自技の発生).
 */
export type OriginalTechniqueLifecycleContract = {
  readonly processorId: typeof ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID;
};

export type OriginalTechniqueGenerationModifierInput = {
  successPercentAdjustmentPoints: number;
};

export type OriginalTechniqueGenerationRecord = {
  founderPersonId: string;
  researchValue: number;
  sourceTechniqueIds: readonly string[];
  developmentReason: string;
  worldWeekIndex: number;
  cooldownWeeksRemaining: number;
  modifiers: OriginalTechniqueGenerationModifierInput;
  proposedNewTechniqueId: string;
  firstUseMatchId?: string;
};

export type OriginalTechniqueGenerationOutcomeKind =
  | "feature_disabled"
  | "cooldown_active"
  | "below_research_threshold"
  | "generation_failed"
  | "generation_succeeded";

export type OriginalTechniqueFoundingHistoryRecord = {
  eventKind: "original_technique_founded";
  founderPersonId: string;
  newTechniqueId: string;
  sourceTechniqueIds: readonly string[];
  researchValueAtFounding: number;
  developmentReason: string;
  researchTier: OriginalTechniqueResearchTier;
  firstUseMatchId?: string;
  worldWeekIndex: number;
};

export type OriginalTechniqueLossHistoryRecord = {
  eventKind: "original_technique_lost";
  techniqueId: string;
  founderPersonId: string;
  worldWeekIndex: number;
  reasons: readonly string[];
};

export type OriginalTechniqueGenerationOutcome = {
  kind: OriginalTechniqueGenerationOutcomeKind;
  researchTier?: OriginalTechniqueResearchTier;
  successPercentTenThousandths?: number;
  retainedResearchValue?: number;
  cooldownWeeksRemaining?: number;
  initialMasteryHundredths?: number;
  foundingHistory?: OriginalTechniqueFoundingHistoryRecord;
  reasons: readonly string[];
};

export type OriginalTechniqueLossEvaluationRecord = {
  techniqueId: string;
  livingPractitionerCount: number;
  registeredSuccessorPersonIds: readonly string[];
  livingSuccessorPractitionerCount: number;
};

export type OriginalTechniqueLossOutcome = {
  isLost: boolean;
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
