/**
 * TechniqueDefinition fixed enumerations and version constants (09 mini-spec §4, §7 / S01-003).
 * These are per-definition classification values; TechniqueCategory / BattleRange /
 * RangeShiftAfterUse remain owned by ./types.ts and are not redefined here.
 */

export const LEARNING_TIERS = ["basic", "standard", "advanced", "secret"] as const;
export type LearningTier = (typeof LEARNING_TIERS)[number];

export const TECHNIQUE_CONSUMPTION_CLASSES = ["small", "medium", "large", "ultimate"] as const;
export type TechniqueConsumptionClass = (typeof TECHNIQUE_CONSUMPTION_CLASSES)[number];

export const TECHNIQUE_PRIORITIES = [2, 1, 0, -1] as const;
export type TechniquePriority = (typeof TECHNIQUE_PRIORITIES)[number];

export const LEARNING_TARGET_DERIVED_STATUSES = [
  "progressing",
  "acquirable",
  "blocked_at_cap",
] as const;
export type LearningTargetDerivedStatus = (typeof LEARNING_TARGET_DERIVED_STATUSES)[number];

/** Standard `learningProgressRequired` display value per tier (09 mini-spec §7). */
export const LEARNING_PROGRESS_STANDARD_BY_TIER = {
  basic: 100,
  standard: 180,
  advanced: 320,
  secret: 500,
} as const;

export const TECHNIQUE_DEFINITION_SCHEMA_VERSION = "0.1.0" as const;
export const INITIAL_TECHNIQUE_CATALOG_DATA_VERSION = "techniques-0.1.0" as const;

/** Sprint 1 reserved action-trait fields (09 mini-spec §4.4). All values must be literal `false`. */
export type ActionTraits = {
  simultaneous: false;
  counterOnHit: false;
  interception: false;
  interrupt: false;
  defenseBreak: false;
};

export const ACTION_TRAITS_KEYS = [
  "simultaneous",
  "counterOnHit",
  "interception",
  "interrupt",
  "defenseBreak",
] as const;

const LEARNING_TIER_SET: ReadonlySet<string> = new Set(LEARNING_TIERS);
const TECHNIQUE_CONSUMPTION_CLASS_SET: ReadonlySet<string> = new Set(TECHNIQUE_CONSUMPTION_CLASSES);
const TECHNIQUE_PRIORITY_SET: ReadonlySet<number> = new Set(TECHNIQUE_PRIORITIES);
const LEARNING_TARGET_DERIVED_STATUS_SET: ReadonlySet<string> = new Set(
  LEARNING_TARGET_DERIVED_STATUSES,
);

export function isLearningTier(value: unknown): value is LearningTier {
  return typeof value === "string" && LEARNING_TIER_SET.has(value);
}

export function isTechniqueConsumptionClass(value: unknown): value is TechniqueConsumptionClass {
  return typeof value === "string" && TECHNIQUE_CONSUMPTION_CLASS_SET.has(value);
}

export function isTechniquePriority(value: unknown): value is TechniquePriority {
  return typeof value === "number" && TECHNIQUE_PRIORITY_SET.has(value);
}

export function isLearningTargetDerivedStatus(
  value: unknown,
): value is LearningTargetDerivedStatus {
  return typeof value === "string" && LEARNING_TARGET_DERIVED_STATUS_SET.has(value);
}
