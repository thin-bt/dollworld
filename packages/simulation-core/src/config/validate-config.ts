import { RANKS, type Rank } from "../enums.js";
import { isSafeRelativePosixPath } from "../paths.js";
import { failure, success, type ValidationIssue, type ValidationResult } from "../validation.js";
import type {
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
} from "./types.js";

const CONFIG_SCHEMA_VERSION = "0.3.0";

/** Legacy calendar/world fields rejected on InitialWorldConfig 0.3.0 new-run input. */
const LEGACY_WORLD_FIELD_NAMES = [
  "startYear",
  "startMonth",
  "startWeekOfMonth",
  "monthsPerYear",
  "birthMonth",
  "birthWeekOfMonth",
  "birthWeekOfApril",
  "yearEndMonth",
  "world",
] as const;

const FIXED_AGE_BANDS = [
  { minAge: 0, maxAge: 7 },
  { minAge: 8, maxAge: 15 },
  { minAge: 16, maxAge: 41 },
  { minAge: 42, maxAge: 70 },
] as const;

const ROOT_KEYS = [
  "schemaVersion",
  "profileId",
  "purpose",
  "worldCalendar",
  "population",
  "history",
  "relationships",
  "families",
  "lineages",
  "abilities",
  "nameData",
  "simulation",
  "validationTargets",
  "performanceTargets",
] as const;

const WORLD_CALENDAR_KEYS = [
  "monthsPerWorldYear",
  "weeksPerMonth",
  "worldYearStartMonth",
  "worldYearStartWeek",
] as const;

const POPULATION_KEYS = [
  "totalLiving",
  "initialUserFounderCount",
  "sexRatioMale",
  "ageBands",
  "activeRankDistribution",
] as const;

const AGE_BAND_KEYS = ["minAge", "maxAge", "count"] as const;

const HISTORY_KEYS = [
  "initialDeceasedAncestors",
  "minimumGenerationDepth",
  "maximumGenerationDepth",
  "earliestHistoricalYear",
  "minimumAgeAtDeath",
  "maximumAgeAtDeath",
  "createExistingRelationships",
  "createPastTournamentHistory",
] as const;

const RELATIONSHIP_KEYS = [
  "knownParentCoverage",
  "twoKnownParentsCoverageAmongCovered",
  "retiredSpouseCoverage",
  "formalMasterCoverageAge8To41",
  "minimumParentAgeAtChildbirth",
  "maximumBiologicalParents",
] as const;

const FAMILIES_KEYS = [
  "initialFamilyCount",
  "minimumMembersPerFamily",
  "maximumMembersPerFamily",
  "baseBirthRateRange",
] as const;

const LINEAGES_KEYS = [
  "initialLineageCount",
  "initialQualifiedMasters",
  "techniqueFocusWeights",
] as const;

const TECHNIQUE_WEIGHT_KEYS = ["unarmed", "sword", "magic"] as const;

const ABILITIES_KEYS = [
  "minimum",
  "maximum",
  "initialSurfaceValueRange",
  "initialGeneticValueRange",
  "initialAptitudeRange",
  "initialAptitudeGeneticValueRange",
] as const;

const NAME_DATA_KEYS = [
  "manifestPath",
  "requiredVersion",
  "neutralGivenNameProbability",
  "familyNameSelection",
  "avoidDuplicateLivingFullNameWithinFamily",
  "displayFormat",
] as const;

const SIMULATION_KEYS = [
  "defaultSeed",
  "rngAlgorithm",
  "defaultYears",
  "benchmarkYears",
  "emitWeeklyEvents",
] as const;

const VALIDATION_TARGET_KEYS = [
  "maximumInitialPopulationMismatch",
  "maximumBrokenReferenceCount",
  "sameSeedMustMatch",
  "differentSeedShouldDiffer",
] as const;

const PERFORMANCE_TARGET_KEYS = [
  "warningSecondsFor600People100Years",
  "warningSecondsFor2000People100Years",
  "measureOnlyPopulation",
] as const;

const RANGE_KEYS = ["min", "max"] as const;

/** Absolute tolerance for techniqueFocusWeights summing to 1 (spec leaves epsilon unspecified). */
const TECHNIQUE_WEIGHT_SUM_TOLERANCE = 1e-12;

const FIXED_WORLD_CALENDAR_PARTIAL = {
  monthsPerWorldYear: 12,
  weeksPerMonth: 4,
  worldYearStartWeek: 1,
} as const;

const UINT32_MAX = 4294967295;

/**
 * Validate a standalone WorldCalendarConfig (CAL-JAN / InitialWorldConfig 0.3.0).
 * Path prefixes use `/worldCalendar/...` for consistency with InitialWorldConfig.
 */
export function validateWorldCalendarConfig(input: unknown): ValidationResult<WorldCalendarConfig> {
  const issues: ValidationIssue[] = [];
  const parsed = parseWorldCalendar(input, issues);
  if (parsed === undefined || issues.length > 0) {
    return failure(issues);
  }
  return success(parsed);
}

