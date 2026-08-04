/**
 * Sprint1Config structural + shape validation (14 mini-spec §1-§8 / S01-001).
 *
 * Scope: structural shape, enumerations, fixed literals, band continuity, and the
 * explicit non-overridable groups called out in §7.6/§7.7/§8 (consumption.actionBase,
 * consumption.performanceBands, judgement). Domain semantics beyond structural shape
 * (e.g. TechniqueCatalog membership, weekly planner scoring, battle resolution) are out
 * of scope for S01-001.
 *
 * Every reachable value is read into a local exactly once before being checked (no
 * repeated property reads), so a Proxy cannot swap the observed value between checks.
 */
import type { AbilityKey } from "../abilities.js";
import { toCanonicalJson } from "../canonical-json.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  ABILITY_CANONICAL_ORDER,
  BATTLE_RANGES,
  SPRINT1_CONFIG_SCHEMA_VERSION,
  SPRINT1_CONFIG_VERSION_DEFAULT,
} from "./constants.js";
import {
  createDefaultSprint1ConfigInput,
  FIXED_CONSUMPTION_ACTION_BASE,
  FIXED_CONSUMPTION_HIGH_PRIORITY_ADDITIONAL,
  FIXED_CONSUMPTION_PERFORMANCE_BANDS,
  FIXED_JUDGEMENT,
} from "./sprint1-config-defaults.js";
import {
  getExpectedCanonicalJsonForConfigVersion,
  isKnownSprint1ConfigVersion,
  registerKnownSprint1ConfigVersion,
} from "./sprint1-config-version-registry.js";
import {
  normalizeSprint1ConfigBasisPoints,
  type Sprint1ConfigNormalizedData,
} from "./normalize-sprint1-config-basis-points.js";
import {
  assertAllNumericLeavesAreSafeIntegers,
  normalizeBasisPoints,
  requireAlreadyNormalizedBasisPoints,
  requireNormalizedBasisPointsInRange,
} from "./basis-points.js";
import type {
  BasicAttackProfileInput,
  BattleConfigInput,
  BattleRange,
  GrowthAgeFactorsInput,
  GrowthConfigInput,
  NumericMinMax,
  Sprint1Config,
  Sprint1ConfigInput,
  TechniqueBalanceConfigInput,
  TechniqueLearningConfigInput,
  TemporaryConditionConfigInput,
  WeeklyActionScoresInput,
  WeeklyPlannerConfigInput,
} from "./types.js";
import {
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireFiniteNumber,
  requireInteger,
  requireIntegerAtLeast,
  requireIntegerInRange,
  requireLiteralBoolean,
  requireLiteralInteger,
  requireLiteralString,
  requireNonEmptyTrimmedString,
  requireNonNegativeFiniteNumber,
  requireNumberInRange,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

const ROOT_KEYS = [
  "schemaVersion",
  "configVersion",
  "growth",
  "temporaryCondition",
  "weeklyPlanner",
  "techniqueLearning",
  "techniqueBalance",
  "battle",
] as const;

const RANGE_KEYS = ["min", "max"] as const;

/**
 * `display`: raw JSON with decimal factor fields (then ×10000 normalized).
 * `normalized`: already basis-points integers (never ×10000 again).
 */
type ConfigParseMode = "display" | "normalized";

let parseMode: ConfigParseMode = "display";

function requireBpInDisplayRange(
  object: Record<string, unknown>,
  key: string,
  path: string,
  displayMinimum: number,
  displayMaximum: number,
  issues: ValidationIssue[],
): number | undefined {
  if (parseMode === "display") {
    return requireNumberInRange(object, key, path, displayMinimum, displayMaximum, issues);
  }
  const minimumBp = normalizeBasisPoints(displayMinimum);
  const maximumBp = normalizeBasisPoints(displayMaximum);
  if (minimumBp === undefined || maximumBp === undefined) {
    issues.push({
      path: `${path}/${key}`,
      message: "internal basis-points range bounds are invalid",
      expected: "exact 1/10000 step bounds",
    });
    return undefined;
  }
  return requireNormalizedBasisPointsInRange(object, key, path, minimumBp, maximumBp, issues);
}

function parseFactorNumberRange(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): NumericMinMax | undefined {
  const object = beginPlainObject(value, path, RANGE_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }
  const min =
    parseMode === "display"
      ? requireFiniteNumber(object, "min", path, issues)
      : requireAlreadyNormalizedBasisPoints(object, "min", path, issues);
  const max =
    parseMode === "display"
      ? requireFiniteNumber(object, "max", path, issues)
      : requireAlreadyNormalizedBasisPoints(object, "max", path, issues);
  if (min === undefined || max === undefined) {
    return undefined;
  }
  if (min > max) {
    issues.push({
      path,
      message: "range min must be <= max",
      actual: { min, max },
      expected: "min <= max",
    });
    return undefined;
  }
  return { min, max };
}

/**
 * Snapshot `value` as a plain object (rejecting Proxy TOCTOU, accessors, and Symbol
 * keys in one pass) and reject unknown keys against the snapshot itself, never the
 * live input.
 */
function beginPlainObject(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(object, keys, path, issues);
  return object;
}

/**
 * Structural parse only (no basis-points normalization, no configVersion content lock, no freeze).
 * Returns raw display-unit values suitable for `normalizeSprint1ConfigBasisPoints`.
 */
function buildSprint1ConfigStructure(input: unknown): ValidationResult<Sprint1ConfigInput> {
  const issues: ValidationIssue[] = [];

  const object = beginPlainObject(input, "", ROOT_KEYS, issues);
  if (object === undefined) {
    return failure(issues);
  }

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    SPRINT1_CONFIG_SCHEMA_VERSION,
    issues,
  );
  const configVersion = requireNonEmptyTrimmedString(object, "configVersion", "", issues);
  const growth = parseGrowthConfig(object["growth"], "/growth", issues);
  const temporaryCondition = parseTemporaryConditionConfig(
    object["temporaryCondition"],
    "/temporaryCondition",
    issues,
  );
  const weeklyPlanner = parseWeeklyPlannerConfig(object["weeklyPlanner"], "/weeklyPlanner", issues);
  const techniqueLearning = parseTechniqueLearningConfig(
    object["techniqueLearning"],
    "/techniqueLearning",
    issues,
  );
  const techniqueBalance = parseTechniqueBalanceConfig(
    object["techniqueBalance"],
    "/techniqueBalance",
    issues,
  );
  const battle = parseBattleConfig(object["battle"], "/battle", issues);

  if (
    schemaVersion === undefined ||
    configVersion === undefined ||
    growth === undefined ||
    temporaryCondition === undefined ||
    weeklyPlanner === undefined ||
    techniqueLearning === undefined ||
    techniqueBalance === undefined ||
    battle === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success({
    schemaVersion,
    configVersion,
    growth,
    temporaryCondition,
    weeklyPlanner,
    techniqueLearning,
    techniqueBalance,
    battle,
  });
}

function ensureDefaultConfigVersionRegistered(): void {
  if (isKnownSprint1ConfigVersion(SPRINT1_CONFIG_VERSION_DEFAULT)) {
    return;
  }
  const previousMode = parseMode;
  parseMode = "display";
  try {
    const result = buildSprint1ConfigStructure(createDefaultSprint1ConfigInput());
    if (!result.ok) {
      throw new Error(
        `default Sprint1Config failed structural build for version registry: ${result.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}`,
      );
    }
    const normalizeIssues: ValidationIssue[] = [];
    const normalized = normalizeSprint1ConfigBasisPoints(result.value, normalizeIssues);
    if (normalized === undefined) {
      throw new Error(
        `default Sprint1Config failed basis-points normalization for version registry: ${normalizeIssues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}`,
      );
    }
    registerKnownSprint1ConfigVersion(SPRINT1_CONFIG_VERSION_DEFAULT, toCanonicalJson(normalized));
  } finally {
    parseMode = previousMode;
  }
}

function finalizeNormalizedSprint1Config(
  normalized: Sprint1ConfigNormalizedData,
): ValidationResult<Sprint1Config> {
  const issues: ValidationIssue[] = [];

  if (!assertAllNumericLeavesAreSafeIntegers(normalized, "", issues)) {
    return failure(issues);
  }

  if (!isKnownSprint1ConfigVersion(normalized.configVersion)) {
    issues.push({
      path: "/configVersion",
      message: "configVersion is not a known registered Sprint1Config version",
      actual: normalized.configVersion,
      expected: "a registered configVersion",
    });
    return failure(issues);
  }

  const expectedCanonicalJson = getExpectedCanonicalJsonForConfigVersion(normalized.configVersion);
  if (expectedCanonicalJson === undefined) {
    issues.push({
      path: "/configVersion",
      message: "configVersion is not a known registered Sprint1Config version",
      actual: normalized.configVersion,
      expected: "a registered configVersion",
    });
    return failure(issues);
  }

  if (toCanonicalJson(normalized) !== expectedCanonicalJson) {
    issues.push({
      path: "/configVersion",
      message: "configVersion content must match the registered canonical content for that version",
      actual: normalized.configVersion,
      expected: "content identical to the registry's canonical JSON for this configVersion",
    });
    return failure(issues);
  }

  return success(deepFreezePlainJson(normalized as Sprint1Config));
}

function validateSprint1ConfigWithMode(
  input: unknown,
  mode: ConfigParseMode,
): ValidationResult<Sprint1Config> {
  const previousMode = parseMode;
  parseMode = mode;
  try {
    ensureDefaultConfigVersionRegistered();
    const structure = buildSprint1ConfigStructure(input);
    if (!structure.ok) {
      return structure;
    }

    if (mode === "display") {
      const issues: ValidationIssue[] = [];
      const normalized = normalizeSprint1ConfigBasisPoints(structure.value, issues);
      if (normalized === undefined) {
        return failure(issues);
      }
      return finalizeNormalizedSprint1Config(normalized);
    }

    // Already in basis-points units; never multiply again.
    return finalizeNormalizedSprint1Config(
      structure.value as unknown as Sprint1ConfigNormalizedData,
    );
  } finally {
    parseMode = previousMode;
  }
}

/** Raw display-unit input → basis-points normalize → registry lock → freeze. */
export function validateSprint1Config(input: unknown): ValidationResult<Sprint1Config> {
  return validateSprint1ConfigWithMode(input, "display");
}

/**
 * Already-normalized basis-points input → structural + registry lock → freeze.
 * Does not multiply by 10000 again.
 */
export function validateNormalizedSprint1Config(input: unknown): ValidationResult<Sprint1Config> {
  return validateSprint1ConfigWithMode(input, "normalized");
}

// ---------------------------------------------------------------------------
// Shared small structural helpers
// ---------------------------------------------------------------------------

function parseIntegerRangeInBounds(
  value: unknown,
  path: string,
  minimumBound: number,
  maximumBound: number,
  issues: ValidationIssue[],
): NumericMinMax | undefined {
  const object = beginPlainObject(value, path, RANGE_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }
  const min = requireIntegerInRange(object, "min", path, minimumBound, maximumBound, issues);
  const max = requireIntegerInRange(object, "max", path, minimumBound, maximumBound, issues);
  if (min === undefined || max === undefined) {
    return undefined;
  }
  if (min > max) {
    issues.push({
      path,
      message: "range min must be <= max",
      actual: { min, max },
      expected: "min <= max",
    });
    return undefined;
  }
  return { min, max };
}

function parseFiniteNumberRange(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): NumericMinMax | undefined {
  const object = beginPlainObject(value, path, RANGE_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }
  const min = requireFiniteNumber(object, "min", path, issues);
  const max = requireFiniteNumber(object, "max", path, issues);
  if (min === undefined || max === undefined) {
    return undefined;
  }
  if (min > max) {
    issues.push({
      path,
      message: "range min must be <= max",
      actual: { min, max },
      expected: "min <= max",
    });
    return undefined;
  }
  return { min, max };
}

type NumericFieldValidator = (
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
) => number | undefined;

/** Requires exactly `keys` (no missing/extra) with each value produced by `validate`. */
function parseNumericRecord<K extends string>(
  value: unknown,
  path: string,
  keys: readonly K[],
  issues: ValidationIssue[],
  validate: NumericFieldValidator,
): Record<K, number> | undefined {
  const object = beginPlainObject(value, path, keys, issues);
  if (object === undefined) {
    return undefined;
  }
  const result = {} as Record<K, number>;
  let ok = true;
  for (const key of keys) {
    const num = validate(object, key, path, issues);
    if (num === undefined) {
      ok = false;
      continue;
    }
    result[key] = num;
  }
  return ok ? result : undefined;
}

/**
 * Reads and equality-checks fixed numeric fields directly off `object` without
 * performing an unknown-key scan (the caller is responsible for that when `object`
 * may carry additional, already-accounted-for keys beside `fixed`'s keys).
 */
function scaleFixedRecordIfNormalized<K extends string>(
  fixed: Record<K, number>,
): Record<K, number> {
  if (parseMode === "display") {
    return fixed;
  }
  const scaled = {} as Record<K, number>;
  for (const key of Object.keys(fixed) as K[]) {
    const bp = normalizeBasisPoints(fixed[key]!);
    if (bp === undefined) {
      throw new Error(
        `fixed canon value is not an exact 1/10000 step: ${key}=${String(fixed[key])}`,
      );
    }
    scaled[key] = bp;
  }
  return scaled;
}

function readFixedNumberFields<K extends string>(
  object: Record<string, unknown>,
  path: string,
  fixed: Record<K, number>,
  issues: ValidationIssue[],
): Record<K, number> | undefined {
  const keys = Object.keys(fixed) as K[];
  const result = {} as Record<K, number>;
  let ok = true;
  for (const key of keys) {
    const num = requireFiniteNumber(object, key, path, issues);
    if (num === undefined) {
      ok = false;
      continue;
    }
    const expected = fixed[key];
    if (num !== expected) {
      issues.push({
        path: `${path}/${key}`,
        message: "value cannot be overridden; must equal the fixed canon value",
        actual: num,
        expected: String(expected),
      });
      ok = false;
      continue;
    }
    result[key] = num;
  }
  return ok ? result : undefined;
}

/** Requires exactly the fixed reference's keys and numeric equality (§7.6/§7.7 "上書き不可"). */
function parseFixedNumberRecord<K extends string>(
  value: unknown,
  path: string,
  fixed: Record<K, number>,
  issues: ValidationIssue[],
): Record<K, number> | undefined {
  const keys = Object.keys(fixed) as K[];
  const object = beginPlainObject(value, path, keys, issues);
  if (object === undefined) {
    return undefined;
  }
  return readFixedNumberFields(object, path, fixed, issues);
}

function assertContiguousBands(
  path: string,
  bands: readonly { name: string; min: number; max: number }[],
  issues: ValidationIssue[],
): void {
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index]!;
    if (band.min > band.max) {
      issues.push({
        path: `${path}/${band.name}`,
        message: "band min must be <= max",
        actual: { min: band.min, max: band.max },
        expected: "min <= max",
      });
    }
    if (index > 0) {
      const previous = bands[index - 1]!;
      if (band.min !== previous.max + 1) {
        issues.push({
          path: `${path}/${band.name}`,
          message: "bands must be contiguous without gaps or overlaps",
          actual: band.min,
          expected: String(previous.max + 1),
        });
      }
    }
  }
}

