/**
 * Final hit chance (12 §9 / S01-006). attackerSkill = stats.skill.surfaceValue.
 */
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleConfig } from "./types.js";
import type { BattleRange } from "./types.js";
import {
  HIT_APTITUDE_FROM_50_WEIGHT_BP,
  HIT_MASTERY_FROM_50_WEIGHT_BP,
  HIT_SKILL_SPEED_DIFF_WEIGHT_BP,
  clampInteger,
  floorDivBasisPoints,
  scaleByBasisPointsFloor,
} from "./battle-turn-math.js";
import type { BasisPoints } from "./basis-points.js";

export type HitChanceInput = {
  techniqueBaseAccuracy: number;
  attackerSkill: number;
  defenderSpeed: number;
  attackerPerformanceFactorBp: BasisPoints;
  defenderPerformanceFactorBp: BasisPoints;
  masteryDisplay: number;
  domainAptitude: number;
  range: BattleRange;
  preferredRanges: readonly BattleRange[];
  usableRanges: readonly BattleRange[];
  attackerCondition: number;
  attackerFatigue: number;
  attackerInjury: number;
  nextHitModifier: number;
  defenderEvading: boolean;
  actionOrder: BattleConfig["actionOrder"];
  hit: BattleConfig["hit"];
};

export function computeRangeHitModifier(
  range: BattleRange,
  preferredRanges: readonly BattleRange[],
  usableRanges: readonly BattleRange[],
  hit: BattleConfig["hit"],
): ValidationResult<number> {
  if (!usableRanges.includes(range)) {
    return failure([
      {
        path: "/range",
        message: "current range is outside usableRanges (attack must be replaced before hit)",
        actual: range,
      },
    ]);
  }
  if (preferredRanges.includes(range)) {
    return success(hit.preferredRangeModifier);
  }
  return success(-hit.usableNonPreferredRangePenalty);
}

export function computeHitChancePercent(input: HitChanceInput): ValidationResult<number> {
  const effectiveSkill = scaleByBasisPointsFloor(
    input.attackerSkill,
    input.attackerPerformanceFactorBp,
  );
  if (!effectiveSkill.ok) {
    return effectiveSkill;
  }
  const effectiveSpeed = scaleByBasisPointsFloor(
    input.defenderSpeed,
    input.defenderPerformanceFactorBp,
  );
  if (!effectiveSpeed.ok) {
    return effectiveSpeed;
  }
  const rangeModifier = computeRangeHitModifier(
    input.range,
    input.preferredRanges,
    input.usableRanges,
    input.hit,
  );
  if (!rangeModifier.ok) {
    return rangeModifier;
  }

  // Base accuracy and integer modifiers in percent * 10000.
  let numerator = BigInt(input.techniqueBaseAccuracy) * 10000n;
  numerator +=
    BigInt(effectiveSkill.value - effectiveSpeed.value) * BigInt(HIT_SKILL_SPEED_DIFF_WEIGHT_BP);
  numerator += BigInt(input.masteryDisplay - 50) * BigInt(HIT_MASTERY_FROM_50_WEIGHT_BP);
  numerator += BigInt(input.domainAptitude - 50) * BigInt(HIT_APTITUDE_FROM_50_WEIGHT_BP);
  numerator += BigInt(rangeModifier.value) * 10000n;

  // stateModifier via shared actionOrder coeffs + nextHitModifier.
  numerator += BigInt(input.attackerCondition) * BigInt(input.actionOrder.conditionPerPoint);
  numerator -= BigInt(input.attackerFatigue) * BigInt(input.actionOrder.fatiguePenaltyPerPoint);
  numerator -= BigInt(input.attackerInjury) * BigInt(input.actionOrder.injuryPenaltyPerPoint);
  numerator += BigInt(input.nextHitModifier) * 10000n;

  if (input.defenderEvading) {
    numerator -= BigInt(input.hit.evadePenalty) * 10000n;
  }

  const floored = floorDivBasisPoints(numerator);
  if (!floored.ok) {
    return floored;
  }
  return success(clampInteger(floored.value, input.hit.minimumPercent, input.hit.maximumPercent));
}

/** Hit chance without evade penalty (for successfulEvasions counterfactual). */
export function computeHitChancePercentWithoutEvade(
  input: HitChanceInput,
): ValidationResult<number> {
  return computeHitChancePercent({ ...input, defenderEvading: false });
}

export function rollHit(rng: SeededRng, chancePercent: number): { roll: number; hit: boolean } {
  const roll = rng.nextInt(1, 101);
  return { roll, hit: roll <= chancePercent };
}
