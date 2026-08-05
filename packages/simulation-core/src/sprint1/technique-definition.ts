/**
 * TechniqueDefinition structural + semantic validation (09 mini-spec §4-§5, §13 / S01-003).
 * Single-definition validation only: catalog membership, cross-technique reference
 * existence/cycle checks, and TechniqueCatalog/catalogHash belong to the catalog module
 * (not created by this file). `PersonTechniqueState`'s storage shape is owned by S01-001
 * (`./person-technique-state.ts`) and is not redefined here.
 */
import { ABILITY_KEYS } from "../abilities.js";
import type { AbilityKey } from "../abilities.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { asPersonId, asTechniqueId } from "../ids.js";
import type { PersonId, TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  ACTION_TRAITS_KEYS,
  LEARNING_PROGRESS_STANDARD_BY_TIER,
  LEARNING_TIERS,
  TECHNIQUE_CONSUMPTION_CLASSES,
  TECHNIQUE_DEFINITION_SCHEMA_VERSION,
  TECHNIQUE_PRIORITIES,
} from "./technique-enums.js";
import type {
  ActionTraits,
  LearningTier,
  TechniquePriority,
  TechniqueConsumptionClass,
} from "./technique-enums.js";
import { BATTLE_RANGES, RANGE_SHIFT_AFTER_USE, TECHNIQUE_CATEGORIES } from "./types.js";
import type { BattleRange, RangeShiftAfterUse, TechniqueCategory } from "./types.js";
import {
  assertNoAccessors,
  childPath,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireSafeIntegerAtLeast,
  requireLiteralBoolean,
  requireLiteralString,
  requireNonEmptyString,
  requireNonEmptyTrimmedString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

/** 09 mini-spec §4.5 `TechniqueMasteryRequirement`. */
export type TechniqueMasteryRequirement = {
  techniqueId: TechniqueId;
  requiredMastery: number;
};

/**
 * Canonical rebuild order (09 mini-spec §4). Every successful validation result has its
 * own keys reconstructed in exactly this order before being deep-frozen.
 */
export const TECHNIQUE_DEFINITION_KEYS = [
  "techniqueId",
  "schemaVersion",
  "dataVersion",
  "name",
  "category",
  "primaryStats",
  "requiredAptitude",
  "requiredStats",
  "prerequisiteTechniqueMastery",
  "mentalCost",
  "difficulty",
  "learningTier",
  "consumptionClass",
  "learningProgressRequired",
  "learningProgressOverrideReason",
  "teachingProficiencyRequired",
  "secrecy",
  "power",
  "accuracy",
  "activationDifficulty",
  "prerequisiteTechniqueIds",
  "originPersonId",
  "sourceTechniqueIds",
  "tags",
  "usableRanges",
  "preferredRanges",
  "rangeShiftAfterUse",
  "priority",
  "speedModifier",
  "injuryModifier",
  "actionTraits",
] as const;

export type TechniqueDefinition = {
  techniqueId: TechniqueId;
  schemaVersion: typeof TECHNIQUE_DEFINITION_SCHEMA_VERSION;
  dataVersion: string;
  name: string;
  category: TechniqueCategory;
  primaryStats: readonly AbilityKey[];
  requiredAptitude: number;
  requiredStats: Partial<Record<AbilityKey, number>>;
  prerequisiteTechniqueMastery: readonly TechniqueMasteryRequirement[];
  mentalCost: number;
  difficulty: number;
  learningTier: LearningTier;
  consumptionClass: TechniqueConsumptionClass;
  learningProgressRequired: number;
  learningProgressOverrideReason: string | null;
  teachingProficiencyRequired: number;
  secrecy: number;
  power: number;
  accuracy: number;
  activationDifficulty: number;
  prerequisiteTechniqueIds: readonly TechniqueId[];
  originPersonId: PersonId | null;
  sourceTechniqueIds: readonly TechniqueId[];
  tags: readonly string[];
  usableRanges: readonly BattleRange[];
  preferredRanges: readonly BattleRange[];
  rangeShiftAfterUse: RangeShiftAfterUse;
  priority: TechniquePriority;
  speedModifier: number;
  injuryModifier: number;
  actionTraits: ActionTraits;
};

const PREREQUISITE_TECHNIQUE_MASTERY_KEYS = ["techniqueId", "requiredMastery"] as const;

// ---------------------------------------------------------------------------
// Small local parsing helpers (kept file-local; not general enough for plain-data.ts)
// ---------------------------------------------------------------------------

function requireStringEnum<const T extends string>(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  allowed: readonly T[],
  issues: ValidationIssue[],
): T | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: allowed.join(" | ") });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    issues.push({
      path,
      message: `value must be one of: ${allowed.join(", ")}`,
      actual: value,
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  return value as T;
}

function requireNumberEnum<const T extends number>(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  allowed: readonly T[],
  issues: ValidationIssue[],
): T | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: allowed.join(" | ") });
    return undefined;
  }
  const value = object[key];
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    !(allowed as readonly number[]).includes(value)
  ) {
    issues.push({
      path,
      message: `value must be one of: ${allowed.join(", ")}`,
      actual: value,
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  return value as T;
}

function readNullableString(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | null | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "string or null" });
    return undefined;
  }
  const value = object[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    issues.push({
      path,
      message: "value must be a string or null",
      actual: value,
      expected: "string or null",
    });
    return undefined;
  }
  return value;
}

