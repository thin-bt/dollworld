/**
 * MovementChance contract helper (12 §13 / S1-SPEC-0.1.16).
 *
 * Pre-roll success percent for BattleActionLog.movementChance.
 * Does not advance RNG. Does not implement the production turn Resolver.
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";

export type MovementChanceBounds = {
  randomMinimum: number;
  randomMaximum: number;
};

export type MovementChanceInput = {
  moverBaseScore: number;
  opponentBaseScore: number;
  randomMinimum: number;
  randomMaximum: number;
};

/**
 * requiredMoveRoll = OpponentBaseScore - MoverBaseScore
 * (minimum inclusive roll that still succeeds).
 */
export function computeRequiredMoveRoll(
  moverBaseScore: number,
  opponentBaseScore: number,
): ValidationResult<number> {
  if (
    typeof moverBaseScore !== "number" ||
    !Number.isSafeInteger(moverBaseScore) ||
    Object.is(moverBaseScore, -0)
  ) {
    return failure([
      {
        path: "/moverBaseScore",
        message: "moverBaseScore must be a safe integer",
        actual: moverBaseScore,
        expected: "safe integer",
      },
    ]);
  }
  if (
    typeof opponentBaseScore !== "number" ||
    !Number.isSafeInteger(opponentBaseScore) ||
    Object.is(opponentBaseScore, -0)
  ) {
    return failure([
      {
        path: "/opponentBaseScore",
        message: "opponentBaseScore must be a safe integer",
        actual: opponentBaseScore,
        expected: "safe integer",
      },
    ]);
  }
  const required = opponentBaseScore - moverBaseScore;
  if (!Number.isSafeInteger(required)) {
    return failure([
      {
        path: "/requiredMoveRoll",
        message: "requiredMoveRoll overflowed the safe-integer range",
        actual: required,
      },
    ]);
  }
  return success(required);
}

export function computePossibleRollCount(bounds: MovementChanceBounds): ValidationResult<number> {
  const { randomMinimum, randomMaximum } = bounds;
  if (
    typeof randomMinimum !== "number" ||
    !Number.isSafeInteger(randomMinimum) ||
    Object.is(randomMinimum, -0) ||
    typeof randomMaximum !== "number" ||
    !Number.isSafeInteger(randomMaximum) ||
    Object.is(randomMaximum, -0)
  ) {
    return failure([
      {
        path: "/bounds",
        message: "randomMinimum and randomMaximum must be safe integers",
        actual: bounds,
      },
    ]);
  }
  if (randomMaximum < randomMinimum) {
    return failure([
      {
        path: "/bounds",
        message: "randomMaximum must be >= randomMinimum",
        actual: bounds,
      },
    ]);
  }
  const count = randomMaximum - randomMinimum + 1;
  if (!Number.isSafeInteger(count) || count <= 0) {
    return failure([
      {
        path: "/possibleRollCount",
        message: "possibleRollCount must be a positive safe integer",
        actual: count,
      },
    ]);
  }
  return success(count);
}

/**
 * Count inclusive rolls in [randomMinimum, randomMaximum] that satisfy
 * MoverBaseScore + roll >= OpponentBaseScore.
 */
export function computeSuccessfulRollCount(input: MovementChanceInput): ValidationResult<number> {
  const required = computeRequiredMoveRoll(input.moverBaseScore, input.opponentBaseScore);
  if (!required.ok) {
    return required;
  }
  const possible = computePossibleRollCount({
    randomMinimum: input.randomMinimum,
    randomMaximum: input.randomMaximum,
  });
  if (!possible.ok) {
    return possible;
  }

  // Succeed when roll >= requiredMoveRoll, clipped to the inclusive roll window.
  const firstSuccess = Math.max(input.randomMinimum, required.value);
  if (firstSuccess > input.randomMaximum) {
    return success(0);
  }
  const count = input.randomMaximum - firstSuccess + 1;
  return success(count);
}

/**
 * movementChance = floor(successfulRollCount * 100 / possibleRollCount)
 * Result is a safe integer in 0..100. RNG consumption: 0.
 */
export function computeMovementChance(input: MovementChanceInput): ValidationResult<number> {
  const successful = computeSuccessfulRollCount(input);
  if (!successful.ok) {
    return successful;
  }
  const possible = computePossibleRollCount({
    randomMinimum: input.randomMinimum,
    randomMaximum: input.randomMaximum,
  });
  if (!possible.ok) {
    return possible;
  }
  const chance = Math.floor((successful.value * 100) / possible.value);
  if (!Number.isSafeInteger(chance) || chance < 0 || chance > 100) {
    return failure([
      {
        path: "/movementChance",
        message: "movementChance must be a safe integer in 0..100",
        actual: chance,
        expected: "0..100",
      },
    ]);
  }
  return success(chance);
}
