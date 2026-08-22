/**
 * UI-007 battle-log wire shapes (§11 / §12 / §10F).
 */

export const BATTLE_LOG_ITEM_VIEW_KEYS = [
  "sequenceInBattle",
  "actionSequence",
  "turnNumber",
  "actorPersonId",
  "actorSide",
  "strategySeed",
  "strategyCandidateScores",
  "strategyTieBreakUsed",
  "requestedAction",
  "resolvedAction",
  "replacementReason",
  "techniqueId",
  "priority",
  "actionOrderScore",
  "rangeBefore",
  "rangeAfter",
  "rangeShiftApplied",
  "rangeShiftBlockChance",
  "rangeShiftBlockRoll",
  "movementChance",
  "movementRoll",
  "evadeDirection",
  "activationChance",
  "activationRoll",
  "activationSucceeded",
  "activationFailureReason",
  "hitChance",
  "hitRoll",
  "hit",
  "damageVariance",
  "damage",
  "focusBaseRecovery",
  "focusAppliedRecovery",
  "injuryChance",
  "injuryRoll",
  "majorInjuryChance",
  "majorInjuryRoll",
  "injuryResult",
  "advantageTurnAwardedTo",
  "sourceLogEntry",
] as const;

export const BATTLE_LOG_LIST_DATA_KEYS = [
  "items",
  "totalCount",
  "nextCursor",
  "resultUiRevision",
] as const;

export const FORBIDDEN_BATTLE_LOG_ITEM_KEYS = ["actionKind", "rngDisplay", "reasonText"] as const;

export type BattleLogLimit = 100 | 200;

export type BattleLogQuery = {
  kind: "battle_log";
  sortKey: "sourceIndex";
  sortOrder: "asc";
  limit: BattleLogLimit;
};

export type BattleLogNextPosition = { sourceIndex: number };

export type BattleLogItemView = Record<(typeof BATTLE_LOG_ITEM_VIEW_KEYS)[number], unknown>;

export type BattleLogListDataView = {
  items: BattleLogItemView[];
  totalCount: number;
  nextCursor: string | null;
  resultUiRevision: number;
};
