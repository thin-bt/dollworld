/**
 * Sprint2Config structural validation and canonical hash (G069 / S2-SPEC-0.2.2-draft §7).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  SPRINT2_CONFIG_SCHEMA_VERSION,
  SPRINT2_CONFIG_VERSION_DEFAULT,
  type CompetitionDomainKey,
} from "./constants.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import {
  getExpectedCanonicalJsonForSprint2ConfigVersion,
  isKnownSprint2ConfigVersion,
  registerKnownSprint2ConfigVersion,
} from "./sprint2-config-version-registry.js";
import type { CapacityTriple, Sprint2Config, Sprint2ConfigInput } from "./types.js";
import {
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireInteger,
  requireIntegerInRange,
  requireBoolean,
  requireLiteralString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";

const ROOT_KEYS = [
  "schemaVersion",
  "configVersion",
  "schedule",
  "tournamentCapacity",
  "postponement",
  "entry",
  "format",
  "seeding",
  "execution",
  "standings",
  "promotion",
  "sQualification",
  "annualRanking",
  "battleLogRetention",
  "championship",
] as const;

const FORBIDDEN_CALENDAR_ROOT_KEYS = [
  "worldYearStartMonth",
  "monthsPerWorldYear",
  "weeksPerMonth",
  "worldYearStartWeek",
] as const;

const RANK_KEYS_F_TO_B = ["F", "E", "D", "C", "B"] as const;
const RANK_ORDER_KEYS = ["F", "E", "D", "C", "B", "A", "S"] as const;
const TOURNAMENT_KINDS = ["normal", "open", "limited", "promotion"] as const;
const DOMAIN_KEYS: readonly CompetitionDomainKey[] = ["unarmed", "sword", "magic"];

function requireSafeInteger(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireInteger(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  const raw = object[key];
  if (typeof raw === "number" && (!Number.isFinite(raw) || !Number.isInteger(raw))) {
    issues.push({
      path: parentPath === "" ? `/${key}` : `${parentPath}/${key}`,
      message: "value must be a safe integer without fractional/NaN/Infinity input",
      actual: raw,
      expected: "safe integer",
    });
    return undefined;
  }
  return value;
}

function validateMonthOffsetArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): readonly number[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }
  const parsed: number[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (typeof item !== "number" || !Number.isSafeInteger(item) || item < 0 || item > 11) {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "month offset must be an integer in 0..11",
        actual: item,
        expected: "0..11",
      });
      return undefined;
    }
    parsed.push(item);
  }
  for (let index = 1; index < parsed.length; index += 1) {
    const current = parsed[index]!;
    const previous = parsed[index - 1]!;
    if (current <= previous) {
      issues.push({
        path,
        message: "month offsets must be strictly ascending with no duplicates",
        actual: parsed,
        expected: "ascending unique offsets",
      });
      return undefined;
    }
  }
  return Object.freeze(parsed);
}

function parseCapacityTriple(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): CapacityTriple | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(object, ["minimum", "recommended", "maximum"], path, issues);
  const minimum = requireSafeInteger(object, "minimum", path, issues);
  const recommended = requireSafeInteger(object, "recommended", path, issues);
  const maximum = requireSafeInteger(object, "maximum", path, issues);
  if (minimum === undefined || recommended === undefined || maximum === undefined) {
    return undefined;
  }
  if (minimum > recommended) {
    issues.push({
      path: `${path}/minimum`,
      message: "minimum must not exceed recommended",
      actual: minimum,
      expected: `<= ${String(recommended)}`,
    });
  }
  if (recommended > maximum) {
    issues.push({
      path: `${path}/recommended`,
      message: "recommended must not exceed maximum",
      actual: recommended,
      expected: `<= ${String(maximum)}`,
    });
  }
  if (issues.some((issue) => issue.path.startsWith(path))) {
    return undefined;
  }
  return { minimum, recommended, maximum };
}

function parseSchedule(
  value: unknown,
  issues: ValidationIssue[],
): Sprint2ConfigInput["schedule"] | undefined {
  const object = snapshotPlainObjectOrFail(value, "/schedule", issues);
  if (object === undefined) {
    return undefined;
  }
  const keys = [
    "normalMonthOffsetsByRank",
    "openMonthOffsets",
    "limitedMonthOffsets",
    "promotionMonthOffsets",
    "weekByKind",
  ] as const;
  rejectUnknownKeys(object, keys, "/schedule", issues);

  const rankObject = snapshotPlainObjectOrFail(
    object["normalMonthOffsetsByRank"],
    "/schedule/normalMonthOffsetsByRank",
    issues,
  );
  const normalMonthOffsetsByRank: Partial<
    Record<(typeof RANK_KEYS_F_TO_B)[number], readonly number[]>
  > = {};
  if (rankObject !== undefined) {
    rejectUnknownKeys(rankObject, RANK_KEYS_F_TO_B, "/schedule/normalMonthOffsetsByRank", issues);
    for (const rank of RANK_KEYS_F_TO_B) {
      const offsets = validateMonthOffsetArray(
        rankObject[rank],
        `/schedule/normalMonthOffsetsByRank/${rank}`,
        issues,
      );
      if (offsets !== undefined) {
        normalMonthOffsetsByRank[rank] = offsets;
      }
    }
  }

  const openMonthOffsets = validateMonthOffsetArray(
    object["openMonthOffsets"],
    "/schedule/openMonthOffsets",
    issues,
  );
  const promotionMonthOffsets = validateMonthOffsetArray(
    object["promotionMonthOffsets"],
    "/schedule/promotionMonthOffsets",
    issues,
  );

  const limitedObject = snapshotPlainObjectOrFail(
    object["limitedMonthOffsets"],
    "/schedule/limitedMonthOffsets",
    issues,
  );
  const limitedMonthOffsets: Partial<Record<CompetitionDomainKey, readonly number[]>> = {};
  if (limitedObject !== undefined) {
    rejectUnknownKeys(limitedObject, DOMAIN_KEYS, "/schedule/limitedMonthOffsets", issues);
    for (const domain of DOMAIN_KEYS) {
      const offsets = validateMonthOffsetArray(
        limitedObject[domain],
        `/schedule/limitedMonthOffsets/${domain}`,
        issues,
      );
      if (offsets !== undefined) {
        limitedMonthOffsets[domain] = offsets;
      }
    }
  }

  const weekObject = snapshotPlainObjectOrFail(
    object["weekByKind"],
    "/schedule/weekByKind",
    issues,
  );
  const weekByKind: Sprint2ConfigInput["schedule"]["weekByKind"] | undefined =
    weekObject === undefined
      ? undefined
      : (() => {
          rejectUnknownKeys(weekObject, TOURNAMENT_KINDS, "/schedule/weekByKind", issues);
          const normal = requireSafeInteger(weekObject, "normal", "/schedule/weekByKind", issues);
          const open = requireSafeInteger(weekObject, "open", "/schedule/weekByKind", issues);
          const limited = requireSafeInteger(weekObject, "limited", "/schedule/weekByKind", issues);
          const promotion = requireSafeInteger(
            weekObject,
            "promotion",
            "/schedule/weekByKind",
            issues,
          );
          if (
            normal === undefined ||
            open === undefined ||
            limited === undefined ||
            promotion === undefined
          ) {
            return undefined;
          }
          return { normal, open, limited, promotion };
        })();

  if (
    RANK_KEYS_F_TO_B.some((rank) => normalMonthOffsetsByRank[rank] === undefined) ||
    openMonthOffsets === undefined ||
    promotionMonthOffsets === undefined ||
    DOMAIN_KEYS.some((domain) => limitedMonthOffsets[domain] === undefined) ||
    weekByKind === undefined
  ) {
    return undefined;
  }

  return {
    normalMonthOffsetsByRank:
      normalMonthOffsetsByRank as Sprint2ConfigInput["schedule"]["normalMonthOffsetsByRank"],
    openMonthOffsets,
    limitedMonthOffsets:
      limitedMonthOffsets as Sprint2ConfigInput["schedule"]["limitedMonthOffsets"],
    promotionMonthOffsets,
    weekByKind,
  };
}

function parseBattleLogRetention(
  value: unknown,
  issues: ValidationIssue[],
): Sprint2ConfigInput["battleLogRetention"] | undefined {
  const object = snapshotPlainObjectOrFail(value, "/battleLogRetention", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["normalDetailedLogWorldYears", "importantDetailedLogWorldYears"],
    "/battleLogRetention",
    issues,
  );
  const normal = requireIntegerInRange(
    object,
    "normalDetailedLogWorldYears",
    "/battleLogRetention",
    1,
    10,
    issues,
  );
  const important = requireSafeInteger(
    object,
    "importantDetailedLogWorldYears",
    "/battleLogRetention",
    issues,
  );
  if (normal === undefined || important === undefined) {
    return undefined;
  }
  if (important !== 100) {
    issues.push({
      path: "/battleLogRetention/importantDetailedLogWorldYears",
      message: "importantDetailedLogWorldYears must equal fixed literal 100",
      actual: important,
      expected: "100",
    });
    return undefined;
  }
  return {
    normalDetailedLogWorldYears: normal,
    importantDetailedLogWorldYears: important,
  };
}

function parseChampionship(
  value: unknown,
  issues: ValidationIssue[],
): Sprint2ConfigInput["championship"] | undefined {
  const object = snapshotPlainObjectOrFail(value, "/championship", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["championshipCycleYears", "cycleOriginWorldYear"],
    "/championship",
    issues,
  );
  const cycleYearsRaw = object["championshipCycleYears"];
  if (cycleYearsRaw !== 1 && cycleYearsRaw !== 4) {
    issues.push({
      path: "/championship/championshipCycleYears",
      message: "championshipCycleYears must be 1 or 4",
      actual: cycleYearsRaw,
      expected: "1 | 4",
    });
    return undefined;
  }
  const cycleOriginWorldYear = requireIntegerInRange(
    object,
    "cycleOriginWorldYear",
    "/championship",
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  if (cycleOriginWorldYear === undefined) {
    return undefined;
  }
  return {
    championshipCycleYears: cycleYearsRaw,
    cycleOriginWorldYear,
  };
}

function parseGenericSection<T>(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: ValidationIssue[],
  parser: (
    object: Record<string, unknown>,
    path: string,
    issues: ValidationIssue[],
  ) => T | undefined,
): T | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(object, keys, path, issues);
  return parser(object, path, issues);
}

function parsePostponement(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["postponement"] | undefined {
  const keys = [
    "maximumCount",
    "mergeIntoNextSameSeriesSlot",
    "revalidateAtNextSlot",
    "carryAcrossWorldYear",
    "preserveAcceptedEntryAcrossDelay",
    "deferredInterestBonusHundredths",
  ] as const;
  rejectUnknownKeys(object, keys, path, issues);
  const maximumCount = requireSafeInteger(object, "maximumCount", path, issues);
  const deferredInterestBonusHundredths = requireSafeInteger(
    object,
    "deferredInterestBonusHundredths",
    path,
    issues,
  );
  const mergeIntoNextSameSeriesSlot = requireBoolean(
    object,
    "mergeIntoNextSameSeriesSlot",
    path,
    issues,
  );
  const revalidateAtNextSlot = requireBoolean(object, "revalidateAtNextSlot", path, issues);
  const carryAcrossWorldYear = requireBoolean(object, "carryAcrossWorldYear", path, issues);
  const preserveAcceptedEntryAcrossDelay = requireBoolean(
    object,
    "preserveAcceptedEntryAcrossDelay",
    path,
    issues,
  );
  if (
    maximumCount === undefined ||
    deferredInterestBonusHundredths === undefined ||
    mergeIntoNextSameSeriesSlot === undefined ||
    revalidateAtNextSlot === undefined ||
    carryAcrossWorldYear === undefined ||
    preserveAcceptedEntryAcrossDelay === undefined
  ) {
    return undefined;
  }
  return {
    maximumCount,
    mergeIntoNextSameSeriesSlot,
    revalidateAtNextSlot,
    carryAcrossWorldYear,
    preserveAcceptedEntryAcrossDelay,
    deferredInterestBonusHundredths,
  };
}

function parseEntry(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["entry"] | undefined {
  const keys = [
    "maximumTournamentReservationsPerWorldMonth",
    "enterThresholdHundredths",
    "baseScoresHundredths",
    "promotionQualificationBonusHundredths",
    "rankGoalFitMaximumHundredths",
    "domainFitMaximumHundredths",
    "recentPerformanceLookbackMatches",
    "recentPerformanceRangeHundredths",
    "rivalInterestMaximumHundredths",
    "personalityRangeHundredths",
    "fatiguePenaltyMaximumHundredths",
    "injuryPenaltyMaximumHundredths",
    "mentalExhaustionPenaltyMaximumHundredths",
  ] as const;
  rejectUnknownKeys(object, keys, path, issues);

  const baseScoresObject = snapshotPlainObjectOrFail(
    object["baseScoresHundredths"],
    `${path}/baseScoresHundredths`,
    issues,
  );
  const baseScoresHundredths: Partial<Record<(typeof TOURNAMENT_KINDS)[number], number>> = {};
  if (baseScoresObject !== undefined) {
    rejectUnknownKeys(baseScoresObject, TOURNAMENT_KINDS, `${path}/baseScoresHundredths`, issues);
    for (const kind of TOURNAMENT_KINDS) {
      const score = requireSafeInteger(
        baseScoresObject,
        kind,
        `${path}/baseScoresHundredths`,
        issues,
      );
      if (score !== undefined) {
        baseScoresHundredths[kind] = score;
      }
    }
  }

  const recentRange = snapshotDenseArrayOrFail(
    object["recentPerformanceRangeHundredths"],
    `${path}/recentPerformanceRangeHundredths`,
    issues,
    2,
  );
  const personalityRange = snapshotDenseArrayOrFail(
    object["personalityRangeHundredths"],
    `${path}/personalityRangeHundredths`,
    issues,
    2,
  );

  const maximumTournamentReservationsPerWorldMonth = requireSafeInteger(
    object,
    "maximumTournamentReservationsPerWorldMonth",
    path,
    issues,
  );
  const enterThresholdHundredths = requireSafeInteger(
    object,
    "enterThresholdHundredths",
    path,
    issues,
  );
  const promotionQualificationBonusHundredths = requireSafeInteger(
    object,
    "promotionQualificationBonusHundredths",
    path,
    issues,
  );
  const rankGoalFitMaximumHundredths = requireSafeInteger(
    object,
    "rankGoalFitMaximumHundredths",
    path,
    issues,
  );
  const domainFitMaximumHundredths = requireSafeInteger(
    object,
    "domainFitMaximumHundredths",
    path,
    issues,
  );
  const recentPerformanceLookbackMatches = requireSafeInteger(
    object,
    "recentPerformanceLookbackMatches",
    path,
    issues,
  );
  const rivalInterestMaximumHundredths = requireSafeInteger(
    object,
    "rivalInterestMaximumHundredths",
    path,
    issues,
  );
  const fatiguePenaltyMaximumHundredths = requireSafeInteger(
    object,
    "fatiguePenaltyMaximumHundredths",
    path,
    issues,
  );
  const injuryPenaltyMaximumHundredths = requireSafeInteger(
    object,
    "injuryPenaltyMaximumHundredths",
    path,
    issues,
  );
  const mentalExhaustionPenaltyMaximumHundredths = requireSafeInteger(
    object,
    "mentalExhaustionPenaltyMaximumHundredths",
    path,
    issues,
  );

  if (
    TOURNAMENT_KINDS.some((kind) => baseScoresHundredths[kind] === undefined) ||
    recentRange === undefined ||
    personalityRange === undefined ||
    maximumTournamentReservationsPerWorldMonth === undefined ||
    enterThresholdHundredths === undefined ||
    promotionQualificationBonusHundredths === undefined ||
    rankGoalFitMaximumHundredths === undefined ||
    domainFitMaximumHundredths === undefined ||
    recentPerformanceLookbackMatches === undefined ||
    rivalInterestMaximumHundredths === undefined ||
    fatiguePenaltyMaximumHundredths === undefined ||
    injuryPenaltyMaximumHundredths === undefined ||
    mentalExhaustionPenaltyMaximumHundredths === undefined
  ) {
    return undefined;
  }

  const parsePair = (items: readonly unknown[], pairPath: string): readonly [number, number] => {
    const lowObject = { value: items[0] };
    const highObject = { value: items[1] };
    const low = requireSafeInteger(lowObject, "value", pairPath, issues);
    const high = requireSafeInteger(highObject, "value", pairPath, issues);
    if (low === undefined || high === undefined) {
      return [0, 0];
    }
    return [low, high];
  };

  return {
    maximumTournamentReservationsPerWorldMonth,
    enterThresholdHundredths,
    baseScoresHundredths:
      baseScoresHundredths as Sprint2ConfigInput["entry"]["baseScoresHundredths"],
    promotionQualificationBonusHundredths,
    rankGoalFitMaximumHundredths,
    domainFitMaximumHundredths,
    recentPerformanceLookbackMatches,
    recentPerformanceRangeHundredths: parsePair(
      recentRange,
      `${path}/recentPerformanceRangeHundredths`,
    ),
    rivalInterestMaximumHundredths,
    personalityRangeHundredths: parsePair(personalityRange, `${path}/personalityRangeHundredths`),
    fatiguePenaltyMaximumHundredths,
    injuryPenaltyMaximumHundredths,
    mentalExhaustionPenaltyMaximumHundredths,
  };
}

function parseFormat(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["format"] | undefined {
  const keys = [
    "roundRobinMinimum",
    "roundRobinMaximum",
    "singleEliminationMinimum",
    "singleEliminationMaximum",
    "groupKnockoutMinimum",
    "groupKnockoutMaximum",
    "promotionAlwaysSingleElimination",
    "groupCount",
    "groupAdvanceCount17to24",
    "groupAdvanceCount25to32",
    "allowThirdPlaceMatch",
    "allowLoserBracket",
  ] as const;
  rejectUnknownKeys(object, keys, path, issues);
  const parsed: Record<string, number | boolean | undefined> = {};
  for (const key of keys) {
    if (typeof object[key] === "boolean") {
      parsed[key] = requireBoolean(object, key, path, issues);
    } else {
      parsed[key] = requireSafeInteger(object, key, path, issues);
    }
  }
  if (keys.some((key) => parsed[key] === undefined)) {
    return undefined;
  }
  return parsed as Sprint2ConfigInput["format"];
}

function parseSeeding(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["seeding"] | undefined {
  rejectUnknownKeys(
    object,
    ["rankOrder", "comparisonOrder", "useDerivedTieKeyOnlyForExactTie"],
    path,
    issues,
  );
  const rankObject = snapshotPlainObjectOrFail(object["rankOrder"], `${path}/rankOrder`, issues);
  const rankOrder: Partial<Record<(typeof RANK_ORDER_KEYS)[number], number>> = {};
  if (rankObject !== undefined) {
    rejectUnknownKeys(rankObject, RANK_ORDER_KEYS, `${path}/rankOrder`, issues);
    for (const rank of RANK_ORDER_KEYS) {
      const value = requireSafeInteger(rankObject, rank, `${path}/rankOrder`, issues);
      if (value !== undefined) {
        rankOrder[rank] = value;
      }
    }
  }
  const comparisonOrder = snapshotDenseArrayOrFail(
    object["comparisonOrder"],
    `${path}/comparisonOrder`,
    issues,
  );
  const useDerivedTieKeyOnlyForExactTie = requireBoolean(
    object,
    "useDerivedTieKeyOnlyForExactTie",
    path,
    issues,
  );
  if (
    RANK_ORDER_KEYS.some((rank) => rankOrder[rank] === undefined) ||
    comparisonOrder === undefined ||
    useDerivedTieKeyOnlyForExactTie === undefined
  ) {
    return undefined;
  }
  return {
    rankOrder: rankOrder as Sprint2ConfigInput["seeding"]["rankOrder"],
    comparisonOrder: comparisonOrder as string[],
    useDerivedTieKeyOnlyForExactTie,
  };
}

function parseStringArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): readonly string[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }
  const parsed: string[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (typeof item !== "string" || item.length === 0) {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "array item must be a non-empty string",
        actual: item,
        expected: "string",
      });
      return undefined;
    }
    parsed.push(item);
  }
  return Object.freeze(parsed);
}

function parseExecution(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["execution"] | undefined {
  const keys = [
    "maximumMatchesPerPersonPerWorldWeek",
    "tournamentKindPriority",
    "entrySelectionKindTieBreak",
    "promotionEligibleOverridesOtherKinds",
    "standardRunStopsOnBattleResolutionError",
    "issueMatchIdForBye",
    "issueMatchIdForForfeit",
  ] as const;
  rejectUnknownKeys(object, keys, path, issues);
  const maximumMatchesPerPersonPerWorldWeek = requireSafeInteger(
    object,
    "maximumMatchesPerPersonPerWorldWeek",
    path,
    issues,
  );
  const tournamentKindPriority = parseStringArray(
    object["tournamentKindPriority"],
    `${path}/tournamentKindPriority`,
    issues,
  );
  const entrySelectionKindTieBreak = parseStringArray(
    object["entrySelectionKindTieBreak"],
    `${path}/entrySelectionKindTieBreak`,
    issues,
  );
  const promotionEligibleOverridesOtherKinds = requireBoolean(
    object,
    "promotionEligibleOverridesOtherKinds",
    path,
    issues,
  );
  const standardRunStopsOnBattleResolutionError = requireBoolean(
    object,
    "standardRunStopsOnBattleResolutionError",
    path,
    issues,
  );
  const issueMatchIdForBye = requireBoolean(object, "issueMatchIdForBye", path, issues);
  const issueMatchIdForForfeit = requireBoolean(object, "issueMatchIdForForfeit", path, issues);
  if (
    maximumMatchesPerPersonPerWorldWeek === undefined ||
    tournamentKindPriority === undefined ||
    entrySelectionKindTieBreak === undefined ||
    promotionEligibleOverridesOtherKinds === undefined ||
    standardRunStopsOnBattleResolutionError === undefined ||
    issueMatchIdForBye === undefined ||
    issueMatchIdForForfeit === undefined
  ) {
    return undefined;
  }
  return {
    maximumMatchesPerPersonPerWorldWeek,
    tournamentKindPriority,
    entrySelectionKindTieBreak,
    promotionEligibleOverridesOtherKinds,
    standardRunStopsOnBattleResolutionError,
    issueMatchIdForBye,
    issueMatchIdForForfeit,
  };
}

function parseStandings(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["standings"] | undefined {
  rejectUnknownKeys(object, ["winPoints", "lossPoints", "tieBreakOrder"], path, issues);
  const winPoints = requireSafeInteger(object, "winPoints", path, issues);
  const lossPoints = requireSafeInteger(object, "lossPoints", path, issues);
  const tieBreakOrder = parseStringArray(object["tieBreakOrder"], `${path}/tieBreakOrder`, issues);
  if (winPoints === undefined || lossPoints === undefined || tieBreakOrder === undefined) {
    return undefined;
  }
  return { winPoints, lossPoints, tieBreakOrder };
}

function parsePromotion(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["promotion"] | undefined {
  const keys = [
    "normalPlacementPoints",
    "limitedPlacementPoints",
    "qualificationBySourceRank",
    "promotionSlots",
    "resetPointsAfterPromotion",
    "preservePointsAfterFailedAttempt",
  ] as const;
  rejectUnknownKeys(object, keys, path, issues);

  const parsePlacement = (
    value: unknown,
    placementPath: string,
  ): Sprint2ConfigInput["promotion"]["normalPlacementPoints"] | undefined => {
    const placementObject = snapshotPlainObjectOrFail(value, placementPath, issues);
    if (placementObject === undefined) {
      return undefined;
    }
    const placementKeys = ["champion", "runnerUp", "topFour", "completed"] as const;
    rejectUnknownKeys(placementObject, placementKeys, placementPath, issues);
    const parsed: Partial<Record<(typeof placementKeys)[number], number>> = {};
    for (const key of placementKeys) {
      const score = requireSafeInteger(placementObject, key, placementPath, issues);
      if (score !== undefined) {
        parsed[key] = score;
      }
    }
    if (placementKeys.some((key) => parsed[key] === undefined)) {
      return undefined;
    }
    return parsed as Sprint2ConfigInput["promotion"]["normalPlacementPoints"];
  };

  const qualificationObject = snapshotPlainObjectOrFail(
    object["qualificationBySourceRank"],
    `${path}/qualificationBySourceRank`,
    issues,
  );
  const qualificationBySourceRank: Partial<
    Sprint2ConfigInput["promotion"]["qualificationBySourceRank"]
  > = {};
  if (qualificationObject !== undefined) {
    rejectUnknownKeys(
      qualificationObject,
      ["F", "E", "D", "C", "B"],
      `${path}/qualificationBySourceRank`,
      issues,
    );
    for (const rank of ["F", "E", "D", "C", "B"] as const) {
      const entryObject = snapshotPlainObjectOrFail(
        qualificationObject[rank],
        `${path}/qualificationBySourceRank/${rank}`,
        issues,
      );
      if (entryObject === undefined) {
        continue;
      }
      rejectUnknownKeys(
        entryObject,
        ["target", "points", "minimumQualifyingWins"],
        `${path}/qualificationBySourceRank/${rank}`,
        issues,
      );
      const target = objectString(
        entryObject,
        "target",
        `${path}/qualificationBySourceRank/${rank}`,
        issues,
      );
      const points = requireSafeInteger(
        entryObject,
        "points",
        `${path}/qualificationBySourceRank/${rank}`,
        issues,
      );
      const minimumQualifyingWins = requireSafeInteger(
        entryObject,
        "minimumQualifyingWins",
        `${path}/qualificationBySourceRank/${rank}`,
        issues,
      );
      if (target !== undefined && points !== undefined && minimumQualifyingWins !== undefined) {
        qualificationBySourceRank[rank] = { target, points, minimumQualifyingWins };
      }
    }
  }

  const slotsObject = snapshotPlainObjectOrFail(
    object["promotionSlots"],
    `${path}/promotionSlots`,
    issues,
  );
  let promotionSlots: Sprint2ConfigInput["promotion"]["promotionSlots"] | undefined;
  if (slotsObject !== undefined) {
    rejectUnknownKeys(
      slotsObject,
      ["divisor", "minimum", "maximum"],
      `${path}/promotionSlots`,
      issues,
    );
    const divisor = requireSafeInteger(slotsObject, "divisor", `${path}/promotionSlots`, issues);
    const minimum = requireSafeInteger(slotsObject, "minimum", `${path}/promotionSlots`, issues);
    const maximum = requireSafeInteger(slotsObject, "maximum", `${path}/promotionSlots`, issues);
    if (divisor !== undefined && minimum !== undefined && maximum !== undefined) {
      promotionSlots = { divisor, minimum, maximum };
    }
  }

  const resetPointsAfterPromotion = requireBoolean(
    object,
    "resetPointsAfterPromotion",
    path,
    issues,
  );
  const preservePointsAfterFailedAttempt = requireBoolean(
    object,
    "preservePointsAfterFailedAttempt",
    path,
    issues,
  );

  const normalPlacementPoints = parsePlacement(
    object["normalPlacementPoints"],
    `${path}/normalPlacementPoints`,
  );
  const limitedPlacementPoints = parsePlacement(
    object["limitedPlacementPoints"],
    `${path}/limitedPlacementPoints`,
  );

  if (
    normalPlacementPoints === undefined ||
    limitedPlacementPoints === undefined ||
    (["F", "E", "D", "C", "B"] as const).some(
      (rank) => qualificationBySourceRank[rank] === undefined,
    ) ||
    promotionSlots === undefined ||
    resetPointsAfterPromotion === undefined ||
    preservePointsAfterFailedAttempt === undefined
  ) {
    return undefined;
  }

  return {
    normalPlacementPoints,
    limitedPlacementPoints,
    qualificationBySourceRank:
      qualificationBySourceRank as Sprint2ConfigInput["promotion"]["qualificationBySourceRank"],
    promotionSlots,
    resetPointsAfterPromotion,
    preservePointsAfterFailedAttempt,
  };
}

function objectString(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string | undefined {
  if (!hasOwn(object, key) || typeof object[key] !== "string" || object[key].length === 0) {
    issues.push({
      path: `${path}/${key}`,
      message: "required non-empty string is missing",
      actual: object[key],
      expected: "string",
    });
    return undefined;
  }
  return object[key] as string;
}

function parseSQualification(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["sQualification"] | undefined {
  const keys = [
    "rollingWindowWeeks",
    "openPlacementPoints",
    "openMatchWinPoints",
    "requiredPoints",
    "requiredWins",
    "requiredTitles",
    "alternativeRequiredFinals",
  ] as const;
  rejectUnknownKeys(object, keys, path, issues);
  const rollingWindowWeeks = requireSafeInteger(object, "rollingWindowWeeks", path, issues);
  const openMatchWinPoints = requireSafeInteger(object, "openMatchWinPoints", path, issues);
  const requiredPoints = requireSafeInteger(object, "requiredPoints", path, issues);
  const requiredWins = requireSafeInteger(object, "requiredWins", path, issues);
  const requiredTitles = requireSafeInteger(object, "requiredTitles", path, issues);
  const alternativeRequiredFinals = requireSafeInteger(
    object,
    "alternativeRequiredFinals",
    path,
    issues,
  );
  const openPlacementObject = snapshotPlainObjectOrFail(
    object["openPlacementPoints"],
    `${path}/openPlacementPoints`,
    issues,
  );
  let openPlacementPoints: Sprint2ConfigInput["sQualification"]["openPlacementPoints"] | undefined;
  if (openPlacementObject !== undefined) {
    const placementKeys = ["champion", "runnerUp", "topFour", "completed"] as const;
    rejectUnknownKeys(openPlacementObject, placementKeys, `${path}/openPlacementPoints`, issues);
    const parsed: Partial<Record<(typeof placementKeys)[number], number>> = {};
    for (const key of placementKeys) {
      const score = requireSafeInteger(
        openPlacementObject,
        key,
        `${path}/openPlacementPoints`,
        issues,
      );
      if (score !== undefined) {
        parsed[key] = score;
      }
    }
    if (!placementKeys.some((key) => parsed[key] === undefined)) {
      openPlacementPoints = parsed as Sprint2ConfigInput["sQualification"]["openPlacementPoints"];
    }
  }
  if (
    rollingWindowWeeks === undefined ||
    openMatchWinPoints === undefined ||
    requiredPoints === undefined ||
    requiredWins === undefined ||
    requiredTitles === undefined ||
    alternativeRequiredFinals === undefined ||
    openPlacementPoints === undefined
  ) {
    return undefined;
  }
  return {
    rollingWindowWeeks,
    openPlacementPoints,
    openMatchWinPoints,
    requiredPoints,
    requiredWins,
    requiredTitles,
    alternativeRequiredFinals,
  };
}

function parseAnnualRanking(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): Sprint2ConfigInput["annualRanking"] | undefined {
  rejectUnknownKeys(
    object,
    [
      "officialMatchWinPoints",
      "placementBonus",
      "limitedPlacementFactorBasisPoints",
      "tieBreakOrder",
    ],
    path,
    issues,
  );
  const officialMatchWinPoints = requireSafeInteger(object, "officialMatchWinPoints", path, issues);
  const limitedPlacementFactorBasisPoints = requireSafeInteger(
    object,
    "limitedPlacementFactorBasisPoints",
    path,
    issues,
  );
  const tieBreakOrder = parseStringArray(object["tieBreakOrder"], `${path}/tieBreakOrder`, issues);
  const bonusObject = snapshotPlainObjectOrFail(
    object["placementBonus"],
    `${path}/placementBonus`,
    issues,
  );
  let placementBonus: Sprint2ConfigInput["annualRanking"]["placementBonus"] | undefined;
  if (bonusObject !== undefined) {
    const bonusKeys = ["champion", "runnerUp", "topFour"] as const;
    rejectUnknownKeys(bonusObject, bonusKeys, `${path}/placementBonus`, issues);
    const parsed: Partial<Record<(typeof bonusKeys)[number], number>> = {};
    for (const key of bonusKeys) {
      const score = requireSafeInteger(bonusObject, key, `${path}/placementBonus`, issues);
      if (score !== undefined) {
        parsed[key] = score;
      }
    }
    if (!bonusKeys.some((key) => parsed[key] === undefined)) {
      placementBonus = parsed as Sprint2ConfigInput["annualRanking"]["placementBonus"];
    }
  }
  if (
    officialMatchWinPoints === undefined ||
    limitedPlacementFactorBasisPoints === undefined ||
    tieBreakOrder === undefined ||
    placementBonus === undefined
  ) {
    return undefined;
  }
  return {
    officialMatchWinPoints,
    placementBonus,
    limitedPlacementFactorBasisPoints,
    tieBreakOrder,
  };
}

export function validateNormalizedSprint2Config(input: unknown): ValidationResult<Sprint2Config> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }

  for (const forbidden of FORBIDDEN_CALENDAR_ROOT_KEYS) {
    if (hasOwn(object, forbidden)) {
      issues.push({
        path: `/${forbidden}`,
        message: "calendar authority must remain in WorldCalendarConfig only",
        actual: object[forbidden],
        expected: "absent from Sprint2Config",
      });
    }
  }

  rejectUnknownKeys(object, ROOT_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    SPRINT2_CONFIG_SCHEMA_VERSION,
    issues,
  );
  const configVersion = objectString(object, "configVersion", "", issues);
  if (schemaVersion === undefined || configVersion === undefined) {
    return failure(issues);
  }

  const schedule = parseSchedule(object["schedule"], issues);
  const tournamentCapacityObject = snapshotPlainObjectOrFail(
    object["tournamentCapacity"],
    "/tournamentCapacity",
    issues,
  );
  const tournamentCapacity: Partial<Record<(typeof TOURNAMENT_KINDS)[number], CapacityTriple>> = {};
  if (tournamentCapacityObject !== undefined) {
    rejectUnknownKeys(tournamentCapacityObject, TOURNAMENT_KINDS, "/tournamentCapacity", issues);
    for (const kind of TOURNAMENT_KINDS) {
      const triple = parseCapacityTriple(
        tournamentCapacityObject[kind],
        `/tournamentCapacity/${kind}`,
        issues,
      );
      if (triple !== undefined) {
        tournamentCapacity[kind] = triple;
      }
    }
  }

  const postponement = parseGenericSection(
    object["postponement"],
    "/postponement",
    [
      "maximumCount",
      "mergeIntoNextSameSeriesSlot",
      "revalidateAtNextSlot",
      "carryAcrossWorldYear",
      "preserveAcceptedEntryAcrossDelay",
      "deferredInterestBonusHundredths",
    ],
    issues,
    parsePostponement,
  );
  const entry = parseGenericSection(
    object["entry"],
    "/entry",
    [
      "maximumTournamentReservationsPerWorldMonth",
      "enterThresholdHundredths",
      "baseScoresHundredths",
      "promotionQualificationBonusHundredths",
      "rankGoalFitMaximumHundredths",
      "domainFitMaximumHundredths",
      "recentPerformanceLookbackMatches",
      "recentPerformanceRangeHundredths",
      "rivalInterestMaximumHundredths",
      "personalityRangeHundredths",
      "fatiguePenaltyMaximumHundredths",
      "injuryPenaltyMaximumHundredths",
      "mentalExhaustionPenaltyMaximumHundredths",
    ],
    issues,
    parseEntry,
  );
  const format = parseGenericSection(
    object["format"],
    "/format",
    [
      "roundRobinMinimum",
      "roundRobinMaximum",
      "singleEliminationMinimum",
      "singleEliminationMaximum",
      "groupKnockoutMinimum",
      "groupKnockoutMaximum",
      "promotionAlwaysSingleElimination",
      "groupCount",
      "groupAdvanceCount17to24",
      "groupAdvanceCount25to32",
      "allowThirdPlaceMatch",
      "allowLoserBracket",
    ],
    issues,
    parseFormat,
  );
  const seeding = parseGenericSection(
    object["seeding"],
    "/seeding",
    ["rankOrder", "comparisonOrder", "useDerivedTieKeyOnlyForExactTie"],
    issues,
    parseSeeding,
  );
  const execution = parseGenericSection(
    object["execution"],
    "/execution",
    [
      "maximumMatchesPerPersonPerWorldWeek",
      "tournamentKindPriority",
      "entrySelectionKindTieBreak",
      "promotionEligibleOverridesOtherKinds",
      "standardRunStopsOnBattleResolutionError",
      "issueMatchIdForBye",
      "issueMatchIdForForfeit",
    ],
    issues,
    parseExecution,
  );
  const standings = parseGenericSection(
    object["standings"],
    "/standings",
    ["winPoints", "lossPoints", "tieBreakOrder"],
    issues,
    parseStandings,
  );
  const promotion = parseGenericSection(
    object["promotion"],
    "/promotion",
    [
      "normalPlacementPoints",
      "limitedPlacementPoints",
      "qualificationBySourceRank",
      "promotionSlots",
      "resetPointsAfterPromotion",
      "preservePointsAfterFailedAttempt",
    ],
    issues,
    parsePromotion,
  );
  const sQualification = parseGenericSection(
    object["sQualification"],
    "/sQualification",
    [
      "rollingWindowWeeks",
      "openPlacementPoints",
      "openMatchWinPoints",
      "requiredPoints",
      "requiredWins",
      "requiredTitles",
      "alternativeRequiredFinals",
    ],
    issues,
    parseSQualification,
  );
  const annualRanking = parseGenericSection(
    object["annualRanking"],
    "/annualRanking",
    [
      "officialMatchWinPoints",
      "placementBonus",
      "limitedPlacementFactorBasisPoints",
      "tieBreakOrder",
    ],
    issues,
    parseAnnualRanking,
  );
  const battleLogRetention = parseBattleLogRetention(object["battleLogRetention"], issues);
  const championship = parseChampionship(object["championship"], issues);

  if (
    schedule === undefined ||
    TOURNAMENT_KINDS.some((kind) => tournamentCapacity[kind] === undefined) ||
    postponement === undefined ||
    entry === undefined ||
    format === undefined ||
    seeding === undefined ||
    execution === undefined ||
    standings === undefined ||
    promotion === undefined ||
    sQualification === undefined ||
    annualRanking === undefined ||
    battleLogRetention === undefined ||
    championship === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const normalized: Sprint2Config = {
    schemaVersion,
    configVersion,
    schedule,
    tournamentCapacity: tournamentCapacity as Sprint2Config["tournamentCapacity"],
    postponement,
    entry,
    format,
    seeding,
    execution,
    standings,
    promotion,
    sQualification,
    annualRanking,
    battleLogRetention,
    championship,
  };

  if (isKnownSprint2ConfigVersion(configVersion)) {
    const expected = getExpectedCanonicalJsonForSprint2ConfigVersion(configVersion);
    const actual = toCanonicalJson(normalized);
    if (expected !== undefined && expected !== actual) {
      return failure([
        {
          path: "/configVersion",
          message: "canonical Sprint2Config body does not match registered configVersion integrity",
          actual: configVersion,
          expected: "registered canonical body",
        },
      ]);
    }
  }

  return success(deepFreezePlainJson(normalized));
}

export function computeSprint2ConfigHash(
  config: Sprint2Config,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(config), "/sprint2ConfigHash");
}

let defaultRegistryInitialized = false;

function ensureDefaultSprint2ConfigRegistry(provider: Sha256Provider): void {
  if (defaultRegistryInitialized) {
    return;
  }
  const validated = validateNormalizedSprint2Config(createDefaultSprint2ConfigInput());
  if (!validated.ok) {
    throw new Error("default Sprint2Config failed validation during registry bootstrap");
  }
  const canonical = toCanonicalJson(validated.value);
  registerKnownSprint2ConfigVersion(SPRINT2_CONFIG_VERSION_DEFAULT, canonical);
  defaultRegistryInitialized = true;
  void provider;
}

export function validateSprint2Config(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<Sprint2Config> {
  ensureDefaultSprint2ConfigRegistry(provider);
  return validateNormalizedSprint2Config(input);
}

export function createDefaultSprint2Config(
  provider: Sha256Provider,
): ValidationResult<Sprint2Config> {
  return validateSprint2Config(createDefaultSprint2ConfigInput(), provider);
}

// Bootstrap registry at module load using a throwaway provider is avoided; registry
// initializes on first validateSprint2Config call.
