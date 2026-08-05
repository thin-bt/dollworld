/**
 * Growth profile enumeration (08 §4.2 / S01-002).
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";

export const GROWTH_PROFILES = ["early", "normal", "late"] as const;
export type GrowthProfile = (typeof GROWTH_PROFILES)[number];

const GROWTH_PROFILE_SET: ReadonlySet<string> = new Set(GROWTH_PROFILES);

export function isGrowthProfile(value: unknown): value is GrowthProfile {
  return typeof value === "string" && GROWTH_PROFILE_SET.has(value);
}

export function validateGrowthProfile(input: unknown): ValidationResult<GrowthProfile> {
  if (!isGrowthProfile(input)) {
    return failure([
      {
        path: "",
        message: "GrowthProfile must be exactly early | normal | late",
        actual: input,
        expected: "early | normal | late",
      },
    ]);
  }
  return success(input);
}
