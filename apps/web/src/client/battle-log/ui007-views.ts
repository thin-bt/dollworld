/**
 * Client mirror of UI-007 BattleLogItemView exact40 + list exact4.
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

export type BattleLogItemView = Record<(typeof BATTLE_LOG_ITEM_VIEW_KEYS)[number], unknown>;

export type BattleLogListData = {
  items: BattleLogItemView[];
  totalCount: number;
  nextCursor: string | null;
  resultUiRevision: number;
};
