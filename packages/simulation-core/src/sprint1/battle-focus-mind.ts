/**
 * focus_mind recovery reservation and turn-end apply (12 §14 / S01-006).
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { scaleByBasisPointsFloor } from "./battle-turn-math.js";
import type { BattleConfig } from "./types.js";

export type FocusMindReservation = {
  baseRecovery: number;
  pending: true;
};

export function computeFocusBaseRecovery(
  maxMental: number,
  focusMind: BattleConfig["focusMind"],
): ValidationResult<number> {
  const scaled = scaleByBasisPointsFloor(maxMental, focusMind.recoveryRatio);
  if (!scaled.ok) {
    return scaled;
  }
  return success(Math.max(1, scaled.value));
}

export type FocusApplyResult = {
  appliedRecovery: number;
  nextHitModifier: number;
  nextActivationModifier: number;
};

/**
 * Apply reserved focus_mind recovery at turn end based on damage received this turn
 * by the focusing participant (as a fraction of maxDurability).
 */
export function resolveFocusMindAtTurnEnd(
  baseRecovery: number,
  damageReceivedThisTurn: number,
  maxDurability: number,
  focusMind: BattleConfig["focusMind"],
): ValidationResult<FocusApplyResult> {
  if (!Number.isSafeInteger(damageReceivedThisTurn) || damageReceivedThisTurn < 0) {
    return failure([
      {
        path: "/damageReceivedThisTurn",
        message: "damageReceivedThisTurn must be a non-negative safe integer",
        actual: damageReceivedThisTurn,
      },
    ]);
  }
  const interruptThreshold = scaleByBasisPointsFloor(maxDurability, focusMind.interruptDamageRatio);
  if (!interruptThreshold.ok) {
    return interruptThreshold;
  }

  if (damageReceivedThisTurn >= interruptThreshold.value && interruptThreshold.value > 0) {
    return success({ appliedRecovery: 0, nextHitModifier: 0, nextActivationModifier: 0 });
  }
  if (damageReceivedThisTurn >= 1) {
    const partial = scaleByBasisPointsFloor(baseRecovery, focusMind.partialRecoveryRatio);
    if (!partial.ok) {
      return partial;
    }
    return success({
      appliedRecovery: partial.value,
      nextHitModifier: focusMind.partialDamageNextHitModifier,
      nextActivationModifier: focusMind.partialDamageNextActivationModifier,
    });
  }
  return success({
    appliedRecovery: baseRecovery,
    nextHitModifier: focusMind.noDamageNextHitModifier,
    nextActivationModifier: focusMind.noDamageNextActivationModifier,
  });
}

export function applyMentalRecovery(
  currentMental: number,
  maxMental: number,
  recovery: number,
): number {
  return Math.min(maxMental, currentMental + recovery);
}
