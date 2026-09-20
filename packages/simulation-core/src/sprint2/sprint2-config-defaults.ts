/**
 * Canonical Sprint2Config default body (S2-SPEC-0.2.2-draft §7.2–7.7 / G069).
 * Values are fixed balance literals for `sprint2-balance-0.1.14`; changing content
 * requires a new configVersion registration.
 */
import { SPRINT2_CONFIG_SCHEMA_VERSION, SPRINT2_CONFIG_VERSION_DEFAULT } from "./constants.js";
import type { Sprint2ConfigInput } from "./types.js";

export function createDefaultSprint2ConfigInput(): Sprint2ConfigInput {
  return {
    schemaVersion: SPRINT2_CONFIG_SCHEMA_VERSION,
    configVersion: SPRINT2_CONFIG_VERSION_DEFAULT,
    schedule: {
      normalMonthOffsetsByRank: {
        F: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        E: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        D: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        C: [0, 2, 4, 6, 8, 10],
        B: [1, 4, 7, 10],
      },
      openMonthOffsets: [2, 5, 8, 11],
      limitedMonthOffsets: {
        unarmed: [0, 3, 6, 9],
        sword: [1, 4, 7, 10],
        magic: [2, 5, 8, 11],
      },
      promotionMonthOffsets: [2, 5, 8, 11],
      weekByKind: {
        normal: 1,
        open: 1,
        limited: 2,
        promotion: 3,
      },
    },
    tournamentCapacity: {
      normal: { minimum: 4, recommended: 8, maximum: 16 },
      open: { minimum: 2, recommended: 6, maximum: 16 },
      limited: { minimum: 4, recommended: 8, maximum: 32 },
      promotion: { minimum: 2, recommended: 8, maximum: 16 },
    },
    postponement: {
      maximumCount: 3,
      mergeIntoNextSameSeriesSlot: true,
      revalidateAtNextSlot: true,
      carryAcrossWorldYear: false,
      preserveAcceptedEntryAcrossDelay: false,
      deferredInterestBonusHundredths: 1000,
    },
    entry: {
      maximumTournamentReservationsPerWorldMonth: 1,
      enterThresholdHundredths: 5000,
      baseScoresHundredths: {
        normal: 4000,
        open: 4500,
        limited: 3000,
        promotion: 7000,
      },
      promotionQualificationBonusHundredths: 4000,
      rankGoalFitMaximumHundredths: 2000,
      domainFitMaximumHundredths: 2500,
      recentPerformanceLookbackMatches: 8,
      recentPerformanceRangeHundredths: [-1000, 2000],
      rivalInterestMaximumHundredths: 1500,
      personalityRangeHundredths: [-1500, 1500],
      fatiguePenaltyMaximumHundredths: 4000,
      injuryPenaltyMaximumHundredths: 5000,
      mentalExhaustionPenaltyMaximumHundredths: 2000,
    },
    format: {
      roundRobinMinimum: 2,
      roundRobinMaximum: 4,
      singleEliminationMinimum: 5,
      singleEliminationMaximum: 16,
      groupKnockoutMinimum: 17,
      groupKnockoutMaximum: 32,
      promotionAlwaysSingleElimination: true,
      groupCount: 8,
      groupAdvanceCount17to24: 1,
      groupAdvanceCount25to32: 2,
      allowThirdPlaceMatch: false,
      allowLoserBracket: false,
    },
    seeding: {
      rankOrder: { F: 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 },
      comparisonOrder: [
        "rank_order",
        "annual_ranking_points",
        "promotion_points",
        "win_rate_basis_points",
      ],
      useDerivedTieKeyOnlyForExactTie: true,
    },
    execution: {
      maximumMatchesPerPersonPerWorldWeek: 3,
      tournamentKindPriority: ["promotion", "open", "limited", "normal"],
      entrySelectionKindTieBreak: ["promotion", "open", "limited", "normal"],
      promotionEligibleOverridesOtherKinds: true,
      standardRunStopsOnBattleResolutionError: true,
      issueMatchIdForBye: false,
      issueMatchIdForForfeit: false,
    },
    standings: {
      winPoints: 3,
      lossPoints: 0,
      tieBreakOrder: [
        "tied_group_points",
        "opponent_points",
        "wins_against_higher_seed",
        "initial_seeding_key",
        "derived_tie_key",
      ],
    },
    promotion: {
      normalPlacementPoints: { champion: 8, runnerUp: 5, topFour: 3, completed: 1 },
      limitedPlacementPoints: { champion: 6, runnerUp: 4, topFour: 2, completed: 1 },
      qualificationBySourceRank: {
        F: { target: "E", points: 12, minimumQualifyingWins: 3 },
        E: { target: "D", points: 16, minimumQualifyingWins: 4 },
        D: { target: "C", points: 20, minimumQualifyingWins: 5 },
        C: { target: "B", points: 24, minimumQualifyingWins: 6 },
        B: { target: "A", points: 30, minimumQualifyingWins: 8 },
      },
      promotionSlots: { divisor: 4, minimum: 1, maximum: 4 },
      resetPointsAfterPromotion: true,
      preservePointsAfterFailedAttempt: true,
    },
    sQualification: {
      rollingWindowWeeks: 48,
      openPlacementPoints: { champion: 12, runnerUp: 8, topFour: 4, completed: 1 },
      openMatchWinPoints: 2,
      requiredPoints: 30,
      requiredWins: 8,
      requiredTitles: 1,
      alternativeRequiredFinals: 2,
    },
    annualRanking: {
      officialMatchWinPoints: 3,
      placementBonus: { champion: 10, runnerUp: 6, topFour: 3 },
      limitedPlacementFactorBasisPoints: 7500,
      tieBreakOrder: ["annual_ranking_points", "rank_at_finalization", "person_id"],
    },
    battleLogRetention: {
      normalDetailedLogWorldYears: 4,
      importantDetailedLogWorldYears: 100,
    },
    championship: {
      championshipCycleYears: 4,
      cycleOriginWorldYear: 1,
    },
  };
}
