/**
 * @shared-world/simulation-core public API.
 * Sprint 0 domain types, config/name-data validation, canonical JSON, Sha256Provider,
 * seeded RNG, world calendar / age eligibility, structured EventEnvelope,
 * and Sprint 1 shared domain/config foundation (S01-001).
 */
export const SIMULATION_CORE_PACKAGE_NAME = "@shared-world/simulation-core" as const;

export type {
  AbilityKey,
  AbilityScores,
  AptitudeKey,
  AptitudeScores,
  StatValueTriple,
} from "./abilities.js";
export { ABILITY_KEYS, APTITUDE_KEYS } from "./abilities.js";

export {
  appendCanonicalJson,
  canonicalize,
  compareUnicodeCodePoints,
  hashCanonicalValueUtf8,
  toCanonicalJson,
} from "./canonical-json.js";

export type {
  AbilitiesConfig,
  AgeBandConfig,
  FamiliesConfig,
  HistoryConfig,
  InitialWorldConfig,
  LineagesConfig,
  NameDataConfig,
  NumericRange,
  PerformanceTargetsConfig,
  PopulationConfig,
  RankDistribution,
  RelationshipsConfig,
  SimulationConfig,
  TechniqueFocusWeights,
  ValidationTargetsConfig,
  WorldCalendarConfig,
} from "./config/types.js";
export {
  allocateByLargestRemainder,
  validateInitialWorldConfig,
  validateWorldCalendarConfig,
} from "./config/validate-config.js";

export type {
  DeceasedActiveCompetitorPerson,
  DeceasedChildPerson,
  DeceasedPerson,
  DeceasedRetiredPerson,
  DeceasedTraineePerson,
  Family,
  Lineage,
  LivingActiveCompetitorPerson,
  LivingChildPerson,
  LivingPerson,
  LivingRetiredPerson,
  LivingTraineePerson,
  MarriageRelationship,
  MasterDiscipleRelationship,
  ParentChildRelationship,
  Person,
  PersonName,
  Relationship,
} from "./domain.js";

export type {
  CareerStatus,
  FamilyStatus,
  LifeStatus,
  LineageFocus,
  LineageStatus,
  ParentRole,
  ParticipationStatus,
  Rank,
  Sex,
} from "./enums.js";
export { MINIMUM_RANK, RANK_ORDER, RANKS } from "./enums.js";

export type {
  AgeEligibility,
  CareerTransitionResult,
  PersonCareerTransition,
} from "./age-status.js";
export {
  applyAgeBasedCareerUpdates,
  computeCurrentAge,
  deriveAgeEligibility,
  isLivingPerson,
  withRecalculatedAge,
} from "./age-status.js";

export type {
  PersonAgedTransition,
  StepOneWeekResult,
  WorldCalendarState,
  WorldCalendarTransition,
  YearStartResult,
  YearStartedTransition,
  YearStatsFinalizedTransition,
} from "./world-calendar.js";
export {
  applyAgeQualification,
  applyMassAging,
  applyYearStart,
  createInitialWorldCalendarState,
  selectMassAgingTargetPersonIds,
  stepOneWeek,
  stepWeeks,
} from "./world-calendar.js";

export type { WeekOfMonth, WorldDate, WorldMonth } from "./world-date.js";
export {
  WORLD_MONTH_ORDER,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  advanceOneWeek,
  advanceWeeks,
  calendarMonthFromOffset,
  createInitialWorldDate,
  createWorldDate,
  fromAbsoluteWeek,
  isSameWorldDate,
  isWorldYearEndWeek,
  isWorldYearStartWeek,
  monthOffsetFromYearStart,
  toAbsoluteWeek,
  validateWorldDate,
  weeksPerWorldYear,
  worldMonthOrder,
  yearStartDate,
} from "./world-date.js";

export type {
  EventId,
  FamilyId,
  LineageId,
  MatchId,
  PersonId,
  RelationshipId,
  RunId,
  SimulationId,
  TechniqueId,
  TournamentId,
  WorldId,
} from "./ids.js";
export {
  asEventId,
  asFamilyId,
  asLineageId,
  asMatchId,
  asPersonId,
  asRelationshipId,
  asRunId,
  asSimulationId,
  asTechniqueId,
  asTournamentId,
  asWorldId,
} from "./ids.js";

export type {
  BasicAttackProfile,
  BasicAttackProfileInput,
  BattleConfig,
  BattleConfigInput,
  BattleRange,
  BasisPointsMinMax,
  GrowthConfig,
  GrowthConfigInput,
  NumericMinMax,
  PersonTechniqueState,
  RangeShiftAfterUse,
  SimulationIdentity,
  SpecSetId,
  SpecVersionEntry,
  Sprint1Config,
  Sprint1ConfigInput,
  Sprint1ConfigIdentity,
  TechniqueBalanceConfig,
  TechniqueBalanceConfigInput,
  TechniqueCategory,
  TechniqueLearningConfig,
  TechniqueLearningConfigInput,
  TemporaryConditionConfig,
  TemporaryConditionConfigInput,
  WeeklyPlannerConfig,
  WeeklyPlannerConfigInput,
} from "./sprint1/types.js";
export { BATTLE_RANGES, RANGE_SHIFT_AFTER_USE, TECHNIQUE_CATEGORIES } from "./sprint1/types.js";
export type { BasisPoints } from "./sprint1/basis-points.js";
export { BASIS_POINTS_SCALE, normalizeBasisPoints } from "./sprint1/basis-points.js";
export {
  ABILITY_CANONICAL_ORDER,
  BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
  BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION,
  BATTLE_PROFILE_ADAPTER_VERSION,
  BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION,
  BATTLE_STATE_SCHEMA_VERSION,
  CANONICAL_JSON_VERSION,
  DEFAULT_BATTLE_STRATEGY_ID,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  EXPECTED_SPEC_VERSIONS,
  HASH_ALGORITHM,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  RUN_RULE_SNAPSHOT_SCHEMA_VERSION,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SIMULATION_IDENTITY_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  SPRINT1_CONFIG_SCHEMA_VERSION,
  SPRINT1_CONFIG_VERSION_DEFAULT,
  START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION,
  EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
  BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  RUN_METADATA_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  FINAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL,
  WEEKLY_TRAINING_PROCESSOR_ID,
  WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL,
} from "./sprint1/constants.js";
export {
  INITIAL_WEEKLY_TRAINING_SIDECAR_ENTRY_KEYS,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_KEYS,
  computeInitialWeeklyTrainingSidecarHash,
  validateInitialWeeklyTrainingSidecarSnapshot,
} from "./sprint1/initial-weekly-training-sidecar.js";
export type {
  InitialWeeklyTrainingSidecarEntry,
  InitialWeeklyTrainingSidecarSnapshot,
} from "./sprint1/initial-weekly-training-sidecar.js";
export { SPRINT1_CLI_INPUT_KEYS, validateSprint1CliInput } from "./sprint1/sprint1-cli-input.js";
export type { Sprint1CliInput } from "./sprint1/sprint1-cli-input.js";
export {
  createWeeklyTrainingSidecarStateFromInitial,
  validateWeeklyTrainingSidecarState,
} from "./sprint1/weekly-training-sidecar-state.js";
export type { WeeklyTrainingSidecarState } from "./sprint1/weekly-training-sidecar-state.js";
export {
  SPRINT1_RUN_CONTEXT_KEYS,
  createSprint1RunContext,
  validateSprint1RunContext,
} from "./sprint1/sprint1-run-context.js";
export type {
  Sprint1RunContext,
  ValidateSprint1RunContextInput,
} from "./sprint1/sprint1-run-context.js";
export { validateSprint1RunSession } from "./sprint1/validate-sprint1-run-session.js";
export {
  CREATE_SPRINT1_RUN_SESSION_INPUT_KEYS,
  CREATE_SPRINT1_RUN_SESSION_FROM_RUN_INITIALIZATION_MATERIALS_KEYS,
  createSprint1RunSession,
  createSprint1RunSessionFromRunInitializationMaterials,
  promoteProvisionalWorldSnapshot,
} from "./sprint1/create-sprint1-run-session.js";
export type {
  CreateSprint1RunSessionDeps,
  CreateSprint1RunSessionInput,
  CreateSprint1RunSessionFromRunInitializationMaterialsInput,
  CreateSprint1RunSessionResult,
  ProvisionalGenerationMeta,
  Sprint1InitialWorldDocumentSnapshot,
} from "./sprint1/create-sprint1-run-session.js";
export { buildWeeklyTrainingPersonRecords } from "./sprint1/sprint1-person-sidecar-records.js";
export { runSprint1WeeklyTrainingAdapter } from "./sprint1/weekly-training-adapter.js";
export { runSprint1WeeklyStep, runSprint1Years } from "./sprint1/sprint1-weekly-step.js";
export type {
  RunSprint1ValidatedWeekObservation,
  RunSprint1WeeklyStepOptions,
  RunSprint1YearsOptions,
} from "./sprint1/sprint1-weekly-step.js";
export {
  SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  assertBattleResultWeekMatchesWorldDate,
} from "./sprint1/sprint1-run-session.js";
export type {
  LegacyWorldProcessorContract,
  Sprint1RunRuntimeState,
  Sprint1RunSession,
  Sprint1TransactionalProcessorAdapterId,
  Sprint1WeeklyTrainingAdapterInput,
  Sprint1WeeklyTrainingAdapterOutput,
} from "./sprint1/sprint1-run-session.js";
export {
  EVENT_ALLOCATION_STATE_KEYS,
  createEventAllocationStateAfterPromotedInitialEvents,
  validateEventAllocationState,
} from "./sprint1/event-allocation-state.js";
export type { EventAllocationState } from "./sprint1/event-allocation-state.js";
export {
  EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
  SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION,
  SPRINT1_EVENT_ENVELOPE_KEYS,
  SPRINT1_EVENT_ENTITIES_KEYS,
  allocateBattleEventCandidates,
  allocateSprint1EventEnvelope,
  allocateWeeklyTrainingEventCandidates,
  promoteProvisionalEventStreamToSprint1,
  promoteProvisionalEventToSprint1,
  validateSprint1EventEnvelope,
} from "./sprint1/event-envelope-sprint1.js";
export type {
  AllocateBattleEventCandidatesInput,
  AllocateSprint1EventEnvelopeInput,
  AllocateWeeklyTrainingEventCandidatesInput,
  Sprint1EventEntities,
  Sprint1EventEnvelope,
} from "./sprint1/event-envelope-sprint1.js";
export {
  BATTLE_RESULT_WEEK_STATE_KEYS,
  appendBattleResultToWeekState,
  assertBattleResultMatchIdNotInWeekState,
  countCompletedMatchesForPersonThisWorldWeek,
  createInitialBattleResultWeekState,
  validateBattleResultWeekState,
} from "./sprint1/battle-result-week-state.js";
export type { BattleResultWeekState } from "./sprint1/battle-result-week-state.js";
export {
  appendBattleResultToStore,
  appendCommittedBattleResultToRuntimeStores,
  assertBattleResultMatchIdNotInStore,
  assertBattleResultsWeekSuffixInvariant,
  createInitialBattleResults,
  validateBattleResultsStore,
} from "./sprint1/battle-result-store.js";
export type { BattleResultsStoreContext } from "./sprint1/battle-result-store.js";
export {
  createInitialSprint1BattleWorldRngState,
  createInitialSprint1WeeklyTrainingProcessorRuntimeState,
  createInitialWeeklyTrainingProcessorRuntimeParts,
} from "./sprint1/sprint1-runtime-rng.js";
export type { WeeklyTrainingProcessorRuntimeParts } from "./sprint1/sprint1-runtime-rng.js";
export {
  FORBIDDEN_MOVEMENT_STATE_MODIFIER_KEYS,
  MOVEMENT_STATE_MODIFIER_ACTION_ORDER_PATHS,
  computeMovementStateModifier,
  computeMoverStateModifier,
  computeOpponentStateModifier,
} from "./sprint1/movement-state-modifier.js";
export type {
  MovementParticipantStateSnapshot,
  MovementStateModifierActionOrderCoeffs,
} from "./sprint1/movement-state-modifier.js";
export {
  computeMovementChance,
  computePossibleRollCount,
  computeRequiredMoveRoll,
  computeSuccessfulRollCount,
} from "./sprint1/movement-chance.js";
export type { MovementChanceBounds, MovementChanceInput } from "./sprint1/movement-chance.js";
export {
  PERSON_TECHNIQUE_STATE_KEYS,
  appendSuccessfulUseCountInvariantIssue,
  clonePersonTechniqueState,
  freezePersonTechniqueState,
  validatePersonTechniqueState,
} from "./sprint1/person-technique-state.js";
export { createDefaultSprint1ConfigInput } from "./sprint1/sprint1-config-defaults.js";
export {
  validateNormalizedSprint1Config,
  validateSprint1Config,
} from "./sprint1/validate-sprint1-config.js";
export {
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  SPRINT1_BALANCE_0_2_0_CONFIG_VERSION,
} from "./sprint1/sprint1-config-canonical-fixture.js";
export {
  cloneSprint1ConfigInput,
  cloneValidatedSprint1Config,
  computeSprint1ConfigHash,
  freezeSprint1ConfigInput,
  freezeValidatedSprint1Config,
  getDefaultSprint1Config,
} from "./sprint1/sprint1-config.js";
export {
  computeSimulationIdentityHash,
  createExpectedSpecVersions,
  createSimulationIdFromIdentity,
  createSimulationIdFromIdentityHash,
  validateSimulationIdentity,
} from "./sprint1/simulation-identity.js";