export function validateInitialWorldConfig(input: unknown): ValidationResult<InitialWorldConfig> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(input)) {
    return failure([
      {
        path: "",
        message: "config root must be an object",
        actual: input,
        expected: "object",
      },
    ]);
  }

  rejectUnknownKeys(input, ROOT_KEYS, "", issues);
  rejectLegacyWorldFields(input, issues);

  const schemaVersion = requireNonEmptyTrimmedString(input, "schemaVersion", "", issues);
  if (schemaVersion !== undefined && schemaVersion !== CONFIG_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "schemaVersion must equal the fixed config schema version",
      actual: schemaVersion,
      expected: CONFIG_SCHEMA_VERSION,
    });
  }
  const profileId = requireNonEmptyTrimmedString(input, "profileId", "", issues);
  const purpose = requireNonEmptyTrimmedString(input, "purpose", "", issues);

  const worldCalendar = parseWorldCalendar(input["worldCalendar"], issues);
  const population = parsePopulation(input["population"], issues);
  const history = parseHistory(input["history"], issues);
  const relationships = parseRelationships(input["relationships"], issues);
  const families = parseFamilies(input["families"], issues);
  const lineages = parseLineages(input["lineages"], issues);
  const abilities = parseAbilities(input["abilities"], issues);
  const nameData = parseNameData(input["nameData"], issues);
  const simulation = parseSimulation(input["simulation"], issues);
  const validationTargets = parseValidationTargets(input["validationTargets"], issues);
  const performanceTargets = parsePerformanceTargets(input["performanceTargets"], issues);

  if (
    population !== undefined &&
    history !== undefined &&
    families !== undefined &&
    lineages !== undefined
  ) {
    assertPopulationConsistency(population, issues);
    assertFamilyLineageFeasibility(population, history, families, lineages, issues);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success({
    schemaVersion: CONFIG_SCHEMA_VERSION,
    profileId: profileId!,
    purpose: purpose!,
    worldCalendar: worldCalendar!,
    population: population!,
    history: history!,
    relationships: relationships!,
    families: families!,
    lineages: lineages!,
    abilities: abilities!,
    nameData: nameData!,
    simulation: simulation!,
    validationTargets: validationTargets!,
    performanceTargets: performanceTargets!,
  });
}

function rejectLegacyWorldFields(input: Record<string, unknown>, issues: ValidationIssue[]): void {
  for (const key of LEGACY_WORLD_FIELD_NAMES) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      issues.push({
        path: `/${key}`,
        message: `legacy field "${key}" is not allowed on InitialWorldConfig 0.3.0`,
        actual: input[key],
        expected: "absent (use worldCalendar)",
      });
    }
  }
}

function parseWorldCalendar(
  value: unknown,
  issues: ValidationIssue[],
): WorldCalendarConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/worldCalendar",
      message: "worldCalendar must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, WORLD_CALENDAR_KEYS, "/worldCalendar", issues);
  for (const key of LEGACY_WORLD_FIELD_NAMES) {
    if (key === "world") {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      issues.push({
        path: `/worldCalendar/${key}`,
        message: `legacy field "${key}" is not allowed inside worldCalendar`,
        actual: value[key],
        expected: "absent",
      });
    }
  }

  let ok = true;
  const monthsPerWorldYear = requireInteger(value, "monthsPerWorldYear", "/worldCalendar", issues);
  if (monthsPerWorldYear === undefined) {
    ok = false;
  } else if (monthsPerWorldYear !== FIXED_WORLD_CALENDAR_PARTIAL.monthsPerWorldYear) {
    issues.push({
      path: "/worldCalendar/monthsPerWorldYear",
      message: "monthsPerWorldYear must equal 12",
      actual: monthsPerWorldYear,
      expected: "12",
    });
    ok = false;
  }

  const weeksPerMonth = requireInteger(value, "weeksPerMonth", "/worldCalendar", issues);
  if (weeksPerMonth === undefined) {
    ok = false;
  } else if (weeksPerMonth !== FIXED_WORLD_CALENDAR_PARTIAL.weeksPerMonth) {
    issues.push({
      path: "/worldCalendar/weeksPerMonth",
      message: "weeksPerMonth must equal 4",
      actual: weeksPerMonth,
      expected: "4",
    });
    ok = false;
  }

  const worldYearStartWeek = requireInteger(value, "worldYearStartWeek", "/worldCalendar", issues);
  if (worldYearStartWeek === undefined) {
    ok = false;
  } else if (worldYearStartWeek !== FIXED_WORLD_CALENDAR_PARTIAL.worldYearStartWeek) {
    issues.push({
      path: "/worldCalendar/worldYearStartWeek",
      message: "worldYearStartWeek must equal 1",
      actual: worldYearStartWeek,
      expected: "1",
    });
    ok = false;
  }

  const worldYearStartMonth = requireInteger(
    value,
    "worldYearStartMonth",
    "/worldCalendar",
    issues,
  );
  if (worldYearStartMonth === undefined) {
    ok = false;
  } else if (worldYearStartMonth < 1 || worldYearStartMonth > 12) {
    issues.push({
      path: "/worldCalendar/worldYearStartMonth",
      message: "worldYearStartMonth must be an integer 1..12",
      actual: worldYearStartMonth,
      expected: "1..12",
    });
    ok = false;
  }

  if (!ok) {
    return undefined;
  }

  return {
    monthsPerWorldYear: 12,
    weeksPerMonth: 4,
    worldYearStartMonth: worldYearStartMonth!,
    worldYearStartWeek: 1,
  };
}

function parsePopulation(value: unknown, issues: ValidationIssue[]): PopulationConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/population",
      message: "population must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, POPULATION_KEYS, "/population", issues);

  const totalLiving = requireIntegerAtLeast(value, "totalLiving", "/population", 1, issues);
  const initialUserFounderCount = requireIntegerAtLeast(
    value,
    "initialUserFounderCount",
    "/population",
    0,
    issues,
  );
  const sexRatioMale = requireUnitInterval(value, "sexRatioMale", "/population", issues);
  const ageBands = parseAgeBands(value["ageBands"], issues);
  const activeRankDistribution = parseRankDistribution(
    value["activeRankDistribution"],
    "/population/activeRankDistribution",
    issues,
  );

  if (
    totalLiving !== undefined &&
    initialUserFounderCount !== undefined &&
    initialUserFounderCount > totalLiving
  ) {
    issues.push({
      path: "/population/initialUserFounderCount",
      message: "initialUserFounderCount must be <= totalLiving",
      actual: initialUserFounderCount,
      expected: `0..${String(totalLiving)}`,
    });
  }

  if (
    totalLiving === undefined ||
    initialUserFounderCount === undefined ||
    sexRatioMale === undefined ||
    ageBands === undefined ||
    activeRankDistribution === undefined
  ) {
    return undefined;
  }

  return {
    totalLiving,
    initialUserFounderCount,
    sexRatioMale,
    ageBands,
    activeRankDistribution,
  };
}

