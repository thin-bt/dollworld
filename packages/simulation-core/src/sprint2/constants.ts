/**
 * Fixed Sprint 2 common-contract version registry (S2-SPEC-0.2.2-draft / G069).
 * Literal strings must not change without bumping the corresponding schema/config version.
 */
export const SPRINT2_CONFIG_SCHEMA_VERSION = "0.1.12" as const;
export const SPRINT2_CONFIG_VERSION_DEFAULT = "sprint2-balance-0.1.14" as const;

export const COMPETITION_DOMAIN_REGISTRY_SCHEMA_VERSION = "0.1.0" as const;
export const COMPETITION_DOMAIN_REGISTRY_VERSION = "competition-domain-registry-0.2.0" as const;

export const COMPETITION_DOMAIN_KEYS = ["unarmed", "sword", "magic"] as const;
export type CompetitionDomainKey = (typeof COMPETITION_DOMAIN_KEYS)[number];

export const DERIVED_TIE_KEY_POLICY_VERSION = "derived-tie-key-0.1.0" as const;

export const DERIVED_TIE_KEY_PURPOSES = [
  "entry_choice",
  "entry_capacity",
  "seeding",
  "standings",
  "promotion_selection",
  "knockout_placement",
] as const;
export type DerivedTieKeyPurpose = (typeof DERIVED_TIE_KEY_PURPOSES)[number];

export const TOURNAMENT_ID_GENERATOR_VERSION = "tournament-id-generator-0.1.0" as const;
export const TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION = "0.1.0" as const;
export const TOURNAMENT_ID_NAMESPACE = "tournament" as const;
export const TOURNAMENT_ID_SEQUENCE_MINIMUM = 1 as const;
export const TOURNAMENT_ID_SEQUENCE_MAXIMUM = 999_999_999_999 as const;
export const TOURNAMENT_ID_SEQUENCE_EXHAUSTED_SENTINEL = 1_000_000_000_000 as const;
export const TOURNAMENT_ID_SEQUENCE_DIGITS = 12 as const;
export const TOURNAMENT_ID_FORMAT_PATTERN = /^tournament_[0-9]{12}$/;
export const TOURNAMENT_ID_SEQUENCE_EXHAUSTED_CODE = "tournament_id_sequence_exhausted" as const;
export const TOURNAMENT_ID_GENERATOR_STATE_INVALID_CODE =
  "tournament_id_generator_state_invalid" as const;

export const TOURNAMENT_SCHEDULE_STATE_SCHEMA_VERSION = "0.1.0" as const;

export const TOURNAMENT_KINDS = ["normal", "open", "limited", "promotion"] as const;
export type TournamentKind = (typeof TOURNAMENT_KINDS)[number];

export const TOURNAMENT_LIFECYCLE_STATES = [
  "planned",
  "scheduled",
  "postponed",
  "merged",
  "cancelled",
] as const;
export type TournamentLifecycleState = (typeof TOURNAMENT_LIFECYCLE_STATES)[number];

export const CHAMPIONSHIP_CYCLE_CLASSIFICATIONS = [
  "championship_year",
  "non_championship_year",
] as const;
export type ChampionshipCycleClassification =
  (typeof CHAMPIONSHIP_CYCLE_CLASSIFICATIONS)[number];

export const NORMAL_RANK_KEYS = ["F", "E", "D", "C", "B"] as const;
export type NormalRankKey = (typeof NORMAL_RANK_KEYS)[number];
