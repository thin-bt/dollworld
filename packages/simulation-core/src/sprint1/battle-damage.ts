/**
 * Damage formula (12 §10 / S01-006).
 */
import type { AbilityKey, AbilityScores } from "../abilities.js";
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { drawInclusiveBasisPoints } from "./multiply-basis-points.js";
import { floorDivBasisPoints, scaleByBasisPointsFloor } from "./battle-turn-math.js";
import type { BattleConfig } from "./types.js";

export function averagePrimaryStatSurface(
  stats: AbilityScores,
  primaryStats: readonly AbilityKey[],
): ValidationResult<number> {
  if (primaryStats.length === 0) {
    return failure([
      {
        path: "/primaryStats",
        message: "primaryStats must be non-empty",
      },
    ]);
  }
  let sum = 0n;
  for (const key of primaryStats) {
    const surface = stats[key]?.surfaceValue;
    if (typeof surface !== "number" || !Number.isSafeInteger(surface)) {
      return failure([
        {
          path: `/stats/${key}/surfaceValue`,
          message: "surfaceValue must be a safe integer",
          actual: surface,
        },
      ]);
    }
    sum += BigInt(surface);
  }
  const avg = sum / BigInt(primaryStats.length);
  return success(Number(avg));
}

export type DamageFormulaInput = {
  techniquePower: number;
  primaryStatValue: number;
  domainAptitude: number;
  masteryDisplay: number;
  defenderStamina: number;
  defenderSkill: number;
  defenderCondition: number;
  defenderFatigue: number;
  defenderInjury: number;
  formula: BattleConfig["damageFormula"];
};

/**
 * RawDamage before variance, as a floor-divided integer (may be negative before max(1, …)).
 */
export function computeRawDamage(input: DamageFormulaInput): ValidationResult<number> {
  const f = input.formula;

  // AttackValue = Primary * (aptitudeBase + aptitude/divisor) * (masteryBase + mastery/divisor)
  // aptitude term = aptitudeBaseBp/10000 + aptitude/divisor
  // = (aptitudeBaseBp * divisor + aptitude * 10000) / (10000 * divisor)
  const aptitudeNumerator =
    BigInt(f.aptitudeBase) * BigInt(f.aptitudeDivisor) + BigInt(input.domainAptitude) * 10000n;
  const aptitudeDenom = 10000n * BigInt(f.aptitudeDivisor);
  const masteryNumerator =
    BigInt(f.masteryBase) * BigInt(f.masteryDivisor) + BigInt(input.masteryDisplay) * 10000n;
  const masteryDenom = 10000n * BigInt(f.masteryDivisor);

  // AttackValue = primary * apt * mast = primary * aptNum * mastNum / (aptDenom * mastDenom)
  const attackNumerator = BigInt(input.primaryStatValue) * aptitudeNumerator * masteryNumerator;
  const attackDenom = aptitudeDenom * masteryDenom;
  const attackValue = attackNumerator / attackDenom;

  // defenderConditionModifier
  const conditionMod = floorDivBasisPoints(
    BigInt(input.defenderCondition) * BigInt(f.conditionDefenseWeight) -
      BigInt(input.defenderFatigue) * BigInt(f.fatigueDefensePenaltyWeight) -
      BigInt(input.defenderInjury) * BigInt(f.injuryDefensePenaltyWeight),
  );
  if (!conditionMod.ok) {
    return conditionMod;
  }

  const staminaPart = scaleByBasisPointsFloor(input.defenderStamina, f.staminaDefenseWeight);
  if (!staminaPart.ok) {
    return staminaPart;
  }
  const skillPart = scaleByBasisPointsFloor(input.defenderSkill, f.skillDefenseWeight);
  if (!skillPart.ok) {
    return skillPart;
  }
  const defenseValue = staminaPart.value + skillPart.value + conditionMod.value;

  // RawDamage = power * wP + attack * wA - defense * wD
  const rawNumerator =
    BigInt(input.techniquePower) * BigInt(f.techniquePowerWeight) +
    attackValue * BigInt(f.attackValueWeight) -
    BigInt(defenseValue) * BigInt(f.defenseValueReductionWeight);
  return floorDivBasisPoints(rawNumerator);
}

export function rollDamageWithVariance(
  rng: SeededRng,
  rawDamage: number,
  formula: BattleConfig["damageFormula"],
): ValidationResult<{ damage: number; varianceBp: number }> {
  const varianceBp = drawInclusiveBasisPoints(
    rng,
    formula.varianceMinimum,
    formula.varianceMaximum,
  );
  // floor(raw * varianceBp / 10000); raw may be negative — clamp after.
  const scaled = floorDivBasisPoints(BigInt(rawDamage) * BigInt(varianceBp));
  if (!scaled.ok) {
    return scaled;
  }
  const damage = Math.max(formula.minimumDamage, scaled.value);
  return success({ damage, varianceBp });
}