function parseAgeBands(value: unknown, issues: ValidationIssue[]): AgeBandConfig[] | undefined {
  if (!Array.isArray(value)) {
    issues.push({
      path: "/population/ageBands",
      message: "ageBands must be an array",
      actual: value,
      expected: "array",
    });
    return undefined;
  }

  if (value.length !== FIXED_AGE_BANDS.length) {
    issues.push({
      path: "/population/ageBands",
      message: "ageBands must contain exactly 4 fixed bands in order",
      actual: value.length,
      expected: String(FIXED_AGE_BANDS.length),
    });
    return undefined;
  }

  const bands: AgeBandConfig[] = [];
  let ok = true;

  for (let i = 0; i < FIXED_AGE_BANDS.length; i += 1) {
    const path = `/population/ageBands/${String(i)}`;
    const item = value[i];
    const expected = FIXED_AGE_BANDS[i]!;
    if (!isPlainObject(item)) {
      issues.push({
        path,
        message: "age band must be an object",
        actual: item,
        expected: "object",
      });
      ok = false;
      continue;
    }

    rejectUnknownKeys(item, AGE_BAND_KEYS, path, issues);
    const minAge = requireInteger(item, "minAge", path, issues);
    const maxAge = requireInteger(item, "maxAge", path, issues);
    const count = requireIntegerAtLeast(item, "count", path, 0, issues);

    if (minAge === undefined || maxAge === undefined || count === undefined) {
      ok = false;
      continue;
    }

    if (minAge < 0 || maxAge < 0) {
      issues.push({
        path,
        message: "age band ages must be non-negative",
        actual: { minAge, maxAge },
        expected: ">= 0",
      });
      ok = false;
      continue;
    }

    if (minAge !== expected.minAge || maxAge !== expected.maxAge) {
      issues.push({
        path,
        message: "ageBands must match the fixed band boundaries in order",
        actual: { minAge, maxAge },
        expected: `${String(expected.minAge)}..${String(expected.maxAge)}`,
      });
      ok = false;
      continue;
    }

    bands.push({ minAge, maxAge, count });
  }

  return ok ? bands : undefined;
}

function parseRankDistribution(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): RankDistribution | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path,
      message: "rank distribution must be an object",
      actual: value,
      expected: "object with ranks F..S",
    });
    return undefined;
  }

  rejectUnknownKeys(value, RANKS, path, issues);

  const distribution = {} as Record<Rank, number>;
  let ok = true;
  for (const rank of RANKS) {
    const count = requireIntegerAtLeast(value, rank, path, 0, issues);
    if (count === undefined) {
      ok = false;
      continue;
    }
    distribution[rank] = count;
  }

  return ok ? (distribution as RankDistribution) : undefined;
}

function parseHistory(value: unknown, issues: ValidationIssue[]): HistoryConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/history",
      message: "history must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, HISTORY_KEYS, "/history", issues);

  const initialDeceasedAncestors = requireIntegerAtLeast(
    value,
    "initialDeceasedAncestors",
    "/history",
    0,
    issues,
  );
  const minimumGenerationDepth = requireIntegerAtLeast(
    value,
    "minimumGenerationDepth",
    "/history",
    1,
    issues,
  );
  const maximumGenerationDepth = requireInteger(
    value,
    "maximumGenerationDepth",
    "/history",
    issues,
  );
  const earliestHistoricalYear = requireInteger(
    value,
    "earliestHistoricalYear",
    "/history",
    issues,
  );
  const minimumAgeAtDeath = requireIntegerAtLeast(
    value,
    "minimumAgeAtDeath",
    "/history",
    18,
    issues,
  );
  const maximumAgeAtDeath = requireInteger(value, "maximumAgeAtDeath", "/history", issues);
  const createExistingRelationships = requireBoolean(
    value,
    "createExistingRelationships",
    "/history",
    issues,
  );
  const createPastTournamentHistory = requireBoolean(
    value,
    "createPastTournamentHistory",
    "/history",
    issues,
  );

  if (
    minimumGenerationDepth !== undefined &&
    maximumGenerationDepth !== undefined &&
    maximumGenerationDepth < minimumGenerationDepth
  ) {
    issues.push({
      path: "/history/maximumGenerationDepth",
      message: "maximumGenerationDepth must be >= minimumGenerationDepth",
      actual: maximumGenerationDepth,
      expected: `>= ${String(minimumGenerationDepth)}`,
    });
  }

  if (earliestHistoricalYear !== undefined && earliestHistoricalYear > 0) {
    issues.push({
      path: "/history/earliestHistoricalYear",
      message: "earliestHistoricalYear must be <= 0",
      actual: earliestHistoricalYear,
      expected: "<= 0",
    });
  }

  if (
    minimumAgeAtDeath !== undefined &&
    maximumAgeAtDeath !== undefined &&
    maximumAgeAtDeath < minimumAgeAtDeath
  ) {
    issues.push({
      path: "/history/maximumAgeAtDeath",
      message: "maximumAgeAtDeath must be >= minimumAgeAtDeath",
      actual: maximumAgeAtDeath,
      expected: `>= ${String(minimumAgeAtDeath)}`,
    });
  }

  if (
    initialDeceasedAncestors === undefined ||
    minimumGenerationDepth === undefined ||
    maximumGenerationDepth === undefined ||
    earliestHistoricalYear === undefined ||
    minimumAgeAtDeath === undefined ||
    maximumAgeAtDeath === undefined ||
    createExistingRelationships === undefined ||
    createPastTournamentHistory === undefined
  ) {
    return undefined;
  }

  return {
    initialDeceasedAncestors,
    minimumGenerationDepth,
    maximumGenerationDepth,
    earliestHistoricalYear,
    minimumAgeAtDeath,
    maximumAgeAtDeath,
    createExistingRelationships,
    createPastTournamentHistory,
  };
}

