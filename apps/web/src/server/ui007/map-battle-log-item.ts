/**
 * BattleActionLog -> BattleLogItemView exact40 (BRIDGE-047 / ACC-095 / MIG-011..013 / DB-014).
 * sourceLogEntry requires validateBattleActionLog (FI-057: never skip invalid items).
 */

import {
  BATTLE_ACTION_LOG_KEYS,
  toCanonicalJson,
  validateBattleActionLog,
  type BattleActionLog,
} from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";
import {
  BATTLE_LOG_ITEM_VIEW_KEYS,
  FORBIDDEN_BATTLE_LOG_ITEM_KEYS,
  type BattleLogItemView,
} from "./types.js";

function cloneSourceLogEntry(log: BattleActionLog): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of BATTLE_ACTION_LOG_KEYS) {
    out[key] = structuredClone(log[key as keyof BattleActionLog]);
  }
  return JSON.parse(toCanonicalJson(out)) as Record<string, unknown>;
}

export function mapBattleActionLogToItemView(
  raw: unknown,
  sourceIndex: number,
): PureResult<BattleLogItemView> {
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0) {
    return fail("sourceIndex must be non-negative integer");
  }

  const validated = validateBattleActionLog(raw);
  if (!validated.ok) {
    return fail("BattleActionLog validation failed", "INTERNAL_ERROR");
  }
  const log = validated.value;

  const techniqueId =
    log.resolvedAction.kind === "use_technique" ? log.resolvedAction.techniqueId : null;

  const view: BattleLogItemView = {
    sequenceInBattle: sourceIndex + 1,
    actionSequence: log.actionSequence,
    turnNumber: log.turnNumber,
    actorPersonId: log.actorPersonId,
    actorSide: log.actorSide,
    strategySeed: log.strategySeed,
    strategyCandidateScores: structuredClone(log.strategyCandidateScores),
    strategyTieBreakUsed: log.strategyTieBreakUsed,
    requestedAction: structuredClone(log.requestedAction),
    resolvedAction: structuredClone(log.resolvedAction),
    // DB-014: pass-through upstream exact values; no invented enumization.
    replacementReason: log.replacementReason,
    techniqueId,
    priority: log.priority,
    actionOrderScore: log.actionOrderScore,
    rangeBefore: log.rangeBefore,
    rangeAfter: log.rangeAfter,
    rangeShiftApplied: log.rangeShiftApplied,
    rangeShiftBlockChance: log.rangeShiftBlockChance,
    rangeShiftBlockRoll: log.rangeShiftBlockRoll,
    movementChance: log.movementChance,
    movementRoll: log.movementRoll,
    evadeDirection: log.evadeDirection,
    activationChance: log.activationChance,
    activationRoll: log.activationRoll,
    activationSucceeded: log.activationSucceeded,
    activationFailureReason: log.activationFailureReason,
    hitChance: log.hitChance,
    hitRoll: log.hitRoll,
    hit: log.hit,
    damageVariance: log.damageVariance,
    damage: log.damage,
    focusBaseRecovery: log.focusBaseRecovery,
    focusAppliedRecovery: log.focusAppliedRecovery,
    injuryChance: log.injuryChance,
    injuryRoll: log.injuryRoll,
    majorInjuryChance: log.majorInjuryChance,
    majorInjuryRoll: log.majorInjuryRoll,
    injuryResult: log.injuryResult,
    advantageTurnAwardedTo: log.advantageTurnAwardedTo,
    sourceLogEntry: cloneSourceLogEntry(log),
  };

  const keys = Object.keys(view);
  if (keys.length !== BATTLE_LOG_ITEM_VIEW_KEYS.length) {
    return fail(`BattleLogItemView key count must be 40, got ${keys.length}`);
  }
  for (const key of BATTLE_LOG_ITEM_VIEW_KEYS) {
    if (!(key in view)) {
      return fail(`BattleLogItemView missing key: ${key}`);
    }
  }
  for (const key of FORBIDDEN_BATTLE_LOG_ITEM_KEYS) {
    if (key in view) {
      return fail(`forbidden wire key present: ${key}`);
    }
  }
  return ok(view);
}
