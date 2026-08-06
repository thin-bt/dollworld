/**
 * Shared integer math contract for weekly effects (08 mini-spec §5.3 / §5.4,
 * referenced by 09 §8.0 and 14 §2 / §5).
 *
 * `multiplyBasisPointsFloor` multiplies an integer base by N basis-points factors
 * using exact BigInt arithmetic and floors exactly once by `10000^N`. Per-factor
 * sequential flooring is forbidden: the fixed test `base=500`,
 * `factors=[6500, 9000, 11500]` must yield 336 (sequential flooring yields 335).
 *
 * BigInt is used only inside this module; every returned value is a Number safe
 * integer and is never written to JSON, canonical values, or stored state.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { BASIS_POINTS_SCALE } from "./basis-points.js";

const BASIS_POINTS_SCALE_BIGINT = BigInt(BASIS_POINTS_SCALE);

/** Minimal RNG surface used by `drawInclusiveBasisPoints` (07 mini-spec `nextInt`). */
export type BasisPointsRng = {
  nextInt(minInclusive: number, maxExclusive: number): number;
};

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)
  );
}

/**
 * `floor(baseInteger * product(factors) / 10000^factors.length)` with a single
 * final floor. `baseInteger` and every factor must be a non-negative safe integer;
 * a final result outside the safe-integer range is a failure (never truncated).
 * An empty `factors` array returns `baseInteger` unchanged.
 */
export function multiplyBasisPointsFloor(
  baseInteger: number,
  factors: readonly number[],
): ValidationResult<number> {
  const issues: ValidationIssue[] = [];

  if (!isNonNegativeSafeInteger(baseInteger)) {
    issues.push({
      path: "/baseInteger",
      message: "baseInteger must be a non-negative safe integer",
      actual: baseInteger,
      expected: "safe integer >= 0",
    });
  }

  if (!Array.isArray(factors)) {
    issues.push({
      path: "/factors",
      message: "factors must be a dense array of basis-points integers",
      actual: factors,
      expected: "readonly number[]",
    });
    return failure(issues);
  }

  for (let index = 0; index < factors.length; index += 1) {
    if (!isNonNegativeSafeInteger(factors[index])) {
      issues.push({
        path: `/factors/${String(index)}`,
        message: "every factor must be a non-negative safe integer in basis points",
        actual: factors[index],
        expected: "safe integer >= 0",
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  let numerator = BigInt(baseInteger);
  for (const factor of factors) {
    numerator *= BigInt(factor);
  }
  const denominator = BASIS_POINTS_SCALE_BIGINT ** BigInt(factors.length);
  const quotient = numerator / denominator;

  const result = Number(quotient);
  if (!Number.isSafeInteger(result) || BigInt(result) !== quotient) {
    return failure([
      {
        path: "",
        message: "multiplyBasisPointsFloor result exceeds the safe-integer range",
        actual: quotient.toString(),
        expected: "safe integer",
      },
    ]);
  }
  return success(result);
}

/**
 * 08 §5.4: uniform inclusive draw over `[minimumBp, maximumBp]` via a single
 * public `nextInt(min, max + 1)` call. No `nextFloat` interpolation, no modulo,
 * no percent-then-×100, no `Math.round`.
 *
 * Invalid bounds are a programmer error and throw (they can never be produced by
 * a validated Sprint1Config); the RNG is not consumed in that case.
 */
export function drawInclusiveBasisPoints(
  rng: BasisPointsRng,
  minimumBp: number,
  maximumBp: number,
): number {
  if (rng === null || typeof rng !== "object" || typeof rng.nextInt !== "function") {
    throw new Error("drawInclusiveBasisPoints requires an RNG exposing nextInt");
  }
  if (!Number.isSafeInteger(minimumBp) || !Number.isSafeInteger(maximumBp)) {
    throw new Error(
      `drawInclusiveBasisPoints bounds must be safe integers (got ${String(minimumBp)}, ${String(maximumBp)})`,
    );
  }
  if (minimumBp > maximumBp) {
    throw new Error(
      `drawInclusiveBasisPoints requires minimumBp <= maximumBp (got ${String(minimumBp)}, ${String(maximumBp)})`,
    );
  }
  if (!Number.isSafeInteger(maximumBp + 1)) {
    throw new Error("drawInclusiveBasisPoints maximumBp + 1 must remain a safe integer");
  }
  return rng.nextInt(minimumBp, maximumBp + 1);
}

/**
 * Mathematical floor (toward -Infinity), unlike JavaScript integer division
 * truncation. Required by 10 §5 / 14 §4 for signed score arithmetic.
 */
export function mathematicalFloor(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    throw new Error(
      `mathematicalFloor requires finite operands and a non-zero denominator (got ${String(numerator)}, ${String(denominator)})`,
    );
  }
  return Math.floor(numerator / denominator);
}