export {
  GROWTH_PROFILES,
  isGrowthProfile,
  validateGrowthProfile,
} from "./sprint1/growth-profile.js";
export type { GrowthProfile } from "./sprint1/growth-profile.js";
export {
  INJURY_STAGES,
  deriveInjuryStage,
  selectInjuryGrowthFactor,
} from "./sprint1/injury-stage.js";
export type { InjuryStage } from "./sprint1/injury-stage.js";
export { deriveMaxMental } from "./sprint1/max-mental.js";
export {
  PERSON_TEMPORARY_CONDITION_KEYS,
  clonePersonTemporaryCondition,
  freezePersonTemporaryCondition,
  validatePersonTemporaryCondition,
} from "./sprint1/person-temporary-condition.js";
export type { PersonTemporaryCondition } from "./sprint1/person-temporary-condition.js";
export {
  STAT_GROWTH_REMAINDER_KEYS,
  cloneStatGrowthRemainderCollection,
  freezeStatGrowthRemainderCollection,
  validateStatGrowthRemainder,
  validateStatGrowthRemainderCollection,
} from "./sprint1/stat-growth-remainder.js";
export type {
  StatGrowthRemainder,
  StatGrowthRemainderCollection,
} from "./sprint1/stat-growth-remainder.js";
export {
  cloneGrowthPotentialScores,
  freezeGrowthPotentialScores,
  validateGrowthPotentialScores,
} from "./sprint1/growth-potential.js";
export type { GrowthPotentialScores } from "./sprint1/growth-potential.js";
export {
  SPRINT1_PERSON_STATE_KEYS,
  SPRINT1_PERSON_STATE_SCHEMA_VERSION,
  cloneSprint1PersonState,
  createInitialSprint1PersonState,
  freezeSprint1PersonState,
  validateSprint1PersonState,
} from "./sprint1/sprint1-person-state.js";
export type {
  Sprint1PersonState,
  Sprint1PersonStateContext,
} from "./sprint1/sprint1-person-state.js";
export {
  TEACHER_FACTOR_KEYS,
  selectAgeGrowthFactor,
  selectCurrentValueGrowthFactor,
  selectDiscipleCountGrowthFactor,
  selectFatigueGrowthFactor,
  selectTeacherGrowthFactor,
} from "./sprint1/growth-factor-selectors.js";
export type { TeacherFactorKey } from "./sprint1/growth-factor-selectors.js";
export {
  isFormalTrainingEligible,
  isWeeklyActionPipelineEligible,
  isWeeklyStateUpdateEligible,
} from "./sprint1/weekly-update-eligibility.js";
export type { WeeklyEligibilityPerson } from "./sprint1/weekly-update-eligibility.js";
export { attachSprint1PersonStateToInitialWorld } from "./sprint1/attach-sprint1-person-state.js";
export { assignInitialActiveTechniqueCoverage } from "./sprint1/assign-initial-technique-coverage.js";

export {
  ACTION_TRAITS_KEYS,
  INITIAL_TECHNIQUE_CATALOG_DATA_VERSION,
  LEARNING_PROGRESS_STANDARD_BY_TIER,
  LEARNING_TARGET_DERIVED_STATUSES,
  LEARNING_TIERS,
  TECHNIQUE_CONSUMPTION_CLASSES,
  TECHNIQUE_DEFINITION_SCHEMA_VERSION,
  TECHNIQUE_PRIORITIES,
  isLearningTargetDerivedStatus,
  isLearningTier,
  isTechniqueConsumptionClass,
  isTechniquePriority,
} from "./sprint1/technique-enums.js";
export type {
  ActionTraits,
  LearningTargetDerivedStatus,
  LearningTier,
  TechniqueConsumptionClass,
  TechniquePriority,
} from "./sprint1/technique-enums.js";
export {
  TECHNIQUE_DEFINITION_KEYS,
  cloneTechniqueDefinition,
  freezeTechniqueDefinition,
  validateTechniqueDefinition,
} from "./sprint1/technique-definition.js";
export type {
  TechniqueDefinition,
  TechniqueMasteryRequirement,
} from "./sprint1/technique-definition.js";
export {
  cloneTechniqueCatalog,
  computeTechniqueCatalogHash,
  freezeTechniqueCatalog,
  validateTechniqueCatalog,
  validateTechniqueCatalogAgainstIdentity,
} from "./sprint1/technique-catalog.js";
export type { TechniqueCatalog, TechniqueCatalogIdentity } from "./sprint1/technique-catalog.js";
export { validateSprint1PersonTechniqueSemantics } from "./sprint1/technique-person-semantics.js";
export type { TechniqueSemanticsPersonContext } from "./sprint1/technique-person-semantics.js";
export {
  deriveLearningTargetStatus,
  evaluateTechniqueAcquisitionConditions,
} from "./sprint1/technique-acquisition.js";
export type {
  TechniqueAcquisitionConditionResult,
  TechniqueLearnerContext,
} from "./sprint1/technique-acquisition.js";
export { deriveRequiredStatsFactor } from "./sprint1/technique-required-stats-factor.js";
export {
  deriveInitialMasteryHundredths,
  deriveTechniqueEffectiveMasteryHundredths,
  selectMasteryCurrentValueFactor,
} from "./sprint1/technique-mastery.js";
export { teacherCanTeach } from "./sprint1/technique-teacher.js";
export type { TeacherCanTeachContext } from "./sprint1/technique-teacher.js";
export {
  deriveBasicAttackEffectiveMasteryHundredths,
  getBasicAttackProfile,
} from "./sprint1/technique-basic-attack.js";

