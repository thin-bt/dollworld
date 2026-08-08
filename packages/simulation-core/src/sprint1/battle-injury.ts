/**
 * Injury chance and application (12 §17 / S01-006).
 */
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { clampInteger, floorDivBasisPoints, scaleByBasisPointsFloor } from "./battle-turn-math.js";
import { isHighConsumptionBand } from "./battle-consumption.js";
import type { BattleConfig } from "./types.js";

export type InjuryResult = "none" | "minor" | "major";

export function baseInjuryChanceFromDamageRatio(
  damage: number,
  maxDurability: number,
  bands: BattleConfig["injury"]["baseChanceBands"],
): ValidationResult<number> {
  if (maxDurability <= 0) {
    return failure([
      {
        path: "/maxDurability",
        message: "maxDurability must be positive",
        actual: maxDurability,
      },
    ]);
  }
  // percent = floor(damage * 100 / maxDurability)
  const percent = Number((BigInt(damage) * 100n) / BigInt(maxDurability));
  if (percent < 10) {
    return success(bands.below10Percent);
  }
  if (percent < 20) {
    return success(bands["10to19Percent"]);
  }
  if (percent < 30) {
    return success(bands["20to29Percent"]);
  }
  if (percent < 40) {
    return success(bands["30to39Percent"]);
  }
  return success(bands["40PercentOrMore"]);
}

export type FinalInjuryChanceInput = {
  damage: number;
  maxDurability: number;
  fatigue: number;
  existingInjury: number;
  stamina: number;
  injuryProneness: number;
  techniqueInjuryModifier: number;
  guarding: boolean;
  inBattleConsumption: number;
  injury: BattleConfig["injury"];
  highBandInjuryMultiplierBp: number;
};

export function computeFinalInjuryChancePercent(
  input: FinalInjuryChanceInput,
): ValidationResult<number> {
  const base = baseInjuryChanceFromDamageRatio(
    input.damage,
    input.maxDurability,
    input.injury.baseChanceBands,
  );
  if (!base.ok) {
    return base;
  }

  // additive in percent * 10000
  const additive =
    BigInt(base.value) * 10000n +
    BigInt(input.fatigue) * BigInt(input.injury.fatigueChancePerPoint) +
    BigInt(input.existingInjury) * BigInt(input.injury.existingInjuryChancePerPoint) -
    BigInt(input.stamina) * BigInt(input.injury.staminaReductionPerPoint) +
    BigInt(input.injuryProneness - 50) * BigInt(input.injury.injuryPronenessChancePerPointFrom50) +
    BigInt(input.techniqueInjuryModifier) * 10000n;

  const additiveFloor = floorDivBasisPoints(additive);
  if (!additiveFloor.ok) {
    return additiveFloor;
  }

  let multiplicativeBp = 10000;
  if (input.guarding) {
    multiplicativeBp = input.injury.guardedChanceFactor;
  }
  if (isHighConsumptionBand(input.inBattleConsumption)) {
    const product = scaleByBasisPointsFloor(multiplicativeBp, input.highBandInjuryMultiplierBp);
    if (!product.ok) {
      return product;
    }
    // product is floor(multiplicativeBp * highBand / 10000); treat as new factor in BP space
    // When guarding=false, multiplicativeBp=10000 → product = highBandInjuryMultiplierBp.
    // When guarding=true, multiplicative = guardedChanceFactor * highBand / 10000.
    multiplicativeBp = product.value;
  }

  const finalScaled = scaleByBasisPointsFloor(Math.max(0, additiveFloor.value), multiplicativeBp);
  if (!finalScaled.ok) {
    return finalScaled;
  }
  return success(clampInteger(finalScaled.value, 0, input.injury.maximumPercent));
}

export function rollInjury(
  rng: SeededRng,
  chancePercent: number,
  injury: BattleConfig["injury"],
): {
  injuryRoll: number | null;
  majorInjuryChance: number | null;
  majorInjuryRoll: number | null;
  result: InjuryResult;
  injuryDelta: number;
} {
  if (chancePercent <= 0) {
    return {
      injuryRoll: null,
      majorInjuryChance: null,
      majorInjuryRoll: null,
      result: "none",
      injuryDelta: 0,
    };
  }
  const injuryRoll = rng.nextInt(1, 101);
  if (injuryRoll > chancePercent) {
    return {
      injuryRoll,
      majorInjuryChance: null,
      majorInjuryRoll: null,
      result: "none",
      injuryDelta: 0,
    };
  }
  // majorChanceWhenInjured is BasisPoints (0.20 → 2000).
  const majorChance = Number((BigInt(injury.majorChanceWhenInjured) * 100n) / 10000n);
  const majorInjuryRoll = rng.nextInt(1, 101);
  if (majorInjuryRoll <= majorChance) {
    return {
      injuryRoll,
      majorInjuryChance: majorChance,
      majorInjuryRoll,
      result: "major",
      injuryDelta: injury.majorInjuryDelta,
    };
  }
  return {
    injuryRoll,
    majorInjuryChance: majorChance,
    majorInjuryRoll,
    result: "minor",
    injuryDelta: injury.minorInjuryDelta,
  };
}

export function applyInjuryDelta(
  injuryBefore: number,
  injuryDelta: number,
  unableToContinueThreshold: number,
  currentDurability: number,
): {
  injuryAfter: number;
  unableToContinue: boolean;
  canAct: boolean;
} {
  const injuryAfter = clampInteger(injuryBefore + injuryDelta, 0, 100);
  const unableToContinue = currentDurability > 0 && injuryAfter >= unableToContinueThreshold;
  return {
    injuryAfter,
    unableToContinue,
    canAct: unableToContinue ? false : true,
  };
}
