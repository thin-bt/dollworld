/**
 * Mastery derivations (09 mini-spec §7, §9 / S01-003): initial mastery by
 * learningTier, the current-value mastery factor bands, and effective-mastery
 * readers for a stored PersonTechniqueState / a basic-attack profile. Does not
 * apply weekly mastery gain math or RNG (deferred to a later Sprint 1 task).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BasisPoints } from "./basis-points.js";
import { isLearningTier, LEARNING_TIERS } from "./technique-enums.js";
import type { LearningTier } from "./technique-enums.js";
import type { PersonTechniqueState, Sprint1Config } from "./types.js";

/**
 * 09 §7 table: initial display mastery per learningTier (`initialMasteryByTier` is
 * still an integer display value 0..100 after Sprint1Config normalization — not
 * basis points). Returns the stored `masteryHundredths` unit (display * 100).
 */
export function deriveInitialMasteryHundredths(
  tier: LearningTier,
  config: Sprint1Config,
): ValidationResult<number> {
  if (!isLearningTier(tier)) {
    return failure([
      {
        path: "/tier",
        message: "tier must be one of the fixed LearningTier values",
        actual: tier,
        expected: LEARNING_TIERS.join(" | "),
      },
    ]);
  }
  const displayValue = config.techniqueLearning.initialMasteryByTier[tier];
  if (
    typeof displayValue !== "number" ||
    !Number.isInteger(displayValue) ||
    displayValue < 0 ||
    displayValue > 100
  ) {
    return failure([
      {
        path: `/config/techniqueLearning/initialMasteryByTier/${tier}`,
        message: "initialMasteryByTier value must be an integer within 0..100",
        actual: displayValue,
        expected: "0..100",
      },
    ]);
  }
  return success(displayValue * 100);
}

/**
 * 09 §9 mastery current-value factor bands, keyed by `masteryHundredths` (0..10000).
 */
export function selectMasteryCurrentValueFactor(
  masteryHundredths: number,
  config: Sprint1Config,
): ValidationResult<BasisPoints> {
  const issues: ValidationIssue[] = [];
  if (
    typeof masteryHundredths !== "number" ||
    !Number.isInteger(masteryHundredths) ||
    masteryHundredths < 0 ||
    masteryHundredths > 10000
  ) {
    issues.push({
      path: "/masteryHundredths",
      message: "masteryHundredths must be an integer within 0..10000",
      actual: masteryHundredths,
      expected: "0..10000",
    });
    return failure(issues);
  }
  const factors = config.techniqueLearning.masteryCurrentValueFactors;
  if (masteryHundredths <= 3999) return success(factors.mastery0to39);
  if (masteryHundredths <= 5999) return success(factors.mastery40to59);
  if (masteryHundredths <= 7999) return success(factors.mastery60to79);
  if (masteryHundredths <= 8999) return success(factors.mastery80to89);
  return success(factors.mastery90to100);
}

/** Reads the stored `masteryHundredths` from a PersonTechniqueState (09 §6, §9). */
export function deriveTechniqueEffectiveMasteryHundredths(
  state: PersonTechniqueState,
): ValidationResult<number> {
  const masteryHundredths = (state as { masteryHundredths?: unknown } | null)?.masteryHundredths;
  if (
    typeof masteryHundredths !== "number" ||
    !Number.isInteger(masteryHundredths) ||
    masteryHundredths < 0 ||
    masteryHundredths > 10000
  ) {
    return failure([
      {
        path: "/masteryHundredths",
        message: "state.masteryHundredths must be an integer within 0..10000",
        actual: masteryHundredths,
        expected: "0..10000",
      },
    ]);
  }
  return success(masteryHundredths);
}