function parseRelationships(
  value: unknown,
  issues: ValidationIssue[],
): RelationshipsConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/relationships",
      message: "relationships must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, RELATIONSHIP_KEYS, "/relationships", issues);

  const knownParentCoverage = requireUnitInterval(
    value,
    "knownParentCoverage",
    "/relationships",
    issues,
  );
  const twoKnownParentsCoverageAmongCovered = requireUnitInterval(
    value,
    "twoKnownParentsCoverageAmongCovered",
    "/relationships",
    issues,
  );
  const retiredSpouseCoverage = requireUnitInterval(
    value,
    "retiredSpouseCoverage",
    "/relationships",
    issues,
  );
  const formalMasterCoverageAge8To41 = requireUnitInterval(
    value,
    "formalMasterCoverageAge8To41",
    "/relationships",
    issues,
  );
  const minimumParentAgeAtChildbirth = requireIntegerAtLeast(
    value,
    "minimumParentAgeAtChildbirth",
    "/relationships",
    18,
    issues,
  );
  const maximumBiologicalParents = requireInteger(
    value,
    "maximumBiologicalParents",
    "/relationships",
    issues,
  );

  if (maximumBiologicalParents !== undefined && maximumBiologicalParents !== 2) {
    issues.push({
      path: "/relationships/maximumBiologicalParents",
      message: "maximumBiologicalParents must equal 2",
      actual: maximumBiologicalParents,
      expected: "2",
    });
  }

  if (
    knownParentCoverage === undefined ||
    twoKnownParentsCoverageAmongCovered === undefined ||
    retiredSpouseCoverage === undefined ||
    formalMasterCoverageAge8To41 === undefined ||
    minimumParentAgeAtChildbirth === undefined ||
    maximumBiologicalParents === undefined
  ) {
    return undefined;
  }

  return {
    knownParentCoverage,
    twoKnownParentsCoverageAmongCovered,
    retiredSpouseCoverage,
    formalMasterCoverageAge8To41,
    minimumParentAgeAtChildbirth,
    maximumBiologicalParents,
  };
}

function parseFamilies(value: unknown, issues: ValidationIssue[]): FamiliesConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/families",
      message: "families must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, FAMILIES_KEYS, "/families", issues);

  const initialFamilyCount = requireIntegerAtLeast(
    value,
    "initialFamilyCount",
    "/families",
    1,
    issues,
  );
  const minimumMembersPerFamily = requireIntegerAtLeast(
    value,
    "minimumMembersPerFamily",
    "/families",
    1,
    issues,
  );
  const maximumMembersPerFamily = requireInteger(
    value,
    "maximumMembersPerFamily",
    "/families",
    issues,
  );
  const baseBirthRateRange = parseNumericRange(
    value["baseBirthRateRange"],
    "/families/baseBirthRateRange",
    0,
    1,
    issues,
  );

  if (
    minimumMembersPerFamily !== undefined &&
    maximumMembersPerFamily !== undefined &&
    maximumMembersPerFamily < minimumMembersPerFamily
  ) {
    issues.push({
      path: "/families/maximumMembersPerFamily",
      message: "maximumMembersPerFamily must be >= minimumMembersPerFamily",
      actual: maximumMembersPerFamily,
      expected: `>= ${String(minimumMembersPerFamily)}`,
    });
  }

  if (
    initialFamilyCount === undefined ||
    minimumMembersPerFamily === undefined ||
    maximumMembersPerFamily === undefined ||
    baseBirthRateRange === undefined
  ) {
    return undefined;
  }

  return {
    initialFamilyCount,
    minimumMembersPerFamily,
    maximumMembersPerFamily,
    baseBirthRateRange,
  };
}

function parseLineages(value: unknown, issues: ValidationIssue[]): LineagesConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/lineages",
      message: "lineages must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, LINEAGES_KEYS, "/lineages", issues);

  const initialLineageCount = requireIntegerAtLeast(
    value,
    "initialLineageCount",
    "/lineages",
    1,
    issues,
  );
  const initialQualifiedMasters = requireIntegerAtLeast(
    value,
    "initialQualifiedMasters",
    "/lineages",
    0,
    issues,
  );
  const techniqueFocusWeights = parseTechniqueFocusWeights(value["techniqueFocusWeights"], issues);

  if (
    initialLineageCount === undefined ||
    initialQualifiedMasters === undefined ||
    techniqueFocusWeights === undefined
  ) {
    return undefined;
  }

  return {
    initialLineageCount,
    initialQualifiedMasters,
    techniqueFocusWeights,
  };
}

