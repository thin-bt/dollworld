/**
 * Technique activation chance (12 §8 / S01-006).
 */
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleConfig } from "./types.js";
import { clampInteger, floorDivBasisPoints } from "./battle-turn-math.js";

export type ActivationChanceInput = {
  activationDifficulty: number;
  spirit: number;
  masteryDisplay: number;
  domainAptitude: number;
  fatigue: number;
  injury: number;
  inBattleConsumption: number;
  nextActivationModifier: number;
  config: BattleConfig["activation"];
};

/**
 * Fixed-point ActivationChancePercent → floor → clamp(min..max).
 */
export function computeActivationChancePercent(
  input: ActivationChanceInput,
): ValidationResult<number> {
  const { config } = input;
  // Start from basePercent * 10000, then add signed weighted terms.
  let numerator = BigInt(config.basePercent) * 10000n;
  numerator -= BigInt(input.activationDifficulty) * BigInt(config.difficultyPenaltyPerPoint);
  numerator += BigInt(input.spirit - 50) * BigInt(config.spiritBonusPerPointFrom50);
  numerator += BigInt(input.masteryDisplay - 50) * BigInt(config.masteryBonusPerPointFrom50);
  numerator += BigInt(input.domainAptitude - 50) * BigInt(config.aptitudeBonusPerPointFrom50);
  numerator -= BigInt(input.fatigue) * BigInt(config.fatiguePenaltyPerPoint);
  numerator -= BigInt(input.injury) * BigInt(config.injuryPenaltyPerPoint);
  numerator -= BigInt(input.inBattleConsumption) * BigInt(config.consumptionPenaltyPerPoint);
  // nextActivationModifier is integer percent points.
  numerator += BigInt(input.nextActivationModifier) * 10000n;

  const floored = floorDivBasisPoints(numerator);
  if (!floored.ok) {
    return floored;
  }
  return success(clampInteger(floored.value, config.minimumPercent, config.maximumPercent));
}

export function rollActivation(
  rng: SeededRng,
  chancePercent: number,
): { roll: number; succeeded: boolean } {
  const roll = rng.nextInt(1, 101);
  return { roll, succeeded: roll <= chancePercent };
}

export function requireActivationInputs(
  input: ActivationChanceInput,
): ValidationResult<ActivationChanceInput> {
  const fields: Array<[string, number]> = [
    ["activationDifficulty", input.activationDifficulty],
    ["spirit", input.spirit],
    ["masteryDisplay", input.masteryDisplay],
    ["domainAptitude", input.domainAptitude],
    ["fatigue", input.fatigue],
    ["injury", input.injury],
    ["inBattleConsumption", input.inBattleConsumption],
    ["nextActivationModifier", input.nextActivationModifier],
  ];
  for (const [path, value] of fields) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || Object.is(value, -0)) {
      return failure([
        {
          path: `/${path}`,
          message: "value must be a safe integer",
          actual: value,
        },
      ]);
    }
  }
  return success(input);
}
