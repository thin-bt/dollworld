import type { Rank } from "../enums.js";

export type AgeBandConfig = {
  minAge: number;
  maxAge: number;
  count: number;
};

export type RankDistribution = { readonly [K in Rank]: number };

export type NumericRange = {
  min: number;
  max: number;
};

export type WorldConfig = {
  startYear: number;
  startMonth: number;
  startWeekOfMonth: number;
  weeksPerMonth: number;
  monthsPerYear: number;
  birthMonth: number;
  birthWeekOfMonth: number;
};

export type PopulationConfig = {
  totalLiving: number;
  initialUserFounderCount: number;
  sexRatioMale: number;
  ageBands: AgeBandConfig[];
  activeRankDistribution: RankDistribution;
};

export type HistoryConfig = {
  initialDeceasedAncestors: number;
  minimumGenerationDepth: number;
  maximumGenerationDepth: number;
  earliestHistoricalYear: number;
  minimumAgeAtDeath: number;
  maximumAgeAtDeath: number;
  createExistingRelationships: boolean;
  createPastTournamentHistory: boolean;
};

export type RelationshipsConfig = {
  knownParentCoverage: number;
  twoKnownParentsCoverageAmongCovered: number;
  retiredSpouseCoverage: number;
  formalMasterCoverageAge8To41: number;
  minimumParentAgeAtChildbirth: number;
  maximumBiologicalParents: number;
};

export type FamiliesConfig = {
  initialFamilyCount: number;
  minimumMembersPerFamily: number;
  maximumMembersPerFamily: number;
  baseBirthRateRange: NumericRange;
};

export type TechniqueFocusWeights = {
  unarmed: number;
  sword: number;
  magic: number;
};

export type LineagesConfig = {
  initialLineageCount: number;
  initialQualifiedMasters: number;
  techniqueFocusWeights: TechniqueFocusWeights;
};

export type AbilitiesConfig = {
  minimum: number;
  maximum: number;
  initialSurfaceValueRange: NumericRange;
  initialGeneticValueRange: NumericRange;
  initialAptitudeRange: NumericRange;
  initialAptitudeGeneticValueRange: NumericRange;
};

export type NameDataConfig = {
  manifestPath: string;
  requiredVersion: string;
  neutralGivenNameProbability: number;
  familyNameSelection: "without_replacement";
  avoidDuplicateLivingFullNameWithinFamily: true;
  displayFormat: "{givenName}・{familyName}";
};

export type SimulationConfig = {
  defaultSeed: number;
  rngAlgorithm: "xoshiro128ss-v1";
  defaultYears: number;
  benchmarkYears: number[];
  emitWeeklyEvents: boolean;
};

export type ValidationTargetsConfig = {
  maximumInitialPopulationMismatch: number;
  maximumBrokenReferenceCount: number;
  sameSeedMustMatch: boolean;
  differentSeedShouldDiffer: boolean;
};

export type PerformanceTargetsConfig = {
  warningSecondsFor600People100Years: number;
  warningSecondsFor2000People100Years: number;
  measureOnlyPopulation: number;
};

export type InitialWorldConfig = {
  schemaVersion: string;
  profileId: string;
  purpose: string;
  world: WorldConfig;
  population: PopulationConfig;
  history: HistoryConfig;
  relationships: RelationshipsConfig;
  families: FamiliesConfig;
  lineages: LineagesConfig;
  abilities: AbilitiesConfig;
  nameData: NameDataConfig;
  simulation: SimulationConfig;
  validationTargets: ValidationTargetsConfig;
  performanceTargets: PerformanceTargetsConfig;
};