function parseTechniqueFocusWeights(
  value: unknown,
  issues: ValidationIssue[],
): TechniqueFocusWeights | undefined {
  const path = "/lineages/techniqueFocusWeights";
  if (!isPlainObject(value)) {
    issues.push({
      path,
      message: "techniqueFocusWeights must be an object",
      actual: value,
      expected: "object with unarmed, sword, magic",
    });
    return undefined;
  }

  rejectUnknownKeys(value, TECHNIQUE_WEIGHT_KEYS, path, issues);

  const unarmed = requireFiniteNumber(value, "unarmed", path, issues);
  const sword = requireFiniteNumber(value, "sword", path, issues);
  const magic = requireFiniteNumber(value, "magic", path, issues);

  if (unarmed === undefined || sword === undefined || magic === undefined) {
    return undefined;
  }

  for (const [key, weight] of [
    ["unarmed", unarmed],
    ["sword", sword],
    ["magic", magic],
  ] as const) {
    if (weight < 0) {
      issues.push({
        path: `${path}/${key}`,
        message: "technique focus weight must be >= 0",
        actual: weight,
        expected: ">= 0",
      });
    }
  }

  const sum = unarmed + sword + magic;
  if (Math.abs(sum - 1) > TECHNIQUE_WEIGHT_SUM_TOLERANCE) {
    issues.push({
      path,
      message: "techniqueFocusWeights must sum to 1 within tolerance",
      actual: sum,
      expected: `1 ± ${String(TECHNIQUE_WEIGHT_SUM_TOLERANCE)}`,
    });
  }

  return { unarmed, sword, magic };
}

function parseAbilities(value: unknown, issues: ValidationIssue[]): AbilitiesConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/abilities",
      message: "abilities must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, ABILITIES_KEYS, "/abilities", issues);

  const minimum = requireInteger(value, "minimum", "/abilities", issues);
  const maximum = requireInteger(value, "maximum", "/abilities", issues);

  if (minimum !== undefined && minimum !== 0) {
    issues.push({
      path: "/abilities/minimum",
      message: "abilities.minimum must be 0",
      actual: minimum,
      expected: "0",
    });
  }
  if (maximum !== undefined && maximum !== 100) {
    issues.push({
      path: "/abilities/maximum",
      message: "abilities.maximum must be 100",
      actual: maximum,
      expected: "100",
    });
  }

  const initialSurfaceValueRange = parseIntegerRange(
    value["initialSurfaceValueRange"],
    "/abilities/initialSurfaceValueRange",
    0,
    100,
    issues,
  );
  const initialGeneticValueRange = parseIntegerRange(
    value["initialGeneticValueRange"],
    "/abilities/initialGeneticValueRange",
    0,
    100,
    issues,
  );
  const initialAptitudeRange = parseIntegerRange(
    value["initialAptitudeRange"],
    "/abilities/initialAptitudeRange",
    0,
    100,
    issues,
  );
  const initialAptitudeGeneticValueRange = parseIntegerRange(
    value["initialAptitudeGeneticValueRange"],
    "/abilities/initialAptitudeGeneticValueRange",
    0,
    100,
    issues,
  );

  if (
    minimum === undefined ||
    maximum === undefined ||
    initialSurfaceValueRange === undefined ||
    initialGeneticValueRange === undefined ||
    initialAptitudeRange === undefined ||
    initialAptitudeGeneticValueRange === undefined
  ) {
    return undefined;
  }

  return {
    minimum,
    maximum,
    initialSurfaceValueRange,
    initialGeneticValueRange,
    initialAptitudeRange,
    initialAptitudeGeneticValueRange,
  };
}

function parseNameData(value: unknown, issues: ValidationIssue[]): NameDataConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/nameData",
      message: "nameData must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, NAME_DATA_KEYS, "/nameData", issues);

  const manifestPath = requireNonEmptyTrimmedString(value, "manifestPath", "/nameData", issues);
  if (manifestPath !== undefined && !isSafeRelativePosixPath(manifestPath)) {
    issues.push({
      path: "/nameData/manifestPath",
      message: "manifestPath must be a safe repository-relative POSIX path",
      actual: manifestPath,
      expected: "relative POSIX path without . / .. / absolute / drive / backslash",
    });
  }
  const requiredVersion = requireNonEmptyTrimmedString(
    value,
    "requiredVersion",
    "/nameData",
    issues,
  );
  const neutralGivenNameProbability = requireUnitInterval(
    value,
    "neutralGivenNameProbability",
    "/nameData",
    issues,
  );
  const familyNameSelection = requireString(value, "familyNameSelection", "/nameData", issues);
  const avoidDuplicate = requireBoolean(
    value,
    "avoidDuplicateLivingFullNameWithinFamily",
    "/nameData",
    issues,
  );
  const displayFormat = requireString(value, "displayFormat", "/nameData", issues);

  if (familyNameSelection !== undefined && familyNameSelection !== "without_replacement") {
    issues.push({
      path: "/nameData/familyNameSelection",
      message: "familyNameSelection must be without_replacement",
      actual: familyNameSelection,
      expected: "without_replacement",
    });
  }

  if (avoidDuplicate !== undefined && avoidDuplicate !== true) {
    issues.push({
      path: "/nameData/avoidDuplicateLivingFullNameWithinFamily",
      message: "avoidDuplicateLivingFullNameWithinFamily must be true",
      actual: avoidDuplicate,
      expected: "true",
    });
  }

  if (displayFormat !== undefined && displayFormat !== "{givenName}・{familyName}") {
    issues.push({
      path: "/nameData/displayFormat",
      message: "displayFormat must be {givenName}・{familyName}",
      actual: displayFormat,
      expected: "{givenName}・{familyName}",
    });
  }

  if (
    manifestPath === undefined ||
    requiredVersion === undefined ||
    neutralGivenNameProbability === undefined ||
    familyNameSelection === undefined ||
    avoidDuplicate === undefined ||
    displayFormat === undefined ||
    familyNameSelection !== "without_replacement" ||
    avoidDuplicate !== true ||
    displayFormat !== "{givenName}・{familyName}" ||
    !isSafeRelativePosixPath(manifestPath)
  ) {
    return undefined;
  }

  return {
    manifestPath,
    requiredVersion,
    neutralGivenNameProbability,
    familyNameSelection: "without_replacement",
    avoidDuplicateLivingFullNameWithinFamily: true,
    displayFormat: "{givenName}・{familyName}",
  };
}