// S01-004 weekly training / learning processor
export {
  WEEKLY_ACTIONS,
  WEEKLY_FORCED_REST_REASONS,
  WEEKLY_REST_FALLBACK_REASONS,
  WEEKLY_SCORED_ACTIONS,
  WEEKLY_TRAINING_ACTIONS,
  isWeeklyAction,
  weeklyActionOrderIndex,
} from "./sprint1/weekly-actions.js";
export type {
  WeeklyAction,
  WeeklyForcedRestReason,
  WeeklyRestFallbackReason,
  WeeklyScoredAction,
  WeeklyTrainingAction,
} from "./sprint1/weekly-actions.js";
export {
  drawInclusiveBasisPoints,
  mathematicalFloor,
  multiplyBasisPointsFloor,
} from "./sprint1/multiply-basis-points.js";
export {
  WEEKLY_ACTION_CONTEXT_SCORE_KEYS,
  WEEKLY_PLANNER_CONTEXT_KEYS,
  cloneWeeklyPlannerContext,
  freezeWeeklyPlannerContext,
  validateWeeklyPlannerContext,
} from "./sprint1/weekly-planner-context.js";
export type {
  WeeklyActionContextScore,
  WeeklyPlannerContext,
} from "./sprint1/weekly-planner-context.js";
export {
  TRAINING_PROCESSOR_ACTION_COUNT_KEYS,
  TRAINING_PROCESSOR_RUNTIME_STATE_KEYS,
  TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION,
  cloneTrainingProcessorRuntimeState,
  createInitialTrainingProcessorRuntimeState,
  freezeTrainingProcessorRuntimeState,
  validateTrainingProcessorRuntimeState,
} from "./sprint1/training-processor-runtime-state.js";
export type {
  TrainingProcessorActionCountKey,
  TrainingProcessorActionCounts,
  TrainingProcessorRuntimeState,
} from "./sprint1/training-processor-runtime-state.js";
export {
  MOTIVATION_FACTOR_MAXIMUM_BASIS_POINTS,
  MOTIVATION_FACTOR_MINIMUM_BASIS_POINTS,
  NEUTRAL_NORMALIZED_INPUT,
  validateTechniqueTargetContext,
  validateTechniqueTargetContexts,
  validateWeeklyStatTargetContext,
  validateWeeklyTrainingPersonRecord,
} from "./sprint1/weekly-training-types.js";
export type {
  StatTargetAbilityContext,
  TechniqueTargetContext,
  WeeklyStatTargetContext,
  WeeklyTrainingEventCandidate,
  WeeklyTrainingPersonRecord,
  WeeklyTrainingPersonView,
  WeeklyTrainingResult,
} from "./sprint1/weekly-training-types.js";
export {
  computeActionScoreHundredths,
  readWeeklyPlannerPersonState,
  scoreWeeklyActions,
  selectWeeklyAction,
} from "./sprint1/weekly-action-scores.js";
export type {
  WeeklyActionCandidateAvailability,
  WeeklyActionScoreEntry,
  WeeklyActionSelection,
  WeeklyPlannerPersonState,
} from "./sprint1/weekly-action-scores.js";
export {
  buildLearningTechniqueCandidates,
  buildPracticeTechniqueCandidates,
  buildTrainingStatCandidates,
  computeLearningTargetScoreHundredths,
  computePracticeTargetScoreHundredths,
  computeRecentPracticeNeed,
  computeStatTargetScoreHundredths,
  selectLearningTechniqueTarget,
  selectNormalTrainingMasteryTarget,
  selectPracticeTechniqueTarget,
  selectTrainingStatTarget,
} from "./sprint1/weekly-target-selection.js";
export type {
  LearningTargetCandidate,
  LearningTargetSelection,
  PracticeTargetCandidate,
  PracticeTargetSelection,
  StatTargetCandidate,
  StatTargetSelection,
  WeeklyLearningFocusNormalization,
} from "./sprint1/weekly-target-selection.js";
export { WEEKLY_TRAINING_EVENT_TYPES } from "./sprint1/weekly-training-effects.js";
export { processWeeklyTrainingWeek } from "./sprint1/process-weekly-training-week.js";
export type { WeeklyTrainingProcessorDependencies } from "./sprint1/process-weekly-training-week.js";
export {
  WEEKLY_PERSON_CORE_KEYS,
  validateWeeklyTrainingPerson,
} from "./sprint1/weekly-person-structure.js";
export type { ParsedWeeklyTrainingPerson } from "./sprint1/weekly-person-structure.js";
export {
  SEEDED_RNG_STATE_KEYS,
  SEEDED_RNG_WORD_MAXIMUM,
  validateSeededRngState,
} from "./sprint1/validate-seeded-rng-state.js";