function assertWeightsSumTo100(
  path: string,
  weights: Readonly<Record<string, number>>,
  issues: ValidationIssue[],
): void {
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
  if (Math.abs(sum - 100) > 1e-9) {
    issues.push({ path, message: "weights must sum to 100", actual: sum, expected: "100" });
  }
}

function assertOrderedPair(
  path: string,
  minimumFieldName: string,
  minimumValue: number,
  maximumFieldName: string,
  maximumValue: number,
  issues: ValidationIssue[],
): void {
  if (minimumValue > maximumValue) {
    issues.push({
      path,
      message: `${minimumFieldName} must be <= ${maximumFieldName}`,
      actual: { [minimumFieldName]: minimumValue, [maximumFieldName]: maximumValue },
      expected: `${minimumFieldName} <= ${maximumFieldName}`,
    });
  }
}

// ---------------------------------------------------------------------------
// 14 §2 growth
// ---------------------------------------------------------------------------

const AGE_FACTOR_KEYS = [
  "age0to7",
  "age8to11",
  "age12to15",
  "age16to20",
  "age21to27",
  "age28to34",
  "age35to41",
  "age42plus",
] as const;

const CURRENT_VALUE_FACTOR_KEYS = [
  "value0to39",
  "value40to59",
  "value60to74",
  "value75to89",
  "value90to100",
] as const;

const TEACHER_FACTOR_KEYS = [
  "noFormalMasterOrUnqualifiedParent",
  "averageMaster",
  "goodMaster",
  "renownedInstructor",
  "eraLeadingInstructor",
] as const;

const DISCIPLE_COUNT_FACTOR_KEYS = [
  "count1to3",
  "count4to6",
  "count7to10",
  "count11to20",
  "count21to40",
  "count41plus",
] as const;

const FATIGUE_FACTOR_KEYS = [
  "value0to20",
  "value21to40",
  "value41to60",
  "value61to80",
  "value81to100",
] as const;

const INJURY_FACTOR_KEYS = ["none0", "light1to24", "medium25to59", "severe60to100"] as const;

const AGE_PROFILE_KEYS = ["early", "normal", "late"] as const;

function parseAgeFactors(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): GrowthAgeFactorsInput | undefined {
  return parseNumericRecord(
    value,
    path,
    AGE_FACTOR_KEYS,
    issues,
    (object, key, fieldPath, fieldIssues) =>
      requireNonNegativeFiniteNumber(object, key, fieldPath, fieldIssues),
  ) as GrowthAgeFactorsInput | undefined;
}

