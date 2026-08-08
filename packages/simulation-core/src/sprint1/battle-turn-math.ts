/**
 * Shared fixed-point helpers for battle turn resolution (12 / S1-SPEC-0.1.15).
 * Integer BasisPoints only — no Math.round / Number.EPSILON / float === ties.
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { BASIS_POINTS_SCALE } from "./basis-points.js";
import type { BasisPoints } from "./basis-points.js";
import { BATTLE_RANGES } from "./types.js";
import type { BattleRange } from "./types.js";

const SCALE = BigInt(BASIS_POINTS_SCALE);

/** Floor-divide a signed BigInt numerator by BASIS_POINTS_SCALE (toward −∞). */
export function floorDivBasisPoints(numerator: bigint): ValidationResult<number> {
  const quotient = numerator / SCALE;
  const remainder = numerator % SCALE;
  let result = quotient;
  if (remainder !== 0n && numerator < 0n) {
    result = quotient - 1n;
  }
  if (result < BigInt(Number.MIN_SAFE_INTEGER) || result > BigInt(Number.MAX_SAFE_INTEGER)) {
    return failure([
      {
        path: "",
        message: "basis-points floor division result is outside the safe-integer range",
        actual: result.toString(),
        expected: "safe integer",
      },
    ]);
  }
  return success(Number(result));
}

/** `floor(value * factorBp / 10000)` for a non-negative base and non-negative factor. */
export function scaleByBasisPointsFloor(
  value: number,
  factorBp: BasisPoints | number,
): ValidationResult<number> {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    return failure([
      {
        path: "/value",
        message: "value must be a non-negative safe integer",
        actual: value,
        expected: "safe integer >= 0",
      },
    ]);
  }
  if (
    typeof factorBp !== "number" ||
    !Number.isSafeInteger(factorBp) ||
    factorBp < 0 ||
    Object.is(factorBp, -0)
  ) {
    return failure([
      {
        path: "/factorBp",
        message: "factor must be a non-negative safe integer basis points",
        actual: factorBp,
        expected: "safe integer >= 0",
      },
    ]);
  }
  return floorDivBasisPoints(BigInt(value) * BigInt(factorBp));
}

/**
 * Signed linear combination of integer points × BasisPoints coefficients, then
 * floor-divide once by 10000.
 */
export function signedWeightedSumFloor(
  terms: readonly { points: number; weightBp: number; sign: 1 | -1 }[],
): ValidationResult<number> {
  let numerator = 0n;
  for (const term of terms) {
    if (!Number.isSafeInteger(term.points) || Object.is(term.points, -0)) {
      return failure([
        {
          path: "/points",
          message: "points must be a safe integer",
          actual: term.points,
          expected: "safe integer",
        },
      ]);
    }
    if (!Number.isSafeInteger(term.weightBp) || term.weightBp < 0 || Object.is(term.weightBp, -0)) {
      return failure([
        {
          path: "/weightBp",
          message: "weight must be a non-negative safe integer basis points",
          actual: term.weightBp,
          expected: "safe integer >= 0",
        },
      ]);
    }
    const contribution = BigInt(term.points) * BigInt(term.weightBp);
    numerator += term.sign === 1 ? contribution : -contribution;
  }
  return floorDivBasisPoints(numerator);
}

export function clampInteger(value: number, minimum: number, maximum: number): number {
  if (value < minimum) {
    return minimum;
  }
  if (value > maximum) {
    return maximum;
  }
  return value;
}

export function battleRangeIndex(range: BattleRange): number {
  return BATTLE_RANGES.indexOf(range);
}

export function shiftBattleRange(
  range: BattleRange,
  direction: "approach_one" | "retreat_one",
): BattleRange {
  const index = battleRangeIndex(range);
  if (direction === "approach_one") {
    return BATTLE_RANGES[Math.max(0, index - 1)]!;
  }
  return BATTLE_RANGES[Math.min(BATTLE_RANGES.length - 1, index + 1)]!;
}

export function canShiftBattleRange(
  range: BattleRange,
  direction: "approach_one" | "retreat_one",
): boolean {
  const index = battleRangeIndex(range);
  if (direction === "approach_one") {
    return index > 0;
  }
  return index < BATTLE_RANGES.length - 1;
}

export function absoluteRangeDistance(a: BattleRange, b: BattleRange): number {
  return Math.abs(battleRangeIndex(a) - battleRangeIndex(b));
}

/**
 * 12 §9 hit formula weights that are not separate `battle.hit` config keys.
 * Values match the mini-spec literals as BasisPoints (×10000).
 */
export const HIT_SKILL_SPEED_DIFF_WEIGHT_BP = 3500 as const;
export const HIT_MASTERY_FROM_50_WEIGHT_BP = 2000 as const;
export const HIT_APTITUDE_FROM_50_WEIGHT_BP = 1000 as const;