function parseSimulation(value: unknown, issues: ValidationIssue[]): SimulationConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/simulation",
      message: "simulation must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, SIMULATION_KEYS, "/simulation", issues);

  const defaultSeed = requireInteger(value, "defaultSeed", "/simulation", issues);
  if (defaultSeed !== undefined && (defaultSeed < 0 || defaultSeed > UINT32_MAX)) {
    issues.push({
      path: "/simulation/defaultSeed",
      message: "defaultSeed must be an integer in 0..4294967295",
      actual: defaultSeed,
      expected: "0..4294967295",
    });
  }

  const rngAlgorithm = requireString(value, "rngAlgorithm", "/simulation", issues);
  if (rngAlgorithm !== undefined && rngAlgorithm !== "xoshiro128ss-v1") {
    issues.push({
      path: "/simulation/rngAlgorithm",
      message: "rngAlgorithm must be xoshiro128ss-v1",
      actual: rngAlgorithm,
      expected: "xoshiro128ss-v1",
    });
  }

  const defaultYears = requireIntegerAtLeast(value, "defaultYears", "/simulation", 1, issues);
  const emitWeeklyEvents = requireBoolean(value, "emitWeeklyEvents", "/simulation", issues);
  const benchmarkYears = parseBenchmarkYears(value["benchmarkYears"], issues);

  if (
    defaultSeed === undefined ||
    rngAlgorithm !== "xoshiro128ss-v1" ||
    defaultYears === undefined ||
    benchmarkYears === undefined ||
    emitWeeklyEvents === undefined ||
    defaultSeed < 0 ||
    defaultSeed > UINT32_MAX
  ) {
    return undefined;
  }

  return {
    defaultSeed,
    rngAlgorithm: "xoshiro128ss-v1",
    defaultYears,
    benchmarkYears,
    emitWeeklyEvents,
  };
}

function parseBenchmarkYears(value: unknown, issues: ValidationIssue[]): number[] | undefined {
  const path = "/simulation/benchmarkYears";
  if (!Array.isArray(value)) {
    issues.push({
      path,
      message: "benchmarkYears must be an array",
      actual: value,
      expected: "integer array without duplicates",
    });
    return undefined;
  }

  const years: number[] = [];
  let ok = true;
  for (let i = 0; i < value.length; i += 1) {
    const item = value[i];
    if (typeof item !== "number" || !Number.isInteger(item) || item < 1) {
      issues.push({
        path: `${path}/${String(i)}`,
        message: "benchmark year must be an integer >= 1",
        actual: item,
        expected: "integer >= 1",
      });
      ok = false;
      continue;
    }
    years.push(item);
  }

  const unique = new Set(years);
  if (unique.size !== years.length) {
    issues.push({
      path,
      message: "benchmarkYears must not contain duplicates",
      actual: years,
      expected: "unique integers",
    });
    ok = false;
  }

  return ok ? years : undefined;
}

function parseValidationTargets(
  value: unknown,
  issues: ValidationIssue[],
): ValidationTargetsConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/validationTargets",
      message: "validationTargets must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, VALIDATION_TARGET_KEYS, "/validationTargets", issues);

  const maximumInitialPopulationMismatch = requireIntegerAtLeast(
    value,
    "maximumInitialPopulationMismatch",
    "/validationTargets",
    0,
    issues,
  );
  const maximumBrokenReferenceCount = requireIntegerAtLeast(
    value,
    "maximumBrokenReferenceCount",
    "/validationTargets",
    0,
    issues,
  );
  const sameSeedMustMatch = requireBoolean(
    value,
    "sameSeedMustMatch",
    "/validationTargets",
    issues,
  );
  const differentSeedShouldDiffer = requireBoolean(
    value,
    "differentSeedShouldDiffer",
    "/validationTargets",
    issues,
  );

  if (
    maximumInitialPopulationMismatch === undefined ||
    maximumBrokenReferenceCount === undefined ||
    sameSeedMustMatch === undefined ||
    differentSeedShouldDiffer === undefined
  ) {
    return undefined;
  }

  return {
    maximumInitialPopulationMismatch,
    maximumBrokenReferenceCount,
    sameSeedMustMatch,
    differentSeedShouldDiffer,
  };
}

function parsePerformanceTargets(
  value: unknown,
  issues: ValidationIssue[],
): PerformanceTargetsConfig | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path: "/performanceTargets",
      message: "performanceTargets must be an object",
      actual: value,
      expected: "object",
    });
    return undefined;
  }

  rejectUnknownKeys(value, PERFORMANCE_TARGET_KEYS, "/performanceTargets", issues);

  const warningSecondsFor600People100Years = requireFiniteNumber(
    value,
    "warningSecondsFor600People100Years",
    "/performanceTargets",
    issues,
  );
  const warningSecondsFor2000People100Years = requireFiniteNumber(
    value,
    "warningSecondsFor2000People100Years",
    "/performanceTargets",
    issues,
  );

  if (
    warningSecondsFor600People100Years !== undefined &&
    !(warningSecondsFor600People100Years > 0)
  ) {
    issues.push({
      path: "/performanceTargets/warningSecondsFor600People100Years",
      message: "warning seconds must be a finite number greater than 0",
      actual: warningSecondsFor600People100Years,
      expected: "> 0",
    });
  }
  if (
    warningSecondsFor2000People100Years !== undefined &&
    !(warningSecondsFor2000People100Years > 0)
  ) {
    issues.push({
      path: "/performanceTargets/warningSecondsFor2000People100Years",
      message: "warning seconds must be a finite number greater than 0",
      actual: warningSecondsFor2000People100Years,
      expected: "> 0",
    });
  }

  const measureOnlyPopulation = requireIntegerAtLeast(
    value,
    "measureOnlyPopulation",
    "/performanceTargets",
    1,
    issues,
  );

  if (
    warningSecondsFor600People100Years === undefined ||
    warningSecondsFor2000People100Years === undefined ||
    measureOnlyPopulation === undefined ||
    !(warningSecondsFor600People100Years > 0) ||
    !(warningSecondsFor2000People100Years > 0)
  ) {
    return undefined;
  }

  return {
    warningSecondsFor600People100Years,
    warningSecondsFor2000People100Years,
    measureOnlyPopulation,
  };
}

