/**
 * Fixed Sprint 1 version registry (14 mini-spec §1.2 / 02 mini-spec §12).
 * These literal strings must not change without bumping the corresponding
 * schemaVersion/configVersion per the registry table; do not replace them with
 * "generic" defaults anywhere else in the codebase.
 */
import { ABILITY_KEYS } from "../abilities.js";
import { S0_SPEC_VERSION } from "../initial-world/constants.js";
import type { SpecVersionEntry } from "./types.js";
import { BATTLE_RANGES, TECHNIQUE_CATEGORIES } from "./types.js";

export { BATTLE_RANGES, TECHNIQUE_CATEGORIES };

export const SPRINT1_CONFIG_SCHEMA_VERSION = "0.2.0" as const;
export const SPRINT1_CONFIG_VERSION_DEFAULT = "sprint1-balance-0.2.0" as const;
export const SIMULATION_IDENTITY_SCHEMA_VERSION = "0.3.0" as const;
export const S1_SPEC_VERSION = "S1-SPEC-0.1.16" as const;
export const MAIN_SPEC_VERSION_FOR_IDENTITY = "SPEC-0.1.2" as const;
/** Must equal the Sprint 0 S0_SPEC_VERSION registry entry (00/02/14 mini-specs). */
export const S0_SPEC_VERSION_FOR_IDENTITY: typeof S0_SPEC_VERSION = S0_SPEC_VERSION;
export const CANONICAL_JSON_VERSION = "canonical-json-v1" as const;
export const HASH_ALGORITHM = "SHA-256" as const;
export const BATTLE_PROFILE_ADAPTER_VERSION = "battle-profile-adapter-0.1.0" as const;
export const MATCH_ID_GENERATOR_VERSION = "match-id-generator-0.1.0" as const;
export const MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION = "0.1.0" as const;
export const MATCH_ID_NAMESPACE = "match" as const;
export const DEFAULT_BATTLE_STRATEGY_VERSION = "default-battle-strategy-0.1.0" as const;

/** 11 mini-spec §4.2 / §8 / §9 / §10 fixed schemaVersion registry (S01-005). */
export const DEFAULT_BATTLE_STRATEGY_ID = "default-battle-strategy" as const;
export const BATTLE_ACTION_SCRIPT_FORMAT_VERSION = "battle-action-script-0.1.0" as const;
export const BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION = "0.1.0" as const;
export const RUN_RULE_SNAPSHOT_SCHEMA_VERSION = "0.4.0" as const;
export const BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION = "0.1.0" as const;
export const START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION = "0.1.0" as const;
export const BATTLE_STATE_SCHEMA_VERSION = "0.5.0" as const;

/** specSetId-ascending order per 02 mini-spec §12: main, sprint0, sprint1. */
export const EXPECTED_SPEC_VERSIONS: readonly SpecVersionEntry[] = [
  { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
  { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
  { specSetId: "sprint1", version: S1_SPEC_VERSION },
];

/** Fixed ability ordering used to normalize basicAttackProfiles.primaryStats (14 §8). */
export const ABILITY_CANONICAL_ORDER = ABILITY_KEYS;
