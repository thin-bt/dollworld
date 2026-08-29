import type {
  COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION,
  COMPETITION_DOMAIN_REGISTRY_VERSION,
  CompetitionDomainKey,
  DERIVED_TIE_KEY_POLICY_VERSION,
  DerivedTieKeyPurpose,
  SPRINT2_CONFIG_SCHEMA_VERSION,
  TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION,
  TOURNAMENT_ID_GENERATOR_VERSION,
  TOURNAMENT_ID_NAMESPACE,
} from "./constants.js";

export type CapacityTriple = {
  minimum: number;
  recommended: number;
  maximum: number;
};

export type Sprint2ScheduleConfig = {
  normalMonthOffsetsByRank: Record<"F" | "E" | "D" | "C" | "B", readonly number[]>;
  openMonthOffsets: readonly number[];
  limitedMonthOffsets: Record<CompetitionDomainKey, readonly number[]>;
  promotionMonthOffsets: readonly number[];
  weekByKind: {
    normal: number;
    open: number;
    limited: number;
    promotion: number;
  };
};

export type Sprint2ConfigInput = {
  schemaVersion: typeof SPRINT2_CONFIG_SCHEMA_VERSION;
  configVersion: string;
  schedule: Sprint2ScheduleConfig;
  tournamentCapacity: {
    normal: CapacityTriple;
    open: CapacityTriple;
    limited: CapacityTriple;
    promotion: CapacityTriple;
  };
  postponement: {
    maximumCount: number;
    mergeIntoNextSameSeriesSlot: boolean;
    revalidateAtNextSlot: boolean;
    carryAcrossWorldYear: boolean;
    preserveAcceptedEntryAcrossDelay: boolean;
    deferredInterestBonusHundredths: number;
  };
  entry: {
    maximumTournamentReservationsPerWorldMonth: number;
    enterThresholdHundredths: number;
    baseScoresHundredths: {
      normal: number;
      open: number;
      limited: number;
      promotion: number;
    };
    promotionQualificationBonusHundredths: number;
    rankGoalFitMaximumHundredths: number;
    domainFitMaximumHundredths: number;
    recentPerformanceLookbackMatches: number;
    recentPerformanceRangeHundredths: readonly [number, number];
    rivalInterestMaximumHundredths: number;
    personalityRangeHundredths: readonly [number, number];
    fatiguePenaltyMaximumHundredths: number;
    injuryPenaltyMaximumHundredths: number;
    mentalExhaustionPenaltyMaximumHundredths: number;
  };
  format: {
    roundRobinMinimum: number;
    roundRobinMaximum: number;
    singleEliminationMinimum: number;
    singleEliminationMaximum: number;
    groupKnockoutMinimum: number;
    groupKnockoutMaximum: number;
    promotionAlwaysSingleElimination: boolean;
    groupCount: number;
    groupAdvanceCount17to24: number;
    groupAdvanceCount25to32: number;
    allowThirdPlaceMatch: boolean;
    allowLoserBracket: boolean;
  };
  seeding: {
    rankOrder: Record<"F" | "E" | "D" | "C" | "B" | "A" | "S", number>;
    comparisonOrder: readonly string[];
    useDerivedTieKeyOnlyForExactTie: boolean;
  };
  execution: {
    maximumMatchesPerPersonPerWorldWeek: number;
    tournamentKindPriority: readonly string[];
    entrySelectionKindTieBreak: readonly string[];
    promotionEligibleOverridesOtherKinds: boolean;
    standardRunStopsOnBattleResolutionError: boolean;
    issueMatchIdForBye: boolean;
    issueMatchIdForForfeit: boolean;
  };
  standings: {
    winPoints: number;
    lossPoints: number;
    tieBreakOrder: readonly string[];
  };
  promotion: {
    normalPlacementPoints: {
      champion: number;
      runnerUp: number;
      topFour: number;
      completed: number;
    };
    limitedPlacementPoints: {
      champion: number;
      runnerUp: number;
      topFour: number;
      completed: number;
    };
    qualificationBySourceRank: Record<
      "F" | "E" | "D" | "C" | "B",
      { target: string; points: number; minimumQualifyingWins: number }
    >;
    promotionSlots: { divisor: number; minimum: number; maximum: number };
    resetPointsAfterPromotion: boolean;
    preservePointsAfterFailedAttempt: boolean;
  };
  sQualification: {
    rollingWindowWeeks: number;
    openPlacementPoints: {
      champion: number;
      runnerUp: number;
      topFour: number;
      completed: number;
    };
    openMatchWinPoints: number;
    requiredPoints: number;
    requiredWins: number;
    requiredTitles: number;
    alternativeRequiredFinals: number;
  };
  annualRanking: {
    officialMatchWinPoints: number;
    placementBonus: { champion: number; runnerUp: number; topFour: number };
    limitedPlacementFactorBasisPoints: number;
    tieBreakOrder: readonly string[];
  };
  battleLogRetention: {
    normalDetailedLogWorldYears: number;
    importantDetailedLogWorldYears: number;
  };
  championship: {
    championshipCycleYears: 1 | 4;
    cycleOriginWorldYear: number;
  };
};

export type Sprint2Config = Sprint2ConfigInput;

export type CompetitionDomainBinding = {
  techniqueCategory: CompetitionDomainKey;
  basicAttackProfile: CompetitionDomainKey;
};

export type CompetitionDomainRegistryInput = {
  schemaVersion: typeof COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION;
  registryVersion: typeof COMPETITION_DOMAIN_REGISTRY_VERSION;
  bindings: Record<CompetitionDomainKey, CompetitionDomainBinding>;
  registryHash?: string;
};

export type CompetitionDomainRegistry = {
  schemaVersion: typeof COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION;
  registryVersion: typeof COMPETITION_DOMAIN_REGISTRY_VERSION;
  bindings: Record<CompetitionDomainKey, CompetitionDomainBinding>;
  registryHash: string;
};

export type DerivedTieKeyInput = {
  simulationId: string;
  runSeed: number;
  tiePolicyVersion: typeof DERIVED_TIE_KEY_POLICY_VERSION;
  purpose: DerivedTieKeyPurpose;
  scopeId: unknown;
  candidateStableId: unknown;
};

export type TournamentIdGeneratorState = {
  schemaVersion: typeof TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION;
  generatorVersion: typeof TOURNAMENT_ID_GENERATOR_VERSION;
  namespace: typeof TOURNAMENT_ID_NAMESPACE;
  nextSequence: number;
};