function parseIntegerRange(
  value: unknown,
  path: string,
  absoluteMin: number,
  absoluteMax: number,
  issues: ValidationIssue[],
): NumericRange | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path,
      message: "range must be an object",
      actual: value,
      expected: "object with integer min and max",
    });
    return undefined;
  }

  rejectUnknownKeys(value, RANGE_KEYS, path, issues);
  const min = requireInteger(value, "min", path, issues);
  const max = requireInteger(value, "max", path, issues);

  if (min === undefined || max === undefined) {
    return undefined;
  }

  if (min < absoluteMin || max > absoluteMax || min > max) {
    issues.push({
      path,
      message: `integer range must satisfy ${String(absoluteMin)} <= min <= max <= ${String(absoluteMax)}`,
      actual: { min, max },
      expected: `${String(absoluteMin)}..${String(absoluteMax)} with min <= max`,
    });
    return undefined;
  }

  return { min, max };
}

function parseNumericRange(
  value: unknown,
  path: string,
  absoluteMin: number,
  absoluteMax: number,
  issues: ValidationIssue[],
): NumericRange | undefined {
  if (!isPlainObject(value)) {
    issues.push({
      path,
      message: "range must be an object",
      actual: value,
      expected: "object with min and max",
    });
    return undefined;
  }

  rejectUnknownKeys(value, RANGE_KEYS, path, issues);
  const min = requireFiniteNumber(value, "min", path, issues);
  const max = requireFiniteNumber(value, "max", path, issues);

  if (min === undefined || max === undefined) {
    return undefined;
  }

  if (min < absoluteMin || max > absoluteMax || min > max) {
    issues.push({
      path,
      message: `range must satisfy ${String(absoluteMin)} <= min <= max <= ${String(absoluteMax)}`,
      actual: { min, max },
      expected: `${String(absoluteMin)}..${String(absoluteMax)} with min <= max`,
    });
    return undefined;
  }

  return { min, max };
}

function assertPopulationConsistency(
  population: PopulationConfig,
  issues: ValidationIssue[],
): void {
  const bandSum = population.ageBands.reduce((sum, band) => sum + band.count, 0);
  if (bandSum !== population.totalLiving) {
    issues.push({
      path: "/population/ageBands",
      message: "sum of ageBand counts must equal totalLiving",
      actual: bandSum,
      expected: String(population.totalLiving),
    });
  }

  const age16To41 = population.ageBands[2]!.count;
  const rankSum = RANKS.reduce((sum, rank) => sum + population.activeRankDistribution[rank], 0);

  if (rankSum !== age16To41) {
    issues.push({
      path: "/population/activeRankDistribution",
      message: "sum of activeRankDistribution must equal the 16..41 age band count",
      actual: rankSum,
      expected: String(age16To41),
    });
  }

  const bandMaleSum = population.ageBands.reduce(
    (sum, band) => sum + Math.floor(band.count * population.sexRatioMale),
    0,
  );
  const totalMale = Math.floor(population.totalLiving * population.sexRatioMale);
  if (bandMaleSum !== totalMale) {
    issues.push({
      path: "/population/sexRatioMale",
      message:
        "sum of floor(ageBand.count * sexRatioMale) must equal floor(totalLiving * sexRatioMale)",
      actual: { bandMaleSum, totalMale },
      expected: "equal male counts after per-band and total floor rounding",
    });
  }
}