function parseAgeFactorsByProfile(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): GrowthConfigInput["ageFactorsByProfile"] | undefined {
  const object = beginPlainObject(value, path, AGE_PROFILE_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const early = parseAgeFactors(object["early"], `${path}/early`, issues);
  const normal = parseAgeFactors(object["normal"], `${path}/normal`, issues);
  const late = parseAgeFactors(object["late"], `${path}/late`, issues);

  if (early === undefined || normal === undefined || late === undefined) {
    return undefined;
  }
  return { early, normal, late };
}

function parseGrowthConfig(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): GrowthConfigInput | undefined {
  const GROWTH_KEYS = [
    "fixedPointScale",
    "baseMilliPointsPerTraining",
    "potentialMinimumFactor",
    "potentialMaximumFactor",
    "ageFactorsByProfile",
    "currentValueFactors",
    "teacherFactors",
    "discipleCountFactors",
    "fatigueFactors",
    "injuryFactors",
    "motivationConditionMinimumFactor",
    "motivationConditionMaximumFactor",
    "rngMinimumFactor",
    "rngMaximumFactor",
  ] as const;

  const object = beginPlainObject(value, path, GROWTH_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const fixedPointScale = requireIntegerAtLeast(object, "fixedPointScale", path, 1, issues);
  const baseMilliPointsPerTraining = requireIntegerAtLeast(
    object,
    "baseMilliPointsPerTraining",
    path,
    0,
    issues,
  );
  const potentialMinimumFactor = requireNonNegativeFiniteNumber(
    object,
    "potentialMinimumFactor",
    path,
    issues,
  );
  const potentialMaximumFactor = requireNonNegativeFiniteNumber(
    object,
    "potentialMaximumFactor",
    path,
    issues,
  );
  const ageFactorsByProfile = parseAgeFactorsByProfile(
    object["ageFactorsByProfile"],
    `${path}/ageFactorsByProfile`,
    issues,
  );
  const currentValueFactors = parseNumericRecord(
    object["currentValueFactors"],
    `${path}/currentValueFactors`,
    CURRENT_VALUE_FACTOR_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const teacherFactors = parseNumericRecord(
    object["teacherFactors"],
    `${path}/teacherFactors`,
    TEACHER_FACTOR_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const discipleCountFactors = parseNumericRecord(
    object["discipleCountFactors"],
    `${path}/discipleCountFactors`,
    DISCIPLE_COUNT_FACTOR_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const fatigueFactors = parseNumericRecord(
    object["fatigueFactors"],
    `${path}/fatigueFactors`,
    FATIGUE_FACTOR_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const injuryFactors = parseNumericRecord(
    object["injuryFactors"],
    `${path}/injuryFactors`,
    INJURY_FACTOR_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const motivationConditionMinimumFactor = requireNonNegativeFiniteNumber(
    object,
    "motivationConditionMinimumFactor",
    path,
    issues,
  );
  const motivationConditionMaximumFactor = requireNonNegativeFiniteNumber(
    object,
    "motivationConditionMaximumFactor",
    path,
    issues,
  );
  const rngMinimumFactor = requireNonNegativeFiniteNumber(object, "rngMinimumFactor", path, issues);
  const rngMaximumFactor = requireNonNegativeFiniteNumber(object, "rngMaximumFactor", path, issues);

  if (
    fixedPointScale === undefined ||
    baseMilliPointsPerTraining === undefined ||
    potentialMinimumFactor === undefined ||
    potentialMaximumFactor === undefined ||
    ageFactorsByProfile === undefined ||
    currentValueFactors === undefined ||
    teacherFactors === undefined ||
    discipleCountFactors === undefined ||
    fatigueFactors === undefined ||
    injuryFactors === undefined ||
    motivationConditionMinimumFactor === undefined ||
    motivationConditionMaximumFactor === undefined ||
    rngMinimumFactor === undefined ||
    rngMaximumFactor === undefined
  ) {
    return undefined;
  }

  assertOrderedPair(
    path,
    "potentialMinimumFactor",
    potentialMinimumFactor,
    "potentialMaximumFactor",
    potentialMaximumFactor,
    issues,
  );
  assertOrderedPair(
    path,
    "motivationConditionMinimumFactor",
    motivationConditionMinimumFactor,
    "motivationConditionMaximumFactor",
    motivationConditionMaximumFactor,
    issues,
  );
  assertOrderedPair(
    path,
    "rngMinimumFactor",
    rngMinimumFactor,
    "rngMaximumFactor",
    rngMaximumFactor,
    issues,
  );

  return {
    fixedPointScale,
    baseMilliPointsPerTraining,
    potentialMinimumFactor,
    potentialMaximumFactor,
    ageFactorsByProfile,
    currentValueFactors: currentValueFactors as GrowthConfigInput["currentValueFactors"],
    teacherFactors: teacherFactors as GrowthConfigInput["teacherFactors"],
    discipleCountFactors: discipleCountFactors as GrowthConfigInput["discipleCountFactors"],
    fatigueFactors: fatigueFactors as GrowthConfigInput["fatigueFactors"],
    injuryFactors: injuryFactors as GrowthConfigInput["injuryFactors"],
    motivationConditionMinimumFactor,
    motivationConditionMaximumFactor,
    rngMinimumFactor,
    rngMaximumFactor,
  };
}

// ---------------------------------------------------------------------------
// 14 §3 temporaryCondition
// ---------------------------------------------------------------------------

function parseInjuryBands(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TemporaryConditionConfigInput["injuryBands"] | undefined {
  const KEYS = ["none", "light", "medium", "severe"] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const none = requireLiteralInteger(object, "none", path, 0, issues);
  const light = parseIntegerRangeInBounds(object["light"], `${path}/light`, 0, 100, issues);
  const medium = parseIntegerRangeInBounds(object["medium"], `${path}/medium`, 0, 100, issues);
  const severe = parseIntegerRangeInBounds(object["severe"], `${path}/severe`, 0, 100, issues);

  if (none === undefined || light === undefined || medium === undefined || severe === undefined) {
    return undefined;
  }

  assertContiguousBands(
    path,
    [
      { name: "none", min: none, max: none },
      { name: "light", min: light.min, max: light.max },
      { name: "medium", min: medium.min, max: medium.max },
      { name: "severe", min: severe.min, max: severe.max },
    ],
    issues,
  );
  if (severe.max !== 100) {
    issues.push({
      path: `${path}/severe`,
      message: "injury bands must cover the full 0..100 range",
      actual: severe.max,
      expected: "100",
    });
  }

  return { none, light, medium, severe };
}

function parseTemporaryConditionConfig(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TemporaryConditionConfigInput | undefined {
  const KEYS = [
    "injuryBands",
    "weeklyFatigueDelta",
    "restConditionDelta",
    "restMentalRecovery",
    "restInjuryRecovery",
    "forcedRestFatigueThreshold",
  ] as const;
  const WEEKLY_FATIGUE_DELTA_KEYS = [
    "trainStat",
    "learnTechnique",
    "practiceTechnique",
    "rest",
  ] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const injuryBands = parseInjuryBands(object["injuryBands"], `${path}/injuryBands`, issues);
  const weeklyFatigueDelta = parseNumericRecord(
    object["weeklyFatigueDelta"],
    `${path}/weeklyFatigueDelta`,
    WEEKLY_FATIGUE_DELTA_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      key === "rest"
        ? requireInteger(fieldObject, key, fieldPath, fieldIssues)
        : requireIntegerAtLeast(fieldObject, key, fieldPath, 0, fieldIssues),
  );
  const restConditionDelta = requireIntegerAtLeast(object, "restConditionDelta", path, 0, issues);
  const restMentalRecovery = requireIntegerAtLeast(object, "restMentalRecovery", path, 0, issues);
  const restInjuryRecovery = requireIntegerAtLeast(object, "restInjuryRecovery", path, 0, issues);
  const forcedRestFatigueThreshold = requireIntegerInRange(
    object,
    "forcedRestFatigueThreshold",
    path,
    0,
    100,
    issues,
  );

  if (
    injuryBands === undefined ||
    weeklyFatigueDelta === undefined ||
    restConditionDelta === undefined ||
    restMentalRecovery === undefined ||
    restInjuryRecovery === undefined ||
    forcedRestFatigueThreshold === undefined
  ) {
    return undefined;
  }

  return {
    injuryBands,
    weeklyFatigueDelta: weeklyFatigueDelta as TemporaryConditionConfigInput["weeklyFatigueDelta"],
    restConditionDelta,
    restMentalRecovery,
    restInjuryRecovery,
    forcedRestFatigueThreshold,
  };
}

// ---------------------------------------------------------------------------
// 14 §4 weeklyPlanner
// ---------------------------------------------------------------------------

const WEEKLY_ACTION_SCORE_KEYS = ["train", "learn", "practice", "rest"] as const;
const CONTEXT_WEIGHT_KEYS = [
  "personality",
  "developmentNeed",
  "recentResult",
  "teacherAdvice",
  "schedule",
] as const;
const BURDEN_MULTIPLIER_KEYS = ["fatigue", "injury", "mental"] as const;
const BURDEN_ACTION_KEYS = ["trainStat", "learnTechnique", "practiceTechnique", "rest"] as const;
const REST_NEED_BONUS_KEYS = [
  "fatiguePerFivePoints",
  "fatigueMaximum",
  "injuryPerFivePoints",
  "injuryMaximum",
  "mentalExhaustionMaximum",
] as const;
const STAT_TARGET_WEIGHT_KEYS = [
  "remainingCapacity",
  "growthPotential",
  "relatedAptitude",
  "teacherRecommendation",
] as const;
const LEARNING_TARGET_WEIGHT_KEYS = [
  "aptitude",
  "requiredStats",
  "currentProgress",
  "teacherAvailability",
  "styleMatch",
  "tierAccessibility",
] as const;
const PRACTICE_TARGET_WEIGHT_KEYS = [
  "masteryNeed",
  "recentPracticeNeed",
  "teacherPriority",
  "styleMatch",
] as const;

function parseWeeklyActionScores(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WeeklyActionScoresInput | undefined {
  return parseNumericRecord(
    value,
    path,
    WEEKLY_ACTION_SCORE_KEYS,
    issues,
    (object, key, fieldPath, fieldIssues) =>
      requireIntegerAtLeast(object, key, fieldPath, 0, fieldIssues),
  ) as WeeklyActionScoresInput | undefined;
}

function parseBaseScoresByCareerStatus(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WeeklyPlannerConfigInput["baseScoresByCareerStatus"] | undefined {
  const KEYS = ["trainee", "activeCompetitor", "retired"] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const trainee = parseWeeklyActionScores(object["trainee"], `${path}/trainee`, issues);
  const activeCompetitor = parseWeeklyActionScores(
    object["activeCompetitor"],
    `${path}/activeCompetitor`,
    issues,
  );
  const retired = parseWeeklyActionScores(object["retired"], `${path}/retired`, issues);

  if (trainee === undefined || activeCompetitor === undefined || retired === undefined) {
    return undefined;
  }
  return { trainee, activeCompetitor, retired };
}

function parseBurdenPenaltyMultiplier(
  value: unknown,
  path: string,
  actionKey: string,
  issues: ValidationIssue[],
) {
  const result = parseNumericRecord(
    value,
    path,
    BURDEN_MULTIPLIER_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  if (result === undefined) {
    return undefined;
  }
  if (actionKey === "rest") {
    for (const key of BURDEN_MULTIPLIER_KEYS) {
      if (result[key] !== 0) {
        issues.push({
          path: `${path}/${key}`,
          message: "rest burden multipliers must all be 0",
          actual: result[key],
          expected: "0",
        });
      }
    }
  }
  return result;
}

function parseBurdenPenaltyMultipliersByAction(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WeeklyPlannerConfigInput["burdenPenaltyMultipliersByAction"] | undefined {
  const object = beginPlainObject(value, path, BURDEN_ACTION_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const trainStat = parseBurdenPenaltyMultiplier(
    object["trainStat"],
    `${path}/trainStat`,
    "trainStat",
    issues,
  );
  const learnTechnique = parseBurdenPenaltyMultiplier(
    object["learnTechnique"],
    `${path}/learnTechnique`,
    "learnTechnique",
    issues,
  );
  const practiceTechnique = parseBurdenPenaltyMultiplier(
    object["practiceTechnique"],
    `${path}/practiceTechnique`,
    "practiceTechnique",
    issues,
  );
  const rest = parseBurdenPenaltyMultiplier(object["rest"], `${path}/rest`, "rest", issues);

  if (
    trainStat === undefined ||
    learnTechnique === undefined ||
    practiceTechnique === undefined ||
    rest === undefined
  ) {
    return undefined;
  }
  return {
    trainStat:
      trainStat as WeeklyPlannerConfigInput["burdenPenaltyMultipliersByAction"]["trainStat"],
    learnTechnique:
      learnTechnique as WeeklyPlannerConfigInput["burdenPenaltyMultipliersByAction"]["learnTechnique"],
    practiceTechnique:
      practiceTechnique as WeeklyPlannerConfigInput["burdenPenaltyMultipliersByAction"]["practiceTechnique"],
    rest: rest as WeeklyPlannerConfigInput["burdenPenaltyMultipliersByAction"]["rest"],
  };
}

function parseWeeklyPlannerConfig(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WeeklyPlannerConfigInput | undefined {
  const KEYS = [
    "baseScoresByCareerStatus",
    "contextScoreRange",
    "contextWeights",
    "baseFatiguePenaltyPerFivePoints",
    "baseInjuryPenaltyPerFivePoints",
    "baseMentalExhaustionPenaltyMaximum",
    "burdenPenaltyMultipliersByAction",
    "restNeedBonuses",
    "statTargetWeights",
    "learningTargetWeights",
    "practiceTargetWeights",
  ] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const baseScoresByCareerStatus = parseBaseScoresByCareerStatus(
    object["baseScoresByCareerStatus"],
    `${path}/baseScoresByCareerStatus`,
    issues,
  );
  const contextScoreRange = parseFiniteNumberRange(
    object["contextScoreRange"],
    `${path}/contextScoreRange`,
    issues,
  );
  const contextWeights = parseNumericRecord(
    object["contextWeights"],
    `${path}/contextWeights`,
    CONTEXT_WEIGHT_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const baseFatiguePenaltyPerFivePoints = requireNonNegativeFiniteNumber(
    object,
    "baseFatiguePenaltyPerFivePoints",
    path,
    issues,
  );
  const baseInjuryPenaltyPerFivePoints = requireNonNegativeFiniteNumber(
    object,
    "baseInjuryPenaltyPerFivePoints",
    path,
    issues,
  );
  const baseMentalExhaustionPenaltyMaximum = requireNonNegativeFiniteNumber(
    object,
    "baseMentalExhaustionPenaltyMaximum",
    path,
    issues,
  );
  const burdenPenaltyMultipliersByAction = parseBurdenPenaltyMultipliersByAction(
    object["burdenPenaltyMultipliersByAction"],
    `${path}/burdenPenaltyMultipliersByAction`,
    issues,
  );
  const restNeedBonuses = parseNumericRecord(
    object["restNeedBonuses"],
    `${path}/restNeedBonuses`,
    REST_NEED_BONUS_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const statTargetWeights = parseNumericRecord(
    object["statTargetWeights"],
    `${path}/statTargetWeights`,
    STAT_TARGET_WEIGHT_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const learningTargetWeights = parseNumericRecord(
    object["learningTargetWeights"],
    `${path}/learningTargetWeights`,
    LEARNING_TARGET_WEIGHT_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireNumberInRange(fieldObject, key, fieldPath, 0, 100, fieldIssues),
  );
  const practiceTargetWeights = parseNumericRecord(
    object["practiceTargetWeights"],
    `${path}/practiceTargetWeights`,
    PRACTICE_TARGET_WEIGHT_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireNumberInRange(fieldObject, key, fieldPath, 0, 100, fieldIssues),
  );

  if (
    baseScoresByCareerStatus === undefined ||
    contextScoreRange === undefined ||
    contextWeights === undefined ||
    baseFatiguePenaltyPerFivePoints === undefined ||
    baseInjuryPenaltyPerFivePoints === undefined ||
    baseMentalExhaustionPenaltyMaximum === undefined ||
    burdenPenaltyMultipliersByAction === undefined ||
    restNeedBonuses === undefined ||
    statTargetWeights === undefined ||
    learningTargetWeights === undefined ||
    practiceTargetWeights === undefined
  ) {
    return undefined;
  }

  assertWeightsSumTo100(`${path}/learningTargetWeights`, learningTargetWeights, issues);
  assertWeightsSumTo100(`${path}/practiceTargetWeights`, practiceTargetWeights, issues);

  return {
    baseScoresByCareerStatus,
    contextScoreRange,
    contextWeights: contextWeights as WeeklyPlannerConfigInput["contextWeights"],
    baseFatiguePenaltyPerFivePoints,
    baseInjuryPenaltyPerFivePoints,
    baseMentalExhaustionPenaltyMaximum,
    burdenPenaltyMultipliersByAction,
    restNeedBonuses: restNeedBonuses as WeeklyPlannerConfigInput["restNeedBonuses"],
    statTargetWeights: statTargetWeights as WeeklyPlannerConfigInput["statTargetWeights"],
    learningTargetWeights:
      learningTargetWeights as WeeklyPlannerConfigInput["learningTargetWeights"],
    practiceTargetWeights:
      practiceTargetWeights as WeeklyPlannerConfigInput["practiceTargetWeights"],
  };
}

// ---------------------------------------------------------------------------
// 14 §5 techniqueLearning
// ---------------------------------------------------------------------------

const TIER_KEYS = ["basic", "standard", "advanced", "secret"] as const;
const MASTERY_GAIN_KEYS = [
  "dedicatedPractice",
  "normalTraining",
  "officialSuccess",
  "officialFailure",
  "mockSuccess",
  "mockFailure",
] as const;
const MASTERY_CURRENT_VALUE_FACTOR_KEYS = [
  "mastery0to39",
  "mastery40to59",
  "mastery60to79",
  "mastery80to89",
  "mastery90to100",
] as const;

const APTITUDE_FACTOR_FORMULA = "0.60 + aptitude / 100 * 0.80" as const;
const LEARNING_TRAIT_FACTOR_FORMULA = "0.70 + learningTrait / 100 * 0.60" as const;
const TEACHER_TRANSMISSION_FACTOR_FORMULA = "0.70 + teachingAbility / 100 * 0.60" as const;
const COMPATIBILITY_FACTOR_FORMULA = "0.80 + compatibility / 100 * 0.40" as const;

function parseTechniqueLearningConfig(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueLearningConfigInput | undefined {
  const KEYS = [
    "baseWeeklyProgressTenths",
    "aptitudeFactorRange",
    "aptitudeFactorFormula",
    "requiredStatsFactorRange",
    "learningTraitFactorRange",
    "learningTraitFactorFormula",
    "teacherTransmissionFactorRange",
    "teacherTransmissionFactorFormula",
    "compatibilityFactorRange",
    "compatibilityFactorFormula",
    "selfStudyFactor",
    "rngFactorRange",
    "initialMasteryByTier",
    "masteryGainHundredths",
    "masteryPracticeRngFactorRange",
    "masteryCurrentValueFactors",
  ] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const baseWeeklyProgressTenths = requireIntegerAtLeast(
    object,
    "baseWeeklyProgressTenths",
    path,
    0,
    issues,
  );
  const aptitudeFactorRange = parseFactorNumberRange(
    object["aptitudeFactorRange"],
    `${path}/aptitudeFactorRange`,
    issues,
  );
  const aptitudeFactorFormula = requireLiteralString(
    object,
    "aptitudeFactorFormula",
    path,
    APTITUDE_FACTOR_FORMULA,
    issues,
  );
  const requiredStatsFactorRange = parseFactorNumberRange(
    object["requiredStatsFactorRange"],
    `${path}/requiredStatsFactorRange`,
    issues,
  );
  const learningTraitFactorRange = parseFactorNumberRange(
    object["learningTraitFactorRange"],
    `${path}/learningTraitFactorRange`,
    issues,
  );
  const learningTraitFactorFormula = requireLiteralString(
    object,
    "learningTraitFactorFormula",
    path,
    LEARNING_TRAIT_FACTOR_FORMULA,
    issues,
  );
  const teacherTransmissionFactorRange = parseFactorNumberRange(
    object["teacherTransmissionFactorRange"],
    `${path}/teacherTransmissionFactorRange`,
    issues,
  );
  const teacherTransmissionFactorFormula = requireLiteralString(
    object,
    "teacherTransmissionFactorFormula",
    path,
    TEACHER_TRANSMISSION_FACTOR_FORMULA,
    issues,
  );
  const compatibilityFactorRange = parseFactorNumberRange(
    object["compatibilityFactorRange"],
    `${path}/compatibilityFactorRange`,
    issues,
  );
  const compatibilityFactorFormula = requireLiteralString(
    object,
    "compatibilityFactorFormula",
    path,
    COMPATIBILITY_FACTOR_FORMULA,
    issues,
  );
  const selfStudyFactor = requireNonNegativeFiniteNumber(object, "selfStudyFactor", path, issues);
  const rngFactorRange = parseFactorNumberRange(
    object["rngFactorRange"],
    `${path}/rngFactorRange`,
    issues,
  );
  const initialMasteryByTier = parseNumericRecord(
    object["initialMasteryByTier"],
    `${path}/initialMasteryByTier`,
    TIER_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerInRange(fieldObject, key, fieldPath, 0, 100, fieldIssues),
  );
  const masteryGainHundredths = parseNumericRecord(
    object["masteryGainHundredths"],
    `${path}/masteryGainHundredths`,
    MASTERY_GAIN_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerAtLeast(fieldObject, key, fieldPath, 0, fieldIssues),
  );
  const masteryPracticeRngFactorRange = parseFactorNumberRange(
    object["masteryPracticeRngFactorRange"],
    `${path}/masteryPracticeRngFactorRange`,
    issues,
  );
  const masteryCurrentValueFactors = parseNumericRecord(
    object["masteryCurrentValueFactors"],
    `${path}/masteryCurrentValueFactors`,
    MASTERY_CURRENT_VALUE_FACTOR_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );

  if (
    baseWeeklyProgressTenths === undefined ||
    aptitudeFactorRange === undefined ||
    aptitudeFactorFormula === undefined ||
    requiredStatsFactorRange === undefined ||
    learningTraitFactorRange === undefined ||
    learningTraitFactorFormula === undefined ||
    teacherTransmissionFactorRange === undefined ||
    teacherTransmissionFactorFormula === undefined ||
    compatibilityFactorRange === undefined ||
    compatibilityFactorFormula === undefined ||
    selfStudyFactor === undefined ||
    rngFactorRange === undefined ||
    initialMasteryByTier === undefined ||
    masteryGainHundredths === undefined ||
    masteryPracticeRngFactorRange === undefined ||
    masteryCurrentValueFactors === undefined
  ) {
    return undefined;
  }

  return {
    baseWeeklyProgressTenths,
    aptitudeFactorRange,
    aptitudeFactorFormula,
    requiredStatsFactorRange,
    learningTraitFactorRange,
    learningTraitFactorFormula,
    teacherTransmissionFactorRange,
    teacherTransmissionFactorFormula,
    compatibilityFactorRange,
    compatibilityFactorFormula,
    selfStudyFactor,
    rngFactorRange,
    initialMasteryByTier:
      initialMasteryByTier as TechniqueLearningConfigInput["initialMasteryByTier"],
    masteryGainHundredths:
      masteryGainHundredths as TechniqueLearningConfigInput["masteryGainHundredths"],
    masteryPracticeRngFactorRange,
    masteryCurrentValueFactors:
      masteryCurrentValueFactors as TechniqueLearningConfigInput["masteryCurrentValueFactors"],
  };
}

// ---------------------------------------------------------------------------
// 14 §6 techniqueBalance
// ---------------------------------------------------------------------------

const BASIC_ATTACK_PROFILE_CATEGORY_KEYS = ["unarmed", "sword", "magic"] as const;
const BASIC_ATTACK_PROFILE_KEYS = [
  "primaryStats",
  "usableRanges",
  "preferredRanges",
  "power",
  "accuracy",
  "mentalCost",
  "priority",
  "speedModifier",
  "rangeShiftAfterUse",
  "injuryModifier",
  "effectiveMastery",
  "activationCheck",
] as const;

function parseAbilityKeyArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): AbilityKey[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const collected: AbilityKey[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const item: unknown = items[index];
    if (
      typeof item !== "string" ||
      !(ABILITY_CANONICAL_ORDER as readonly string[]).includes(item)
    ) {
      issues.push({
        path: `${path}/${String(index)}`,
        message:
          "value must be one of the fixed ability keys (martial/vitality/technique are not ability keys)",
        actual: item,
        expected: ABILITY_CANONICAL_ORDER.join(" | "),
      });
      ok = false;
      continue;
    }
    if (seen.has(item)) {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "duplicate ability key is not allowed",
        actual: item,
        expected: "unique ability keys",
      });
      ok = false;
      continue;
    }
    seen.add(item);
    collected.push(item as AbilityKey);
  }
  if (!ok) {
    return undefined;
  }
  if (collected.length === 0) {
    issues.push({
      path,
      message: "primaryStats must not be empty",
      actual: items,
      expected: "non-empty array",
    });
    return undefined;
  }
  return [...collected].sort(
    (a, b) => ABILITY_CANONICAL_ORDER.indexOf(a) - ABILITY_CANONICAL_ORDER.indexOf(b),
  );
}

function parseBattleRangeArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleRange[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const collected: BattleRange[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const item: unknown = items[index];
    if (typeof item !== "string" || !(BATTLE_RANGES as readonly string[]).includes(item)) {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "value must be one of the fixed battle ranges",
        actual: item,
        expected: BATTLE_RANGES.join(" | "),
      });
      ok = false;
      continue;
    }
    if (seen.has(item)) {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "duplicate battle range is not allowed",
        actual: item,
        expected: "unique battle ranges",
      });
      ok = false;
      continue;
    }
    seen.add(item);
    collected.push(item as BattleRange);
  }
  if (!ok) {
    return undefined;
  }
  if (collected.length === 0) {
    issues.push({
      path,
      message: "range array must not be empty",
      actual: items,
      expected: "non-empty array",
    });
    return undefined;
  }
  return [...collected].sort((a, b) => BATTLE_RANGES.indexOf(a) - BATTLE_RANGES.indexOf(b));
}

function parseBasicAttackProfile(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BasicAttackProfileInput | undefined {
  const object = beginPlainObject(value, path, BASIC_ATTACK_PROFILE_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const primaryStats = parseAbilityKeyArray(object["primaryStats"], `${path}/primaryStats`, issues);
  const usableRanges = parseBattleRangeArray(
    object["usableRanges"],
    `${path}/usableRanges`,
    issues,
  );
  const preferredRanges = parseBattleRangeArray(
    object["preferredRanges"],
    `${path}/preferredRanges`,
    issues,
  );
  const power = requireNumberInRange(object, "power", path, 0, 100, issues);
  const accuracy = requireNumberInRange(object, "accuracy", path, 0, 100, issues);
  const mentalCost = requireLiteralInteger(object, "mentalCost", path, 0, issues);
  const priority = requireLiteralInteger(object, "priority", path, 0, issues);
  const speedModifier = requireLiteralInteger(object, "speedModifier", path, 0, issues);
  const rangeShiftAfterUse = requireLiteralString(
    object,
    "rangeShiftAfterUse",
    path,
    "none",
    issues,
  );
  const injuryModifier = requireLiteralInteger(object, "injuryModifier", path, 0, issues);
  const effectiveMastery = requireLiteralInteger(object, "effectiveMastery", path, 50, issues);
  const activationCheck = requireLiteralBoolean(object, "activationCheck", path, false, issues);

  if (
    primaryStats === undefined ||
    usableRanges === undefined ||
    preferredRanges === undefined ||
    power === undefined ||
    accuracy === undefined ||
    mentalCost === undefined ||
    priority === undefined ||
    speedModifier === undefined ||
    rangeShiftAfterUse === undefined ||
    injuryModifier === undefined ||
    effectiveMastery === undefined ||
    activationCheck === undefined
  ) {
    return undefined;
  }

  const usableSet = new Set<BattleRange>(usableRanges);
  for (const preferred of preferredRanges) {
    if (!usableSet.has(preferred)) {
      issues.push({
        path: `${path}/preferredRanges`,
        message: "preferredRanges must be a subset of usableRanges",
        actual: preferredRanges,
        expected: `subset of [${usableRanges.join(", ")}]`,
      });
      return undefined;
    }
  }

  return {
    primaryStats,
    usableRanges,
    preferredRanges,
    power,
    accuracy,
    mentalCost,
    priority,
    speedModifier,
    rangeShiftAfterUse,
    injuryModifier,
    effectiveMastery,
    activationCheck,
  };
}

function parseBasicAttackProfiles(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueBalanceConfigInput["basicAttackProfiles"] | undefined {
  // martial (and any other key) is rejected here; only unarmed | sword | magic are allowed.
  const object = beginPlainObject(value, path, BASIC_ATTACK_PROFILE_CATEGORY_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  let ok = true;
  const result: Partial<
    Record<(typeof BASIC_ATTACK_PROFILE_CATEGORY_KEYS)[number], BasicAttackProfileInput>
  > = {};
  for (const key of BASIC_ATTACK_PROFILE_CATEGORY_KEYS) {
    if (!hasOwn(object, key)) {
      issues.push({
        path: `${path}/${key}`,
        message: "required key is missing",
        expected: "object",
      });
      ok = false;
      continue;
    }
    const profile = parseBasicAttackProfile(object[key], `${path}/${key}`, issues);
    if (profile === undefined) {
      ok = false;
      continue;
    }
    result[key] = profile;
  }

  if (!ok) {
    return undefined;
  }
  return result as TechniqueBalanceConfigInput["basicAttackProfiles"];
}

function parsePowerBands(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueBalanceConfigInput["powerBands"] | undefined {
  const KEYS = ["basicAttack", "small", "standard", "advanced", "secret"] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const basicAttack = requireIntegerInRange(object, "basicAttack", path, 0, 100, issues);
  const small = parseIntegerRangeInBounds(object["small"], `${path}/small`, 0, 100, issues);
  const standard = parseIntegerRangeInBounds(
    object["standard"],
    `${path}/standard`,
    0,
    100,
    issues,
  );
  const advanced = parseIntegerRangeInBounds(
    object["advanced"],
    `${path}/advanced`,
    0,
    100,
    issues,
  );
  const secret = parseIntegerRangeInBounds(object["secret"], `${path}/secret`, 0, 100, issues);

  if (
    basicAttack === undefined ||
    small === undefined ||
    standard === undefined ||
    advanced === undefined ||
    secret === undefined
  ) {
    return undefined;
  }

  assertContiguousBands(
    path,
    [
      { name: "small", min: small.min, max: small.max },
      { name: "standard", min: standard.min, max: standard.max },
      { name: "advanced", min: advanced.min, max: advanced.max },
      { name: "secret", min: secret.min, max: secret.max },
    ],
    issues,
  );

  return { basicAttack, small, standard, advanced, secret };
}

function parseTechniqueBalanceConfig(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueBalanceConfigInput | undefined {
  const KEYS = ["powerBands", "basicAttackProfiles"] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const powerBands = parsePowerBands(object["powerBands"], `${path}/powerBands`, issues);
  const basicAttackProfiles = parseBasicAttackProfiles(
    object["basicAttackProfiles"],
    `${path}/basicAttackProfiles`,
    issues,
  );

  if (powerBands === undefined || basicAttackProfiles === undefined) {
    return undefined;
  }

  return { powerBands, basicAttackProfiles };
}

// ---------------------------------------------------------------------------
// 14 §7 battle
// ---------------------------------------------------------------------------

const CONSUMPTION_CLASS_KEYS = ["basicAttack", "small", "medium", "large", "ultimate"] as const;

function parseStartDurability(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["startDurability"] | undefined {
  const KEYS = [
    "conditionPercentPerPoint",
    "fatiguePercentPerPoint",
    "injuryPercentPerPoint",
    "minimumPercent",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const conditionPercentPerPoint = requireNonNegativeFiniteNumber(
    object,
    "conditionPercentPerPoint",
    path,
    issues,
  );
  const fatiguePercentPerPoint = requireNonNegativeFiniteNumber(
    object,
    "fatiguePercentPerPoint",
    path,
    issues,
  );
  const injuryPercentPerPoint = requireNonNegativeFiniteNumber(
    object,
    "injuryPercentPerPoint",
    path,
    issues,
  );
  const minimumPercent = requireIntegerInRange(object, "minimumPercent", path, 0, 100, issues);

  if (
    conditionPercentPerPoint === undefined ||
    fatiguePercentPerPoint === undefined ||
    injuryPercentPerPoint === undefined ||
    minimumPercent === undefined
  ) {
    return undefined;
  }
  return {
    conditionPercentPerPoint,
    fatiguePercentPerPoint,
    injuryPercentPerPoint,
    minimumPercent,
  };
}

function parseActionOrder(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["actionOrder"] | undefined {
  const KEYS = [
    "conditionPerPoint",
    "fatiguePenaltyPerPoint",
    "injuryPenaltyPerPoint",
    "randomMinimum",
    "randomMaximum",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const conditionPerPoint = requireNonNegativeFiniteNumber(
    object,
    "conditionPerPoint",
    path,
    issues,
  );
  const fatiguePenaltyPerPoint = requireNonNegativeFiniteNumber(
    object,
    "fatiguePenaltyPerPoint",
    path,
    issues,
  );
  const injuryPenaltyPerPoint = requireNonNegativeFiniteNumber(
    object,
    "injuryPenaltyPerPoint",
    path,
    issues,
  );
  const randomMinimum = requireInteger(object, "randomMinimum", path, issues);
  const randomMaximum = requireInteger(object, "randomMaximum", path, issues);

  if (
    conditionPerPoint === undefined ||
    fatiguePenaltyPerPoint === undefined ||
    injuryPenaltyPerPoint === undefined ||
    randomMinimum === undefined ||
    randomMaximum === undefined
  ) {
    return undefined;
  }
  assertOrderedPair(path, "randomMinimum", randomMinimum, "randomMaximum", randomMaximum, issues);
  return {
    conditionPerPoint,
    fatiguePenaltyPerPoint,
    injuryPenaltyPerPoint,
    randomMinimum,
    randomMaximum,
  };
}

function parseHit(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["hit"] | undefined {
  const KEYS = [
    "minimumPercent",
    "maximumPercent",
    "preferredRangeModifier",
    "usableNonPreferredRangePenalty",
    "evadePenalty",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const minimumPercent = requireIntegerInRange(object, "minimumPercent", path, 0, 100, issues);
  const maximumPercent = requireIntegerInRange(object, "maximumPercent", path, 0, 100, issues);
  const preferredRangeModifier = requireIntegerAtLeast(
    object,
    "preferredRangeModifier",
    path,
    0,
    issues,
  );
  const usableNonPreferredRangePenalty = requireIntegerAtLeast(
    object,
    "usableNonPreferredRangePenalty",
    path,
    0,
    issues,
  );
  const evadePenalty = requireIntegerAtLeast(object, "evadePenalty", path, 0, issues);

  if (
    minimumPercent === undefined ||
    maximumPercent === undefined ||
    preferredRangeModifier === undefined ||
    usableNonPreferredRangePenalty === undefined ||
    evadePenalty === undefined
  ) {
    return undefined;
  }
  assertOrderedPair(
    path,
    "minimumPercent",
    minimumPercent,
    "maximumPercent",
    maximumPercent,
    issues,
  );
  return {
    minimumPercent,
    maximumPercent,
    preferredRangeModifier,
    usableNonPreferredRangePenalty,
    evadePenalty,
  };
}

function parseDamageFormula(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["damageFormula"] | undefined {
  const KEYS = [
    "aptitudeBase",
    "aptitudeDivisor",
    "masteryBase",
    "masteryDivisor",
    "staminaDefenseWeight",
    "skillDefenseWeight",
    "conditionDefenseWeight",
    "fatigueDefensePenaltyWeight",
    "injuryDefensePenaltyWeight",
    "techniquePowerWeight",
    "attackValueWeight",
    "defenseValueReductionWeight",
    "varianceMinimum",
    "varianceMaximum",
    "minimumDamage",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const aptitudeBase = requireNonNegativeFiniteNumber(object, "aptitudeBase", path, issues);
  const aptitudeDivisor = requireNonNegativeFiniteNumber(object, "aptitudeDivisor", path, issues);
  const masteryBase = requireNonNegativeFiniteNumber(object, "masteryBase", path, issues);
  const masteryDivisor = requireNonNegativeFiniteNumber(object, "masteryDivisor", path, issues);
  const staminaDefenseWeight = requireNonNegativeFiniteNumber(
    object,
    "staminaDefenseWeight",
    path,
    issues,
  );
  const skillDefenseWeight = requireNonNegativeFiniteNumber(
    object,
    "skillDefenseWeight",
    path,
    issues,
  );
  const conditionDefenseWeight = requireNonNegativeFiniteNumber(
    object,
    "conditionDefenseWeight",
    path,
    issues,
  );
  const fatigueDefensePenaltyWeight = requireNonNegativeFiniteNumber(
    object,
    "fatigueDefensePenaltyWeight",
    path,
    issues,
  );
  const injuryDefensePenaltyWeight = requireNonNegativeFiniteNumber(
    object,
    "injuryDefensePenaltyWeight",
    path,
    issues,
  );
  const techniquePowerWeight = requireNonNegativeFiniteNumber(
    object,
    "techniquePowerWeight",
    path,
    issues,
  );
  const attackValueWeight = requireNonNegativeFiniteNumber(
    object,
    "attackValueWeight",
    path,
    issues,
  );
  const defenseValueReductionWeight = requireNonNegativeFiniteNumber(
    object,
    "defenseValueReductionWeight",
    path,
    issues,
  );
  const varianceMinimum = requireNonNegativeFiniteNumber(object, "varianceMinimum", path, issues);
  const varianceMaximum = requireNonNegativeFiniteNumber(object, "varianceMaximum", path, issues);
  const minimumDamage = requireIntegerAtLeast(object, "minimumDamage", path, 0, issues);

  if (
    aptitudeBase === undefined ||
    aptitudeDivisor === undefined ||
    masteryBase === undefined ||
    masteryDivisor === undefined ||
    staminaDefenseWeight === undefined ||
    skillDefenseWeight === undefined ||
    conditionDefenseWeight === undefined ||
    fatigueDefensePenaltyWeight === undefined ||
    injuryDefensePenaltyWeight === undefined ||
    techniquePowerWeight === undefined ||
    attackValueWeight === undefined ||
    defenseValueReductionWeight === undefined ||
    varianceMinimum === undefined ||
    varianceMaximum === undefined ||
    minimumDamage === undefined
  ) {
    return undefined;
  }
  assertOrderedPair(
    path,
    "varianceMinimum",
    varianceMinimum,
    "varianceMaximum",
    varianceMaximum,
    issues,
  );

  return {
    aptitudeBase,
    aptitudeDivisor,
    masteryBase,
    masteryDivisor,
    staminaDefenseWeight,
    skillDefenseWeight,
    conditionDefenseWeight,
    fatigueDefensePenaltyWeight,
    injuryDefensePenaltyWeight,
    techniquePowerWeight,
    attackValueWeight,
    defenseValueReductionWeight,
    varianceMinimum,
    varianceMaximum,
    minimumDamage,
  };
}

function parseDefense(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["defense"] | undefined {
  const KEYS = [
    "damageFactorByConsumptionClass",
    "rangeShiftBlockChanceByConsumptionClass",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const damageFactorByConsumptionClass = parseNumericRecord(
    object["damageFactorByConsumptionClass"],
    `${path}/damageFactorByConsumptionClass`,
    CONSUMPTION_CLASS_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireBpInDisplayRange(fieldObject, key, fieldPath, 0, 1, fieldIssues),
  );
  const rangeShiftBlockChanceByConsumptionClass = parseNumericRecord(
    object["rangeShiftBlockChanceByConsumptionClass"],
    `${path}/rangeShiftBlockChanceByConsumptionClass`,
    CONSUMPTION_CLASS_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerInRange(fieldObject, key, fieldPath, 0, 100, fieldIssues),
  );

  if (
    damageFactorByConsumptionClass === undefined ||
    rangeShiftBlockChanceByConsumptionClass === undefined
  ) {
    return undefined;
  }
  return {
    damageFactorByConsumptionClass:
      damageFactorByConsumptionClass as BattleConfigInput["defense"]["damageFactorByConsumptionClass"],
    rangeShiftBlockChanceByConsumptionClass:
      rangeShiftBlockChanceByConsumptionClass as BattleConfigInput["defense"]["rangeShiftBlockChanceByConsumptionClass"],
  };
}

function parseMovement(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["movement"] | undefined {
  const KEYS = [
    "speedWeight",
    "skillWeight",
    "actionBonus",
    "opponentPreferredRangeControlBonus",
    "opposingMovementBonus",
    "guardingRangeControlBonus",
    "randomMinimum",
    "randomMaximum",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const speedWeight = requireNonNegativeFiniteNumber(object, "speedWeight", path, issues);
  const skillWeight = requireNonNegativeFiniteNumber(object, "skillWeight", path, issues);
  const actionBonus = requireIntegerAtLeast(object, "actionBonus", path, 0, issues);
  const opponentPreferredRangeControlBonus = requireIntegerAtLeast(
    object,
    "opponentPreferredRangeControlBonus",
    path,
    0,
    issues,
  );
  const opposingMovementBonus = requireIntegerAtLeast(
    object,
    "opposingMovementBonus",
    path,
    0,
    issues,
  );
  const guardingRangeControlBonus = requireIntegerAtLeast(
    object,
    "guardingRangeControlBonus",
    path,
    0,
    issues,
  );
  const randomMinimum = requireInteger(object, "randomMinimum", path, issues);
  const randomMaximum = requireInteger(object, "randomMaximum", path, issues);

  if (
    speedWeight === undefined ||
    skillWeight === undefined ||
    actionBonus === undefined ||
    opponentPreferredRangeControlBonus === undefined ||
    opposingMovementBonus === undefined ||
    guardingRangeControlBonus === undefined ||
    randomMinimum === undefined ||
    randomMaximum === undefined
  ) {
    return undefined;
  }
  assertOrderedPair(path, "randomMinimum", randomMinimum, "randomMaximum", randomMaximum, issues);

  return {
    speedWeight,
    skillWeight,
    actionBonus,
    opponentPreferredRangeControlBonus,
    opposingMovementBonus,
    guardingRangeControlBonus,
    randomMinimum,
    randomMaximum,
  };
}

function parseFocusMind(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["focusMind"] | undefined {
  const KEYS = [
    "recoveryRatio",
    "partialRecoveryRatio",
    "interruptDamageRatio",
    "noDamageNextHitModifier",
    "noDamageNextActivationModifier",
    "partialDamageNextHitModifier",
    "partialDamageNextActivationModifier",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const recoveryRatio = requireBpInDisplayRange(object, "recoveryRatio", path, 0, 1, issues);
  const partialRecoveryRatio = requireBpInDisplayRange(
    object,
    "partialRecoveryRatio",
    path,
    0,
    1,
    issues,
  );
  const interruptDamageRatio = requireBpInDisplayRange(
    object,
    "interruptDamageRatio",
    path,
    0,
    1,
    issues,
  );
  const noDamageNextHitModifier = requireIntegerAtLeast(
    object,
    "noDamageNextHitModifier",
    path,
    0,
    issues,
  );
  const noDamageNextActivationModifier = requireIntegerAtLeast(
    object,
    "noDamageNextActivationModifier",
    path,
    0,
    issues,
  );
  const partialDamageNextHitModifier = requireIntegerAtLeast(
    object,
    "partialDamageNextHitModifier",
    path,
    0,
    issues,
  );
  const partialDamageNextActivationModifier = requireIntegerAtLeast(
    object,
    "partialDamageNextActivationModifier",
    path,
    0,
    issues,
  );

  if (
    recoveryRatio === undefined ||
    partialRecoveryRatio === undefined ||
    interruptDamageRatio === undefined ||
    noDamageNextHitModifier === undefined ||
    noDamageNextActivationModifier === undefined ||
    partialDamageNextHitModifier === undefined ||
    partialDamageNextActivationModifier === undefined
  ) {
    return undefined;
  }
  return {
    recoveryRatio,
    partialRecoveryRatio,
    interruptDamageRatio,
    noDamageNextHitModifier,
    noDamageNextActivationModifier,
    partialDamageNextHitModifier,
    partialDamageNextActivationModifier,
  };
}

function parseActivation(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["activation"] | undefined {
  const KEYS = [
    "minimumPercent",
    "maximumPercent",
    "basePercent",
    "difficultyPenaltyPerPoint",
    "spiritBonusPerPointFrom50",
    "masteryBonusPerPointFrom50",
    "aptitudeBonusPerPointFrom50",
    "fatiguePenaltyPerPoint",
    "injuryPenaltyPerPoint",
    "consumptionPenaltyPerPoint",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const minimumPercent = requireIntegerInRange(object, "minimumPercent", path, 0, 100, issues);
  const maximumPercent = requireIntegerInRange(object, "maximumPercent", path, 0, 100, issues);
  const basePercent = requireIntegerInRange(object, "basePercent", path, 0, 100, issues);
  const difficultyPenaltyPerPoint = requireNonNegativeFiniteNumber(
    object,
    "difficultyPenaltyPerPoint",
    path,
    issues,
  );
  const spiritBonusPerPointFrom50 = requireNonNegativeFiniteNumber(
    object,
    "spiritBonusPerPointFrom50",
    path,
    issues,
  );
  const masteryBonusPerPointFrom50 = requireNonNegativeFiniteNumber(
    object,
    "masteryBonusPerPointFrom50",
    path,
    issues,
  );
  const aptitudeBonusPerPointFrom50 = requireNonNegativeFiniteNumber(
    object,
    "aptitudeBonusPerPointFrom50",
    path,
    issues,
  );
  const fatiguePenaltyPerPoint = requireNonNegativeFiniteNumber(
    object,
    "fatiguePenaltyPerPoint",
    path,
    issues,
  );
  const injuryPenaltyPerPoint = requireNonNegativeFiniteNumber(
    object,
    "injuryPenaltyPerPoint",
    path,
    issues,
  );
  const consumptionPenaltyPerPoint = requireNonNegativeFiniteNumber(
    object,
    "consumptionPenaltyPerPoint",
    path,
    issues,
  );

  if (
    minimumPercent === undefined ||
    maximumPercent === undefined ||
    basePercent === undefined ||
    difficultyPenaltyPerPoint === undefined ||
    spiritBonusPerPointFrom50 === undefined ||
    masteryBonusPerPointFrom50 === undefined ||
    aptitudeBonusPerPointFrom50 === undefined ||
    fatiguePenaltyPerPoint === undefined ||
    injuryPenaltyPerPoint === undefined ||
    consumptionPenaltyPerPoint === undefined
  ) {
    return undefined;
  }
  assertOrderedPair(
    path,
    "minimumPercent",
    minimumPercent,
    "maximumPercent",
    maximumPercent,
    issues,
  );

  return {
    minimumPercent,
    maximumPercent,
    basePercent,
    difficultyPenaltyPerPoint,
    spiritBonusPerPointFrom50,
    masteryBonusPerPointFrom50,
    aptitudeBonusPerPointFrom50,
    fatiguePenaltyPerPoint,
    injuryPenaltyPerPoint,
    consumptionPenaltyPerPoint,
  };
}

function parseInjury(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["injury"] | undefined {
  const KEYS = [
    "baseChanceBands",
    "fatigueChancePerPoint",
    "existingInjuryChancePerPoint",
    "staminaReductionPerPoint",
    "injuryPronenessChancePerPointFrom50",
    "maximumPercent",
    "guardedChanceFactor",
    "majorChanceWhenInjured",
    "minorInjuryDelta",
    "majorInjuryDelta",
    "unableToContinueThreshold",
  ] as const;
  const BASE_CHANCE_BAND_KEYS = [
    "below10Percent",
    "10to19Percent",
    "20to29Percent",
    "30to39Percent",
    "40PercentOrMore",
  ] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const baseChanceBands = parseNumericRecord(
    object["baseChanceBands"],
    `${path}/baseChanceBands`,
    BASE_CHANCE_BAND_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerInRange(fieldObject, key, fieldPath, 0, 100, fieldIssues),
  );
  const fatigueChancePerPoint = requireNonNegativeFiniteNumber(
    object,
    "fatigueChancePerPoint",
    path,
    issues,
  );
  const existingInjuryChancePerPoint = requireNonNegativeFiniteNumber(
    object,
    "existingInjuryChancePerPoint",
    path,
    issues,
  );
  const staminaReductionPerPoint = requireNonNegativeFiniteNumber(
    object,
    "staminaReductionPerPoint",
    path,
    issues,
  );
  const injuryPronenessChancePerPointFrom50 = requireNonNegativeFiniteNumber(
    object,
    "injuryPronenessChancePerPointFrom50",
    path,
    issues,
  );
  const maximumPercent = requireIntegerInRange(object, "maximumPercent", path, 0, 100, issues);
  const guardedChanceFactor = requireBpInDisplayRange(
    object,
    "guardedChanceFactor",
    path,
    0,
    1,
    issues,
  );
  const majorChanceWhenInjured = requireBpInDisplayRange(
    object,
    "majorChanceWhenInjured",
    path,
    0,
    1,
    issues,
  );
  const minorInjuryDelta = requireIntegerInRange(object, "minorInjuryDelta", path, 0, 100, issues);
  const majorInjuryDelta = requireIntegerInRange(object, "majorInjuryDelta", path, 0, 100, issues);
  const unableToContinueThreshold = requireIntegerInRange(
    object,
    "unableToContinueThreshold",
    path,
    1,
    100,
    issues,
  );

  if (
    baseChanceBands === undefined ||
    fatigueChancePerPoint === undefined ||
    existingInjuryChancePerPoint === undefined ||
    staminaReductionPerPoint === undefined ||
    injuryPronenessChancePerPointFrom50 === undefined ||
    maximumPercent === undefined ||
    guardedChanceFactor === undefined ||
    majorChanceWhenInjured === undefined ||
    minorInjuryDelta === undefined ||
    majorInjuryDelta === undefined ||
    unableToContinueThreshold === undefined
  ) {
    return undefined;
  }

  return {
    baseChanceBands: baseChanceBands as BattleConfigInput["injury"]["baseChanceBands"],
    fatigueChancePerPoint,
    existingInjuryChancePerPoint,
    staminaReductionPerPoint,
    injuryPronenessChancePerPointFrom50,
    maximumPercent,
    guardedChanceFactor,
    majorChanceWhenInjured,
    minorInjuryDelta,
    majorInjuryDelta,
    unableToContinueThreshold,
  };
}

function parseConsumption(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["consumption"] | undefined {
  const KEYS = [
    "actionBase",
    "highPriorityAdditional",
    "performanceBands",
    "highBandInjuryMultiplier",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const actionBase = parseFixedNumberRecord(
    object["actionBase"],
    `${path}/actionBase`,
    FIXED_CONSUMPTION_ACTION_BASE,
    issues,
  );
  const highPriorityAdditionalRaw = requireInteger(object, "highPriorityAdditional", path, issues);
  const performanceBands = parseFixedNumberRecord(
    object["performanceBands"],
    `${path}/performanceBands`,
    scaleFixedRecordIfNormalized(FIXED_CONSUMPTION_PERFORMANCE_BANDS),
    issues,
  );
  const highBandInjuryMultiplier = requireNonNegativeFiniteNumber(
    object,
    "highBandInjuryMultiplier",
    path,
    issues,
  );

  if (
    actionBase === undefined ||
    highPriorityAdditionalRaw === undefined ||
    performanceBands === undefined ||
    highBandInjuryMultiplier === undefined
  ) {
    return undefined;
  }

  if (highPriorityAdditionalRaw !== FIXED_CONSUMPTION_HIGH_PRIORITY_ADDITIONAL) {
    issues.push({
      path: `${path}/highPriorityAdditional`,
      message: "value cannot be overridden; must equal the fixed canon value",
      actual: highPriorityAdditionalRaw,
      expected: String(FIXED_CONSUMPTION_HIGH_PRIORITY_ADDITIONAL),
    });
    return undefined;
  }

  return {
    actionBase: actionBase as BattleConfigInput["consumption"]["actionBase"],
    highPriorityAdditional: highPriorityAdditionalRaw,
    performanceBands: performanceBands as BattleConfigInput["consumption"]["performanceBands"],
    highBandInjuryMultiplier,
  };
}

function parseJudgement(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["judgement"] | undefined {
  const KEYS = [
    "totalMinimum",
    "totalMaximum",
    "damageMaximum",
    "hitMaximum",
    "techniqueMaximum",
    "initiativeMaximum",
    "defenseMaximum",
    "passivityPenaltyMaximum",
    "passivityPenaltyPerAction",
    "invalidActionPenaltyPerAction",
    "techniqueImportancePoints",
  ] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const { techniqueImportancePoints: fixedTechniqueImportancePoints, ...fixedFlat } =
    FIXED_JUDGEMENT;
  const flat = readFixedNumberFields(object, path, fixedFlat, issues);
  const techniqueImportancePoints = parseFixedNumberRecord(
    object["techniqueImportancePoints"],
    `${path}/techniqueImportancePoints`,
    fixedTechniqueImportancePoints,
    issues,
  );

  if (flat === undefined || techniqueImportancePoints === undefined) {
    return undefined;
  }

  if (flat["totalMinimum"] >= flat["totalMaximum"]) {
    issues.push({
      path: `${path}/totalMaximum`,
      message: "totalMinimum must be < totalMaximum",
      actual: { totalMinimum: flat["totalMinimum"], totalMaximum: flat["totalMaximum"] },
      expected: "totalMinimum < totalMaximum",
    });
    return undefined;
  }

  return {
    totalMinimum: flat["totalMinimum"],
    totalMaximum: flat["totalMaximum"],
    damageMaximum: flat["damageMaximum"],
    hitMaximum: flat["hitMaximum"],
    techniqueMaximum: flat["techniqueMaximum"],
    initiativeMaximum: flat["initiativeMaximum"],
    defenseMaximum: flat["defenseMaximum"],
    passivityPenaltyMaximum: flat["passivityPenaltyMaximum"],
    passivityPenaltyPerAction: flat["passivityPenaltyPerAction"],
    invalidActionPenaltyPerAction: flat["invalidActionPenaltyPerAction"],
    techniqueImportancePoints:
      techniqueImportancePoints as BattleConfigInput["judgement"]["techniqueImportancePoints"],
  };
}

function parseStrategy(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["strategy"] | undefined {
  const KEYS = [
    "expectedDamageWeight",
    "rangeControlWeight",
    "defenseNeedWeight",
    "mentalRecoveryNeedWeight",
    "mentalCostPenaltyWeight",
    "injuryRiskPenaltyWeight",
    "personalityModifiers",
    "surrenderCandidateThreshold",
    "surrenderActionBaseScore",
    "surrender",
    "highConsumptionSurrenderBonus",
  ] as const;
  const PERSONALITY_MODIFIER_KEYS = [
    "attackAggressionPerPointFrom50",
    "attackRiskTolerancePerPointFrom50",
    "defenseCautionPerPointFrom50",
    "defenseRiskTolerancePenaltyPerPointFrom50",
    "focusCautionPerPointFrom50",
    "movementAggressionMinusCaution",
    "surrenderCautionPerPointFrom50",
    "surrenderPerseveranceReductionPerPointFrom50",
    "surrenderRiskToleranceReductionPerPointFrom50",
  ] as const;
  const SURRENDER_KEYS = [
    "durabilityWeight",
    "mentalWeight",
    "injuryWeight",
    "consumptionWeight",
    "opponentLeadWeight",
    "confidenceWeight",
    "majorInjuryRiskWeight",
  ] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const expectedDamageWeight = requireNonNegativeFiniteNumber(
    object,
    "expectedDamageWeight",
    path,
    issues,
  );
  const rangeControlWeight = requireIntegerAtLeast(object, "rangeControlWeight", path, 0, issues);
  const defenseNeedWeight = requireIntegerAtLeast(object, "defenseNeedWeight", path, 0, issues);
  const mentalRecoveryNeedWeight = requireIntegerAtLeast(
    object,
    "mentalRecoveryNeedWeight",
    path,
    0,
    issues,
  );
  const mentalCostPenaltyWeight = requireNonNegativeFiniteNumber(
    object,
    "mentalCostPenaltyWeight",
    path,
    issues,
  );
  const injuryRiskPenaltyWeight = requireIntegerAtLeast(
    object,
    "injuryRiskPenaltyWeight",
    path,
    0,
    issues,
  );
  const personalityModifiers = parseNumericRecord(
    object["personalityModifiers"],
    `${path}/personalityModifiers`,
    PERSONALITY_MODIFIER_KEYS,
    issues,
    requireNonNegativeFiniteNumber,
  );
  const surrenderCandidateThreshold = requireIntegerInRange(
    object,
    "surrenderCandidateThreshold",
    path,
    0,
    100,
    issues,
  );
  const surrenderActionBaseScore = requireInteger(object, "surrenderActionBaseScore", path, issues);
  const surrender = parseNumericRecord(
    object["surrender"],
    `${path}/surrender`,
    SURRENDER_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerAtLeast(fieldObject, key, fieldPath, 0, fieldIssues),
  );
  const highConsumptionSurrenderBonus = requireIntegerAtLeast(
    object,
    "highConsumptionSurrenderBonus",
    path,
    0,
    issues,
  );

  if (
    expectedDamageWeight === undefined ||
    rangeControlWeight === undefined ||
    defenseNeedWeight === undefined ||
    mentalRecoveryNeedWeight === undefined ||
    mentalCostPenaltyWeight === undefined ||
    injuryRiskPenaltyWeight === undefined ||
    personalityModifiers === undefined ||
    surrenderCandidateThreshold === undefined ||
    surrenderActionBaseScore === undefined ||
    surrender === undefined ||
    highConsumptionSurrenderBonus === undefined
  ) {
    return undefined;
  }

  return {
    expectedDamageWeight,
    rangeControlWeight,
    defenseNeedWeight,
    mentalRecoveryNeedWeight,
    mentalCostPenaltyWeight,
    injuryRiskPenaltyWeight,
    personalityModifiers:
      personalityModifiers as BattleConfigInput["strategy"]["personalityModifiers"],
    surrenderCandidateThreshold,
    surrenderActionBaseScore,
    surrender: surrender as BattleConfigInput["strategy"]["surrender"],
    highConsumptionSurrenderBonus,
  };
}

function parseConditionConfidencePair(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): { condition: number; confidence: number } | undefined {
  const KEYS = ["condition", "confidence"] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const condition = requireIntegerInRange(object, "condition", path, -20, 20, issues);
  const confidence = requireIntegerInRange(object, "confidence", path, -20, 20, issues);
  if (condition === undefined || confidence === undefined) {
    return undefined;
  }
  return { condition, confidence };
}

function parsePostEffects(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["postEffects"] | undefined {
  const KEYS = [
    "continuedFatigueRatio",
    "damageAdditionalFatigueRules",
    "majorInjuryAdditionalFatigue",
    "consecutiveMatchAdditionalFatigueRules",
    "ageAdditionalFatigueRules",
    "resultModifiersByBattleKindAndEndReason",
  ] as const;
  const DAMAGE_ADDITIONAL_FATIGUE_KEYS = [
    "below10Percent",
    "10to19Percent",
    "20to29Percent",
    "30to39Percent",
    "40PercentOrMore",
  ] as const;
  const CONSECUTIVE_MATCH_KEYS = ["firstMatch", "secondMatch", "thirdOrLater"] as const;
  const AGE_ADDITIONAL_FATIGUE_KEYS = ["age0to27", "age28to34", "age35to41"] as const;
  const RESULT_MODIFIER_KEYS = [
    "officialWin",
    "officialLoss",
    "mockWin",
    "mockLoss",
    "surrenderAdditional",
    "knockoutAdditional",
  ] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const continuedFatigueRatio = requireBpInDisplayRange(
    object,
    "continuedFatigueRatio",
    path,
    0,
    1,
    issues,
  );
  const damageAdditionalFatigueRules = parseNumericRecord(
    object["damageAdditionalFatigueRules"],
    `${path}/damageAdditionalFatigueRules`,
    DAMAGE_ADDITIONAL_FATIGUE_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerInRange(fieldObject, key, fieldPath, 0, 100, fieldIssues),
  );
  const majorInjuryAdditionalFatigue = requireIntegerAtLeast(
    object,
    "majorInjuryAdditionalFatigue",
    path,
    0,
    issues,
  );
  const consecutiveMatchAdditionalFatigueRules = parseNumericRecord(
    object["consecutiveMatchAdditionalFatigueRules"],
    `${path}/consecutiveMatchAdditionalFatigueRules`,
    CONSECUTIVE_MATCH_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerAtLeast(fieldObject, key, fieldPath, 0, fieldIssues),
  );
  const ageAdditionalFatigueRules = parseNumericRecord(
    object["ageAdditionalFatigueRules"],
    `${path}/ageAdditionalFatigueRules`,
    AGE_ADDITIONAL_FATIGUE_KEYS,
    issues,
    (fieldObject, key, fieldPath, fieldIssues) =>
      requireIntegerAtLeast(fieldObject, key, fieldPath, 0, fieldIssues),
  );

  let resultModifiers:
    BattleConfigInput["postEffects"]["resultModifiersByBattleKindAndEndReason"] | undefined;
  const resultModifiersObject = beginPlainObject(
    object["resultModifiersByBattleKindAndEndReason"],
    `${path}/resultModifiersByBattleKindAndEndReason`,
    RESULT_MODIFIER_KEYS,
    issues,
  );
  if (resultModifiersObject !== undefined) {
    let ok = true;
    const built: Partial<
      Record<(typeof RESULT_MODIFIER_KEYS)[number], { condition: number; confidence: number }>
    > = {};
    for (const key of RESULT_MODIFIER_KEYS) {
      if (!hasOwn(resultModifiersObject, key)) {
        issues.push({
          path: `${path}/resultModifiersByBattleKindAndEndReason/${key}`,
          message: "required key is missing",
          expected: "object",
        });
        ok = false;
        continue;
      }
      const pair = parseConditionConfidencePair(
        resultModifiersObject[key],
        `${path}/resultModifiersByBattleKindAndEndReason/${key}`,
        issues,
      );
      if (pair === undefined) {
        ok = false;
        continue;
      }
      built[key] = pair;
    }
    if (ok) {
      resultModifiers =
        built as BattleConfigInput["postEffects"]["resultModifiersByBattleKindAndEndReason"];
    }
  }

  if (
    continuedFatigueRatio === undefined ||
    damageAdditionalFatigueRules === undefined ||
    majorInjuryAdditionalFatigue === undefined ||
    consecutiveMatchAdditionalFatigueRules === undefined ||
    ageAdditionalFatigueRules === undefined ||
    resultModifiers === undefined
  ) {
    return undefined;
  }

  return {
    continuedFatigueRatio,
    damageAdditionalFatigueRules:
      damageAdditionalFatigueRules as BattleConfigInput["postEffects"]["damageAdditionalFatigueRules"],
    majorInjuryAdditionalFatigue,
    consecutiveMatchAdditionalFatigueRules:
      consecutiveMatchAdditionalFatigueRules as BattleConfigInput["postEffects"]["consecutiveMatchAdditionalFatigueRules"],
    ageAdditionalFatigueRules:
      ageAdditionalFatigueRules as BattleConfigInput["postEffects"]["ageAdditionalFatigueRules"],
    resultModifiersByBattleKindAndEndReason: resultModifiers,
  };
}

function parseMentalCost(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput["mentalCost"] | undefined {
  const KEYS = ["maximumMasteryReductionRatio"] as const;
  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const maximumMasteryReductionRatio = requireBpInDisplayRange(
    object,
    "maximumMasteryReductionRatio",
    path,
    0,
    1,
    issues,
  );
  if (maximumMasteryReductionRatio === undefined) {
    return undefined;
  }
  return { maximumMasteryReductionRatio };
}

function parseBattleConfig(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): BattleConfigInput | undefined {
  const KEYS = [
    "maxTurns",
    "defaultInitialRange",
    "startDurability",
    "actionOrder",
    "hit",
    "damageFormula",
    "defense",
    "movement",
    "focusMind",
    "activation",
    "mentalCost",
    "injury",
    "consumption",
    "judgement",
    "strategy",
    "postEffects",
  ] as const;

  const object = beginPlainObject(value, path, KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  const maxTurns = requireLiteralInteger(object, "maxTurns", path, 20, issues);
  const defaultInitialRangeRaw = requireNonEmptyTrimmedString(
    object,
    "defaultInitialRange",
    path,
    issues,
  );
  let defaultInitialRange: BattleRange | undefined;
  if (defaultInitialRangeRaw !== undefined) {
    if ((BATTLE_RANGES as readonly string[]).includes(defaultInitialRangeRaw)) {
      defaultInitialRange = defaultInitialRangeRaw as BattleRange;
    } else {
      issues.push({
        path: `${path}/defaultInitialRange`,
        message: "value must be one of the fixed battle ranges",
        actual: defaultInitialRangeRaw,
        expected: BATTLE_RANGES.join(" | "),
      });
    }
  }

  const startDurability = parseStartDurability(
    object["startDurability"],
    `${path}/startDurability`,
    issues,
  );
  const actionOrder = parseActionOrder(object["actionOrder"], `${path}/actionOrder`, issues);
  const hit = parseHit(object["hit"], `${path}/hit`, issues);
  const damageFormula = parseDamageFormula(
    object["damageFormula"],
    `${path}/damageFormula`,
    issues,
  );
  const defense = parseDefense(object["defense"], `${path}/defense`, issues);
  const movement = parseMovement(object["movement"], `${path}/movement`, issues);
  const focusMind = parseFocusMind(object["focusMind"], `${path}/focusMind`, issues);
  const activation = parseActivation(object["activation"], `${path}/activation`, issues);
  const mentalCost = parseMentalCost(object["mentalCost"], `${path}/mentalCost`, issues);
  const injury = parseInjury(object["injury"], `${path}/injury`, issues);
  const consumption = parseConsumption(object["consumption"], `${path}/consumption`, issues);
  const judgement = parseJudgement(object["judgement"], `${path}/judgement`, issues);
  const strategy = parseStrategy(object["strategy"], `${path}/strategy`, issues);
  const postEffects = parsePostEffects(object["postEffects"], `${path}/postEffects`, issues);

  if (
    maxTurns === undefined ||
    defaultInitialRange === undefined ||
    startDurability === undefined ||
    actionOrder === undefined ||
    hit === undefined ||
    damageFormula === undefined ||
    defense === undefined ||
    movement === undefined ||
    focusMind === undefined ||
    activation === undefined ||
    mentalCost === undefined ||
    injury === undefined ||
    consumption === undefined ||
    judgement === undefined ||
    strategy === undefined ||
    postEffects === undefined
  ) {
    return undefined;
  }

  return {
    maxTurns,
    defaultInitialRange,
    startDurability,
    actionOrder,
    hit,
    damageFormula,
    defense,
    movement,
    focusMind,
    activation,
    mentalCost,
    injury,
    consumption,
    judgement,
    strategy,
    postEffects,
  };
}