// S01-005 battle start / BattleState generation.
// `reserveNextMatchId`, `createBattleState`, `beginBattle` and
// `startBattleTransaction` stay internal on purpose (11 §10): the public
// battle entry point is 12 mini-spec `runBattleToCompletion` (S01-007).
export {
  CREATE_INITIAL_MATCH_ID_GENERATOR_STATE_KEYS,
  MATCH_ID_FORMAT_PATTERN,
  MATCH_ID_GENERATOR_STATE_INVALID_CODE,
  MATCH_ID_GENERATOR_STATE_KEYS,
  MATCH_ID_SEED_MAXIMUM,
  MATCH_ID_SEED_MINIMUM,
  MATCH_ID_SEQUENCE_DIGITS,
  MATCH_ID_SEQUENCE_EXHAUSTED_CODE,
  MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL,
  MATCH_ID_SEQUENCE_MAXIMUM,
  MATCH_ID_SEQUENCE_MINIMUM,
  cloneMatchIdGeneratorState,
  computeMatchIdGeneratorStateHash,
  createInitialMatchIdGeneratorState,
  formatMatchIdFromSequence,
  freezeMatchIdGeneratorState,
  isMatchIdText,
  validateMatchId,
  validateMatchIdGeneratorState,
} from "./sprint1/match-id-generator.js";
export type {
  CreateInitialMatchIdGeneratorStateInput,
  MatchIdGeneratorState,
  ReserveNextMatchIdResult as MatchIdReservationResult,
} from "./sprint1/match-id-generator.js";
export {
  BATTLE_KINDS,
  BATTLE_SIDES,
  BATTLE_STATUSES,
  BATTLE_TERMINAL_REASONS,
  isBattleKind,
  isBattleSide,
  isBattleStatus,
  isBattleTerminalReason,
} from "./sprint1/battle-enums.js";
export type {
  BattleKind,
  BattleSide,
  BattleStatus,
  BattleTerminalReason,
} from "./sprint1/battle-enums.js";
export {
  BATTLE_DECISION_PROFILE_KEYS,
  BATTLE_PROFILE_NEUTRAL_VALUE,
  adaptBattleProfile,
  createNeutralBattleDecisionProfile,
  validateBattleDecisionProfile,
} from "./sprint1/battle-decision-profile.js";
export type {
  AdaptedBattleProfile,
  BattleDecisionProfile,
} from "./sprint1/battle-decision-profile.js";
export {
  BATTLE_ACTION_SOURCE_IDENTITY_KEYS,
  BATTLE_ACTION_SOURCE_KINDS,
  createDefaultStrategyActionSourceIdentity,
  createScriptedActionsSourceIdentity,
  validateBattleActionSourceIdentity,
} from "./sprint1/battle-action-source-identity.js";
export type {
  BattleActionSourceIdentity,
  BattleActionSourceKind,
} from "./sprint1/battle-action-source-identity.js";
export {
  BATTLE_ACTION_KINDS,
  BATTLE_ACTION_REPLACEMENT_REASONS,
  BASIC_ATTACK_PROFILES,
  EVADE_DIRECTIONS,
  INVALID_ACTION_COUNT_REPLACEMENT_REASONS,
  invalidActionCountDeltaForReplacementReason,
  isBattleActionReplacementReason,
  validateBattleAction,
  validateBattleActionReplacementReason,
  validateResolvedBattleAction,
} from "./sprint1/battle-action.js";
export type {
  BattleAction,
  BattleActionKind,
  BattleActionReplacementReason,
  BattleBasicAttackProfile,
  EvadeDirection,
  ResolvedBattleAction,
} from "./sprint1/battle-action.js";
export {
  BATTLE_ACTION_SCRIPT_KEYS,
  BATTLE_ACTION_SCRIPT_TURN_KEYS,
  FIXED_BASIC_DEFENSE_ACTION_SCRIPT_BYTE_LENGTH,
  FIXED_BASIC_DEFENSE_ACTION_SCRIPT_SHA256,
  battleActionScriptToCanonicalScript,
  buildFixedBasicDefenseBattleActionScript,
  computeActionScriptHash,
  getBattleActionFromScript,
  validateBattleActionScript,
  validateCanonicalBattleActionScriptString,
} from "./sprint1/battle-action-script.js";
export type { BattleActionScript, BattleActionScriptTurn } from "./sprint1/battle-action-script.js";
export { validateScriptedBothSideBinding } from "./sprint1/battle-action-script-binding.js";
export {
  RUN_RULE_SNAPSHOT_KEYS,
  cloneRunRuleSnapshot,
  createRunRuleSnapshot,
  freezeRunRuleSnapshot,
  validateRunRuleSnapshot,
  validateRunRuleSnapshotAgainstIdentity,
} from "./sprint1/run-rule-snapshot.js";
export type { CreateRunRuleSnapshotInput, RunRuleSnapshot } from "./sprint1/run-rule-snapshot.js";
export {
  COMPETITION_DOMAIN_KEYS,
  COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION,
  COMPETITION_DOMAIN_REGISTRY_VERSION,
  DERIVED_TIE_KEY_POLICY_VERSION,
  DERIVED_TIE_KEY_PURPOSES,
  SPRINT2_CONFIG_SCHEMA_VERSION,
  SPRINT2_CONFIG_VERSION_DEFAULT,
  TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION,
  TOURNAMENT_ID_GENERATOR_VERSION,
  TOURNAMENT_ID_NAMESPACE,
  TOURNAMENT_SCHEDULE_STATE_SCHEMA_VERSION,
  TOURNAMENT_KINDS,
  TOURNAMENT_LIFECYCLE_STATES,
  PLANNED_PARTICIPANT_LIST_SCHEMA_VERSION,
  ENTRY_CHOICE_POLICY_VERSION,
  TOURNAMENT_BRACKET_DEFINITION_SCHEMA_VERSION,
  BRACKET_RUNTIME_SLOT_STATE_SCHEMA_VERSION,
  TOURNAMENT_MATCH_PLAN_SCHEMA_VERSION,
  TOURNAMENT_BATTLE_HANDOFF_RESULT_SCHEMA_VERSION,
  STORED_BATTLE_RESULT_REF_SCHEMA_VERSION,
  TOURNAMENT_BATTLE_APPLICATION_FACT_SCHEMA_VERSION,
  STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION,
  MATERIALIZED_BATTLE_RESULT_VIEW_SCHEMA_VERSION,
  IMPORTANT_BATTLE_MARKER_SCHEMA_VERSION,
  DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION,
  DETAILED_LOG_RETENTION_STATUSES,
  IMPORTANT_BATTLE_REASONS,
} from "./sprint2/constants.js";
export type { DetailedLogRetentionStatus, ImportantBattleReason } from "./sprint2/constants.js";
export {
  computeCompetitionDomainRegistryHash,
  createDefaultCompetitionDomainRegistryInput,
  finalizeCompetitionDomainRegistry,
  validateCompetitionDomainRegistry,
} from "./sprint2/competition-domain.js";
export {
  computeDerivedTieKey,
  computeDerivedTieKeysForCandidates,
  validateDerivedTieKeyInput,
} from "./sprint2/derived-tie-key.js";
export {
  createDefaultSprint2IdentityBindings,
  validateSprint2IdentityBindings,
} from "./sprint2/sprint2-identity-bindings.js";
export {
  computeTournamentIdGeneratorStateHash,
  createInitialTournamentIdGeneratorState,
  formatTournamentIdFromSequence,
  isTournamentIdText,
  reserveNextTournamentId,
  validateTournamentId,
  validateTournamentIdGeneratorState,
} from "./sprint2/tournament-id-registry.js";
export {
  buildSeriesKey,
  classifyChampionshipCycleYear,
  generateSchedulePlan,
  validateSchedulePlanInputs,
} from "./sprint2/tournament-schedule-plan.js";
export {
  applyFailureToStart,
  commitSchedulePlan,
  rejectInvalidScheduleTransition,
} from "./sprint2/tournament-schedule-state.js";
export {
  buildTournamentScheduleReadModel,
  toScheduleReadModelEntry,
} from "./sprint2/tournament-schedule-read-model.js";
export {
  assertScheduleLifecycleIdentityFresh,
  buildPlannedParticipantList,
  buildTournamentChoiceCandidates,
  canProduceParticipantList,
  collectEligibilityRejections,
  computeParticipantListHash,
  computeScheduleLifecycleIdentity,
  createNeutralEntryChoicePolicy,
  evaluateEntrantEligibility,
  OFFICIAL_COMPETITION_MAXIMUM_AGE,
  OFFICIAL_COMPETITION_MINIMUM_AGE,
  selectSimultaneousTournamentForPerson,
  toEntrySelectionHandoff,
} from "./sprint2/tournament-entry-selection.js";
export {
  STRUCTURAL_FORMAT_KINDS,
  validateFormatSelectionResult,
  validateInjectedStructuralPolicyInput,
} from "./sprint2/tournament-bracket-policy.js";
export type {
  FormatSelectionPolicyIdentity,
  FormatSelectionResult,
  InjectedStructuralPolicyInput,
  KnockoutSeedByeMapping,
  KnockoutSeedByePolicyIdentity,
  KnockoutStructuralSlot,
  StandingsTieBreakPolicyIdentity,
  StructuralFormatKind,
} from "./sprint2/tournament-bracket-policy.js";
export {
  buildStructuralBracketDefinition,
  computeBracketDefinitionHash,
  createInitialBracketRuntimeSlotState,
  toStructuralBracketHandoff,
} from "./sprint2/tournament-bracket-definition.js";
export type {
  BracketRuntimeSlotState,
  StructuralBracketBuildInput,
  StructuralBracketBuildResult,
  StructuralBracketHandoff,
  StructuralGroupMembership,
  StructuralRoundRobinPair,
  TournamentBracketDefinition,
} from "./sprint2/tournament-bracket-definition.js";
export {
  buildTournamentMatchPlan,
  canonicalStructuralSlotKey,
  computeTournamentMatchPlanIdentityHash,
  verifyTournamentMatchPlanReservation,
} from "./sprint2/tournament-match-plan.js";
export type {
  TournamentMatchPlan,
  TournamentMatchPlanBuildInput,
  TournamentSlotMatchBinding,
  TournamentStructuralSlotIdentity,
} from "./sprint2/tournament-match-plan.js";
export {
  executeTournamentBattleHandoff,
  snapshotTournamentHandoffMaterial,
  snapshotTournamentHandoffMaterialJson,
} from "./sprint2/tournament-battle-handoff.js";
export type {
  TournamentBattleHandoffInput,
  TournamentBattleHandoffOutput,
  TournamentBattleHandoffResult,
  TournamentBattleHandoffSuccess,
} from "./sprint2/tournament-battle-handoff.js";
export {
  buildStoredBattleResultRef,
  computeStoredBattleResultRefHash,
  formatTournamentSlotId,
  validateStoredBattleResultRef,
  validateTournamentBattleSlotIdentity,
} from "./sprint2/stored-battle-result-ref.js";
export type {
  BuildStoredBattleResultRefInput,
  StoredBattleResultRef,
  TournamentBattleSlotIdentity,
} from "./sprint2/stored-battle-result-ref.js";
export {
  executeTournamentBattleAtomic,
  snapshotTournamentBattleAtomicBaseline,
} from "./sprint2/tournament-battle-atomic-adapter.js";
export type {
  ExecuteTournamentBattleAtomicInput,
  ExecuteTournamentBattleAtomicOutput,
  ExecuteTournamentBattleAtomicSuccess,
  TournamentBattleApplicationFact,
  TournamentBattleAtomicPublicationGate,
} from "./sprint2/tournament-battle-atomic-adapter.js";
export {
  buildTournamentFinalResult,
  computeTournamentFinalResultHash,
  tournamentPlacementContributionKey,
  validateTournamentFinalResult,
  validateTournamentFinalResultSource,
} from "./sprint2/tournament-final-result.js";
export type {
  BuildTournamentFinalResultInput,
  TournamentFinalPlacement,
  TournamentFinalResult,
  ValidateTournamentFinalResultSource,
} from "./sprint2/tournament-final-result.js";
export {
  applyTournamentFinalResultToCompetitiveRecord,
  computeCompetitiveRecordHash,
  createEmptyCompetitiveRecord,
  validateCompetitiveRecordShape,
} from "./sprint2/competitive-record-update.js";
export type {
  ApplyTournamentFinalResultToCompetitiveRecordInput,
  ApplyTournamentFinalResultToCompetitiveRecordOutput,
  CompetitiveRecord,
  PromotionProgress,
  SQualificationContribution,
  SQualificationState,
  WinsByDomain,
  WinsByTournamentKind,
} from "./sprint2/competitive-record-update.js";
export {
  buildRankPromotionResult,
  commitPromotionWithRankHistory,
  computeRankPromotionResultHash,
  findCommittedPromotionResult,
  snapshotPromotionAtomicBaseline,
} from "./sprint2/rank-promotion-result.js";
export type {
  BuildRankPromotionResultInput,
  CommittedPromotionRegistry,
  CommitPromotionWithRankHistoryInput,
  CommitPromotionWithRankHistoryOutput,
  PromotionAtomicCommitGate,
  RankPromotionResult,
} from "./sprint2/rank-promotion-result.js";
export {
  appendPersonRankHistoryEntry,
  buildPersonRankHistoryEntry,
  createEmptyPersonRankHistory,
  isExactlyOneRankStepUp,
  validatePersonRankHistoryContinuity,
} from "./sprint2/person-rank-history.js";
export type {
  AppendPersonRankHistoryEntryOutput,
  BuildPersonRankHistoryEntryInput,
  PersonRankHistory,
  PersonRankHistoryEntry,
} from "./sprint2/person-rank-history.js";
export {
  buildSQualificationHistoryEntry,
  commitSQualificationHistoryEntry,
  computeSQualificationHistoryEntryHash,
  createEmptySQualificationHistory,
  validateSQualificationHistorySource,
} from "./sprint2/s-qualification-history.js";
export type {
  BuildSQualificationHistoryEntryInput,
  CommitSQualificationHistoryEntryOutput,
  SQualificationHistory,
  SQualificationHistoryEntry,
  ValidateSQualificationHistorySource,
} from "./sprint2/s-qualification-history.js";
export {
  createDefaultTournamentPayoutConfig,
  createDefaultTournamentPayoutTable,
  lookupTournamentPayoutAmount,
  validateTournamentPayoutConfig,
} from "./sprint2/tournament-payout-config.js";
export type {
  LookupTournamentPayoutInput,
  TournamentPayoutConfig,
  TournamentPayoutTable,
} from "./sprint2/tournament-payout-config.js";
export {
  applyTournamentFinalResultEarnings,
  computeAnnualEarningsApplicationIdentityHash,
  computeYearlyCumulativeEarnings,
  createEmptyAnnualEarningsLedger,
  listAnnualEarningsApplicationsForYear,
} from "./sprint2/annual-earnings.js";
export type {
  AnnualEarningsApplication,
  AnnualEarningsLedger,
  ApplyTournamentFinalResultEarningsInput,
  ApplyTournamentFinalResultEarningsOutput,
} from "./sprint2/annual-earnings.js";
export { projectAnnualRanking, projectAnnualRankingForBrowser } from "./sprint2/annual-ranking.js";
export type {
  AnnualRankingDisplayFacts,
  ProjectAnnualRankingInput,
} from "./sprint2/annual-ranking.js";
export {
  createEmptyAnnualRankingHistoryStore,
  finalizeClosedYearHistory,
  toAnnualRankingDisplayFacts,
  upsertAnnualRankingHistoryEntry,
  validateAnnualRankingHistoryEntry,
} from "./sprint2/annual-ranking-history.js";
export type {
  AnnualRankingHistoryEntry,
  AnnualRankingHistoryRow,
  AnnualRankingHistoryStore,
  FinalizeClosedYearHistoryOutput,
  UpsertAnnualRankingHistoryInput,
  UpsertAnnualRankingHistoryOutput,
} from "./sprint2/annual-ranking-history.js";
export { buildPreviousWorldYearEarningsSnapshot } from "./sprint2/previous-world-year-snapshot.js";
export type { PreviousWorldYearEarningsSnapshot } from "./sprint2/previous-world-year-snapshot.js";
export {
  computeDetailedLogPayloadHash,
  computeDetailedLogPayloadBytes,
  createEmptyDetailedLogPayloadStore,
  deleteDetailedLogPayloadEntries,
  getDetailedLogPayloadBytes,
  putDetailedLogPayloadIfAbsent,
  countRetainedPayloadReferences,
} from "./sprint2/detailed-log-payload-store.js";
export type {
  DetailedLogPayloadEntry,
  DetailedLogPayloadStore,
  PutDetailedLogPayloadOutcome,
} from "./sprint2/detailed-log-payload-store.js";
export {
  buildImportantBattleMarker,
  computeBattleResultHash,
  computeStoredRecordHash,
  publishStoredBattleResult,
  rejectRetroactiveImportantBattleMarker,
  validateImportantBattleMarker,
  validateStoredBattleResultRecord,
  validateStoredBattleResultReferences,
  withStoredBattleResultRetentionStatus,
} from "./sprint2/stored-battle-result.js";
export type {
  ImportantBattleMarker,
  PublishStoredBattleResultInput,
  PublishStoredBattleResultResult,
  StoredBattleResultRecord,
} from "./sprint2/stored-battle-result.js";
export {
  applyRetentionPrunePlan,
  classifyRetentionPolicy,
  isSummaryOrResultPermanent,
  planRetentionPruneUpdates,
  resolveDetailedLogRetentionYears,
  shouldPruneDetailedLogRecord,
} from "./sprint2/battle-log-retention.js";
export type { RetentionPolicyClass } from "./sprint2/battle-log-retention.js";
export {
  materializeStoredBattleResultView,
  rejectPrunedDetailedLogProjection,
  verifyRetainedDetailedLogPayloadIdentity,
} from "./sprint2/stored-battle-result-materialization.js";
export type { MaterializedBattleResultView } from "./sprint2/stored-battle-result-materialization.js";
export {
  executeDetailedLogPayloadGc,
  logicalPruneSurvivesGcFailure,
  planDetailedLogPayloadGc,
  retainedOwnerCountForPayload,
} from "./sprint2/stored-battle-result-gc.js";
export type {
  DetailedLogPayloadGcExecutionResult,
  DetailedLogPayloadGcExecutor,
  DetailedLogPayloadGcPlan,
} from "./sprint2/stored-battle-result-gc.js";
export {
  createInitialSprint2CheckpointRunContext,
  validateSprint2CheckpointRunContext,
  canonicalizeSprint2CheckpointRunContext,
} from "./sprint2/sprint2-checkpoint-context.js";
export type { Sprint2CheckpointRunContext } from "./sprint2/sprint2-checkpoint-context.js";
export {
  createInitialWorldWeekExecutionState,
  deriveProcessedWorldWeeks,
  markExecutionStateCompleted,
  normalizeCompletedToPendingWeek,
  toCompletedCheckpointExecutionState,
  validateWorldWeekExecutionState,
  assertExecutionStateConfigCompatibility,
} from "./sprint2/world-week-execution-state.js";
export type { WorldWeekExecutionState } from "./sprint2/world-week-execution-state.js";
export { runWeeks, runYears, SPRINT2_WEEKS_PER_WORLD_YEAR } from "./sprint2/run-weeks.js";
export type { RunWeeksOptions } from "./sprint2/run-weeks.js";
export {
  buildDetailedBattleLogCheckpointManifest,
  buildDetailedLogLogicalPath,
  validateDetailedBattleLogCheckpointManifest,
  validateDetailedLogLogicalPath,
} from "./sprint2/checkpoint-manifest.js";
export type {
  DetailedBattleLogCheckpointManifest,
  DetailedBattleLogCheckpointManifestEntry,
} from "./sprint2/checkpoint-manifest.js";
export {
  buildSprint2CheckpointBundle,
  validateSprint2CheckpointBundle,
  assertBundleRefMatchesBundle,
} from "./sprint2/checkpoint-bundle.js";
export type {
  Sprint2CheckpointBundle,
  Sprint2CheckpointBundleRef,
} from "./sprint2/checkpoint-bundle.js";
export {
  publishSprint2Checkpoint,
  beginCheckpointTransaction,
  endCheckpointTransaction,
  Sprint2CheckpointPublicationStore,
} from "./sprint2/checkpoint-publish.js";
export type {
  PublishCheckpointInput,
  PublishCheckpointOutcome,
} from "./sprint2/checkpoint-publish.js";
export {
  restoreSprint2CheckpointRunContextFromBundle,
  resumeSprint2CheckpointFromStore,
  rejectUnsupportedDraftCheckpointBundle,
} from "./sprint2/checkpoint-resume.js";
export type { ResumeCheckpointInput } from "./sprint2/checkpoint-resume.js";
export {
  validateSprint2TournamentEventPayload,
  TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
  TOURNAMENT_MATCH_BYE_EVENT_TYPE,
  TOURNAMENT_ROUND_COMPLETED_EVENT_TYPE,
  TOURNAMENT_FINISHED_EVENT_TYPE,
  PERSON_PROMOTION_QUALIFIED_EVENT_TYPE,
  PERSON_RANK_PROMOTED_EVENT_TYPE,
  PERSON_S_RANK_QUALIFIED_EVENT_TYPE,
  PERSON_S_RANK_PROMOTED_EVENT_TYPE,
  isSprint2TournamentEventType,
} from "./sprint2/tournament-event-payloads.js";
export type {
  TournamentMatchRecordedPayload,
  TournamentMatchByePayload,
  TournamentRoundCompletedPayload,
  TournamentFinishedPayload,
} from "./sprint2/tournament-event-payloads.js";
export {
  validateSprint2EventEnvelope,
  allocateSprint2EventEnvelope,
  validateSprint2EventSequence,
  rejectDuplicateSprint2EventCandidate,
  validateSprint2TournamentEventOrdering,
  sprint2EventsToJsonl,
  computeSprint2EventCandidateIdentity,
} from "./sprint2/tournament-event-envelope-sprint2.js";
export type {
  Sprint2EventEnvelope,
  Sprint2EventEntities,
  AllocateSprint2EventEnvelopeInput,
} from "./sprint2/tournament-event-envelope-sprint2.js";
export {
  projectSprint2InitialWorldDocument,
  projectSprint2FinalWorldDocument,
  materializeFinalWorldBattleResults,
  buildSprint2FixedSevenRunOutput,
  rejectFixedSevenProjectionMutation,
} from "./sprint2/fixed-seven-projection.js";
export type {
  Sprint2InitialWorldDocument,
  Sprint2FinalWorldDocument,
  Sprint2RunMetadataDocument,
  Sprint2ValidationReportDocument,
  Sprint2PerformanceDocument,
  Sprint2FixedSevenProjectionInput,
  FixedSevenRunOutput,
  Sprint2FinalWorldMaterializedBattleResult,
} from "./sprint2/fixed-seven-projection.js";
export {
  serializeFixedSevenToMemoryReference,
  serializeFixedSevenStreaming,
  reassembleFixedSevenFromStreaming,
  assertFixedSevenStreamingEqualsReference,
  measureFixedSevenUtf8Bytes,
} from "./sprint2/fixed-seven-serializer.js";
export type { FixedSevenStreamingChunk } from "./sprint2/fixed-seven-serializer.js";
export {
  Sprint2FixedSevenPublicationStore,
  publishSprint2FixedSevenRun,
  validateFixedSevenStagingMembership,
  listCompletedFixedSevenRuns,
  listStagingFixedSevenRuns,
} from "./sprint2/fixed-seven-publish.js";
export type {
  PublishFixedSevenRunInput,
  PublishFixedSevenRunOutcome,
} from "./sprint2/fixed-seven-publish.js";
export { createDefaultSprint2ConfigInput } from "./sprint2/sprint2-config-defaults.js";
export {
  computeSprint2ConfigHash,
  createDefaultSprint2Config,
  validateNormalizedSprint2Config,
  validateSprint2Config,
} from "./sprint2/validate-sprint2-config.js";
export {
  createDefaultSprint3ConfigInput,
  createSprint3Balance020ConfigInput,
  createSprint3Balance030ConfigInput,
  createSprint3Balance040ConfigInput,
  createSprint3Balance050ConfigInput,
  createSprint3Balance060ConfigInput,
  createSprint3Balance070ConfigInput,
  createSprint3Balance080ConfigInput,
} from "./sprint3/sprint3-config-defaults.js";
export {
  isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled,
  selectDiscipleCountTeachingEfficiencyFactor,
} from "./sprint3/resolve-weekly-disciple-count-teaching-efficiency.js";
export {
  isFormalMasterMentorshipRelationKind,
  isWeeklyTrainingParentTemporaryGuidanceEnabled,
  selectParentTemporaryGuidanceTeacherFactor,
  selectWeeklyTrainingTeacherFactorBasisPoints,
  shouldApplyParentTemporaryGuidanceTeacherFactor,
  validateWeeklyTrainingSprint3ConfigBinding,
} from "./sprint3/resolve-weekly-parent-temporary-guidance.js";
export { evaluateEnrollmentAssignment } from "./sprint3/evaluate-enrollment-assignment.js";
export {
  computeWeeklyTeachCompositeScore,
  computeWeeklyTeachingAllocationSlots,
  evaluateExplicitWeeklyTeachAction,
  evaluateWeeklyTeachRefusal,
  isExplicitWeeklyTeachActionEnabled,
} from "./sprint3/evaluate-explicit-weekly-teach.js";
export {
  evaluateTeachingSelectionReEvaluationDue,
  evaluateTechniqueTeachingSelection,
  isTechniqueTeachingSelectionEnabled,
  rankTeachableTechniqueCandidates,
} from "./sprint3/evaluate-technique-teaching-selection.js";
export {
  buildOriginalTechniqueFoundingHistoryRecord,
  classifyOriginalTechniqueResearchTier,
  computeFailedGenerationRetainedResearchValue,
  computeOriginalTechniqueGenerationSuccessPercentTenThousandths,
  disabledOriginalTechniqueGenerationOutcome,
  evaluateOriginalTechniqueGenerationAttempt,
  evaluateOriginalTechniqueLoss,
  isOriginalTechniqueLifecycleEnabled,
  rollOriginalTechniqueGenerationSuccess,
} from "./sprint3/evaluate-original-technique-lifecycle.js";
export {
  computeAutonomousMaxDisciples,
  evaluateMasterIntakeDecision,
} from "./sprint3/evaluate-master-intake.js";
export { evaluateMasterQualificationEligibility } from "./sprint3/evaluate-master-qualification.js";
export {
  computeSprint3ConfigHash,
  createDefaultSprint3Config,
  validateNormalizedSprint3Config,
  validateSprint3Config,
} from "./sprint3/validate-sprint3-config.js";
export {
  ENROLLMENT_ASSIGNMENT_PROCESSOR_ID,
  EXPLICIT_WEEKLY_TEACH_ACTION_PROCESSOR_ID,
  MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
  MASTER_INTAKE_EVALUATION_POLICY_DEFERRED,
  MASTER_INTAKE_EVALUATION_PROCESSOR_ID,
  MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
  MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
  SPRINT3_CONFIG_SCHEMA_VERSION,
  SPRINT3_CONFIG_VERSION_DEFAULT,
  SPRINT3_CONFIG_VERSION_ENROLLMENT,
  SPRINT3_CONFIG_VERSION_INTAKE,
  SPRINT3_CONFIG_VERSION_QUALIFICATION,
  SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
  SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
  SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
  SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
  ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY,
  ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID,
  TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY,
  TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID,
  WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
  WEEKLY_TRAINING_DISCIPLE_COUNT_TEACHING_EFFICIENCY_BINDING_ID,
  WEEKLY_TRAINING_PARENT_TEMPORARY_GUIDANCE_BINDING_ID,
} from "./sprint3/constants.js";
export type {
  DiscipleCountFactorBracket,
  EnrollmentAssignmentKind,
  EnrollmentAssignmentOutcome,
  EnrollmentAssignmentRecord,
  EnrollmentMasterCandidate,
  EnrollmentSpecialReason,
  ExplicitWeeklyTeachActionContract,
  Sprint3TeachingSelectionConfig,
  TeachingSelectionReEvaluationContext,
  TeachingSelectionReEvaluationDueResult,
  TeachingSelectionReEvaluationTriggers,
  TechniqueTeachingSelectionCandidate,
  TechniqueTeachingSelectionContract,
  TechniqueTeachingSelectionExcludedCandidate,
  TechniqueTeachingSelectionOutcome,
  TechniqueTeachingSelectionRankedCandidate,
  TechniqueTeachingSelectionRecord,
  OriginalTechniqueFoundingHistoryRecord,
  OriginalTechniqueGenerationOutcome,
  OriginalTechniqueGenerationOutcomeKind,
  OriginalTechniqueGenerationRecord,
  OriginalTechniqueLifecycleContract,
  OriginalTechniqueLossEvaluationRecord,
  OriginalTechniqueLossOutcome,
  OriginalTechniqueResearchTier,
  Sprint3OriginalTechniqueLifecycleConfig,
  Sprint3WeeklyTeachActionConfig,
  WeeklyTeachAllocationFormula,
  WeeklyTeachDiscipleDecision,
  WeeklyTeachDiscipleOutcome,
  WeeklyTeachDiscipleRequest,
  WeeklyTeachEvaluationInputScores,
  WeeklyTeachEvaluationWeights,
  WeeklyTeachTierThresholds,
  ExplicitWeeklyTeachActionOutcome,
  ExplicitWeeklyTeachActionOutcomeKind,
  ExplicitWeeklyTeachActionRecord,
  ExplicitWeeklyTeachMasterWeeklyAction,
  MasterIntakeAcceptance,
  MasterIntakeEvaluationOutcome,
  MasterIntakeEvaluationRecord,
  MasterIntakeLimitFormula,
  MentorshipRelationKind,
  Sprint3Config,
  Sprint3ConfigInput,
  Sprint3EnrollmentConfig,
  MasterQualificationEligibilityThresholds,
  MasterQualificationEvaluationOutcome,
  MasterQualificationEvaluationRecord,
  Sprint3MasterQualificationConfig,
  Sprint3MasterIntakeConfig,
  Sprint3MasterIntakeConfigAutonomousLimit,
  Sprint3MasterIntakeConfigDeferred,
  Sprint3MasterQualificationConfigDeferred,
  Sprint3MasterQualificationConfigWithThresholds,
  Sprint3MentorshipFeatureFlags,
  Sprint3TeachingEfficiencyConfig,
} from "./sprint3/types.js";
export type {
  Sprint2Config,
  Sprint2ConfigInput,
  CompetitionDomainBinding,
  CompetitionDomainRegistry,
  CompetitionDomainRegistryInput,
  DerivedTieKeyInput,
  PlannedScheduleSlot,
  TournamentIdGeneratorState,
  TournamentScheduleEntry,
  TournamentScheduleReadModelEntry,
  TournamentScheduleState,
  TournamentSeriesKey,
  EntrantCandidateFacts,
  EntrantEligibilityRejectionReason,
  EntrantEligibilityResult,
  EntryChoiceDecisionInput,
  EntryChoicePolicy,
  EntryChoicePolicyIdentity,
  EntryChoicePolicyResult,
  EntrySelectionHandoff,
  PlannedParticipantList,
  ScheduleLifecycleIdentity,
} from "./sprint2/types.js";
export type { Sprint2IdentityBindings } from "./sprint1/types.js";
export {
  ACTIVE_YEAR_START_PROCESSOR_MANIFEST_SCHEMA_VERSION,
  WORLD_YEAR_START_PROCESSOR_ID,
  YEAR_START_PROCESSOR_SLOTS,
  computeActiveYearStartProcessorManifestHash,
  createDefaultActiveYearStartProcessorManifest,
  validateActiveYearStartProcessorManifest,
} from "./sprint1/active-year-start-processor-manifest.js";
export type {
  ActiveYearStartProcessorManifest,
  ActiveYearStartProcessorManifestEntry,
  YearStartImplementationStatus,
  YearStartProcessorSlot,
} from "./sprint1/active-year-start-processor-manifest.js";
export {
  WORLD_YEAR_START_RECEIPT_SCHEMA_VERSION,
  WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION,
  WORLD_YEAR_START_TRANSACTION_AGGREGATE_SCHEMA_VERSION,
  cloneWorldYearStartRuntimeState,
  computeWorldYearStartTransactionAggregateHash,
  createInitialWorldYearStartRuntimeState,
  validateWorldYearStartReceipt,
  validateWorldYearStartRuntimeState,
  validateWorldYearStartTransactionAggregate,
} from "./sprint1/world-year-start-runtime-state.js";
export type {
  WorldYearStartReceipt,
  WorldYearStartRuntimeState,
  WorldYearStartTransactionAggregate,
} from "./sprint1/world-year-start-runtime-state.js";
export {
  computeLegacySimulationIdentityV040Hash,
  createSimulationIdFromLegacyIdentityV040Hash,
  LEGACY_S1_SPEC_VERSION_0_4_0,
  LEGACY_SIMULATION_IDENTITY_SCHEMA_VERSION_0_4_0,
  validateLegacySimulationIdentityV040,
} from "./sprint1/legacy-simulation-identity-0.4.0.js";
export type { LegacySimulationIdentityV040 } from "./sprint1/legacy-simulation-identity-0.4.0.js";
export {
  YEAR_START_SENTINEL_HASH,
  replaceWorldYearStartRuntimeState,
  runWorldYearStartPhase,
  sealWorldYearStartReceiptHashes,
} from "./sprint1/year-start-phase.js";
export type {
  YearStartPhaseHashContext,
  YearStartPhaseInput,
  YearStartPhaseResult,
} from "./sprint1/year-start-phase.js";
export {
  createDefaultYearStartProcessorRegistry,
  invokeYearStartProcessorsViaRegistry,
  validateRegistryAgainstManifest,
} from "./sprint1/year-start-processor-registry.js";
export type {
  YearStartExecutionPlan,
  YearStartProcessorCallable,
  YearStartProcessorExecutionState,
  YearStartProcessorRegistry,
  YearStartProcessorRegistryEntry,
} from "./sprint1/year-start-processor-registry.js";
export {
  classifyYearStartEventPair,
  listYearStartEventPairClassifications,
  validateYearStartReceiptEventProvenance,
} from "./sprint1/year-start-event-provenance.js";
export type {
  YearStartEventPairClassification,
  YearStartEventPairPhase,
} from "./sprint1/year-start-event-provenance.js";
export {
  YEAR_START_AGGREGATE_SENTINEL_HASH,
  buildWorldYearStartTransactionAggregate,
  computeEventAllocationStateHash,
  computeEventStreamHash,
  computeIdGeneratorStatesHash,
  computeProcessorRuntimeStateHash,
  computeWorldStateComponentHash,
  finalizePostTransactionAggregateHash,
} from "./sprint1/year-start-aggregate.js";
export type {
  YearStartAggregateComponentInput,
  YearStartAggregateHashes,
} from "./sprint1/year-start-aggregate.js";
export {
  BATTLE_RULES_SNAPSHOT_REF_KEYS,
  cloneBattleRulesSnapshotRef,
  createBattleRulesSnapshotRef,
  freezeBattleRulesSnapshotRef,
  validateBattleRulesSnapshotRef,
} from "./sprint1/battle-rules-snapshot-ref.js";
export type { BattleRulesSnapshotRef } from "./sprint1/battle-rules-snapshot-ref.js";
export {
  BASE_MAX_DURABILITY_OFFSET,
  BATTLE_PARTICIPANT_SNAPSHOT_KEYS,
  BATTLE_PARTICIPANT_SOURCE_KEYS,
  BATTLE_PARTICIPANT_SOURCE_SNAPSHOT_KEYS,
  MOCK_BATTLE_TRAINEE_MAXIMUM_AGE,
  MOCK_BATTLE_TRAINEE_MINIMUM_AGE,
  OFFICIAL_BATTLE_MAXIMUM_AGE,
  OFFICIAL_BATTLE_MINIMUM_AGE,
  START_DURABILITY_FULL_PERCENT_BASIS_POINTS,
  deriveBaseMaxDurability,
  deriveStartCurrentDurability,
  deriveStartDurabilityPercentBasisPoints,
  isEligibleForBattleKind,
  validateBattleParticipant,
  validateBattleParticipantSnapshot,
  validateBattleParticipantSource,
} from "./sprint1/battle-participant.js";
export type {
  BattleParticipantContext,
  BattleParticipantSnapshot,
  BattleParticipantSource,
  BattleParticipantSourceSnapshot,
} from "./sprint1/battle-participant.js";
export {
  BATTLE_DETAILED_LOG_KEYS,
  BATTLE_FAILURE_INFO_KEYS,
  BATTLE_STATE_KEYS,
  cloneBattleState,
  createEmptyBattleDetailedLog,
  freezeBattleState,
  validateBattleDetailedLog,
  validateBattleFailureInfo,
  validateBattleState,
  preflightPreparedBattleStateViewStructure,
  validatePreparedBattleStateView,
} from "./sprint1/battle-state.js";
export type { BattleDetailedLog, BattleFailureInfo, BattleState } from "./sprint1/battle-state.js";
export {
  START_BATTLE_RUNTIME_TRANSITION_KEYS,
  cloneStartBattleRuntimeTransition,
  freezeStartBattleRuntimeTransition,
  validateStartBattleRuntimeTransition,
  validateStartBattleRuntimeTransitionAgainst,
} from "./sprint1/start-battle-runtime-transition.js";
export type { StartBattleRuntimeTransition } from "./sprint1/start-battle-runtime-transition.js";
export {
  BATTLE_SIMULATION_SOURCE_PROCESSOR,
  BATTLE_STARTED_EVENT_TYPE,
} from "./sprint1/battle-started-event.js";
export type {
  BattleStartedEventCandidate,
  BattleStartedEventPayload,
} from "./sprint1/battle-started-event.js";
export { CREATE_BATTLE_REQUEST_KEYS } from "./sprint1/create-battle-state.js";
export type { CreateBattleRequest } from "./sprint1/create-battle-state.js";
export type { BattleStartValidation } from "./sprint1/begin-battle.js";
export type { StartBattleInput, StartBattleResult } from "./sprint1/start-battle-transaction.js";

