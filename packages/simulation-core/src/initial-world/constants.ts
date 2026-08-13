/** Fixed InitialWorldSnapshot schemaVersion (04 mini-spec / S00-006). */
export const INITIAL_WORLD_SNAPSHOT_SCHEMA_VERSION = "0.1.0" as const;

export const SIMULATION_SPEC_VERSION = "SPEC-0.1.1" as const;
export const S0_SPEC_VERSION = "S0-SPEC-0.1.6" as const;

export const INITIAL_WORLD_SOURCE_PROCESSOR = "initial-world-generation" as const;

export const FIXED_WORLD_ID = "world_000001" as const;

export const FOCUS_KEYS = ["unarmed", "sword", "magic"] as const;

export const RNG_LABELS = {
  deceased: "initial-world/persons/deceased",
  livingAge07: "initial-world/persons/living/age-0-7",
  livingAge815: "initial-world/persons/living/age-8-15",
  livingAge1641: "initial-world/persons/living/age-16-41",
  livingAge4270: "initial-world/persons/living/age-42-70",
  families: "initial-world/families",
  namesFamily: "initial-world/names/family",
  namesPerson: "initial-world/names/person",
  lineages: "initial-world/lineages",
  ranksActive: "initial-world/ranks/active",
  ranksRetired: "initial-world/ranks/retired",
  relationshipsParent: "initial-world/relationships/parent",
  relationshipsMarriage: "initial-world/relationships/marriage",
  relationshipsMaster: "initial-world/relationships/master",
  abilities: "initial-world/abilities",
} as const;

export const LINEAGE_NAME_SUFFIX: Record<(typeof FOCUS_KEYS)[number], string> = {
  unarmed: "体術",
  sword: "剣術",
  magic: "魔術",
};

/** Scale float weights to integers before largest-remainder (deterministic). */
export const WEIGHT_INTEGER_SCALE = 1_000_000;
