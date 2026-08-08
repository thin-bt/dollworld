/**
 * basic_defense damage reduction and range-shift block (12 §11 / S01-006).
 */
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { scaleByBasisPointsFloor } from "./battle-turn-math.js";
import type { BattleConfig } from "./types.js";
import type { TechniqueConsumptionClass } from "./technique-enums.js";

export type DefenseConsumptionClassKey = "basicAttack" | TechniqueConsumptionClass;

export function guardedDamageFactor(
  classKey: DefenseConsumptionClassKey,
  defense: BattleConfig["defense"],
): ValidationResult<number> {
  const factor = defense.damageFactorByConsumptionClass[classKey];
  if (typeof factor !== "number") {
    return failure([
      {
        path: `/damageFactorByConsumptionClass/${classKey}`,
        message: "missing guarded damage factor",
      },
    ]);
  }
  return success(factor);
}

export function applyGuardedDamage(
  normalDamage: number,
  classKey: DefenseConsumptionClassKey,
  defense: BattleConfig["defense"],
): ValidationResult<{ guardedDamage: number; reducedBy: number }> {
  const factor = guardedDamageFactor(classKey, defense);
  if (!factor.ok) {
    return factor;
  }
  const scaled = scaleByBasisPointsFloor(normalDamage, factor.value);
  if (!scaled.ok) {
    return scaled;
  }
  const guardedDamage = Math.max(1, scaled.value);
  return success({ guardedDamage, reducedBy: Math.max(0, normalDamage - guardedDamage) });
}

export function rangeShiftBlockChance(
  classKey: DefenseConsumptionClassKey,
  defense: BattleConfig["defense"],
): ValidationResult<number> {
  const chance = defense.rangeShiftBlockChanceByConsumptionClass[classKey];
  if (typeof chance !== "number" || !Number.isSafeInteger(chance)) {
    return failure([
      {
        path: `/rangeShiftBlockChanceByConsumptionClass/${classKey}`,
        message: "missing range-shift block chance",
      },
    ]);
  }
  return success(chance);
}

export function rollRangeShiftBlock(
  rng: SeededRng,
  blockChance: number,
): { roll: number; blocked: boolean } {
  const roll = rng.nextInt(1, 101);
  return { roll, blocked: roll <= blockChance };
}
