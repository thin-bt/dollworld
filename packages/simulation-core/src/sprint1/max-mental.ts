/**
 * Max mental derivation: 50 + spirit.surfaceValue (08 §6.1 / S01-002).
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";

export function deriveMaxMental(spiritSurfaceValue: number): ValidationResult<number> {
  if (
    typeof spiritSurfaceValue !== "number" ||
    !Number.isInteger(spiritSurfaceValue) ||
    Object.is(spiritSurfaceValue, -0)
  ) {
    return failure([
      {
        path: "/abilities/spirit/surfaceValue",
        message: "spirit.surfaceValue must be a finite integer",
        actual: spiritSurfaceValue,
        expected: "integer 0..100",
      },
    ]);
  }
  if (spiritSurfaceValue < 0 || spiritSurfaceValue > 100) {
    return failure([
      {
        path: "/abilities/spirit/surfaceValue",
        message: "spirit.surfaceValue out of range",
        actual: spiritSurfaceValue,
        expected: "0..100",
      },
    ]);
  }
  return success(50 + spiritSurfaceValue);
}
