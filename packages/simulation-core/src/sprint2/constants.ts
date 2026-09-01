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

export const PLANNED_PARTICIPANT_LIST_SCHEMA_VERSION = "0.1.0" as const;
export const ENTRY_CHOICE_POLICY_VERSION = "entry-choice-policy-0.1.0" as const;

export const TOURNAMENT_BRACKET_DEFINITION_SCHEMA_VERSION = "0.1.0" as const;
export const BRACKET_RUNTIME_SLOT_STATE_SCHEMA_VERSION = "0.1.0" as const;

export const TOURNAMENT_MATCH_PLAN_SCHEMA_VERSION = "0.1.0" as const;
export const TOURNAMENT_BATTLE_HANDOFF_RESULT_SCHEMA_VERSION = "0.1.0" as const;

export const STORED_BATTLE_RESULT_REF_SCHEMA_VERSION = "0.2.0" as const;
export const TOURNAMENT_BATTLE_APPLICATION_FACT_SCHEMA_VERSION = "0.1.0" as const;

export const STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION = "0.1.0" as const;
export const MATERIALIZED_BATTLE_RESULT_VIEW_SCHEMA_VERSION = "0.1.0" as const;
export const IMPORTANT_BATTLE_MARKER_SCHEMA_VERSION = "0.1.0" as const;
export const DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION = "0.1.0" as const;

export const DETAILED_LOG_RETENTION_STATUSES = ["retained", "pruned"] as const;
export type DetailedLogRetentionStatus = (typeof DETAILED_LOG_RETENTION_STATUSES)[number];

export const IMPORTANT_BATTLE_REASONS = [
  "highest_tournament_match",
  "tournament_final",
  "historical_record_update",
] as const;
export type ImportantBattleReason = (typeof IMPORTANT_BATTLE_REASONS)[number];

export const TOURNAMENT_FINAL_RESULT_SCHEMA_VERSION = "0.1.0" as const;
export const TOURNAMENT_AWARD_TIERS = ["champion", "runner_up", "top_four", "completed"] as const;
export type TournamentAwardTier = (typeof TOURNAMENT_AWARD_TIERS)[number];

export const COMPETITIVE_RECORD_SCHEMA_VERSION = "0.2.0" as const;
export const PROMOTION_PROGRESS_SCHEMA_VERSION = "0.1.0" as const;
export const PROMOTION_QUALIFICATION_STATUSES = ["inactive", "active"] as const;
export type PromotionQualificationStatus = (typeof PROMOTION_QUALIFICATION_STATUSES)[number];

export const S_QUALIFICATION_CONTRIBUTION_SCHEMA_VERSION = "0.1.0" as const;
export const S_QUALIFICATION_STATE_SCHEMA_VERSION = "0.1.0" as const;
export const S_QUALIFICATION_SOURCE_KINDS = ["open_match", "open_placement"] as const;
export type SQualificationSourceKind = (typeof S_QUALIFICATION_SOURCE_KINDS)[number];

export const RANK_PROMOTION_RESULT_SCHEMA_VERSION = "0.1.0" as const;
export const PERSON_RANK_HISTORY_SCHEMA_VERSION = "0.1.0" as const;
export const PERSON_RANK_HISTORY_ENTRY_SCHEMA_VERSION = "0.1.0" as const;
export const S_QUALIFICATION_HISTORY_ENTRY_SCHEMA_VERSION = "0.1.0" as const;

export const TOURNAMENT_PAYOUT_CONFIG_SCHEMA_VERSION = "0.1.0" as const;
export const ANNUAL_EARNINGS_APPLICATION_SCHEMA_VERSION = "0.1.0" as const;
export const ANNUAL_RANKING_HISTORY_ENTRY_SCHEMA_VERSION = "0.1.0" as const;
export const ANNUAL_RANKING_HISTORY_ROW_SCHEMA_VERSION = "0.1.0" as const;
export const PREVIOUS_WORLD_YEAR_EARNINGS_SNAPSHOT_SCHEMA_VERSION = "0.1.0" as const;
