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

export { canonicalize, compareUnicodeCodePoints, toCanonicalJson } from "./canonical-json.js";

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
  WorldConfig,
} from "./config/types.js";
export {
  allocateByLargestRemainder,
  validateInitialWorldConfig,
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
  applyYearStart,
  createInitialWorldCalendarState,
  stepOneWeek,
  stepWeeks,
} from "./world-calendar.js";

export type { WeekOfMonth, WorldDate, WorldMonth } from "./world-date.js";
export {
  WORLD_MONTH_ORDER,
  advanceOneWeek,
  advanceWeeks,
  createInitialWorldDate,
  createWorldDate,
  fromAbsoluteWeek,
  isAprilWeek1,
  isMarchWeek4,
  isSameWorldDate,
  toAbsoluteWeek,
  validateWorldDate,
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
  BATTLE_PROFILE_ADAPTER_VERSION,
  CANONICAL_JSON_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  EXPECTED_SPEC_VERSIONS,
  HASH_ALGORITHM,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_VERSION,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SIMULATION_IDENTITY_SCHEMA_VERSION,
  SPRINT1_CONFIG_SCHEMA_VERSION,
  SPRINT1_CONFIG_VERSION_DEFAULT,
} from "./sprint1/constants.js";
export {
  PERSON_TECHNIQUE_STATE_KEYS,
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
  isWeeklyStateUpdateEligible,
} from "./sprint1/weekly-update-eligibility.js";
export type { WeeklyEligibilityPerson } from "./sprint1/weekly-update-eligibility.js";
export { attachSprint1PersonStateToInitialWorld } from "./sprint1/attach-sprint1-person-state.js";

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

export type { Sha256Provider } from "./sha256-provider.js";
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
} from "./world-engine/index.js";
