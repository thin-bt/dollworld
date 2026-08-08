/**
 * effectiveMentalCost (12 §16 / S01-006).
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BasisPoints } from "./basis-points.js";
import { BASIS_POINTS_SCALE } from "./basis-points.js";

/**
 * ```text
 * effectiveMentalCost
 * = max(0, floor(mentalCost * (1 - mastery/100 * maximumMasteryReductionRatio)))
 * ```
 *
 * `mastery` is display mastery (`masteryHundredths / 100`).
 * `maximumMasteryReductionRatio` is normalized BasisPoints.
 */
export function computeEffectiveMentalCost(
  mentalCost: number,
  masteryHundredths: number,
  maximumMasteryReductionRatioBp: BasisPoints,
): ValidationResult<number> {
  if (!Number.isSafeInteger(mentalCost) || mentalCost < 0) {
    return failure([
      {
        path: "/mentalCost",
        message: "mentalCost must be a non-negative safe integer",
        actual: mentalCost,
      },
    ]);
  }
  if (
    !Number.isSafeInteger(masteryHundredths) ||
    masteryHundredths < 0 ||
    masteryHundredths > 10000
  ) {
    return failure([
      {
        path: "/masteryHundredths",
        message: "masteryHundredths must be a safe integer in 0..10000",
        actual: masteryHundredths,
      },
    ]);
  }
  if (!Number.isSafeInteger(maximumMasteryReductionRatioBp) || maximumMasteryReductionRatioBp < 0) {
    return failure([
      {
        path: "/maximumMasteryReductionRatio",
        message: "maximumMasteryReductionRatio must be non-negative basis points",
        actual: maximumMasteryReductionRatioBp,
      },
    ]);
  }

  // reductionFactor = mastery/100 * ratio = masteryHundredths/10000 * ratioBp/10000
  // cost * (1 - reduction) = cost * (1 - masteryHundredths * ratioBp / 10000^2)
  // = floor( cost * (10000^2 - masteryHundredths * ratioBp) / 10000^2 )
  const scale2 = BigInt(BASIS_POINTS_SCALE) * BigInt(BASIS_POINTS_SCALE);
  const reductionNumerator = BigInt(masteryHundredths) * BigInt(maximumMasteryReductionRatioBp);
  const keep = scale2 - reductionNumerator;
  if (keep < 0n) {
    return success(0);
  }
  const numerator = BigInt(mentalCost) * keep;
  const quotient = numerator / scale2;
  if (quotient > BigInt(Number.MAX_SAFE_INTEGER)) {
    return failure([
      {
        path: "",
        message: "effectiveMentalCost overflow",
        expected: "safe integer",
      },
    ]);
  }
  const value = Number(quotient);
  return success(value < 0 ? 0 : value);
}