function parsePrimaryStats(
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
    if (typeof item !== "string" || !(ABILITY_KEYS as readonly string[]).includes(item)) {
      issues.push({
        path: childPath(path, index),
        message: "value must be one of the fixed ability keys",
        actual: item,
        expected: ABILITY_KEYS.join(" | "),
      });
      ok = false;
      continue;
    }
    if (seen.has(item)) {
      issues.push({
        path: childPath(path, index),
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
  return [...collected].sort((a, b) => ABILITY_KEYS.indexOf(a) - ABILITY_KEYS.indexOf(b));
}

function parseRequiredStats(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): Partial<Record<AbilityKey, number>> | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, ABILITY_KEYS, path, issues);

  let ok = true;
  const parsedByKey = new Map<AbilityKey, number>();
  for (const key of ABILITY_KEYS) {
    if (!hasOwn(object, key)) {
      continue;
    }
    const fieldValue = requireIntegerInRange(object, key, path, 0, 100, issues);
    if (fieldValue === undefined) {
      ok = false;
      continue;
    }
    parsedByKey.set(key, fieldValue);
  }
  if (!ok) {
    return undefined;
  }

  const result: Partial<Record<AbilityKey, number>> = {};
  for (const key of ABILITY_KEYS) {
    const fieldValue = parsedByKey.get(key);
    if (fieldValue !== undefined) {
      result[key] = fieldValue;
    }
  }
  return result;
}

function parseBattleRangeArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  requireNonEmptyArray: boolean,
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
        path: childPath(path, index),
        message: "value must be one of the fixed battle ranges",
        actual: item,
        expected: BATTLE_RANGES.join(" | "),
      });
      ok = false;
      continue;
    }
    if (seen.has(item)) {
      issues.push({
        path: childPath(path, index),
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
  if (requireNonEmptyArray && collected.length === 0) {
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

function parseTechniqueIdArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  selfTechniqueId: string | undefined,
): TechniqueId[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const collected: string[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const item: unknown = items[index];
    const itemPath = childPath(path, index);
    if (typeof item !== "string" || item.length === 0 || item !== item.trim()) {
      issues.push({
        path: itemPath,
        message: "value must be a non-empty trimmed TechniqueId string",
        actual: item,
        expected: "non-empty trimmed string",
      });
      ok = false;
      continue;
    }
    if (selfTechniqueId !== undefined && item === selfTechniqueId) {
      issues.push({
        path: itemPath,
        message: "TechniqueId must not reference itself",
        actual: item,
        expected: "TechniqueId different from techniqueId",
      });
      ok = false;
      continue;
    }
    if (seen.has(item)) {
      issues.push({
        path: itemPath,
        message: "duplicate TechniqueId is not allowed",
        actual: item,
        expected: "unique TechniqueId values",
      });
      ok = false;
      continue;
    }
    seen.add(item);
    collected.push(item);
  }
  if (!ok) {
    return undefined;
  }
  return collected.sort(compareUnicodeCodePoints).map((id) => asTechniqueId(id));
}

function parsePrerequisiteTechniqueMastery(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueMasteryRequirement[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const collected: { techniqueId: string; requiredMastery: number }[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const itemPath = childPath(path, index);
    const object = snapshotPlainObjectOrFail(items[index], itemPath, issues);
    if (object === undefined) {
      ok = false;
      continue;
    }
    assertNoAccessors(object, itemPath, issues);
    rejectUnknownKeys(object, PREREQUISITE_TECHNIQUE_MASTERY_KEYS, itemPath, issues);

    const techniqueIdRaw = requireNonEmptyTrimmedString(object, "techniqueId", itemPath, issues);
    const requiredMastery = requireIntegerInRange(
      object,
      "requiredMastery",
      itemPath,
      0,
      100,
      issues,
    );

    if (techniqueIdRaw === undefined || requiredMastery === undefined) {
      ok = false;
      continue;
    }
    if (seen.has(techniqueIdRaw)) {
      issues.push({
        path: itemPath,
        message: "duplicate techniqueId in prerequisiteTechniqueMastery",
        actual: techniqueIdRaw,
        expected: "unique techniqueId values",
      });
      ok = false;
      continue;
    }
    seen.add(techniqueIdRaw);
    collected.push({ techniqueId: techniqueIdRaw, requiredMastery });
  }
  if (!ok) {
    return undefined;
  }

  collected.sort((a, b) => compareUnicodeCodePoints(a.techniqueId, b.techniqueId));
  return collected.map((entry) => ({
    techniqueId: asTechniqueId(entry.techniqueId),
    requiredMastery: entry.requiredMastery,
  }));
}

function parseTags(value: unknown, path: string, issues: ValidationIssue[]): string[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const collected: string[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const item: unknown = items[index];
    const itemPath = childPath(path, index);
    if (typeof item !== "string" || item.length === 0 || item !== item.trim()) {
      issues.push({
        path: itemPath,
        message: "tag must be a non-empty trimmed string",
        actual: item,
        expected: "non-empty trimmed string",
      });
      ok = false;
      continue;
    }
    if (seen.has(item)) {
      issues.push({
        path: itemPath,
        message: "duplicate tag is not allowed",
        actual: item,
        expected: "unique tags",
      });
      ok = false;
      continue;
    }
    seen.add(item);
    collected.push(item);
  }
  if (!ok) {
    return undefined;
  }
  return collected.sort(compareUnicodeCodePoints);
}

function parseOriginPersonId(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): PersonId | null | undefined {
  const key = "originPersonId";
  const fullPath = childPath(path, key);
  if (!hasOwn(object, key)) {
    issues.push({
      path: fullPath,
      message: "required key is missing",
      expected: "PersonId or null",
    });
    return undefined;
  }
  const value = object[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    issues.push({
      path: fullPath,
      message: "originPersonId must be null or a non-empty trimmed PersonId string",
      actual: value,
      expected: "null or non-empty trimmed string",
    });
    return undefined;
  }
  return asPersonId(value);
}

function parseActionTraits(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): ActionTraits | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, ACTION_TRAITS_KEYS, path, issues);

  let ok = true;
  for (const key of ACTION_TRAITS_KEYS) {
    const fieldValue = requireLiteralBoolean(object, key, path, false, issues);
    if (fieldValue === undefined) {
      ok = false;
    }
  }
  if (!ok) {
    return undefined;
  }

  return {
    simultaneous: false,
    counterOnHit: false,
    interception: false,
    interrupt: false,
    defenseBreak: false,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateTechniqueDefinition(input: unknown): ValidationResult<TechniqueDefinition> {
  const issues: ValidationIssue[] = [];

  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "TechniqueDefinition must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }

  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, TECHNIQUE_DEFINITION_KEYS, "", issues);

  const techniqueIdRaw = requireNonEmptyTrimmedString(object, "techniqueId", "", issues);
  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    TECHNIQUE_DEFINITION_SCHEMA_VERSION,
    issues,
  );
  const dataVersion = requireNonEmptyString(object, "dataVersion", "", issues);
  const name = requireNonEmptyTrimmedString(object, "name", "", issues);
  const category = requireStringEnum(object, "category", "", TECHNIQUE_CATEGORIES, issues);
  const primaryStats = parsePrimaryStats(object["primaryStats"], "/primaryStats", issues);
  const requiredAptitude = requireIntegerInRange(object, "requiredAptitude", "", 0, 100, issues);
  const requiredStats = parseRequiredStats(object["requiredStats"], "/requiredStats", issues);
  const prerequisiteTechniqueMasteryRaw = parsePrerequisiteTechniqueMastery(
    object["prerequisiteTechniqueMastery"],
    "/prerequisiteTechniqueMastery",
    issues,
  );
  const mentalCost = requireSafeIntegerAtLeast(object, "mentalCost", "", 0, issues);
  const difficulty = requireIntegerInRange(object, "difficulty", "", 0, 100, issues);
  const learningTier = requireStringEnum(object, "learningTier", "", LEARNING_TIERS, issues);
  const consumptionClass = requireStringEnum(
    object,
    "consumptionClass",
    "",
    TECHNIQUE_CONSUMPTION_CLASSES,
    issues,
  );
  const learningProgressRequired = requireIntegerInRange(
    object,
    "learningProgressRequired",
    "",
    1,
    10000,
    issues,
  );
  const overrideReasonRaw = readNullableString(
    object,
    "learningProgressOverrideReason",
    "",
    issues,
  );
  const teachingProficiencyRequired = requireIntegerInRange(
    object,
    "teachingProficiencyRequired",
    "",
    0,
    100,
    issues,
  );
  const secrecy = requireIntegerInRange(object, "secrecy", "", 0, 100, issues);
  const power = requireIntegerInRange(object, "power", "", 0, 100, issues);
  const accuracy = requireIntegerInRange(object, "accuracy", "", 0, 100, issues);
  const activationDifficulty = requireIntegerInRange(
    object,
    "activationDifficulty",
    "",
    0,
    100,
    issues,
  );
  const prerequisiteTechniqueIds = parseTechniqueIdArray(
    object["prerequisiteTechniqueIds"],
    "/prerequisiteTechniqueIds",
    issues,
    techniqueIdRaw,
  );
  const originPersonId = parseOriginPersonId(object, "", issues);
  const sourceTechniqueIds = parseTechniqueIdArray(
    object["sourceTechniqueIds"],
    "/sourceTechniqueIds",
    issues,
    techniqueIdRaw,
  );
  const tags = parseTags(object["tags"], "/tags", issues);
  const usableRanges = parseBattleRangeArray(object["usableRanges"], "/usableRanges", issues, true);
  const preferredRanges = parseBattleRangeArray(
    object["preferredRanges"],
    "/preferredRanges",
    issues,
    false,
  );
  const rangeShiftAfterUse = requireStringEnum(
    object,
    "rangeShiftAfterUse",
    "",
    RANGE_SHIFT_AFTER_USE,
    issues,
  );
  const priority = requireNumberEnum(object, "priority", "", TECHNIQUE_PRIORITIES, issues);
  const speedModifier = requireIntegerInRange(object, "speedModifier", "", -20, 20, issues);
  const injuryModifier = requireIntegerInRange(object, "injuryModifier", "", -20, 20, issues);
  const actionTraits = parseActionTraits(object["actionTraits"], "/actionTraits", issues);

  // --- cross-field checks (require multiple fields already parsed) ---

  let learningProgressOverrideReason: string | null | undefined;
  if (
    overrideReasonRaw !== undefined &&
    learningTier !== undefined &&
    learningProgressRequired !== undefined
  ) {
    const standardValue = LEARNING_PROGRESS_STANDARD_BY_TIER[learningTier];
    const path = "/learningProgressOverrideReason";
    if (learningProgressRequired === standardValue) {
      if (overrideReasonRaw !== null) {
        issues.push({
          path,
          message:
            "learningProgressOverrideReason must be null when learningProgressRequired matches the tier's standard value",
          actual: overrideReasonRaw,
          expected: "null",
        });
      } else {
        learningProgressOverrideReason = null;
      }
    } else if (
      overrideReasonRaw === null ||
      overrideReasonRaw.length === 0 ||
      overrideReasonRaw !== overrideReasonRaw.trim()
    ) {
      issues.push({
        path,
        message:
          "learningProgressOverrideReason must be a non-empty trimmed string when learningProgressRequired differs from the tier's standard value",
        actual: overrideReasonRaw,
        expected: "non-empty trimmed string",
      });
    } else {
      learningProgressOverrideReason = overrideReasonRaw;
    }
  }

  let prerequisiteTechniqueMastery: TechniqueMasteryRequirement[] | undefined;
  if (prerequisiteTechniqueMasteryRaw !== undefined && prerequisiteTechniqueIds !== undefined) {
    const prerequisiteSet = new Set<string>(prerequisiteTechniqueIds);
    let subsetOk = true;
    for (const entry of prerequisiteTechniqueMasteryRaw) {
      if (!prerequisiteSet.has(entry.techniqueId)) {
        issues.push({
          path: "/prerequisiteTechniqueMastery",
          message:
            "prerequisiteTechniqueMastery.techniqueId must be a subset of prerequisiteTechniqueIds",
          actual: entry.techniqueId,
          expected: `one of: ${prerequisiteTechniqueIds.join(", ")}`,
        });
        subsetOk = false;
      }
    }
    if (subsetOk) {
      prerequisiteTechniqueMastery = prerequisiteTechniqueMasteryRaw;
    }
  }

  if (usableRanges !== undefined && preferredRanges !== undefined) {
    const usableSet = new Set<BattleRange>(usableRanges);
    for (const preferred of preferredRanges) {
      if (!usableSet.has(preferred)) {
        issues.push({
          path: "/preferredRanges",
          message: "preferredRanges must be a subset of usableRanges",
          actual: preferredRanges,
          expected: `subset of [${usableRanges.join(", ")}]`,
        });
        break;
      }
    }
  }

  if (
    techniqueIdRaw === undefined ||
    schemaVersion === undefined ||
    dataVersion === undefined ||
    name === undefined ||
    category === undefined ||
    primaryStats === undefined ||
    requiredAptitude === undefined ||
    requiredStats === undefined ||
    prerequisiteTechniqueMastery === undefined ||
    mentalCost === undefined ||
    difficulty === undefined ||
    learningTier === undefined ||
    consumptionClass === undefined ||
    learningProgressRequired === undefined ||
    learningProgressOverrideReason === undefined ||
    teachingProficiencyRequired === undefined ||
    secrecy === undefined ||
    power === undefined ||
    accuracy === undefined ||
    activationDifficulty === undefined ||
    prerequisiteTechniqueIds === undefined ||
    originPersonId === undefined ||
    sourceTechniqueIds === undefined ||
    tags === undefined ||
    usableRanges === undefined ||
    preferredRanges === undefined ||
    rangeShiftAfterUse === undefined ||
    priority === undefined ||
    speedModifier === undefined ||
    injuryModifier === undefined ||
    actionTraits === undefined
  ) {
    return failure(issues);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const value: TechniqueDefinition = {
    techniqueId: asTechniqueId(techniqueIdRaw),
    schemaVersion,
    dataVersion,
    name,
    category,
    primaryStats,
    requiredAptitude,
    requiredStats,
    prerequisiteTechniqueMastery,
    mentalCost,
    difficulty,
    learningTier,
    consumptionClass,
    learningProgressRequired,
    learningProgressOverrideReason,
    teachingProficiencyRequired,
    secrecy,
    power,
    accuracy,
    activationDifficulty,
    prerequisiteTechniqueIds,
    originPersonId,
    sourceTechniqueIds,
    tags,
    usableRanges,
    preferredRanges,
    rangeShiftAfterUse,
    priority,
    speedModifier,
    injuryModifier,
    actionTraits,
  };

  return success(deepFreezePlainJson(value));
}

/**
 * Public clone: validate unknown input, then independently clone and deep-freeze.
 * Does not run getters / setters / toJSON; never normalizes invalid inputs to success.
 */
export function cloneTechniqueDefinition(input: unknown): ValidationResult<TechniqueDefinition> {
  const validated = validateTechniqueDefinition(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

/**
 * Public freeze: validate unknown input and return the deep-frozen rebuilt value.
 */
export function freezeTechniqueDefinition(input: unknown): ValidationResult<TechniqueDefinition> {
  return validateTechniqueDefinition(input);
}
