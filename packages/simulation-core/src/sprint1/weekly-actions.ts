/**
 * Weekly action enum plus the forced-rest / rest-fallback reason enums
 * (10 mini-spec §2, §3.1, §3.2 / S01-004).
 *
 * The declaration order of `WEEKLY_ACTIONS` is the canonical tie-break order for
 * action selection, and `WEEKLY_REST_FALLBACK_REASONS` / `WEEKLY_FORCED_REST_REASONS`
 * are the fixed record orders required by 10 §3.1 and §3.2.
 */

export const WEEKLY_ACTIONS = [
  "train_stat",
  "learn_technique",
  "practice_technique",
  "rest",
  "inactive",
] as const;
export type WeeklyAction = (typeof WEEKLY_ACTIONS)[number];

/** Actions that carry a `weeklyPlanner` base score (10 §5.1). `inactive` is not scored. */
export const WEEKLY_SCORED_ACTIONS = [
  "train_stat",
  "learn_technique",
  "practice_technique",
  "rest",
] as const;
export type WeeklyScoredAction = (typeof WEEKLY_SCORED_ACTIONS)[number];

/** The three training-style actions (10 §3.2). */
export const WEEKLY_TRAINING_ACTIONS = [
  "train_stat",
  "learn_technique",
  "practice_technique",
] as const;
export type WeeklyTrainingAction = (typeof WEEKLY_TRAINING_ACTIONS)[number];

/** Priority order is also the recorded `forcedReason` precedence (10 §3.1). */
export const WEEKLY_FORCED_REST_REASONS = ["severe_injury", "fatigue_threshold"] as const;
export type WeeklyForcedRestReason = (typeof WEEKLY_FORCED_REST_REASONS)[number];

export const WEEKLY_REST_FALLBACK_REASONS = [
  "no_trainable_stat",
  "no_learning_candidate",
  "no_practice_candidate",
] as const;
export type WeeklyRestFallbackReason = (typeof WEEKLY_REST_FALLBACK_REASONS)[number];

const WEEKLY_ACTION_SET: ReadonlySet<string> = new Set(WEEKLY_ACTIONS);

export function isWeeklyAction(value: unknown): value is WeeklyAction {
  return typeof value === "string" && WEEKLY_ACTION_SET.has(value);
}

/** Index of `action` in the fixed `WEEKLY_ACTIONS` order (used for tie normalization). */
export function weeklyActionOrderIndex(action: WeeklyAction): number {
  return WEEKLY_ACTIONS.indexOf(action);
}

/** `weeklyFatigueDelta` / `burdenPenaltyMultipliersByAction` config key for an action (14 §3, §4). */
export const WEEKLY_ACTION_CONFIG_KEY = {
  train_stat: "trainStat",
  learn_technique: "learnTechnique",
  practice_technique: "practiceTechnique",
  rest: "rest",
} as const satisfies Record<WeeklyScoredAction, string>;

/** `baseScoresByCareerStatus` entry key for an action (14 §4). */
export const WEEKLY_ACTION_BASE_SCORE_KEY = {
  train_stat: "train",
  learn_technique: "learn",
  practice_technique: "practice",
  rest: "rest",
} as const satisfies Record<WeeklyScoredAction, string>;