// S01-006 battle turn resolution (prepare / strategy / resolve).
export {
  computeBattleStateCanonicalHash,
  prepareBattleTurn,
  validatePreparedBattleTurn,
  preflightPreparedBattleTurnStructure,
  bindPreparedBattleTurnToBattleState,
  buildPreparedStateView,
  PREPARE_BATTLE_TURN_INPUT_KEYS,
  PREPARED_BATTLE_TURN_KEYS,
} from "./sprint1/prepare-battle-turn.js";
export type {
  PreparedBattleTurn,
  PrepareBattleTurnResult,
  PrepareBattleTurnValidation,
} from "./sprint1/prepare-battle-turn.js";
export {
  validateBattleActionsSource,
  validateDefaultBattleStrategySource,
  validateScriptedActionSource,
  DEFAULT_BATTLE_STRATEGY_SOURCE_KEYS,
  SCRIPTED_ACTION_SOURCE_KEYS,
} from "./sprint1/battle-actions-source.js";
export type {
  BattleActionsSource,
  DefaultBattleStrategySource,
  ScriptedActionSource,
} from "./sprint1/battle-actions-source.js";
export {
  BATTLE_ACTION_LOG_KEYS,
  BATTLE_TURN_ORDER_LOG_KEYS,
  createEmptyBattleActionLogShell,
  validateBattleActionLog,
  validateBattleTurnOrderLog,
} from "./sprint1/battle-turn-logs.js";
export type {
  BattleActionLog,
  BattleTurnOrderLog,
  StrategyCandidateScoreEntry,
} from "./sprint1/battle-turn-logs.js";
export {
  DefaultBattleStrategy,
  runDefaultBattleStrategy,
  scoreStrategyAction,
} from "./sprint1/default-battle-strategy.js";
export type {
  BattleStrategyInput,
  BattleStrategyResult,
  StrategyScoreComponents,
} from "./sprint1/default-battle-strategy.js";
export {
  buildStrategyScoreComponents,
  compareBattleActionsCanonical,
  computePredictedMajorInjuryChance,
  computePredictedSelfInjuryChance,
  sortBattleActionsCanonical,
  strategyActionKey,
} from "./sprint1/battle-strategy-scoring.js";
export type {
  StrategyScoreBuildInput,
  StrategyScoreBuildResult,
} from "./sprint1/battle-strategy-scoring.js";
export {
  priorityForResolvedAction,
  computeActionOrderScoreWithoutRandom,
  resolveActionOrder,
} from "./sprint1/battle-action-order.js";
export type { Priority, ResolveActionOrderResult } from "./sprint1/battle-action-order.js";
export { enumerateLegalBattleActions } from "./sprint1/battle-legal-actions.js";
export {
  replaceIllegalBattleAction,
  cancelSecondActionAsOpponentEnded,
} from "./sprint1/battle-action-replacement.js";
export type { ActionReplacementResult } from "./sprint1/battle-action-replacement.js";
export {
  resolveBattleTurn,
  RESOLVE_BATTLE_TURN_INPUT_KEYS,
} from "./sprint1/resolve-battle-turn.js";
export type {
  ResolveBattleTurnResult,
  ResolveBattleTurnValidation,
} from "./sprint1/resolve-battle-turn.js";
export {
  createBattleParticipantReplayBaseline,
  validateBattleDetailedLogReplay,
  validateBattleStateReplayConsistency,
  assertEmptyLogMatchesBaseline,
} from "./sprint1/battle-detailed-log-replay.js";
export type { BattleParticipantReplayRuntime } from "./sprint1/battle-detailed-log-replay.js";
export {
  applyTerminalIfNeeded,
  isBattleTerminal,
  selectTerminalReason,
} from "./sprint1/battle-terminal.js";
export {
  computeSurrenderScore,
  includeSurrenderCandidate,
  surrenderActionScore,
} from "./sprint1/battle-surrender.js";
export {
  consumptionPerformanceFactor,
  applyConsumptionDelta,
  baseConsumptionForResolvedAction,
  isHighConsumptionBand,
} from "./sprint1/battle-consumption.js";
export { computeEffectiveMentalCost } from "./sprint1/battle-mental-cost.js";
export { computeActivationChancePercent, rollActivation } from "./sprint1/battle-activation.js";
export {
  computeHitChancePercent,
  computeHitChancePercentWithoutEvade,
  computeRangeHitModifier,
  rollHit,
} from "./sprint1/battle-hit.js";
export {
  averagePrimaryStatSurface,
  computeRawDamage,
  rollDamageWithVariance,
} from "./sprint1/battle-damage.js";
export {
  applyGuardedDamage,
  rangeShiftBlockChance,
  rollRangeShiftBlock,
} from "./sprint1/battle-defense.js";
export { computeMovementScores, rollMovement } from "./sprint1/battle-movement.js";
export {
  computeFocusBaseRecovery,
  resolveFocusMindAtTurnEnd,
  applyMentalRecovery,
} from "./sprint1/battle-focus-mind.js";
export {
  computeFinalInjuryChancePercent,
  rollInjury,
  applyInjuryDelta,
  baseInjuryChanceFromDamageRatio,
} from "./sprint1/battle-injury.js";
export type { InjuryResult } from "./sprint1/battle-injury.js";
export {
  accumulateTurnDamageTotals,
  isPassiveResolvedAction,
  selectAdvantageSide,
} from "./sprint1/battle-turn-aggregate.js";

