/**
 * Basic-attack profile lookup and effective-mastery reader (09 mini-spec §11.1 /
 * S01-003). Basic attacks have no `activationDifficulty`, no learning/mastery
 * growth, and use a fixed effective mastery of 50 (§11.1) — they never read a
 * PersonTechniqueState.
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { TECHNIQUE_CATEGORIES } from "./types.js";
import type { BasicAttackProfile, Sprint1Config, TechniqueCategory } from "./types.js";

/**
 * `techniqueBalance.basicAttackProfiles` is keyed by the same 3 category keys as
 * `TechniqueCategory` (09 §2); `martial` is not a valid key and is rejected by
 * Sprint1Config validation upstream, so no remapping happens here.
 */
export function getBasicAttackProfile(
  config: Sprint1Config,
  category: TechniqueCategory,
): ValidationResult<BasicAttackProfile> {
  if (
    typeof category !== "string" ||
    !(TECHNIQUE_CATEGORIES as readonly string[]).includes(category)
  ) {
    return failure([
      {
        path: "/category",
        message: "category must be one of the fixed TechniqueCategory values",
        actual: category,
        expected: TECHNIQUE_CATEGORIES.join(" | "),
      },
    ]);
  }
  return success(config.techniqueBalance.basicAttackProfiles[category]);
}

/** 09 §11.1: basic-attack profiles hold a fixed `effectiveMastery` (50), not a stored state. */
export function deriveBasicAttackEffectiveMasteryHundredths(
  profile: BasicAttackProfile,
): ValidationResult<number> {
  const effectiveMastery = (profile as { effectiveMastery?: unknown } | null)?.effectiveMastery;
  if (
    typeof effectiveMastery !== "number" ||
    !Number.isInteger(effectiveMastery) ||
    effectiveMastery < 0 ||
    effectiveMastery > 100
  ) {
    return failure([
      {
        path: "/effectiveMastery",
        message: "profile.effectiveMastery must be an integer within 0..100",
        actual: effectiveMastery,
        expected: "0..100",
      },
    ]);
  }
  return success(effectiveMastery * 100);
}