function assertFamilyLineageFeasibility(
  population: PopulationConfig,
  history: HistoryConfig,
  families: FamiliesConfig,
  lineages: LineagesConfig,
  issues: ValidationIssue[],
): void {
  const totalPersons = population.totalLiving + history.initialDeceasedAncestors;

  if (families.initialFamilyCount * families.minimumMembersPerFamily > totalPersons) {
    issues.push({
      path: "/families/initialFamilyCount",
      message:
        "initialFamilyCount * minimumMembersPerFamily must be <= totalLiving + initialDeceasedAncestors",
      actual: {
        lowerBound: families.initialFamilyCount * families.minimumMembersPerFamily,
        totalPersons,
      },
      expected: "feasible lower bound",
    });
  }

  if (totalPersons > families.initialFamilyCount * families.maximumMembersPerFamily) {
    issues.push({
      path: "/families/maximumMembersPerFamily",
      message:
        "totalLiving + initialDeceasedAncestors must be <= initialFamilyCount * maximumMembersPerFamily",
      actual: {
        totalPersons,
        upperBound: families.initialFamilyCount * families.maximumMembersPerFamily,
      },
      expected: "feasible upper bound",
    });
  }

  if (lineages.initialLineageCount > families.initialFamilyCount) {
    issues.push({
      path: "/lineages/initialLineageCount",
      message: "initialLineageCount must be <= initialFamilyCount",
      actual: lineages.initialLineageCount,
      expected: `<= ${String(families.initialFamilyCount)}`,
    });
  }

  const retiredCount = population.ageBands[3]!.count;
  const rankSum = RANKS.reduce((sum, rank) => sum + population.activeRankDistribution[rank], 0);

  if (lineages.initialQualifiedMasters > retiredCount) {
    issues.push({
      path: "/lineages/initialQualifiedMasters",
      message: "initialQualifiedMasters must be <= living retired count",
      actual: lineages.initialQualifiedMasters,
      expected: `<= ${String(retiredCount)}`,
    });
  }

  if (retiredCount >= 1 && rankSum < 1) {
    issues.push({
      path: "/population/activeRankDistribution",
      message: "activeRankDistribution sum must be >= 1 when living retirees (42..70) are present",
      actual: rankSum,
      expected: ">= 1",
    });
    return;
  }

  if (retiredCount === 0) {
    return;
  }

  const retiredRankAllocation = allocateByLargestRemainder(
    population.activeRankDistribution,
    retiredCount,
  );
  const cOrHigher =
    retiredRankAllocation.C +
    retiredRankAllocation.B +
    retiredRankAllocation.A +
    retiredRankAllocation.S;

  if (cOrHigher < lineages.initialQualifiedMasters) {
    issues.push({
      path: "/lineages/initialQualifiedMasters",
      message:
        "C-or-higher retired history slots from largest-remainder allocation must be >= initialQualifiedMasters",
      actual: { cOrHigher, initialQualifiedMasters: lineages.initialQualifiedMasters },
      expected: `cOrHigher >= ${String(lineages.initialQualifiedMasters)}`,
    });
  }
}

export function allocateByLargestRemainder(
  weights: RankDistribution,
  targetCount: number,
): RankDistribution {
  if (!Number.isInteger(targetCount) || targetCount < 0) {
    throw new Error(
      `allocateByLargestRemainder rejected invalid targetCount: ${String(targetCount)}`,
    );
  }

  const weightSum = RANKS.reduce((sum, rank) => sum + weights[rank], 0);
  if (!Number.isInteger(weightSum) || weightSum <= 0) {
    throw new Error(
      `allocateByLargestRemainder rejected non-positive weightSum: ${String(weightSum)}`,
    );
  }

  if (targetCount === 0) {
    return { F: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
  }

  const bases = {} as Record<Rank, number>;
  const remainders = {} as Record<Rank, number>;
  let allocated = 0;

  for (const rank of RANKS) {
    const weight = weights[rank];
    bases[rank] = Math.floor((weight * targetCount) / weightSum);
    remainders[rank] = (weight * targetCount) % weightSum;
    allocated += bases[rank]!;
  }

  let remaining = targetCount - allocated;
  const order = [...RANKS].sort((a, b) => {
    const remainderDiff = remainders[b]! - remainders[a]!;
    if (remainderDiff !== 0) {
      return remainderDiff;
    }
    return RANKS.indexOf(a) - RANKS.indexOf(b);
  });

  const result = { ...bases } as Record<Rank, number>;
  for (const rank of order) {
    if (remaining <= 0) {
      break;
    }
    result[rank]! += 1;
    remaining -= 1;
  }

  return result as RankDistribution;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void {
  const allowedSet = new Set<string>(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      issues.push({
        path: path === "" ? `/${key}` : `${path}/${key}`,
        message: "unknown key is not allowed",
        actual: key,
        expected: `one of: ${allowed.join(", ")}`,
      });
    }
  }
}

function requireString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const path = parentPath === "" ? `/${key}` : `${parentPath}/${key}`;
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "string" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string") {
    issues.push({ path, message: "value must be a string", actual: value, expected: "string" });
    return undefined;
  }
  return value;
}

function requireNonEmptyTrimmedString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = requireString(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  const path = parentPath === "" ? `/${key}` : `${parentPath}/${key}`;
  if (value.length === 0 || value !== value.trim()) {
    issues.push({
      path,
      message: "string must be non-empty and must not have leading or trailing whitespace",
      actual: value,
      expected: "trimmed non-empty string",
    });
    return undefined;
  }
  return value;
}

function requireBoolean(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): boolean | undefined {
  const path = `${parentPath}/${key}`;
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "boolean" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "boolean") {
    issues.push({ path, message: "value must be a boolean", actual: value, expected: "boolean" });
    return undefined;
  }
  return value;
}

function requireFiniteNumber(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const path = `${parentPath}/${key}`;
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "finite number" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({
      path,
      message: "value must be a finite number",
      actual: value,
      expected: "finite number",
    });
    return undefined;
  }
  return Object.is(value, -0) ? 0 : value;
}

function requireInteger(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const path = parentPath === "" ? `/${key}` : `${parentPath}/${key}`;
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "integer" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    issues.push({
      path,
      message: "value must be an integer",
      actual: value,
      expected: "integer",
    });
    return undefined;
  }
  return value;
}

function requireIntegerAtLeast(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  minimum: number,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireInteger(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  const path = `${parentPath}/${key}`;
  if (value < minimum) {
    issues.push({
      path,
      message: `value must be an integer >= ${String(minimum)}`,
      actual: value,
      expected: `>= ${String(minimum)}`,
    });
    return undefined;
  }
  return value;
}

function requireUnitInterval(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  const value = requireFiniteNumber(object, key, parentPath, issues);
  if (value === undefined) {
    return undefined;
  }
  const path = `${parentPath}/${key}`;
  if (value < 0 || value > 1) {
    issues.push({
      path,
      message: "value must be within 0..1",
      actual: value,
      expected: "0..1",
    });
    return undefined;
  }
  return value;
}