// S1-SPEC-0.1.18 BattleResult deterministic contract helpers
export {
  BATTLE_PHASES,
  JUDGE_DECISIVE_CRITERIA,
  applyBattleTechniqueMasteryAttempts,
  battlePhaseFromIndex,
  compareEffectiveDamageRatio,
  compareLowerInBattleConsumption,
  compareRemainingDurabilityRatio,
  compareRemainingMental,
  compareSuccessfulHits,
  computeBattlePhaseIndex,
  computeFinalDurabilityRatioBasisPoints,
  decideJudgeWinner,
  isBattleKeyMomentLog,
  listBattlePhasesForTurnsExecuted,
} from "./sprint1/battle-result-contracts.js";
export type {
  BattleMasteryAttempt,
  BattlePhase,
  CrossProductComparison,
  JudgeDecisiveCriterion,
  JudgeTieBreakInput,
  JudgeTieBreakResult,
  JudgeTieBreakSide,
  KeyMomentCandidateLog,
} from "./sprint1/battle-result-contracts.js";

// S1-SPEC-0.1.19 post-start execution abort contracts
export {
  BATTLE_EXECUTION_ABORT_FAILURE_KINDS,
  BATTLE_EXECUTION_ABORT_STAGES,
  BattleExecutionAbortError,
  RUN_BATTLE_TO_COMPLETION_RESULT_KINDS,
  classifyRunBattleToCompletionOutcome,
  isBattleExecutionAbortError,
  isValidSha256HexDigest,
  issuesIndicateDependencyFailure,
} from "./sprint1/battle-execution-abort.js";
export type {
  BattleExecutionAbortErrorInput,
  BattleExecutionAbortFailureKind,
  BattleExecutionAbortStage,
  ClassifyRunBattleToCompletionOutcomeInput,
  RunBattleToCompletionOutcomeClassification,
  RunBattleToCompletionResultKind,
} from "./sprint1/battle-execution-abort.js";

