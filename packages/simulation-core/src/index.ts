/**
 * @shared-world/simulation-core public API.
 * Sprint 0 domain types, config/name-data validation, canonical JSON, Sha256Provider, and seeded RNG.
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
export { RANKS } from "./enums.js";

export type {
  EventId,
  FamilyId,
  LineageId,
  MatchId,
  PersonId,
  RelationshipId,
  RunId,
  SimulationId,
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
  asTournamentId,
  asWorldId,
} from "./ids.js";

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
  ValidationFailure,
  ValidationIssue,
  ValidationResult,
  ValidationSuccess,
} from "./validation.js";
export { failure, isSuccess, success } from "./validation.js";