// S01-007 BattleResult / post-effects / runBattleToCompletion
export {
  BATTLE_RESULT_SCHEMA_VERSION,
  RUN_BATTLE_COMMIT_PLAN_SCHEMA_VERSION,
  BATTLE_REPLAY_BUNDLE_SCHEMA_VERSION,
  BATTLE_RESULT_KINDS,
  BATTLE_END_REASONS,
  BATTLE_EXPERIENCE_OUTCOMES,
} from "./sprint1/battle-result-types.js";
export type {
  BattleResultKind,
  BattleEndReason,
  BattleExperienceOutcome,
  BattlePostProcessParticipantContext,
  BattlePostProcessContext,
  BattleFinalSnapshot,
  JudgeScoreBreakdown,
  JudgeScoreByParticipant,
  BattleTechniqueStateDelta,
  BattleExperienceSummary,
  BattleParticipantDevelopmentEffects,
  BattleDevelopmentEffects,
  BattlePhaseSummary,
  BattleKeyMoment,
  BattleSideRatioSummary,
  BattleSideValueSummary,
  BattleJudgeSummary,
  BattleInjuryParticipantSummary,
  BattleInjurySummary,
  BattleSummaryLog,
  BattleResultViolation,
  BattleResultValidation,
  BattleResult,
  FinalizeBattleResultInput,
} from "./sprint1/battle-result-types.js";
export {
  BATTLE_POST_PROCESS_CONTEXT_KEYS,
  consecutiveMatchKeyFromCount,
  validateBattlePostProcessContext,
  computePostProcessContextHash,
} from "./sprint1/battle-post-process-context.js";
export type { ConsecutiveMatchKey } from "./sprint1/battle-post-process-context.js";
export {
  markBattleFailedState,
  assertFailedStatePreservesCommittedBody,
} from "./sprint1/mark-battle-failed.js";
export {
  computeJudgeScoreBreakdown,
  buildJudgeScores,
  computeTechniqueScoreFromLogs,
} from "./sprint1/battle-judge-score.js";
export {
  buildDevelopmentEffects,
  countInjurySummaryForSide,
} from "./sprint1/battle-development-effects.js";
export { buildBattleSummaryLog, computeSummaryLogHash } from "./sprint1/battle-summary-log.js";
export {
  finalizeBattleResult,
  computeFinalStateHash,
  FINALIZE_BATTLE_RESULT_INPUT_KEYS,
} from "./sprint1/finalize-battle-result.js";
export {
  validateBattleResult,
  evaluateBattleResultValidation,
  BATTLE_RESULT_KEYS,
} from "./sprint1/validate-battle-result.js";
export {
  BATTLE_FINISHED_EVENT_TYPE,
  createBattleFinishedEventCandidate,
} from "./sprint1/battle-finished-event.js";
export type {
  BattleFinishedEventCandidate,
  BattleFinishedEventPayload,
  BattleFinishedSummary,
} from "./sprint1/battle-finished-event.js";
export {
  RUN_BATTLE_TO_COMPLETION_INPUT_KEYS,
  RUN_BATTLE_COMMIT_PLAN_STRUCTURE_INPUT_KEYS,
  computeRunBattleCommitPlanHash,
  runBattleToCompletion,
  validateRunBattleCommitPlanStructure,
} from "./sprint1/run-battle-to-completion.js";
export type {
  RunBattleToCompletionInput,
  RunBattleToCompletionResult,
  RunBattleCommitPlan,
  RunBattleCommitPlanStructuralValidation,
} from "./sprint1/run-battle-to-completion.js";
export { convertBattleResultToWorldEffectCandidates } from "./sprint1/battle-result-world-effects.js";
export {
  commitRunBattlePlan,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
} from "./sprint1/commit-run-battle-plan.js";
export type { CommitRunBattlePlanInput } from "./sprint1/commit-run-battle-plan.js";
export type {
  BattleResultWorldEffectCandidates,
  WorldPersonBattleEffectCandidate,
  WorldPersonTechniqueEffectCandidate,
} from "./sprint1/battle-result-world-effects.js";

export type {
  NameCandidateCategory,
  NameCandidateFile,
  NameDataManifest,
  NameDataManifestFiles,
  NameDataSelectionPolicy,
  NameManifestFileEntry,
  ValidatedNameData,
} from "./names/types.js";
export type { ValidateNameDataInput } from "./names/validate-name-data.js";
export {
  validateNameCandidateFile,
  validateNameData,
  validateNameDataManifest,
} from "./names/validate-name-data.js";

export type { Sha256Provider, Sha256Utf8Hasher } from "./sha256-provider.js";
export { computeConfigHash, computeNameDataHash } from "./sha256-provider.js";

export type { SeededRng, SeededRngFactory, SeededRngState } from "./rng.js";
export { createSeededRng, deriveSeed, importSeededRng, RNG_ALGORITHM_VERSION } from "./rng.js";

export type {
  EventEntities,
  EventEnvelope,
  EventImportance,
  EventOrigin,
  FamilyInitializedPayload,
  LineageInitializedPayload,
  PersonAgedPayload,
  PersonCareerStatusChangedPayload,
  PersonDebutedPayload,
  PersonForceRetiredPayload,
  PersonInitializedPayload,
  RelationshipInitializedPayload,
  SimulationCompletedPayload,
  Sprint0EventType,
  ValidationFailedPayload,
  WorldStartedPayload,
  WorldYearStartedPayload,
  WorldYearStatsFinalizedPayload,
} from "./events/types.js";
export {
  CAREER_STATUSES,
  EVENT_ENVELOPE_SCHEMA_VERSION,
  EVENT_IMPORTANCES,
  EVENT_ORIGINS,
  SPRINT0_EVENT_TYPES,
  emptyEventEntities,
  isCareerStatus,
  isEventImportance,
  isEventOrigin,
  isRank,
  isSprint0EventType,
} from "./events/types.js";
export { assertEventIdMatchesSequence, eventIdFromSequence } from "./events/event-id.js";
export type {
  EventFactoryCommon,
  SimulationCompletedFactoryInput,
  ValidationFailedFactoryInput,
} from "./events/factories.js";
export {
  createFamilyInitializedEvent,
  createLineageInitializedEvent,
  createPersonInitializedEvent,
  createRelationshipInitializedEvent,
  createSimulationCompletedEvent,
  createValidationFailedEvent,
  createWorldDateForYearStatsFinalized,
  createWorldStartedEvent,
} from "./events/factories.js";
export type { ConvertWorldCalendarTransitionsInput } from "./events/from-transitions.js";
export { convertWorldCalendarTransitions } from "./events/from-transitions.js";
export { eventsToJsonl } from "./events/jsonl.js";
export type { KnownEntityIds, ValidateEventSequenceOptions } from "./events/validate.js";
export { validateEventEnvelope, validateEventSequence } from "./events/validate.js";

export type {
  ValidationFailure,
  ValidationIssue,
  ValidationResult,
  ValidationSuccess,
} from "./validation.js";
export { failure, isSuccess, success } from "./validation.js";

export { generateInitialWorld } from "./initial-world/generate.js";
export { validateInitialWorldSnapshot } from "./initial-world/validate-snapshot.js";
export type {
  InitialGenerationSummary,
  InitialWorldGenerationInput,
  InitialWorldGenerationResult,
  InitialWorldSnapshot,
  InitialWorldValidationSummary,
  TargetActualPair,
  TargetActualRate,
} from "./initial-world/types.js";
export { InitialWorldGenerationError } from "./initial-world/errors.js";
export { buildSimulationIdMaterial, createSimulationId } from "./initial-world/simulation-id.js";
export {
  allocateByLargestRemainderOrdered,
  expandAllocationToList,
} from "./initial-world/largest-remainder.js";
export {
  FIXED_WORLD_ID,
  INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION,
  INITIAL_WORLD_SOURCE_PROCESSOR,
  S0_SPEC_VERSION,
  SIMULATION_SPEC_VERSION,
} from "./initial-world/constants.js";

export type {
  ProcessorRngEntry,
  ProcessorRuntimeState,
  ProcessorSpecificRuntimeEntry,
  RunWorldOneWeekInput,
  RunWorldWeeksInput,
  RunWorldYearsInput,
  WorldEngineErrorContext,
  WorldEngineRunResult,
  WorldEngineState,
  WorldProcessor,
  YearStatsFinalizedNotice,
} from "./world-engine/index.js";
export {
  WorldEngineError,
  cloneWorldEngineState,
  createWorldEngineState,
  runWorldOneWeek,
  runWorldWeeks,
  runWorldYears,
  validateWorldEngineState,
  cloneProcessorSpecificState,
  cloneRuntimeState,
  exportRuntimeState,
  validateAndCloneProcessorRuntimeState,
} from "./world-engine/index.js";
